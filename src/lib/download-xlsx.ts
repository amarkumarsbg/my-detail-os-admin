/** SpreadsheetML .xls download (opens in Excel / Google Sheets) without extra deps. */

function xmlEscape(value: unknown): string {
  if (value == null) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function downloadXlsx(
  filename: string,
  headers: string[],
  rows: Array<Array<unknown>>
): void {
  const headerRow = headers
    .map((h) => `<Cell><Data ss:Type="String">${xmlEscape(h)}</Data></Cell>`)
    .join("");
  const body = rows
    .map((row) => {
      const cells = headers
        .map((_, i) => {
          const v = row[i];
          const isNum = typeof v === "number" && Number.isFinite(v);
          return `<Cell><Data ss:Type="${isNum ? "Number" : "String"}">${xmlEscape(v)}</Data></Cell>`;
        })
        .join("");
      return `<Row>${cells}</Row>`;
    })
    .join("");

  const xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
<Worksheet ss:Name="Export"><Table>
<Row>${headerRow}</Row>
${body}
</Table></Worksheet></Workbook>`;

  const blob = new Blob([xml], { type: "application/vnd.ms-excel" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".xls") || filename.endsWith(".xlsx")
    ? filename.replace(/\.xlsx$/i, ".xls")
    : `${filename}.xls`;
  a.click();
  URL.revokeObjectURL(url);
}
