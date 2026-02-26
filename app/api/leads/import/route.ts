import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { RowDataPacket } from "mysql2";
import pool from "@/lib/db";
import { requireAuth, requireWrite } from "@/lib/api-helpers";

interface NameIdRow extends RowDataPacket {
  id: number;
  name: string;
}

// ─── Mapping: Russian labels & aliases → DB enum values ─────────
const CONTACT_METHOD_MAP: Record<string, string> = {
  // Enum values (pass-through)
  salon: "salon",
  phone: "phone",
  social: "social",
  old_request: "old_request",
  // Russian labels
  "в салоне": "salon",
  "салон": "salon",
  "по телефону": "phone",
  "телефон": "phone",
  "звонок": "phone",
  "соц. сети": "social",
  "соц сети": "social",
  "соцсети": "social",
  "социальные сети": "social",
  "старая заявка": "old_request",
  "повторное обращение": "old_request",
  "повторный": "old_request",
  "старый": "old_request",
};

const RESULT_MAP: Record<string, string> = {
  // Enum values (pass-through)
  measurement: "measurement",
  sale: "sale",
  deferred: "deferred",
  // Russian labels
  "замер": "measurement",
  "замеры": "measurement",
  "продажа": "sale",
  "продано": "sale",
  "отложенный": "deferred",
  "отложен": "deferred",
  "отложено": "deferred",
  "думает": "deferred",
};

function resolveContactMethod(raw: string): string | null {
  return CONTACT_METHOD_MAP[raw.toLowerCase().trim()] ?? null;
}

function resolveResult(raw: string): string | null {
  return RESULT_MAP[raw.toLowerCase().trim()] ?? null;
}

/** Safely extract a plain string from any ExcelJS cell value (handles richText, formula, hyperlink, etc.) */
function getCellString(cell: ExcelJS.Cell): string {
  const v = cell.value;
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  // Rich text: { richText: [{ text: '...' }, ...] }
  if (typeof v === "object" && "richText" in v && Array.isArray((v as { richText: { text: string }[] }).richText)) {
    return (v as { richText: { text: string }[] }).richText.map((r) => r.text).join("");
  }
  // Hyperlink: { text: '...', hyperlink: '...' }
  if (typeof v === "object" && "text" in v) {
    return String((v as { text: string }).text);
  }
  // Formula result: { result: ..., formula: '...' }
  if (typeof v === "object" && "result" in v) {
    const res = (v as { result: unknown }).result;
    if (res == null) return "";
    if (res instanceof Date) return res.toISOString().slice(0, 10);
    return String(res);
  }
  // Fallback
  return String(v);
}

