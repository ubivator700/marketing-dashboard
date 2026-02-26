import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import pool from "@/lib/db";
import type { RowDataPacket } from "mysql2";
import { requireAuth } from "@/lib/api-helpers";

/* ────────────────────────────────────────────────────────────────────
   Шаблон импорта расходов — v2
   ─── Улучшения:
   - Блок инструкций сверху с форматированием
   - Дропдауны из справочника
   - Подсказки под заголовком (строка описаний)
   - Стилизованные примеры с текущими датами
   - SUM-формула для суммы
   - Справочник на отдельном листе
   ──────────────────────────────────────────────────────────────────── */

const INDIGO = "FF6366F1";
const INDIGO_DARK = "FF4338CA";
const GRAY_50 = "FFF9FAFB";
const GRAY_100 = "FFF3F4F6";
const GRAY_200 = "FFE5E7EB";
const GRAY_500 = "FF6B7280";
const GRAY_700 = "FF374151";
const GRAY_900 = "FF111827";
const GREEN_50 = "FFF0FDF4";
const GREEN_700 = "FF15803D";
const RED_500 = "FFEF4444";
const WHITE = "FFFFFFFF";
const AMBER_50 = "FFFFFBEB";
const AMBER_700 = "FFB45309";

function border(color = GRAY_200): Partial<ExcelJS.Border> {
  return { style: "thin", color: { argb: color } };
}

