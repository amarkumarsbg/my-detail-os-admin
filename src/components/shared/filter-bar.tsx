"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Search, RefreshCw } from "lucide-react";

interface FilterBarProps {
  searchValue?: string;
  searchPlaceholder?: string;
  onSearch?: (v: string) => void;
  children?: ReactNode; // extra filter controls (selects, etc.)
  onRefresh?: () => void;
  refreshing?: boolean;
  rightSlot?: ReactNode; // buttons on the far right
}

export function FilterBar({
  searchValue,
  searchPlaceholder = "Search…",
  onSearch,
  children,
  onRefresh,
  refreshing,
  rightSlot,
}: FilterBarProps) {
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: "8px",
        padding: "10px clamp(12px, 3vw, 24px)",
        borderBottom: "1px solid var(--border)",
        background: "var(--card)",
      }}
    >
      {onSearch && (
        <div style={{ position: "relative", minWidth: "200px", maxWidth: "280px", flex: "1 1 200px" }}>
          <Search
            style={{
              position: "absolute",
              left: "10px",
              top: "50%",
              transform: "translateY(-50%)",
              width: "14px",
              height: "14px",
              color: "var(--muted-foreground)",
              pointerEvents: "none",
            }}
          />
          <input
            type="search"
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(e) => onSearch(e.target.value)}
            style={{
              width: "100%",
              height: "34px",
              paddingLeft: "32px",
              paddingRight: "10px",
              border: "1px solid var(--border)",
              borderRadius: "6px",
              fontSize: "13px",
              color: "var(--foreground)",
              background: "var(--secondary)",
              outline: "none",
              boxSizing: "border-box",
            }}
            onFocus={(e) => { e.target.style.borderColor = "#50B0A0"; e.target.style.background = "var(--card)"; }}
            onBlur={(e) => { e.target.style.borderColor = "var(--border)"; e.target.style.background = "var(--secondary)"; }}
          />
        </div>
      )}
      {children}
      {(onRefresh || rightSlot) && (
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "8px" }}>
          {rightSlot}
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={refreshing}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "5px",
                height: "34px",
                padding: "0 12px",
                border: "1px solid var(--border)",
                borderRadius: "6px",
                background: "var(--card)",
                fontSize: "12px",
                fontWeight: 500,
                color: "var(--muted-foreground)",
                cursor: refreshing ? "not-allowed" : "pointer",
                opacity: refreshing ? 0.7 : 1,
              }}
            >
              <RefreshCw style={{ width: "13px", height: "13px", animation: refreshing ? "spin 1s linear infinite" : "none" }} />
              Refresh
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Custom dropdown for use inside FilterBar ────────────────────────────────

interface FilterSelectProps {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  label?: string;
}

export function FilterSelect({ value, onChange, options, label }: FilterSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
      {label && <span style={{ fontSize: "12px", color: "var(--muted-foreground)", whiteSpace: "nowrap" }}>{label}</span>}
      <div ref={ref} style={{ position: "relative" }}>
        {/* Trigger */}
        <button
          type="button"
          onClick={() => setOpen((p) => !p)}
          style={{
            height: "34px",
            padding: "0 10px 0 12px",
            display: "flex",
            alignItems: "center",
            gap: 6,
            border: open ? "1px solid #50B0A0" : "1px solid var(--border)",
            borderRadius: "6px",
            background: "var(--card)",
            fontSize: "12px",
            fontWeight: 500,
            color: "var(--foreground)",
            cursor: "pointer",
            outline: "none",
            whiteSpace: "nowrap",
            boxShadow: open ? "0 0 0 3px rgba(59,130,246,0.12)" : "none",
            transition: "border-color 0.15s, box-shadow 0.15s",
          }}
        >
          <span>{selected?.label ?? value}</span>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0, color: "var(--muted-foreground)", transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}>
            <path d="M2.5 4.5l3.5 3.5 3.5-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {/* Dropdown */}
        {open && (
          <div style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            minWidth: "100%",
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            boxShadow: "0 4px 16px rgba(0,0,0,0.15), 0 1px 4px rgba(0,0,0,0.08)",
            zIndex: 200,
            padding: "4px",
          }}>
            {options.map((o) => {
              const isActive = o.value === value;
              return (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => { onChange(o.value); setOpen(false); }}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "7px 10px",
                    borderRadius: "5px",
                    border: "none",
                    background: isActive ? "var(--accent)" : "transparent",
                    color: isActive ? "#50B0A0" : "var(--foreground)",
                    fontSize: "12px",
                    fontWeight: isActive ? 600 : 400,
                    cursor: "pointer",
                    textAlign: "left",
                    whiteSpace: "nowrap",
                    transition: "background 0.1s",
                  }}
                  onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = "rgba(99,120,150,0.18)"; }}
                  onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
                >
                  {isActive && (
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ flexShrink: 0 }}>
                      <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="#50B0A0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                  <span style={{ marginLeft: isActive ? 0 : 16 }}>{o.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
