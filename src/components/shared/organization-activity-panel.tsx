"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Activity, Loader2 } from "lucide-react";
import { ErrorBanner } from "@/components/shared/error-banner";
import { EmptyState } from "@/components/shared/empty-state";
import { FilterSelect } from "@/components/shared/filter-bar";
import { Badge } from "@/components/ui/badge";
import {
  listPlatformOrganizationActivity,
  type OrganizationActivityRow,
} from "@/api/platform";
import { formatDateTime } from "@/lib/utils";

const ACTION_LABELS: Record<string, string> = {
  CREATED: "Created",
  UPDATED: "Updated",
  DELETED: "Deleted",
  STATUS_CHANGED: "Status Changed",
  PAYMENT_RECEIVED: "Payment Received",
  CREATE: "Created",
  UPDATE: "Updated",
  DELETE: "Deleted",
  UPDATE_STATUS: "Status Changed",
  RECORD_PAYMENT: "Payment Received",
  ASSIGNED: "Assigned",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  STOCK_ADJUSTED: "Stock Adjusted",
  WHATSAPP_SENT: "WhatsApp Sent",
  EMAIL_SENT: "Email Sent",
  MECHANIC_SWITCHED: "Mechanic Switched",
  OWNERSHIP_TRANSFERRED: "Ownership Transferred",
  WALLET_CREDITED: "Wallet Credited",
  WALLET_DEBITED: "Wallet Debited",
};

const ENTITY_OPTIONS = [
  { value: "all", label: "All entities" },
  { value: "JOB_CARD", label: "Job Card" },
  { value: "CUSTOMER", label: "Customer" },
  { value: "VEHICLE", label: "Vehicle" },
  { value: "INVOICE", label: "Invoice" },
  { value: "APPOINTMENT", label: "Appointment" },
  { value: "INVENTORY", label: "Inventory" },
  { value: "STAFF", label: "Staff" },
  { value: "QUOTATION", label: "Quotation" },
  { value: "EXPENSE", label: "Expense" },
  { value: "WALLET", label: "Wallet" },
  { value: "jobCards", label: "jobCards" },
  { value: "invoices", label: "invoices" },
  { value: "vehicles", label: "vehicles" },
];

function actionLabel(action: string): string {
  if (ACTION_LABELS[action]) return ACTION_LABELS[action];
  if (action.startsWith("CREATE_")) return "Created";
  if (action.startsWith("UPDATE_")) return action.includes("STATUS") ? "Status Changed" : "Updated";
  if (action.startsWith("DELETE_")) return "Deleted";
  if (action.startsWith("REPLACE_")) return "Synced";
  return action.replace(/_/g, " ");
}

function actionVariant(action: string): "success" | "info" | "warning" | "destructive" | "muted" | "default" {
  const a = action.toUpperCase();
  if (a.includes("DELETE") || a.includes("CANCEL")) return "destructive";
  if (a.includes("CREATE") || a.includes("COMPLETED") || a.includes("PAYMENT") || a.includes("CREDITED")) return "success";
  if (a.includes("STATUS") || a.includes("UPDATE") || a.includes("ASSIGN")) return "info";
  if (a.includes("WHATSAPP") || a.includes("EMAIL") || a.includes("STOCK")) return "warning";
  return "muted";
}

function describeActivity(row: OrganizationActivityRow): string {
  if (row.details?.trim()) return row.details.trim();
  const label = row.entityLabel || row.entityId || row.entityType || "Item";
  return `${actionLabel(row.action)} — ${label}`;
}

const inputStyle: React.CSSProperties = {
  height: 34,
  padding: "0 10px",
  border: "1px solid var(--border)",
  borderRadius: 6,
  fontSize: 13,
  background: "var(--secondary)",
  color: "var(--foreground)",
  outline: "none",
  boxSizing: "border-box",
};

