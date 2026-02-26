import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import pool from "@/lib/db";
import type { RowDataPacket } from "mysql2";
import { requireAuth } from "@/lib/api-helpers";

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  // Fetch reference data from DB
  const [[channelRows], [storeRows], [productTypeRows]] = await Promise.all([
    pool.query<RowDataPacket[]>("SELECT name FROM channels ORDER BY name"),
    pool.query<RowDataPacket[]>("SELECT name FROM stores ORDER BY name"),
    pool.query<RowDataPacket[]>("SELECT name, category, avg_check FROM product_types ORDER BY name"),
  ]);

  const channelNames = channelRows.map((r) => r.name as string);
  const storeNames = storeRows.map((r) => r.name as string);
  const productTypeNames = productTypeRows.map((r) => r.name as string);

  const CONTACT_METHODS = ["salon", "phone", "social", "old_request"];
  const RESULTS = ["measurement", "sale", "deferred"];

  const wb = new ExcelJS.Workbook();

  // ─── Reference sheet (hidden lists for dropdowns) ──────────────
  const ref = wb.addWorksheet("Справочник");

  ref.getColumn(1).header = "Каналы";
  ref.getColumn(1).width = 25;
  ref.getColumn(2).header = "Способ контакта";
  ref.getColumn(2).width = 20;
  ref.getColumn(3).header = "Результат";
  ref.getColumn(3).width = 20;
  ref.getColumn(4).header = "Точки";
  ref.getColumn(4).width = 25;
  ref.getColumn(5).header = "Типы товаров";
  ref.getColumn(5).width = 30;

  // Style reference header
  const refHeader = ref.getRow(1);
  refHeader.font = { bold: true, color: { argb: "FFFFFFFF" } };
  refHeader.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF374151" } };
  refHeader.alignment = { horizontal: "center" };

  const maxRows = Math.max(channelNames.length, CONTACT_METHODS.length, RESULTS.length, storeNames.length, productTypeNames.length, 1);
  for (let i = 0; i < maxRows; i++) {
    const row = ref.getRow(i + 2);
    if (i < channelNames.length) row.getCell(1).value = channelNames[i];
    if (i < CONTACT_METHODS.length) row.getCell(2).value = CONTACT_METHODS[i];
    if (i < RESULTS.length) row.getCell(3).value = RESULTS[i];
    if (i < storeNames.length) row.getCell(4).value = storeNames[i];
    if (i < productTypeNames.length) row.getCell(5).value = productTypeNames[i];
  }

  // ─── Main template sheet ───────────────────────────────────────
  const ws = wb.addWorksheet("Лиды");

  ws.columns = [
    { header: "Имя клиента *", key: "name", width: 28 },
    { header: "Канал *", key: "channel", width: 22 },
    { header: "Способ контакта *", key: "contactMethod", width: 22 },
    { header: "Результат *", key: "result", width: 20 },
    { header: "Дата (ГГГГ-ММ-ДД) *", key: "date", width: 22 },
    { header: "Заметка", key: "note", width: 30 },
    { header: "Точка", key: "store", width: 22 },
    { header: "Типы товаров (через запятую)", key: "productType", width: 30 },
  ];

  // Style header
  const headerRow = ws.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
  headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF6366F1" } };
  headerRow.alignment = { horizontal: "center", vertical: "middle" };
  headerRow.height = 28;

  // Add border to header
  for (let c = 1; c <= 8; c++) {
    const cell = headerRow.getCell(c);
    cell.border = {
      bottom: { style: "medium", color: { argb: "FF4338CA" } },
    };
  }

  // Add note on product type header about comma-separated format
  headerRow.getCell(8).note = {
    texts: [
      { text: "Можно указать несколько типов через запятую.\n", font: { bold: true, size: 9 } },
      { text: "Например: Окна ПВХ, Входные двери\n\n", font: { size: 9 } },
      { text: "Допустимые значения см. на листе «Справочник».", font: { italic: true, size: 9 } },
    ],
  };

  // Add note on name header about "Неизвестно" option
  headerRow.getCell(1).note = {
    texts: [
      { text: "Если имя неизвестно, укажите: Неизвестно", font: { size: 9 } },
    ],
  };

  // Data validation ranges for dropdown lists
  const chRange = channelNames.length > 0 ? `Справочник!$A$2:$A$${channelNames.length + 1}` : undefined;
  const cmRange = `Справочник!$B$2:$B$${CONTACT_METHODS.length + 1}`;
  const resRange = `Справочник!$C$2:$C$${RESULTS.length + 1}`;
  const stRange = storeNames.length > 0 ? `Справочник!$D$2:$D$${storeNames.length + 1}` : undefined;
  // ptRange removed — product types are now comma-separated free text

  // Apply data validation to rows 2..200
  for (let r = 2; r <= 200; r++) {
    // Channel dropdown
    if (chRange) {
      ws.getCell(`B${r}`).dataValidation = {
        type: "list",
        formulae: [chRange],
        showErrorMessage: true,
        errorTitle: "Неверный канал",
        error: "Выберите канал из списка или добавьте новый в разделе Каналы",
      };
    }

    // Contact method dropdown
    ws.getCell(`C${r}`).dataValidation = {
      type: "list",
      formulae: [cmRange],
      showErrorMessage: true,
      errorTitle: "Неверный способ",
      error: "Допустимо: salon, phone, social, old_request",
    };

    // Result dropdown
    ws.getCell(`D${r}`).dataValidation = {
      type: "list",
      formulae: [resRange],
      showErrorMessage: true,
      errorTitle: "Неверный результат",
      error: "Допустимо: measurement, sale, deferred",
    };

    // Store dropdown
    if (stRange) {
      ws.getCell(`G${r}`).dataValidation = {
        type: "list",
        formulae: [stRange],
        showErrorMessage: false,
      };
    }

    // Product type — no dropdown (comma-separated free text)
  }

  // Example rows
  const today = new Date().toISOString().slice(0, 10);
  // Build example product type strings (one single, one comma-separated)
  const exPt1 = productTypeNames[0] ?? "";
  const exPt2 =
    productTypeNames.length >= 2
      ? `${productTypeNames[0]}, ${productTypeNames[1]}`
      : exPt1;

  const exampleData = [
    {
      name: "Иван Иванов",
      channel: channelNames[0] ?? "Яндекс Директ",
      contactMethod: "phone",
      result: "measurement",
      date: today,
      note: "Звонок по рекламе",
      store: storeNames[0] ?? "",
      productType: exPt1,
    },
    {
      name: "Неизвестно",
      channel: channelNames[1] ?? channelNames[0] ?? "Google Ads",
      contactMethod: "salon",
      result: "sale",
      date: today,
      note: "Пришла в салон",
      store: storeNames[0] ?? "",
      productType: exPt2,
    },
  ];

  for (const ex of exampleData) {
    const row = ws.addRow(ex);
    row.font = { color: { argb: "FF9CA3AF" }, italic: true };
  }

  // Instructions row
  const instrRow = ws.addRow({
    name: "↑ Удалите примеры выше",
    channel: "",
    contactMethod: "",
    result: "",
    date: "",
    note: "* = обязательное поле",
    store: "(необязательно)",
    productType: "(через запятую)",
  });
  instrRow.font = { italic: true, color: { argb: "FFEF4444" }, size: 9 };

  // Freeze header row
  ws.views = [{ state: "frozen", xSplit: 0, ySplit: 1 }];

  // Auto-filter
  ws.autoFilter = { from: "A1", to: "H1" };

  // ExcelJS doesn't support moving sheets easily, so rebuild with correct order
  const wb2 = new ExcelJS.Workbook();

  // Main sheet
  const ws2 = wb2.addWorksheet("Лиды");
  ws2.columns = ws.columns.map((c) => ({ header: c.header, key: c.key, width: c.width }));

  // Copy header style
  const hdr2 = ws2.getRow(1);
  hdr2.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
  hdr2.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF6366F1" } };
  hdr2.alignment = { horizontal: "center", vertical: "middle" };
  hdr2.height = 28;
  for (let c = 1; c <= 8; c++) {
    hdr2.getCell(c).border = { bottom: { style: "medium", color: { argb: "FF4338CA" } } };
  }

  // Add notes on header cells
  hdr2.getCell(1).note = {
    texts: [
      { text: "Если имя неизвестно, укажите: Неизвестно", font: { size: 9 } },
    ],
  };
  hdr2.getCell(8).note = {
    texts: [
      { text: "Можно указать несколько типов через запятую.\n", font: { bold: true, size: 9 } },
      { text: "Например: Окна ПВХ, Входные двери\n\n", font: { size: 9 } },
      { text: "Допустимые значения см. на листе «Справочник».", font: { italic: true, size: 9 } },
    ],
  };

  // Add example rows
  for (const ex of exampleData) {
    const row = ws2.addRow(ex);
    row.font = { color: { argb: "FF9CA3AF" }, italic: true };
  }

  // Instructions
  const instr2 = ws2.addRow({
    name: "↑ Удалите примеры выше",
    channel: "",
    contactMethod: "",
    result: "",
    date: "",
    note: "* = обязательное поле",
    store: "(необязательно)",
    productType: "(через запятую)",
  });
  instr2.font = { italic: true, color: { argb: "FFEF4444" }, size: 9 };

  ws2.views = [{ state: "frozen", xSplit: 0, ySplit: 1 }];
  ws2.autoFilter = { from: "A1", to: "H1" };

  // Reference sheet
  const ref2 = wb2.addWorksheet("Справочник");
  ref2.getColumn(1).width = 25;
  ref2.getColumn(2).width = 20;
  ref2.getColumn(3).width = 20;
  ref2.getColumn(4).width = 25;
  ref2.getColumn(5).width = 30;

  const refH2 = ref2.getRow(1);
  refH2.getCell(1).value = "Каналы";
  refH2.getCell(2).value = "Способ контакта";
  refH2.getCell(3).value = "Результат";
  refH2.getCell(4).value = "Точки";
  refH2.getCell(5).value = "Типы товаров";
  refH2.font = { bold: true, color: { argb: "FFFFFFFF" } };
  refH2.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF374151" } };
  refH2.alignment = { horizontal: "center" };

  for (let i = 0; i < maxRows; i++) {
    const row = ref2.getRow(i + 2);
    if (i < channelNames.length) row.getCell(1).value = channelNames[i];
    if (i < CONTACT_METHODS.length) row.getCell(2).value = CONTACT_METHODS[i];
    if (i < RESULTS.length) row.getCell(3).value = RESULTS[i];
    if (i < storeNames.length) row.getCell(4).value = storeNames[i];
    if (i < productTypeNames.length) row.getCell(5).value = productTypeNames[i];
  }

  // Apply data validation
  const chRange2 = channelNames.length > 0 ? `Справочник!$A$2:$A$${channelNames.length + 1}` : undefined;
  const cmRange2 = `Справочник!$B$2:$B$${CONTACT_METHODS.length + 1}`;
  const resRange2 = `Справочник!$C$2:$C$${RESULTS.length + 1}`;
  const stRange2 = storeNames.length > 0 ? `Справочник!$D$2:$D$${storeNames.length + 1}` : undefined;
  // ptRange2 removed — product types are now comma-separated free text

  for (let r = 2; r <= 200; r++) {
    if (chRange2) {
      ws2.getCell(`B${r}`).dataValidation = {
        type: "list",
        formulae: [chRange2],
        showErrorMessage: true,
        errorTitle: "Неверный канал",
        error: "Выберите канал из списка",
      };
    }
    ws2.getCell(`C${r}`).dataValidation = {
      type: "list",
      formulae: [cmRange2],
      showErrorMessage: true,
      errorTitle: "Неверный способ",
      error: "Допустимо: salon, phone, social, old_request",
    };
    ws2.getCell(`D${r}`).dataValidation = {
      type: "list",
      formulae: [resRange2],
      showErrorMessage: true,
      errorTitle: "Неверный результат",
      error: "Допустимо: measurement, sale, deferred",
    };
    if (stRange2) {
      ws2.getCell(`G${r}`).dataValidation = {
        type: "list",
        formulae: [stRange2],
        showErrorMessage: false,
      };
    }
    // Product type — no dropdown (comma-separated free text)
  }

  const buffer = await wb2.xlsx.writeBuffer();

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": "attachment; filename=leads_template.xlsx",
    },
  });
}
