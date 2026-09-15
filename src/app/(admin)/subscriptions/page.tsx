"use client";
import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { CreditCard } from "lucide-react";
import { Topbar } from "@/components/layout/topbar";
import { ErrorBanner } from "@/components/shared/error-banner";
import { EmptyState } from "@/components/shared/empty-state";
import { FilterBar, FilterSelect } from "@/components/shared/filter-bar";
import { AdminTable, THead, Th, TBody, Tr, Td, TableFooter, AdminTableSkeleton } from "@/components/shared/admin-table";
import { SubscriptionStatusBadge, PaymentStatusBadge, PlanBadge } from "@/components/shared/status-badges";
import { listOrganizations } from "@/api/organizations";
import { formatDate, daysRemainingLabel, termLabel } from "@/lib/utils";
import type { OrgListItem } from "@/types";

export default function SubscriptionsPage() {
  const [orgs, setOrgs] = useState<OrgListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPlan, setFilterPlan] = useState("all");

  async function load(silent = false) {
    if (!silent) setLoading(true); else setRefreshing(true);
    setError(null);
    try { setOrgs(await listOrganizations()); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed to load"); }
    finally { setLoading(false); setRefreshing(false); }
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    let result = orgs;
    if (filterStatus !== "all") result = result.filter(o => o.subscription.status === filterStatus);
    if (filterPlan !== "all") result = result.filter(o => o.subscription.planCode === filterPlan);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((o) => o.organization.name.toLowerCase().includes(q));
    }
    return result;
  }, [orgs, search, filterStatus, filterPlan]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      <Topbar title="Subscriptions" description="All organization subscriptions" />
      <FilterBar searchValue={search} onSearch={setSearch} searchPlaceholder="Search organizations…" onRefresh={() => load(true)} refreshing={refreshing}>
        <FilterSelect value={filterStatus} onChange={setFilterStatus} options={[
          { value: "all", label: "All Statuses" },
          { value: "TRIAL", label: "Trial" },
          { value: "ACTIVE", label: "Active" },
          { value: "PAST_DUE", label: "Past Due" },
          { value: "EXPIRED", label: "Expired" },
          { value: "CANCELLED", label: "Cancelled" },
        ]} />
        <FilterSelect value={filterPlan} onChange={setFilterPlan} options={[
          { value: "all", label: "All Plans" },
          { value: "STARTER", label: "Starter" },
          { value: "GROWTH", label: "Growth" },
          { value: "BUSINESS", label: "Business" },
          { value: "ENTERPRISE", label: "Enterprise" },
          { value: "CUSTOM", label: "Custom" },
        ]} />
      </FilterBar>
      <div style={{ flex: 1, overflowY: "auto", padding: "clamp(10px, 2vw, 16px) clamp(12px, 3vw, 24px)", background: "var(--page-bg)" }}>
        {error && <div style={{ marginBottom: "12px" }}><ErrorBanner message={error} onRetry={load} /></div>}
        {loading ? <AdminTableSkeleton rows={8} cols={10} /> : filtered.length === 0 ? (
          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "12px" }}><EmptyState icon={CreditCard} title="No subscriptions found" /></div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block">
              <AdminTable>
                <THead><tr><Th>Organization</Th><Th>Plan</Th><Th>Term</Th><Th>Status</Th><Th>Start</Th><Th>Expiry</Th><Th>Days Left</Th><Th>Payment</Th><Th>Branches</Th><Th>Users</Th><Th></Th></tr></THead>
                <TBody>
                  {filtered.map((o) => { const s = o.subscription; return (
                    <Tr key={o.organization.id}>
                      <Td><Link href={`/organizations/${o.organization.id}`} style={{ color: "#2563eb", textDecoration: "none", fontWeight: 500 }}>{o.organization.name}</Link></Td>
                      <Td><PlanBadge planCode={s.planCode} /></Td>
                      <Td muted nowrap>{termLabel(s.termMonths)}</Td>
                      <Td><SubscriptionStatusBadge status={s.status} /></Td>
                      <Td muted nowrap>{formatDate(s.startsAt)}</Td>
                      <Td muted nowrap>{formatDate(s.expiresAt)}</Td>
                      <Td muted nowrap>{daysRemainingLabel(s.daysRemaining)}</Td>
                      <Td><PaymentStatusBadge status={s.paymentStatus} /></Td>
                      <Td muted>{o.usage.branchesUsed}/{s.effectiveMaxBranches ?? "∞"}</Td>
                      <Td muted>{o.usage.usersUsed}/{s.limits.maxStaff ?? "∞"}</Td>
                      <Td><Link href={`/organizations/${o.organization.id}`} style={{ fontSize: "12px", fontWeight: 500, color: "#2563eb", textDecoration: "none", padding: "4px 10px", border: "1px solid #bfdbfe", borderRadius: "5px", background: "#eff6ff" }}>Manage</Link></Td>
                    </Tr>
                  ); })}
                </TBody>
              </AdminTable>
              <TableFooter showing={filtered.length} total={orgs.length} label="subscriptions" />
            </div>

            {/* Mobile cards */}
            <div className="flex flex-col gap-3 md:hidden">
              {filtered.map((o) => { const s = o.subscription; return (
                <div key={o.organization.id} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                    <Link href={`/organizations/${o.organization.id}`} style={{ fontSize: 14, fontWeight: 600, color: "#2563eb", textDecoration: "none" }}>{o.organization.name}</Link>
                    <Link href={`/organizations/${o.organization.id}`} style={{ fontSize: 12, fontWeight: 500, color: "#2563eb", textDecoration: "none", padding: "5px 12px", border: "1px solid #bfdbfe", borderRadius: 6, background: "#eff6ff", whiteSpace: "nowrap", flexShrink: 0 }}>Manage</Link>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    <PlanBadge planCode={s.planCode} />
                    <SubscriptionStatusBadge status={s.status} />
                    <PaymentStatusBadge status={s.paymentStatus} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 16px" }}>
                    {[
                      { label: "Term", value: termLabel(s.termMonths) },
                      { label: "Days Left", value: daysRemainingLabel(s.daysRemaining) },
                      { label: "Start", value: formatDate(s.startsAt) },
                      { label: "Expiry", value: formatDate(s.expiresAt) },
                      { label: "Branches", value: `${o.usage.branchesUsed} / ${s.effectiveMaxBranches ?? "∞"}` },
                      { label: "Users", value: `${o.usage.usersUsed} / ${s.limits.maxStaff ?? "∞"}` },
                    ].map(({ label, value }) => (
                      <div key={label}>
                        <div style={{ fontSize: 10, fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>{label}</div>
                        <div style={{ fontSize: 13, color: "var(--foreground)" }}>{value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ); })}
              <div style={{ fontSize: 12, color: "var(--muted-foreground)", textAlign: "center", paddingTop: 4 }}>
                Showing {filtered.length} of {orgs.length} subscriptions
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}