export async function POST(request: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const writeError = requireWrite(session!.role, "leads");
  if (writeError) return writeError;

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Файл не загружен" }, { status: 400 });
    }

    // Read the file (use ArrayBuffer directly for Node 22 compat with exceljs)
    const arrayBuffer = await file.arrayBuffer();

    // Parse Excel
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(arrayBuffer);

    // Find the data sheet (prefer "Лиды", fall back to first sheet)
    const ws = wb.worksheets.find((s) => s.name === "Лиды") ?? wb.worksheets[0];

    if (!ws) {
      return NextResponse.json({ error: "Пустой файл Excel" }, { status: 400 });
    }

    // Load lookup maps from DB
    const [channelRows] = await pool.query<NameIdRow[]>("SELECT id, name FROM channels");
    const channelMap = new Map<string, number>();
    for (const ch of channelRows) {
      channelMap.set(ch.name.toLowerCase().trim(), ch.id);
    }

    const [storeRows] = await pool.query<NameIdRow[]>("SELECT id, name FROM stores");
    const storeMap = new Map<string, number>();
    for (const s of storeRows) {
      storeMap.set(s.name.toLowerCase().trim(), s.id);
    }

    const [productTypeRows] = await pool.query<NameIdRow[]>("SELECT id, name FROM product_types");
    const productTypeMap = new Map<string, number>();
    for (const pt of productTypeRows) {
      productTypeMap.set(pt.name.toLowerCase().trim(), pt.id);
    }

    interface ParsedLead {
      name: string;
      channelId: number | null;
      contactMethod: string;
      result: string;
      date: string;
      note: string | null;
      storeId: number | null;
      productTypeIds: number[];
    }

    const validRows: { rowNumber: number; data: ParsedLead }[] = [];
    const errors: string[] = [];

    // Iterate rows (skip header = row 1)
    ws.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // skip header

      const name = getCellString(row.getCell(1)).trim();
      const channelName = getCellString(row.getCell(2)).trim();
      const contactMethodRaw = getCellString(row.getCell(3)).trim();
      const resultRaw = getCellString(row.getCell(4)).trim();
      const note = getCellString(row.getCell(6)).trim() || null;
      const storeName = getCellString(row.getCell(7)).trim();
      const productTypeRaw = getCellString(row.getCell(8)).trim();

      // Date needs special handling (ExcelJS often returns Date objects)
      const dateRaw = row.getCell(5).value;

      // Skip empty rows and instruction rows
      if (!name) return;
      if (name.startsWith("↑") || name.includes("Удалите примеры")) return;

      console.log(`[leads/import] parsing row ${rowNumber}: name="${name}" contactMethodRaw="${contactMethodRaw}" (type=${typeof row.getCell(3).value}, raw=${JSON.stringify(row.getCell(3).value)}) resultRaw="${resultRaw}" (type=${typeof row.getCell(4).value}, raw=${JSON.stringify(row.getCell(4).value)})`);

      // Resolve contact method (supports both enum values and Russian labels)
      const contactMethod = resolveContactMethod(contactMethodRaw);
      if (!contactMethod) {
        errors.push(`Строка ${rowNumber}: неверный способ контакта "${contactMethodRaw}". Допустимо: В салоне, По телефону, Соц. сети, Старая заявка (или salon, phone, social, old_request)`);
        return;
      }

      // Resolve result (supports both enum values and Russian labels)
      const result = resolveResult(resultRaw);
      if (!result) {
        errors.push(`Строка ${rowNumber}: неверный результат "${resultRaw}". Допустимо: Замер, Продажа, Отложенный (или measurement, sale, deferred)`);
        return;
      }

      // Parse date
      let dateStr: string;
      if (dateRaw instanceof Date) {
        dateStr = dateRaw.toISOString().slice(0, 10);
      } else {
        dateStr = String(dateRaw ?? "").trim();
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        errors.push(`Строка ${rowNumber}: неверная дата "${dateStr}". Формат: ГГГГ-ММ-ДД`);
        return;
      }

      // Resolve channel ("Рекламный канал неизвестен" → null)
      const UNKNOWN_CHANNEL = "рекламный канал неизвестен";
      let channelId: number | null = null;
      if (channelName && channelName.toLowerCase() !== UNKNOWN_CHANNEL) {
        channelId = channelMap.get(channelName.toLowerCase()) ?? null;
        if (!channelId) {
          errors.push(`Строка ${rowNumber}: канал "${channelName}" не найден`);
          return;
        }
      }

      // Resolve store
      let storeId: number | null = null;
      if (storeName) {
        storeId = storeMap.get(storeName.toLowerCase()) ?? null;
        if (!storeId) {
          errors.push(`Строка ${rowNumber}: точка "${storeName}" не найдена`);
          return;
        }
      }

      // Resolve product types (comma-separated)
      const productTypeIds: number[] = [];
      if (productTypeRaw) {
        const ptNames = productTypeRaw.split(",").map((s) => s.trim()).filter(Boolean);
        let hasError = false;
        for (const ptName of ptNames) {
          const ptId = productTypeMap.get(ptName.toLowerCase()) ?? null;
          if (!ptId) {
            errors.push(`Строка ${rowNumber}: тип товара "${ptName}" не найден`);
            hasError = true;
            break;
          }
          productTypeIds.push(ptId);
        }
        if (hasError) return;
      }

      validRows.push({
        rowNumber,
        data: { name, channelId, contactMethod, result, date: dateStr, note, storeId, productTypeIds },
      });
    });

    // Batch insert validated rows
    const insertedLeads: {
      id: number;
      name: string;
      channelId: number;
      contactMethod: string;
      result: string;
      date: string;
      note: string | null;
      storeId: number | null;
      productTypeIds: number[];
    }[] = [];

    for (const { rowNumber, data } of validRows) {
      console.log(`[leads/import] row ${rowNumber}: contactMethod="${data.contactMethod}" result="${data.result}"`);
      const [queryResult] = await pool.query(
        "INSERT INTO leads (name, channel_id, contact_method, result, date, note, store_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [data.name, data.channelId, data.contactMethod, data.result, data.date, data.note, data.storeId]
      );

      const insertId = (queryResult as { insertId: number }).insertId;

      // Insert junction rows
      if (data.productTypeIds.length > 0) {
        const values = data.productTypeIds.map((ptId) => [insertId, ptId]);
        await pool.query(
          "INSERT INTO lead_product_types (lead_id, product_type_id) VALUES ?",
          [values]
        );
      }

      insertedLeads.push({
        id: insertId,
        name: data.name,
        channelId: data.channelId ?? 0,
        contactMethod: data.contactMethod,
        result: data.result,
        date: data.date,
        note: data.note,
        storeId: data.storeId,
        productTypeIds: data.productTypeIds,
      });
    }

    return NextResponse.json({
      inserted: insertedLeads.length,
      leads: insertedLeads,
      errors,
    });
  } catch (err) {
    console.error("[leads/import] error:", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Ошибка обработки файла: ${message}` },
      { status: 500 }
    );
  }
}
