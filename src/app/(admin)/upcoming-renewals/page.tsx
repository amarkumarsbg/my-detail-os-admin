"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarClock } from "lucide-react";
import { toast } from "sonner";
import { Topbar } from "@/components/layout/topbar";
import { StatCard } from "@/components/shared/stat-card";
import { ErrorBanner } from "@/components/shared/error-banner";
import { EmptyState } from "@/components/shared/empty-state";
import { FilterBar } from "@/components/shared/filter-bar";
import { ExportButtons } from "@/components/shared/export-buttons";
import { AdminTable, THead, Th, TBody, Tr, Td, TableFooter, AdminTableSkeleton } from "@/components/shared/admin-table";
import { PlanBadge, SubscriptionStatusBadge } from "@/components/shared/status-badges";
import { listOrganizations } from "@/api/organizations";
import { formatDate, daysRemainingLabel } from "@/lib/utils";
import { csvDateStamp, downloadCsv } from "@/lib/download-csv";
import { downloadXlsx } from "@/lib/download-xlsx";
import { downloadPdfTable } from "@/lib/download-pdf";
import type { OrgListItem } from "@/types";

type WindowDays = 15 | 30 | 60;

export default function UpcomingRenewalsPage() {
  const [orgs, setOrgs] = useState<OrgListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [windowDays, setWindowDays] = useState<WindowDays>(30);

  useEffect(() => {
    listOrganizations()
      .then(setOrgs)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  const inWindow = useMemo(() => {
    const q = search.toLowerCase();
    return orgs.filter((o) => {
      const d = o.subscription.daysRemaining;
      if (d == null || d < 0 || d > windowDays) return false;
      if (o.subscription.status === "CANCELLED") return false;
      if (q && !`${o.organization.name} ${o.organization.ownerEmail}`.toLowerCase().includes(q)) return false;
      return true;
    }).sort((a, b) => (a.subscription.daysRemaining ?? 99) - (b.subscription.daysRemaining ?? 99));
  }, [orgs, windowDays, search]);

  const counts = useMemo(() => ({
    15: orgs.filter((o) => { const d = o.subscription.daysRemaining; return d != null && d >= 0 && d <= 15 && o.subscription.status !== "CANCELLED"; }).length,
    30: orgs.filter((o) => { const d = o.subscription.daysRemaining; return d != null && d >= 0 && d <= 30 && o.subscription.status !== "CANCELLED"; }).length,
    60: orgs.filter((o) => { const d = o.subscription.daysRemaining; return d != null && d >= 0 && d <= 60 && o.subscription.status !== "CANCELLED"; }).length,
  }), [orgs]);

  function exportRows() {
    return {
      headers: ["Organization", "Owner", "Email", "Plan", "Status", "Expiry", "Days remaining", "Org ID"],
      rows: inWindow.map((o) => [
        o.organization.name,
        o.organization.ownerName ?? "",
        o.organization.ownerEmail ?? "",
        o.subscription.planCode,
        o.subscription.status,
        o.subscription.expiresAt ?? "",
        o.subscription.daysRemaining ?? "",
        o.organization.id,
      ]),
    };
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      <Topbar title="Upcoming Renewals" description="Orgs expiring in 15 / 30 / 60 days — pitch upgrades or send renewal quotes" />
      <div style={{ padding: "12px 24px 0", display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 }}>
        <StatCard label="≤ 15 days" value={counts[15]} icon={CalendarClock} iconBg="#fef2f2" iconColor="#dc2626" />
        <StatCard label="≤ 30 days" value={counts[30]} icon={CalendarClock} iconBg="#fffbeb" iconColor="#d97706" />
        <StatCard label="≤ 60 days" value={counts[60]} icon={CalendarClock} iconBg="#EFF8F6" iconColor="#50B0A0" />
      </div>
      <FilterBar searchValue={search} onSearch={setSearch} searchPlaceholder="Search org or owner…"
        rightSlot={
          <>
            {([15, 30, 60] as const).map((w) => (
              <button key={w} type="button" onClick={() => setWindowDays(w)}
                style={{ height: 34, padding: "0 12px", borderRadius: 6, border: "1px solid var(--border)", background: windowDays === w ? "#50B0A0" : "var(--secondary)", color: windowDays === w ? "#fff" : "var(--foreground)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                {w}d
              </button>
            ))}
            <ExportButtons
              disabled={inWindow.length === 0}
              onCsv={() => { const e = exportRows(); downloadCsv(`upcoming-renewals-${windowDays}d-${csvDateStamp()}.csv`, e.headers, e.rows); toast.success("CSV downloaded"); }}
              onXlsx={() => { const e = exportRows(); downloadXlsx(`upcoming-renewals-${windowDays}d-${csvDateStamp()}.xls`, e.headers, e.rows); toast.success("XLSX downloaded"); }}
              onPdf={() => { const e = exportRows(); downloadPdfTable({ filename: `upcoming-renewals-${windowDays}d.pdf`, title: "Upcoming Renewals", headers: e.headers, rows: e.rows }); toast.success("PDF downloaded"); }}
            />
          </>
        }
      />
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 24px" }}>
        {error && <ErrorBanner message={error} />}
        {loading ? <AdminTableSkeleton rows={8} cols={7} /> : inWindow.length === 0 ? (
          <EmptyState icon={CalendarClock} title="No upcoming renewals in this window" />
        ) : (
          <>
            <AdminTable>
              <THead><tr><Th>Organization</Th><Th>Owner</Th><Th>Plan</Th><Th>Status</Th><Th>Expiry</Th><Th>Days</Th><Th>Action</Th></tr></THead>
              <TBody>
                {inWindow.map((o) => (
                  <Tr key={o.organization.id}>
                    <Td><Link href={`/organizations/${o.organization.id}`} style={{ color: "#50B0A0", fontWeight: 500, textDecoration: "none" }}>{o.organization.name}</Link></Td>
                    <Td muted>{o.organization.ownerName ?? "—"}<div style={{ fontSize: 11 }}>{o.organization.ownerEmail}</div></Td>
                    <Td><PlanBadge planCode={o.subscription.planCode} /></Td>
                    <Td><SubscriptionStatusBadge status={o.subscription.status} /></Td>
                    <Td muted nowrap>{formatDate(o.subscription.expiresAt)}</Td>
                    <Td muted nowrap>{daysRemainingLabel(o.subscription.daysRemaining)}</Td>
                    <Td>
                      <Link href={`/organizations/${o.organization.id}`} style={{ fontSize: 12, fontWeight: 600, color: "#50B0A0" }}>Modify plan</Link>
                    </Td>
                  </Tr>
                ))}
              </TBody>
            </AdminTable>
            <TableFooter showing={inWindow.length} total={orgs.length} label="organizations" />
          </>
        )}
      </div>
    </div>
  );
}
