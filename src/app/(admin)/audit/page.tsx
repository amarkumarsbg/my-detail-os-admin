"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ClipboardList, ChevronDown, ChevronRight } from "lucide-react";
import { Topbar } from "@/components/layout/topbar";
import { ErrorBanner } from "@/components/shared/error-banner";
import { RefreshingBar } from "@/components/shared/loading";
import { EmptyState } from "@/components/shared/empty-state";
import { FilterBar } from "@/components/shared/filter-bar";
import { AdminTable, THead, Th, TBody, Tr, Td, TableFooter, AdminTableSkeleton } from "@/components/shared/admin-table";
import { OrganizationActivityPanel } from "@/components/shared/organization-activity-panel";
import { listPlatformAudit, type PlatformAuditRow } from "@/api/platform";
import { listOrganizations } from "@/api/organizations";
import { formatDateTime } from "@/lib/utils";

type AuditTab = "platform" | "organization";

export default function AuditPage() {
  const [tab, setTab] = useState<AuditTab>("platform");

  // Platform audit state (unchanged behavior)
  const [rows, setRows] = useState<PlatformAuditRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [actionFilter, setActionFilter] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  // Org options for Organization Activity tab
  const [orgOptions, setOrgOptions] = useState<Array<{ id: string; name: string }>>([]);

  async function loadPlatform(silent = false) {
    if (!silent) setLoading(true); else setRefreshing(true);
    setError(null);
    try {
      const res = await listPlatformAudit({ limit: 200, action: actionFilter || undefined });
      setRows(res.logs);
      setTotal(res.total);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    if (tab !== "platform") return;
    const t = setTimeout(() => { void loadPlatform(); }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, actionFilter]);

  useEffect(() => {
    listOrganizations()
      .then((orgs) => setOrgOptions(orgs.map((o) => ({
        id: o.organization.id,
        name: o.organization.name,
      }))))
      .catch(() => setOrgOptions([]));
  }, []);

  const tabBtn = (id: AuditTab, label: string) => {
    const active = tab === id;
    return (
      <button
        type="button"
        onClick={() => setTab(id)}
        style={{
          height: 34,
          padding: "0 14px",
          borderRadius: 8,
          border: active ? "1px solid #50B0A0" : "1px solid var(--border)",
          background: active ? "#EFF8F6" : "var(--card)",
          color: active ? "#2F7D70" : "var(--foreground)",
          fontSize: 13,
          fontWeight: active ? 600 : 500,
          cursor: "pointer",
        }}
      >
        {label}
      </button>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      <RefreshingBar show={refreshing && tab === "platform"} />
      <Topbar
        title="Audit Logs"
        description={
          tab === "platform"
            ? `${total} platform events`
            : "Workshop operational activity by organization"
        }
      />

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          padding: "10px clamp(12px, 3vw, 24px)",
          borderBottom: "1px solid var(--border)",
          background: "var(--card)",
        }}
      >
        {tabBtn("platform", "Platform Audit")}
        {tabBtn("organization", "Organization Activity")}
      </div>

      {tab === "platform" ? (
        <>
          <FilterBar
            searchValue={actionFilter}
            onSearch={setActionFilter}
            searchPlaceholder="Filter by action…"
            onRefresh={() => loadPlatform(true)}
            refreshing={refreshing}
          />
          <div style={{ flex: 1, overflowY: "auto", padding: "clamp(10px, 2vw, 16px) clamp(12px, 3vw, 24px)", background: "var(--page-bg)" }}>
            {error && <div style={{ marginBottom: "12px" }}><ErrorBanner message={error} onRetry={loadPlatform} /></div>}
            {loading ? <AdminTableSkeleton rows={8} cols={5} /> : rows.length === 0 ? (
              <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "12px" }}>
                <EmptyState icon={ClipboardList} title="No audit events found" description="No platform audit logs match the current criteria." />
              </div>
            ) : (
              <>
                <AdminTable>
                  <THead><tr><Th width="28px"></Th><Th>Event</Th><Th>Organization</Th><Th>Actor</Th><Th>Timestamp</Th></tr></THead>
                  <TBody>
                    {rows.map((r) => (
                      <React.Fragment key={r.id}>
                        <Tr onClick={() => setExpanded((prev) => prev === r.id ? null : r.id)}>
                          <Td><span style={{ color: "var(--muted-foreground)", display: "flex" }}>{expanded === r.id ? <ChevronDown style={{ width: "14px", height: "14px" }} /> : <ChevronRight style={{ width: "14px", height: "14px" }} />}</span></Td>
                          <Td><code style={{ fontSize: "12px", fontFamily: "monospace", fontWeight: 600, color: "#2F7D70", background: "#EFF8F6", padding: "2px 6px", borderRadius: "4px" }}>{r.action}</code></Td>
                          <Td>
                            {r.organizationId ? (
                              <Link href={`/organizations/${r.organizationId}`} onClick={(e) => e.stopPropagation()} style={{ color: "#50B0A0", textDecoration: "none", fontWeight: 500 }}>
                                {r.organizationName ?? "—"}
                              </Link>
                            ) : (
                              <span style={{ color: "var(--muted-foreground)" }}>{r.organizationName ?? "Platform"}</span>
                            )}
                          </Td>
                          <Td muted>{r.actor}</Td>
                          <Td muted nowrap>{formatDateTime(r.createdAt)}</Td>
                        </Tr>
                        {expanded === r.id && (
                          <tr style={{ background: "var(--page-bg)" }}>
                            <td colSpan={5} style={{ padding: "12px 20px", borderBottom: "1px solid var(--border)" }}>
                              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", fontSize: "12px" }}>
                                <div>
                                  <p style={{ fontSize: "11px", fontWeight: 600, color: "var(--muted-foreground)", margin: "0 0 4px", textTransform: "uppercase" }}>Before</p>
                                  <pre style={{ margin: 0, padding: "8px 10px", background: "var(--card)", border: "1px solid var(--border)", borderRadius: "6px", fontSize: "11px", overflow: "auto", maxHeight: "120px", color: "var(--foreground)" }}>{r.before != null ? JSON.stringify(r.before, null, 2) : "—"}</pre>
                                </div>
                                <div>
                                  <p style={{ fontSize: "11px", fontWeight: 600, color: "var(--muted-foreground)", margin: "0 0 4px", textTransform: "uppercase" }}>After</p>
                                  <pre style={{ margin: 0, padding: "8px 10px", background: "var(--card)", border: "1px solid var(--border)", borderRadius: "6px", fontSize: "11px", overflow: "auto", maxHeight: "120px", color: "var(--foreground)" }}>{r.after != null ? JSON.stringify(r.after, null, 2) : "—"}</pre>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </TBody>
                </AdminTable>
                <TableFooter showing={rows.length} total={total} label="events" />
              </>
            )}
          </div>
        </>
      ) : (
        <div style={{ flex: 1, overflowY: "auto", background: "var(--page-bg)", display: "flex", flexDirection: "column", minHeight: 0 }}>
          <OrganizationActivityPanel organizationOptions={orgOptions} showOrganizationColumn />
        </div>
      )}
    </div>
  );
}