export type OrganizationActivityPanelProps = {
  /** When set, org is fixed (org detail page). When omitted, show org selector. */
  organizationId?: string;
  organizationName?: string;
  /** Options for org selector (audit page). */
  organizationOptions?: Array<{ id: string; name: string }>;
  showOrganizationColumn?: boolean;
  pageSize?: number;
  embedded?: boolean;
  /** Stretch the list to fill remaining viewport height (full audit page). */
  fillHeight?: boolean;
};

export function OrganizationActivityPanel({
  organizationId: fixedOrgId,
  organizationName: fixedOrgName,
  organizationOptions = [],
  showOrganizationColumn,
  pageSize = 25,
  embedded = false,
  fillHeight = false,
}: OrganizationActivityPanelProps) {
  const [selectedOrgId, setSelectedOrgId] = useState(fixedOrgId ?? "");
  const [search, setSearch] = useState("");
  const [action, setAction] = useState("");
  const [entityType, setEntityType] = useState("all");
  const [actor, setActor] = useState("");
  const [since, setSince] = useState("");
  const [until, setUntil] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<OrganizationActivityRow[]>([]);
  const [total, setTotal] = useState(0);
  const [orgName, setOrgName] = useState(fixedOrgName ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (fixedOrgId) setSelectedOrgId(fixedOrgId);
  }, [fixedOrgId]);

  const load = useCallback(async () => {
    if (!selectedOrgId) {
      setRows([]);
      setTotal(0);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await listPlatformOrganizationActivity(selectedOrgId, {
        search: search.trim() || undefined,
        action: action.trim() || undefined,
        entityType: entityType === "all" ? undefined : entityType,
        actor: actor.trim() || undefined,
        since: since || undefined,
        until: until ? `${until}T23:59:59.999Z` : undefined,
        page,
        limit: pageSize,
      });
      setRows(res.activities);
      setTotal(res.total);
      setOrgName(res.organization.name);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load organization activity");
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [selectedOrgId, search, action, entityType, actor, since, until, page, pageSize]);

  useEffect(() => {
    const t = setTimeout(() => { void load(); }, 250);
    return () => clearTimeout(t);
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [selectedOrgId, search, action, entityType, actor, since, until]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const showOrgCol = showOrganizationColumn ?? !fixedOrgId;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: embedded ? 12 : 0,
        minHeight: 0,
        ...(fillHeight ? { flex: 1, height: "100%" } : {}),
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 8,
          flexShrink: 0,
          ...(embedded
            ? {}
            : {
                padding: "10px clamp(12px, 3vw, 24px)",
                borderBottom: "1px solid var(--border)",
                background: "var(--card)",
              }),
        }}
      >
        {!fixedOrgId && (
          <FilterSelect
            value={selectedOrgId}
            onChange={setSelectedOrgId}
            placeholder="Select organization…"
            aria-label="Organization"
            minWidth={200}
            maxMenuHeight={320}
            options={[
              { value: "", label: "Select organization…" },
              ...organizationOptions.map((o) => ({ value: o.id, label: o.name })),
            ]}
          />
        )}
        <input
          type="search"
          placeholder="Search details, label, action…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ ...inputStyle, minWidth: 180, flex: "1 1 180px", maxWidth: 280 }}
        />
        <FilterSelect
          value={entityType}
          onChange={setEntityType}
          options={ENTITY_OPTIONS.filter((o, i, arr) => arr.findIndex((x) => x.value === o.value) === i)}
          label="Entity"
        />
        <input
          type="text"
          placeholder="Action…"
          value={action}
          onChange={(e) => setAction(e.target.value)}
          style={{ ...inputStyle, width: 140 }}
        />
        <input
          type="text"
          placeholder="Actor…"
          value={actor}
          onChange={(e) => setActor(e.target.value)}
          style={{ ...inputStyle, width: 140 }}
        />
        <input type="date" value={since} onChange={(e) => setSince(e.target.value)} style={inputStyle} aria-label="From date" />
        <input type="date" value={until} onChange={(e) => setUntil(e.target.value)} style={inputStyle} aria-label="To date" />
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading || !selectedOrgId}
          style={{
            height: 34, padding: "0 12px", borderRadius: 6, border: "1px solid var(--border)",
            background: "var(--card)", fontSize: 12, cursor: loading || !selectedOrgId ? "not-allowed" : "pointer",
            display: "inline-flex", alignItems: "center", gap: 6,
          }}
        >
          {loading ? <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} /> : null}
          Refresh
        </button>
      </div>

      <div
        style={{
          ...(embedded ? {} : { padding: "clamp(10px, 2vw, 16px) clamp(12px, 3vw, 24px)" }),
          ...(fillHeight
            ? { flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }
            : {}),
        }}
      >
        {!selectedOrgId ? (
          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 }}>
            <EmptyState icon={Activity} title="Select an organization" description="Choose an organization to view its workshop activity log." />
          </div>
        ) : error ? (
          <ErrorBanner message={error} onRetry={load} />
        ) : loading && rows.length === 0 ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 40, color: "var(--muted-foreground)" }}>
            <Loader2 style={{ width: 20, height: 20, animation: "spin 1s linear infinite" }} />
          </div>
        ) : rows.length === 0 ? (
          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 }}>
            <EmptyState
              icon={Activity}
              title="No activity found"
              description={`No workshop activities for ${orgName || "this organization"} match the current filters.`}
            />
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              minHeight: 0,
              ...(fillHeight ? { flex: 1 } : {}),
            }}
          >
            <div
              style={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                minHeight: 0,
                ...(fillHeight
                  ? { flex: 1 }
                  : { maxHeight: embedded ? "min(420px, 50vh)" : "min(520px, 55vh)" }),
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
                {rows.map((r, idx) => (
                  <div
                    key={r.id}
                    style={{
                      padding: "14px 16px",
                      borderTop: idx === 0 ? "none" : "1px solid var(--border)",
                      display: "flex",
                      flexDirection: "column",
                      gap: 6,
                    }}
                  >
                    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--foreground)", lineHeight: 1.35 }}>
                          {describeActivity(r)}
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 12px", marginTop: 6, fontSize: 12, color: "var(--muted-foreground)" }}>
                          <span>{r.userName || r.userId || "Unknown actor"}</span>
                          {showOrgCol && (
                            <Link href={`/organizations/${r.organizationId}`} style={{ color: "#50B0A0", textDecoration: "none", fontWeight: 500 }}>
                              {r.organizationName}
                            </Link>
                          )}
                          {r.entityType && (
                            <span>
                              {r.entityType}
                              {r.entityLabel || r.entityId ? ` · ${r.entityLabel || r.entityId}` : ""}
                            </span>
                          )}
                          <span>{formatDateTime(r.createdAt)}</span>
                        </div>
                      </div>
                      <Badge variant={actionVariant(r.action)}>{actionLabel(r.action)}</Badge>
                    </div>
                    {r.action && (
                      <code style={{ fontSize: 11, fontFamily: "monospace", color: "#2F7D70", background: "#EFF8F6", padding: "2px 6px", borderRadius: 4, width: "fit-content" }}>
                        {r.action}
                      </code>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                marginTop: 12,
                fontSize: 12,
                color: "var(--muted-foreground)",
                flexShrink: 0,
              }}
            >
              <span>
                Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
                {orgName ? ` · ${orgName}` : ""}
              </span>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  disabled={page <= 1 || loading}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  style={{ height: 30, padding: "0 10px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--card)", cursor: page <= 1 ? "not-allowed" : "pointer", fontSize: 12 }}
                >
                  Previous
                </button>
                <span style={{ alignSelf: "center" }}>Page {page} / {totalPages}</span>
                <button
                  type="button"
                  disabled={page >= totalPages || loading}
                  onClick={() => setPage((p) => p + 1)}
                  style={{ height: 30, padding: "0 10px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--card)", cursor: page >= totalPages ? "not-allowed" : "pointer", fontSize: 12 }}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
