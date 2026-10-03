"use client";

import type { CSSProperties } from "react";
import { Download, FileText } from "lucide-react";

const btnStyle = (disabled: boolean): CSSProperties => ({
  height: 34,
  padding: "0 12px",
  borderRadius: 6,
  border: "1px solid var(--border)",
  background: "var(--secondary)",
  color: "var(--foreground)",
  fontSize: 13,
  fontWeight: 500,
  cursor: disabled ? "not-allowed" : "pointer",
  opacity: disabled ? 0.55 : 1,
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
});

export function ExportButtons({
  disabled,
  onCsv,
  onPdf,
  onXlsx,
}: {
  disabled?: boolean;
  onCsv: () => void;
  onPdf: () => void;
  onXlsx?: () => void;
}) {
  return (
    <>
      <button type="button" onClick={onCsv} disabled={disabled} style={btnStyle(!!disabled)}>
        <Download style={{ width: 14, height: 14 }} />
        CSV
      </button>
      {onXlsx && (
        <button type="button" onClick={onXlsx} disabled={disabled} style={btnStyle(!!disabled)}>
          <Download style={{ width: 14, height: 14 }} />
          XLSX
        </button>
      )}
      <button type="button" onClick={onPdf} disabled={disabled} style={btnStyle(!!disabled)}>
        <FileText style={{ width: 14, height: 14 }} />
        PDF
      </button>
    </>
  );
}
