"use client";

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export function downloadPdfTable(opts: {
  filename: string;
  title: string;
  subtitle?: string;
  headers: string[];
  rows: Array<Array<unknown>>;
}): void {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const marginX = 36;

  doc.setFontSize(14);
  doc.setTextColor(30, 41, 59);
  doc.text(opts.title, marginX, 36);

  if (opts.subtitle) {
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(opts.subtitle, marginX, 52);
  }

  autoTable(doc, {
    startY: opts.subtitle ? 64 : 48,
    head: [opts.headers],
    body: opts.rows.map((row) =>
      row.map((cell) => (cell == null ? "" : String(cell)))
    ),
    styles: {
      fontSize: 8,
      cellPadding: 4,
      overflow: "linebreak",
      valign: "top",
    },
    headStyles: {
      fillColor: [80, 176, 160],
      textColor: 255,
      fontStyle: "bold",
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: marginX, right: marginX },
  });

  doc.save(opts.filename.endsWith(".pdf") ? opts.filename : `${opts.filename}.pdf`);
}
