"use client";
import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Building2 } from "lucide-react";
import { Topbar } from "@/components/layout/topbar";
import { ErrorBanner } from "@/components/shared/error-banner";
import { EmptyState } from "@/components/shared/empty-state";
import { FilterBar, FilterSelect } from "@/components/shared/filter-bar";
import { AdminTable, THead, Th, TBody, Tr, Td, TableFooter, AdminTableSkeleton } from "@/components/shared/admin-table";
import { SubscriptionStatusBadge, PaymentStatusBadge, PlanBadge } from "@/components/shared/status-badges";
import { listOrganizations } from "@/api/organizations";
import { formatDate, daysRemainingLabel } from "@/lib/utils";
import type { OrgListItem, PlanCode } from "@/types";

type FS = "all" | "active" | "trial" | "expired" | "past_due" | "expiring" | "cancelled";

export default function OrganizationsPage() {
  const [orgs, setOrgs] = useState<OrgListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterPlan, setFilterPlan] = useState<PlanCode | "all">("all");
  const [filterStatus, setFilterStatus] = useState<FS>("all");

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
    const q = search.toLowerCase().trim();
    return orgs.filter((o) => {
      if (q) {
        const hay = [
          o.organization.name,
          o.organization.id,
          o.organization.slug,
          o.organization.ownerName,
          o.organization.ownerEmail,
          o.organization.ownerPhone,
          o.organization.primaryBranchName,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (filterPlan !== "all" && o.subscription.planCode !== filterPlan) return false;
      const s = o.subscription;
      if (filterStatus === "active") return s.status === "ACTIVE";
      if (filterStatus === "trial") return s.status === "TRIAL";
      if (filterStatus === "expired") return s.status === "EXPIRED";
      if (filterStatus === "past_due") return s.status === "PAST_DUE";
      if (filterStatus === "cancelled") return s.status === "CANCELLED";
      if (filterStatus === "expiring") { const d = s.daysRemaining; return d != null && d > 0 && d <= 30; }
      return true;
    });
  }, [orgs, search, filterPlan, filterStatus]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      <Topbar title="Organizations" description={`${orgs.length} customer organizations`} />
      <FilterBar searchValue={search} onSearch={setSearch} searchPlaceholder="Search name, owner, email, phone, slug…" onRefresh={() => load(true)} refreshing={refreshing}>
        <FilterSelect value={filterPlan} onChange={(v) => setFilterPlan(v as PlanCode | "all")} options={[
          { value: "all", label: "All Plans" },
          { value: "STARTER", label: "Starter" },
          { value: "GROWTH", label: "Growth" },
          { value: "BUSINESS", label: "Business" },
          { value: "ENTERPRISE", label: "Enterprise" },
          { value: "CUSTOM", label: "Custom" },
        ]} />
        <FilterSelect value={filterStatus} onChange={(v) => setFilterStatus(v as FS)} options={[
          { value: "all", label: "All Statuses" },
          { value: "trial", label: "Trial" },
          { value: "active", label: "Active" },
          { value: "expired", label: "Expired" },
          { value: "past_due", label: "Past Due" },
          { value: "expiring", label: "Expiring Soon" },
          { value: "cancelled", label: "Cancelled" },
        ]} />
      </FilterBar>
      <div style={{ flex: 1, overflowY: "auto", padding: "clamp(10px, 2vw, 16px) clamp(12px, 3vw, 24px)", background: "var(--page-bg)" }}>
        {error && <div style={{ marginBottom: "12px" }}><ErrorBanner message={error} onRetry={load} /></div>}
        {loading ? <AdminTableSkeleton rows={8} cols={7} /> : filtered.length === 0 ? (
          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "12px" }}>
            <EmptyState icon={Building2} title="No organizations found" description={search || filterPlan !== "all" || filterStatus !== "all" ? "Try adjusting your filters." : "No organizations yet."} />
          </div>
        ) : (
          <>
            {/* ── Desktop table (md+) ── */}
            <div className="hidden md:block">
              <AdminTable>
                <THead><tr><Th>Organization</Th><Th>Owner</Th><Th>Plan</Th><Th>Status</Th><Th>Expiry</Th><Th>Payment</Th><Th>Branches</Th><Th>Users</Th><Th></Th></tr></THead>
                <TBody>
                  {filtered.map((org) => (
                    <Tr key={org.organization.id}>
                      <Td>
                        <Link href={`/organizations/${org.organization.id}`} style={{ color: "#50B0A0", textDecoration: "none", fontWeight: 500 }}>{org.organization.name}</Link>
                        <div style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>
                          {org.organization.slug ? `/${org.organization.slug}` : org.organization.id}
                        </div>
                      </Td>
                      <Td>
                        <div style={{ fontWeight: 500 }}>{org.organization.ownerName ?? "—"}</div>
                        <div style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>
                          {org.organization.ownerEmail ?? org.organization.ownerPhone ?? "—"}
                        </div>
                      </Td>
                      <Td><PlanBadge planCode={org.subscription.planCode} /></Td>
                      <Td><SubscriptionStatusBadge status={org.subscription.status} /></Td>
                      <Td muted nowrap><div>{formatDate(org.subscription.expiresAt)}</div><div style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>{daysRemainingLabel(org.subscription.daysRemaining)}</div></Td>
                      <Td><PaymentStatusBadge status={org.subscription.paymentStatus} /></Td>
                      <Td muted>{org.usage.branchesUsed} / {org.subscription.effectiveMaxBranches ?? "∞"}</Td>
                      <Td muted>{org.usage.usersUsed} / {org.subscription.limits.maxStaff ?? "∞"}</Td>
                      <Td><Link href={`/organizations/${org.organization.id}`} style={{ fontSize: "12px", fontWeight: 500, color: "#50B0A0", textDecoration: "none", padding: "4px 10px", border: "1px solid #B8E0D8", borderRadius: "5px", background: "#EFF8F6" }}>Manage</Link></Td>
                    </Tr>
                  ))}
                </TBody>
              </AdminTable>
              <TableFooter showing={filtered.length} total={orgs.length} label="organizations" />
            </div>

            {/* ── Mobile card list (< md) ── */}
            <div className="flex flex-col gap-3 md:hidden">
              {filtered.map((org) => (
                <div key={org.organization.id} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
                  {/* Header row */}
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                    <div style={{ minWidth: 0 }}>
                      <Link href={`/organizations/${org.organization.id}`} style={{ fontSize: 14, fontWeight: 600, color: "#50B0A0", textDecoration: "none", display: "block" }}>{org.organization.name}</Link>
                      <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
                        {org.organization.ownerName
                          ? `${org.organization.ownerName}${org.organization.ownerEmail ? ` · ${org.organization.ownerEmail}` : ""}`
                          : org.organization.slug
                            ? `/${org.organization.slug}`
                            : org.organization.id}
                      </span>
                    </div>
                    <Link href={`/organizations/${org.organization.id}`} style={{ fontSize: 12, fontWeight: 500, color: "#50B0A0", textDecoration: "none", padding: "5px 12px", border: "1px solid #B8E0D8", borderRadius: 6, background: "#EFF8F6", whiteSpace: "nowrap", flexShrink: 0 }}>Manage</Link>
                  </div>

                  {/* Badges row */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    <PlanBadge planCode={org.subscription.planCode} />
                    <SubscriptionStatusBadge status={org.subscription.status} />
                    <PaymentStatusBadge status={org.subscription.paymentStatus} />
                  </div>

                  {/* Info grid */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 16px" }}>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>Expiry</div>
                      <div style={{ fontSize: 13, color: "var(--foreground)" }}>{formatDate(org.subscription.expiresAt)}</div>
                      <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{daysRemainingLabel(org.subscription.daysRemaining)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>Usage</div>
                      <div style={{ fontSize: 13, color: "var(--foreground)" }}>
                        {org.usage.branchesUsed}/{org.subscription.effectiveMaxBranches ?? "∞"} branches
                        &nbsp;·&nbsp;
                        {org.usage.usersUsed}/{org.subscription.limits.maxStaff ?? "∞"} users
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              <div style={{ fontSize: 12, color: "var(--muted-foreground)", textAlign: "center", paddingTop: 4 }}>
                Showing {filtered.length} of {orgs.length} organizations
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}