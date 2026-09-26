"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { PlatformAuditRow } from "@/api/platform";
import { formatDateTime } from "@/lib/utils";
import {
  platformAuditActorLabel,
  platformAuditBadge,
  platformAuditChangeLines,
  platformAuditTitle,
} from "@/lib/platform-audit";

type PlatformAuditListProps = {
  rows: PlatformAuditRow[];
  /** Show organization name/link (global audit page). */
  showOrganization?: boolean;
  /** Internal scroll height for long lists. Ignored when fillHeight is true. */
  maxHeight?: string;
  /** Stretch list to fill remaining parent height. */
  fillHeight?: boolean;
};

export function PlatformAuditList({
  rows,
  showOrganization = false,
  maxHeight = "min(420px, 50vh)",
  fillHeight = false,
}: PlatformAuditListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div
      style={{
        background: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        ...(fillHeight ? { flex: 1, height: "100%" } : { maxHeight }),
      }}
    >
      <div
        style={{
          overflowY: "auto",
          WebkitOverflowScrolling: "touch",
          flex: 1,
          minHeight: 0,
        }}
      >
        {rows.map((r, idx) => {
          const badge = platformAuditBadge(r.action);
          const title = platformAuditTitle(r.action);
          const changes = platformAuditChangeLines(r.before, r.after);
          const expanded = expandedId === r.id;
          const hasDetails = changes.length > 0;

          return (
            <div
              key={r.id}
              style={{
                borderTop: idx === 0 ? "none" : "1px solid var(--border)",
              }}
            >
              <button
                type="button"
                onClick={() => setExpandedId((prev) => (prev === r.id ? null : r.id))}
                disabled={!hasDetails}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "14px 16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  background: "transparent",
                  border: "none",
                  cursor: hasDetails ? "pointer" : "default",
                  color: "inherit",
                }}
              >
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                  <div style={{ minWidth: 0, flex: 1, display: "flex", gap: 8 }}>
                    {hasDetails ? (
                      <span style={{ color: "var(--muted-foreground)", marginTop: 2, flexShrink: 0 }}>
                        {expanded
                          ? <ChevronDown style={{ width: 14, height: 14 }} />
                          : <ChevronRight style={{ width: 14, height: 14 }} />}
                      </span>
                    ) : (
                      <span style={{ width: 14, flexShrink: 0 }} />
                    )}
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--foreground)", lineHeight: 1.35 }}>
                        {title}
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 12px", marginTop: 6, fontSize: 12, color: "var(--muted-foreground)" }}>
                        <span>{platformAuditActorLabel(r.actor)}</span>
                        {showOrganization && (
                          r.organizationId ? (
                            <Link
                              href={`/organizations/${r.organizationId}`}
                              onClick={(e) => e.stopPropagation()}
                              style={{ color: "#50B0A0", textDecoration: "none", fontWeight: 500 }}
                            >
                              {r.organizationName ?? "Organization"}
                            </Link>
                          ) : (
                            <span>{r.organizationName ?? "Platform"}</span>
                          )
                        )}
                        <span>{formatDateTime(r.createdAt)}</span>
                      </div>
                      {!expanded && changes.length > 0 && (
                        <div style={{ marginTop: 6, fontSize: 12, color: "var(--muted-foreground)", lineHeight: 1.4 }}>
                          {changes[0]}
                          {changes.length > 1 ? ` · +${changes.length - 1} more` : ""}
                        </div>
                      )}
                    </div>
                  </div>
                  <Badge variant={badge.variant}>{badge.label}</Badge>
                </div>
              </button>

              {expanded && hasDetails && (
                <div style={{ padding: "0 16px 14px 38px" }}>
                  <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    What changed
                  </p>
                  <ul style={{ margin: 0, padding: "10px 12px 10px 28px", background: "var(--page-bg)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, color: "var(--foreground)", lineHeight: 1.55 }}>
                    {changes.map((line) => (
                      <li key={line} style={{ marginBottom: 4 }}>{line}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
