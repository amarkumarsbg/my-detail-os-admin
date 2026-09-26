"use client";

import { useEffect, useState } from "react";
import { ClipboardList } from "lucide-react";
import { Topbar } from "@/components/layout/topbar";
import { ErrorBanner } from "@/components/shared/error-banner";
import { RefreshingBar } from "@/components/shared/loading";
import { EmptyState } from "@/components/shared/empty-state";
import { FilterBar } from "@/components/shared/filter-bar";
import { AdminTableSkeleton, TableFooter } from "@/components/shared/admin-table";
import { OrganizationActivityPanel } from "@/components/shared/organization-activity-panel";
import { PlatformAuditList } from "@/components/shared/platform-audit-list";
import { listPlatformAudit, type PlatformAuditRow } from "@/api/platform";
import { listOrganizations } from "@/api/organizations";

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
          <div
            style={{
              flex: 1,
              minHeight: 0,
              overflow: "hidden",
              padding: "clamp(10px, 2vw, 16px) clamp(12px, 3vw, 24px)",
              background: "var(--page-bg)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {error && <div style={{ marginBottom: "12px", flexShrink: 0 }}><ErrorBanner message={error} onRetry={loadPlatform} /></div>}
            {loading ? <AdminTableSkeleton rows={8} cols={5} /> : rows.length === 0 ? (
              <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "12px" }}>
                <EmptyState icon={ClipboardList} title="No audit events found" description="No platform audit logs match the current criteria." />
              </div>
            ) : (
              <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
                <PlatformAuditList
                  rows={rows}
                  showOrganization
                  fillHeight
                />
                <div style={{ flexShrink: 0, marginTop: 12 }}>
                  <TableFooter showing={rows.length} total={total} label="events" />
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        <div style={{ flex: 1, overflow: "hidden", background: "var(--page-bg)", display: "flex", flexDirection: "column", minHeight: 0 }}>
          <OrganizationActivityPanel
            organizationOptions={orgOptions}
            showOrganizationColumn
            fillHeight
          />
        </div>
      )}
    </div>
  );
}
