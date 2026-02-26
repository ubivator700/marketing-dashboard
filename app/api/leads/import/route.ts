import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { RowDataPacket } from "mysql2";
import pool from "@/lib/db";
import { requireAuth, requireWrite } from "@/lib/api-helpers";

interface NameIdRow extends RowDataPacket {
  id: number;
  name: string;
}

const VALID_CONTACT_METHODS = ["salon", "phone", "social", "old_request"];
const VALID_RESULTS = ["measurement", "sale", "deferred"];

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

    // Read the file into a buffer (use Uint8Array for Node 22 compat with exceljs)
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

      const name = String(row.getCell(1).value ?? "").trim();
      const channelName = String(row.getCell(2).value ?? "").trim();
      const contactMethod = String(row.getCell(3).value ?? "").trim().toLowerCase();
      const result = String(row.getCell(4).value ?? "").trim().toLowerCase();
      const dateRaw = row.getCell(5).value;
      const note = String(row.getCell(6).value ?? "").trim() || null;
      const storeName = String(row.getCell(7).value ?? "").trim();
      const productTypeRaw = String(row.getCell(8).value ?? "").trim();

      // Skip empty rows
      if (!name) return;

      // Validate contact method
      if (!VALID_CONTACT_METHODS.includes(contactMethod)) {
        errors.push(`Строка ${rowNumber}: неверный способ контакта "${contactMethod}". Допустимо: ${VALID_CONTACT_METHODS.join(", ")}`);
        return;
      }

      // Validate result
      if (!VALID_RESULTS.includes(result)) {
        errors.push(`Строка ${rowNumber}: неверный результат "${result}". Допустимо: ${VALID_RESULTS.join(", ")}`);
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

    for (const { data } of validRows) {
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
