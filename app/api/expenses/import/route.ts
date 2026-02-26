import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { RowDataPacket } from "mysql2";
import pool from "@/lib/db";
import { requireAuth, requireWrite } from "@/lib/api-helpers";

interface ChannelRow extends RowDataPacket {
  id: number;
  name: string;
}

interface ProjectRow extends RowDataPacket {
  id: number;
  name: string;
}

/* ────────────────────────────────────────────────────────────────────
   Импорт расходов из Excel.

   Поддерживает два формата шаблона:

   1) v2 (новый): колонки A-H, где A = №, B = Название, C = Сумма …
      Строки 1–5 — заголовки/инструкции, данные с строки 6+

   2) v1 (старый): колонки A-G, где A = Название, B = Сумма …
      Строки 1 — заголовок, данные с строки 2+

   Автоопределение формата: если ячейка A1 содержит "ШАБЛОН" или "№"
   находится в первой строке заголовков, то v2. Иначе v1.
   ──────────────────────────────────────────────────────────────────── */

export async function POST(request: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const writeError = requireWrite(session!.role, "expenses");
  if (writeError) return writeError;

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Файл не загружен" }, { status: 400 });
    }

    // Read the file into a buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Parse Excel
    const wb = new ExcelJS.Workbook();
    // @ts-expect-error — Node 22 Buffer<ArrayBuffer> vs exceljs Buffer type mismatch
    await wb.xlsx.load(buffer);
    const ws = wb.worksheets[0];

    if (!ws) {
      return NextResponse.json({ error: "Пустой файл Excel" }, { status: 400 });
    }

    // ─── Detect template version ────────────────────────────────
    const cellA1 = String(ws.getCell("A1").value ?? "").trim();
    const cellA4 = String(ws.getCell("A4").value ?? "").trim();

    // v2 detection: title row contains "ШАБЛОН" or row 4 header starts with "№"
    const isV2 =
      cellA1.toUpperCase().includes("ШАБЛОН") ||
      cellA4 === "№" ||
      cellA4 === "#";

    // Column offsets: v1 starts at col 1 (A), v2 starts at col 2 (B)
    const colOffset = isV2 ? 1 : 0;
    // First data row: v1=2, v2=6
    const firstDataRow = isV2 ? 6 : 2;

    // ─── Load lookup maps from DB ───────────────────────────────
    const [channelRows] = await pool.query<ChannelRow[]>("SELECT id, name FROM channels");
    const channelMap = new Map<string, number>();
    for (const ch of channelRows) {
      channelMap.set(ch.name.toLowerCase().trim(), ch.id);
    }

    const [projectRows] = await pool.query<ProjectRow[]>("SELECT id, name FROM projects");
    const projectMap = new Map<string, number>();
    for (const p of projectRows) {
      projectMap.set(p.name.toLowerCase().trim(), p.id);
    }

    const [storeRows] = await pool.query<ChannelRow[]>("SELECT id, name FROM stores");
    const storeMap = new Map<string, number>();
    for (const s of storeRows) {
      storeMap.set(s.name.toLowerCase().trim(), s.id);
    }

    interface ParsedExpense {
      name: string;
      amount: number;
      responsible: string;
      date: string;
      projectId: number | null;
      channelId: number | null;
      storeId: number | null;
    }

    const validRows: { rowNumber: number; data: ParsedExpense }[] = [];
    const errors: string[] = [];

    // Iterate rows (skip headers)
    ws.eachRow((row, rowNumber) => {
      if (rowNumber < firstDataRow) return; // skip header rows

      const name = String(row.getCell(1 + colOffset).value ?? "").trim();
      const amountRaw = row.getCell(2 + colOffset).value;
      const responsible = String(row.getCell(3 + colOffset).value ?? "").trim();
      const dateRaw = row.getCell(4 + colOffset).value;
      const projectName = String(row.getCell(5 + colOffset).value ?? "").trim();
      const channelName = String(row.getCell(6 + colOffset).value ?? "").trim();
      const storeName = String(row.getCell(7 + colOffset).value ?? "").trim();

      // Skip empty rows and instruction rows
      if (!name) return;
      if (name.startsWith("⚠️") || name.startsWith("↑") || name.includes("Удалите примеры")) return;

      // Validate amount
      const amount = typeof amountRaw === "number" ? amountRaw : parseFloat(String(amountRaw));
      if (isNaN(amount) || amount < 0) {
        errors.push(`Строка ${rowNumber}: неверная сумма "${amountRaw}"`);
        return;
      }

      // Validate responsible
      if (!responsible) {
        errors.push(`Строка ${rowNumber}: не указан ответственный`);
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

      // Resolve project
      let projectId: number | null = null;
      if (projectName && projectName !== "(необязательно)") {
        projectId = projectMap.get(projectName.toLowerCase()) ?? null;
        if (!projectId) {
          errors.push(`Строка ${rowNumber}: проект "${projectName}" не найден`);
          return;
        }
      }

      // Resolve channel
      let channelId: number | null = null;
      if (channelName && channelName !== "(необязательно)") {
        channelId = channelMap.get(channelName.toLowerCase()) ?? null;
        if (!channelId) {
          errors.push(`Строка ${rowNumber}: канал "${channelName}" не найден`);
          return;
        }
      }

      // Resolve store
      let storeId: number | null = null;
      if (storeName && storeName !== "(необязательно)") {
        storeId = storeMap.get(storeName.toLowerCase()) ?? null;
        if (!storeId) {
          errors.push(`Строка ${rowNumber}: точка "${storeName}" не найдена`);
          return;
        }
      }

      validRows.push({
        rowNumber,
        data: { name, amount, responsible, date: dateStr, projectId, channelId, storeId },
      });
    });

    // Batch insert validated rows
    const insertedExpenses: {
      id: number;
      name: string;
      amount: number;
      responsible: string;
      date: string;
      projectId: number | null;
      channelId: number | null;
      storeId: number | null;
    }[] = [];

    for (const { data } of validRows) {
      const [queryResult] = await pool.query(
        "INSERT INTO expenses (name, amount, responsible, date, project_id, channel_id, store_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [data.name, data.amount, data.responsible, data.date, data.projectId, data.channelId, data.storeId]
      );

      const insertId = (queryResult as { insertId: number }).insertId;
      insertedExpenses.push({
        id: insertId,
        name: data.name,
        amount: data.amount,
        responsible: data.responsible,
        date: data.date,
        projectId: data.projectId,
        channelId: data.channelId,
        storeId: data.storeId,
      });
    }

    return NextResponse.json({
      inserted: insertedExpenses.length,
      expenses: insertedExpenses,
      errors,
    });
  } catch (err) {
    console.error("[expenses/import] error:", err);
    return NextResponse.json(
      { error: "Ошибка обработки файла", details: String(err) },
      { status: 500 }
    );
  }
}
