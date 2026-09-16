"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BarChart3, Building2, Database, Users } from "lucide-react";
import { Topbar } from "@/components/layout/topbar";
import { ErrorBanner } from "@/components/shared/error-banner";
import { RefreshingBar } from "@/components/shared/loading";
import { FilterBar } from "@/components/shared/filter-bar";
import { AdminTable, THead, Th, TBody, Tr, Td, AdminTableSkeleton } from "@/components/shared/admin-table";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { PlanBadge } from "@/components/shared/status-badges";
import { listOrganizations } from "@/api/organizations";
import type { OrgListItem } from "@/types";

function usagePct(used: number, limit: number | null | undefined): number | null {
  if (limit == null || limit <= 0) return null;
  return Math.min(100, Math.round((used / limit) * 100));
}

function statusForOrg(org: OrgListItem): { label: "Healthy" | "Warning" | "Critical"; variant: "success" | "warning" | "destructive" } {
  const branchPct = usagePct(org.usage.branchesUsed, org.subscription.effectiveMaxBranches);
  const userPct = usagePct(org.usage.usersUsed, org.subscription.effectiveMaxUsers ?? org.subscription.limits.maxStaff);
  const maxPct = Math.max(branchPct ?? 0, userPct ?? 0);
  if (maxPct >= 95) return { label: "Critical", variant: "destructive" };
  if (maxPct >= 75) return { label: "Warning", variant: "warning" };
  return { label: "Healthy", variant: "success" };
}

function barColor(pct: number) {
  if (pct > 90) return "#ef4444";
  if (pct > 75) return "#eab308";
  return "#50B0A0";
}

export default function UsagePage() {
  const [orgs, setOrgs] = useState<OrgListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load(silent = false) {
    if (!silent) setLoading(true); else setRefreshing(true);
    setError(null);
    try {
      setOrgs(await listOrganizations());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load usage");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { load(); }, []);

  const stats = useMemo(() => {
    const activeOrgs = orgs.filter((o) => o.subscription.status === "ACTIVE" || o.subscription.status === "PAST_DUE").length;
    const totalUsers = orgs.reduce((sum, o) => sum + (o.usage.usersUsed || 0), 0);
    const totalBranches = orgs.reduce((sum, o) => sum + (o.usage.branchesUsed || 0), 0);
    const nearLimit = orgs.filter((o) => {
      const s = statusForOrg(o);
      return s.label !== "Healthy";
    }).length;
    return { activeOrgs, totalUsers, totalBranches, nearLimit, totalOrgs: orgs.length };
  }, [orgs]);

  const ranked = useMemo(() => {
    return [...orgs].sort((a, b) => {
      const aPct = Math.max(
        usagePct(a.usage.branchesUsed, a.subscription.effectiveMaxBranches) ?? 0,
        usagePct(a.usage.usersUsed, a.subscription.effectiveMaxUsers ?? a.subscription.limits.maxStaff) ?? 0
      );
      const bPct = Math.max(
        usagePct(b.usage.branchesUsed, b.subscription.effectiveMaxBranches) ?? 0,
        usagePct(b.usage.usersUsed, b.subscription.effectiveMaxUsers ?? b.subscription.limits.maxStaff) ?? 0
      );
      return bPct - aPct;
    });
  }, [orgs]);

  const cards = [
    { label: "Organizations", value: stats.totalOrgs, sub: `${stats.activeOrgs} active`, icon: Database, color: "#50B0A0" },
    { label: "Billable Users", value: stats.totalUsers, sub: "across all orgs", icon: Users, color: "#16a34a" },
    { label: "Branches", value: stats.totalBranches, sub: "across all orgs", icon: Building2, color: "#7c3aed" },
    { label: "Near Limit", value: stats.nearLimit, sub: "warning or critical", icon: BarChart3, color: "#ea580c" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      <RefreshingBar show={refreshing} />
      <Topbar title="Platform Usage" description="Seat and branch utilization from live organization entitlements" />
      <FilterBar onRefresh={() => load(true)} refreshing={refreshing || loading} />
      <div style={{ flex: 1, overflowY: "auto", padding: "clamp(10px, 2vw, 16px) clamp(12px, 3vw, 24px)", background: "var(--page-bg)", display: "flex", flexDirection: "column", gap: 16 }}>
        {error && <ErrorBanner message={error} onRetry={load} />}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 14 }}>
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, padding: "16px 18px", boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontSize: 12, color: "var(--muted-foreground)", fontWeight: 500 }}>{card.label}</div>
                    <div style={{ fontSize: 24, fontWeight: 700, marginTop: 6, color: "var(--foreground)" }}>{loading ? "—" : card.value}</div>
                    <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 4 }}>{card.sub}</div>
                  </div>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--secondary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon style={{ width: 16, height: 16, color: card.color }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
          <div style={{ padding: "16px 18px", borderBottom: "1px solid var(--border)" }}>
            <div style={{ fontSize: 15, fontWeight: 600 }}>Organizations by Usage</div>
            <div style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 2 }}>Ranked by how close they are to plan limits</div>
          </div>
          <div style={{ padding: 12 }}>
            {loading ? (
              <AdminTableSkeleton rows={6} cols={5} />
            ) : ranked.length === 0 ? (
              <EmptyState icon={Building2} title="No organizations yet" />
            ) : (
              <AdminTable>
                <THead>
                  <tr>
                    <Th>Organization</Th>
                    <Th>Plan</Th>
                    <Th>Branches</Th>
                    <Th>Users</Th>
                    <Th>Status</Th>
                  </tr>
                </THead>
                <TBody>
                  {ranked.map((org) => {
                    const branchLimit = org.subscription.effectiveMaxBranches;
                    const userLimit = org.subscription.effectiveMaxUsers ?? org.subscription.limits.maxStaff;
                    const branchPct = usagePct(org.usage.branchesUsed, branchLimit);
                    const userPct = usagePct(org.usage.usersUsed, userLimit);
                    const status = statusForOrg(org);
                    return (
                      <Tr key={org.organization.id}>
                        <Td>
                          <Link href={`/organizations/${org.organization.id}`} style={{ color: "#50B0A0", textDecoration: "none", fontWeight: 500 }}>
                            {org.organization.name}
                          </Link>
                        </Td>
                        <Td><PlanBadge planCode={org.subscription.planCode} /></Td>
                        <Td>
                          <div style={{ fontSize: 13 }}>{org.usage.branchesUsed}/{branchLimit ?? "∞"}</div>
                          {branchPct != null && (
                            <div style={{ marginTop: 6, width: 90, height: 4, borderRadius: 999, background: "var(--secondary)", overflow: "hidden" }}>
                              <div style={{ width: `${branchPct}%`, height: "100%", background: barColor(branchPct) }} />
                            </div>
                          )}
                        </Td>
                        <Td>
                          <div style={{ fontSize: 13 }}>{org.usage.usersUsed}/{userLimit ?? "∞"}</div>
                          {userPct != null && (
                            <div style={{ marginTop: 6, width: 90, height: 4, borderRadius: 999, background: "var(--secondary)", overflow: "hidden" }}>
                              <div style={{ width: `${userPct}%`, height: "100%", background: barColor(userPct) }} />
                            </div>
                          )}
                        </Td>
                        <Td><Badge variant={status.variant}>{status.label}</Badge></Td>
                      </Tr>
                    );
                  })}
                </TBody>
              </AdminTable>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