function allBorders(color = GRAY_200): Partial<ExcelJS.Borders> {
  const b = border(color);
  return { top: b, bottom: b, left: b, right: b };
}

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  // ─── Fetch reference data ──────────────────────────────────────
  const [[channelRows], [projectRows], [storeRows]] = await Promise.all([
    pool.query<RowDataPacket[]>("SELECT name FROM channels ORDER BY name"),
    pool.query<RowDataPacket[]>("SELECT name FROM projects ORDER BY name"),
    pool.query<RowDataPacket[]>("SELECT name FROM stores ORDER BY name"),
  ]);

  const channelNames = channelRows.map((r) => r.name as string);
  const projectNames = projectRows.map((r) => r.name as string);
  const storeNames = storeRows.map((r) => r.name as string);

  const wb = new ExcelJS.Workbook();
  wb.creator = "Маркетинг Дашборд";
  wb.created = new Date();

  // ═══════════════════════════════════════════════════════════════
  //  SHEET 1 — Расходы (main)
  // ═══════════════════════════════════════════════════════════════
  const ws = wb.addWorksheet("Расходы", {
    properties: { defaultRowHeight: 22 },
  });

  // Column widths
  ws.columns = [
    { key: "num", width: 5 },        // A — №
    { key: "name", width: 34 },       // B — Название
    { key: "amount", width: 18 },     // C — Сумма
    { key: "responsible", width: 22 }, // D — Ответственный
    { key: "date", width: 18 },       // E — Дата
    { key: "project", width: 28 },    // F — Проект
    { key: "channel", width: 25 },    // G — Канал
    { key: "store", width: 22 },      // H — Точка
  ];

  // ─── Row 1: Title banner ─────────────────────────────────────
  ws.mergeCells("A1:H1");
  const titleCell = ws.getCell("A1");
  titleCell.value = "📋  ШАБЛОН ИМПОРТА РАСХОДОВ";
  titleCell.font = { bold: true, size: 14, color: { argb: WHITE } };
  titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: INDIGO } };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  ws.getRow(1).height = 36;

  // ─── Row 2: Instructions ─────────────────────────────────────
  ws.mergeCells("A2:H2");
  const instrCell = ws.getCell("A2");
  instrCell.value =
    "Инструкция: заполните таблицу ниже. Поля с * обязательны. Удалите примеры перед импортом. Проект / Канал / Точка — выбирайте из выпадающих списков.";
  instrCell.font = { size: 10, italic: true, color: { argb: GRAY_700 } };
  instrCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: AMBER_50 } };
  instrCell.alignment = { horizontal: "left", vertical: "middle", wrapText: true };
  instrCell.border = allBorders(AMBER_700);
  ws.getRow(2).height = 30;

  // ─── Row 3: Empty spacer ────────────────────────────────────
  ws.getRow(3).height = 6;

  // ─── Row 4: Column headers ──────────────────────────────────
  const HEADER_ROW = 4;
  const headers = [
    "№",
    "Название *",
    "Сумма (₽) *",
    "Ответственный *",
    "Дата *",
    "Проект",
    "Канал",
    "Точка",
  ];
  const headerRow = ws.getRow(HEADER_ROW);
  headers.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h;
    cell.font = { bold: true, size: 11, color: { argb: WHITE } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: INDIGO } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = { bottom: { style: "medium", color: { argb: INDIGO_DARK } } };
  });
  headerRow.height = 30;

  // ─── Row 5: Sub-headers (hints) ─────────────────────────────
  const SUB_ROW = 5;
  const subHints = [
    "",
    "Что оплатили",
    "Без знака ₽",
    "ФИО / должность",
    "ГГГГ-ММ-ДД",
    "(необязательно)",
    "(необязательно)",
    "(необязательно)",
  ];
  const subRow = ws.getRow(SUB_ROW);
  subHints.forEach((h, i) => {
    const cell = subRow.getCell(i + 1);
    cell.value = h;
    cell.font = { size: 9, italic: true, color: { argb: GRAY_500 } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: GRAY_100 } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = { bottom: border(GRAY_200) };
  });
  subRow.height = 22;

  // ─── Data starts at row 6 ────────────────────────────────────
  const DATA_START = 6;

  // ─── Reference sheet (build before dropdowns) ────────────────
  const ref = wb.addWorksheet("Справочник");
  ref.state = "veryHidden"; // hide from user but accessible for formulas

  ref.getColumn(1).width = 30;
  ref.getColumn(2).width = 28;
  ref.getColumn(3).width = 25;

  const refHeaderRow = ref.getRow(1);
  ["Проекты", "Каналы", "Точки"].forEach((label, i) => {
    const cell = refHeaderRow.getCell(i + 1);
    cell.value = label;
    cell.font = { bold: true, color: { argb: WHITE } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: GRAY_700 } };
    cell.alignment = { horizontal: "center" };
  });

  const maxRef = Math.max(projectNames.length, channelNames.length, storeNames.length, 1);
  for (let i = 0; i < maxRef; i++) {
    const row = ref.getRow(i + 2);
    if (i < projectNames.length) row.getCell(1).value = projectNames[i];
    if (i < channelNames.length) row.getCell(2).value = channelNames[i];
    if (i < storeNames.length) row.getCell(3).value = storeNames[i];
  }

  // Also add a visible reference sheet for the user
  const refVisible = wb.addWorksheet("Справочник (просмотр)");
  refVisible.getColumn(1).width = 30;
  refVisible.getColumn(2).width = 28;
  refVisible.getColumn(3).width = 25;

  const refVisHeader = refVisible.getRow(1);
  ["Проекты", "Каналы", "Точки"].forEach((label, i) => {
    const cell = refVisHeader.getCell(i + 1);
    cell.value = label;
    cell.font = { bold: true, color: { argb: WHITE }, size: 11 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: INDIGO } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
  });
  refVisHeader.height = 28;

  for (let i = 0; i < maxRef; i++) {
    const row = refVisible.getRow(i + 2);
    if (i < projectNames.length) {
      row.getCell(1).value = projectNames[i];
      row.getCell(1).font = { size: 10 };
    }
    if (i < channelNames.length) {
      row.getCell(2).value = channelNames[i];
      row.getCell(2).font = { size: 10 };
    }
    if (i < storeNames.length) {
      row.getCell(3).value = storeNames[i];
      row.getCell(3).font = { size: 10 };
    }
    // Zebra stripe
    if (i % 2 === 0) {
      for (let c = 1; c <= 3; c++) {
        row.getCell(c).fill = { type: "pattern", pattern: "solid", fgColor: { argb: GRAY_50 } };
      }
    }
  }

  // ─── Data validation (dropdowns) rows DATA_START..300 ────────
  const projRange =
    projectNames.length > 0 ? `Справочник!$A$2:$A$${projectNames.length + 1}` : undefined;
  const chRange =
    channelNames.length > 0 ? `Справочник!$B$2:$B$${channelNames.length + 1}` : undefined;
  const stRange =
    storeNames.length > 0 ? `Справочник!$C$2:$C$${storeNames.length + 1}` : undefined;

  for (let r = DATA_START; r <= 300; r++) {
    // Row number formula in column A
    ws.getCell(`A${r}`).value = { formula: `IF(B${r}="","",ROW()-${DATA_START - 1})` };
    ws.getCell(`A${r}`).font = { size: 10, color: { argb: GRAY_500 } };
    ws.getCell(`A${r}`).alignment = { horizontal: "center" };

    if (projRange) {
      ws.getCell(`F${r}`).dataValidation = {
        type: "list",
        formulae: [projRange],
        showErrorMessage: true,
        errorTitle: "Неверный проект",
        error: "Выберите проект из списка или оставьте пустым",
      };
    }
    if (chRange) {
      ws.getCell(`G${r}`).dataValidation = {
        type: "list",
        formulae: [chRange],
        showErrorMessage: true,
        errorTitle: "Неверный канал",
        error: "Выберите канал из списка или оставьте пустым",
      };
    }
    if (stRange) {
      ws.getCell(`H${r}`).dataValidation = {
        type: "list",
        formulae: [stRange],
        showErrorMessage: true,
        errorTitle: "Неверная точка",
        error: "Выберите торговую точку из списка или оставьте пустым",
      };
    }

    // Zebra striping for data rows
    if ((r - DATA_START) % 2 === 1) {
      for (let c = 1; c <= 8; c++) {
        ws.getRow(r).getCell(c).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: GRAY_50 },
        };
      }
    }
  }

  // ─── Example rows ────────────────────────────────────────────
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);
  const twoDaysAgo = new Date(today);
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
  const twoDaysAgoStr = twoDaysAgo.toISOString().slice(0, 10);

  const examples = [
    {
      name: "Рекламная кампания Google Ads",
      amount: 15000,
      responsible: "Маркетолог",
      date: todayStr,
      project: projectNames[0] ?? "",
      channel: channelNames[0] ?? "",
      store: storeNames[0] ?? "",
    },
    {
      name: "Печать баннеров для выставки",
      amount: 5000,
      responsible: "Дизайнер",
      date: yesterdayStr,
      project: "",
      channel: channelNames[1] ?? channelNames[0] ?? "",
      store: "",
    },
    {
      name: "Продвижение в Instagram",
      amount: 8500,
      responsible: "SMM-менеджер",
      date: twoDaysAgoStr,
      project: projectNames[1] ?? projectNames[0] ?? "",
      channel: channelNames[0] ?? "",
      store: storeNames[0] ?? "",
    },
  ];

  examples.forEach((ex, i) => {
    const rowNum = DATA_START + i;
    const row = ws.getRow(rowNum);
    row.getCell(1).value = { formula: `IF(B${rowNum}="","",ROW()-${DATA_START - 1})` };
    row.getCell(2).value = ex.name;
    row.getCell(3).value = ex.amount;
    row.getCell(4).value = ex.responsible;
    row.getCell(5).value = ex.date;
    row.getCell(6).value = ex.project;
    row.getCell(7).value = ex.channel;
    row.getCell(8).value = ex.store;

    // Style examples in lighter color
    for (let c = 1; c <= 8; c++) {
      row.getCell(c).font = { italic: true, color: { argb: GRAY_500 }, size: 10 };
      row.getCell(c).fill = { type: "pattern", pattern: "solid", fgColor: { argb: GREEN_50 } };
      row.getCell(c).border = allBorders(GRAY_200);
    }
  });

  // ─── Instruction row after examples ──────────────────────────
  const instrRowNum = DATA_START + examples.length;
  ws.mergeCells(`A${instrRowNum}:H${instrRowNum}`);
  const instrDataCell = ws.getCell(`A${instrRowNum}`);
  instrDataCell.value = "⚠️  Удалите примеры выше и заполните своими данными. Поля Проект / Канал / Точка необязательны.";
  instrDataCell.font = { italic: true, color: { argb: RED_500 }, size: 10 };
  instrDataCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF1F2" } };
  instrDataCell.alignment = { horizontal: "center", vertical: "middle" };
  ws.getRow(instrRowNum).height = 26;

  // ─── Summary footer row (below data area) ───────────────────
  const SUMMARY_ROW = 302;
  ws.mergeCells(`A${SUMMARY_ROW}:B${SUMMARY_ROW}`);
  const summaryLabel = ws.getCell(`A${SUMMARY_ROW}`);
  summaryLabel.value = "ИТОГО:";
  summaryLabel.font = { bold: true, size: 11, color: { argb: GRAY_900 } };
  summaryLabel.alignment = { horizontal: "right", vertical: "middle" };

  const summaryValue = ws.getCell(`C${SUMMARY_ROW}`);
  summaryValue.value = { formula: `SUM(C${DATA_START}:C${SUMMARY_ROW - 1})` };
  summaryValue.font = { bold: true, size: 12, color: { argb: GREEN_700 } };
  summaryValue.numFmt = "#,##0 ₽";
  summaryValue.fill = { type: "pattern", pattern: "solid", fgColor: { argb: GREEN_50 } };
  summaryValue.border = allBorders(GREEN_700);

  const summaryCount = ws.getCell(`D${SUMMARY_ROW}`);
  summaryCount.value = { formula: `COUNTA(B${DATA_START}:B${SUMMARY_ROW - 1})&" записей"` };
  summaryCount.font = { size: 10, color: { argb: GRAY_500 } };

  // ─── Formatting for amount column ────────────────────────────
  ws.getColumn(3).numFmt = "#,##0";

  // ─── Freeze header rows (1-5) ───────────────────────────────
  ws.views = [{ state: "frozen", xSplit: 0, ySplit: SUB_ROW }];

  // ─── Auto-filter on header row ──────────────────────────────
  ws.autoFilter = {
    from: { row: HEADER_ROW, column: 1 },
    to: { row: HEADER_ROW, column: 8 },
  };

  // ─── Print settings ─────────────────────────────────────────
  ws.pageSetup = {
    orientation: "landscape",
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
  };

  // ═══════════════════════════════════════════════════════════════
  //  Generate buffer & return
  // ═══════════════════════════════════════════════════════════════
  const buffer = await wb.xlsx.writeBuffer();

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": "attachment; filename=expenses_template.xlsx",
    },
  });
}
