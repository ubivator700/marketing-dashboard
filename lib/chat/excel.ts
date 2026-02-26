import ExcelJS from "exceljs";

// ─── Generate Excel workbook and return Buffer ───────────────────

export async function generateExcel(
  _title: string,
  sheets: Array<{ name: string; columns: string[]; rows: unknown[][] }>,
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Маркетинговый дашборд";
  workbook.created = new Date();

  for (const sheet of sheets) {
    const ws = workbook.addWorksheet(sheet.name);

    // Header row
    ws.addRow(sheet.columns);
    const headerRow = ws.getRow(1);
    headerRow.font = { bold: true, size: 11 };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE8EAF6" },
    };
    headerRow.alignment = { vertical: "middle", horizontal: "center" };

    // Data rows
    for (const row of sheet.rows) {
      ws.addRow(row);
    }

    // Auto-fit column widths (approximate)
    ws.columns.forEach((col, i) => {
      const headerLen = (sheet.columns[i] || "").length;
      let maxLen = headerLen;
      for (const row of sheet.rows) {
        const val = row[i];
        const len = val != null ? String(val).length : 0;
        if (len > maxLen) maxLen = len;
      }
      col.width = Math.min(Math.max(maxLen + 2, 10), 50);
    });

    // Borders for header
    headerRow.eachCell((cell) => {
      cell.border = {
        bottom: { style: "thin", color: { argb: "FF9E9E9E" } },
      };
    });
  }

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
