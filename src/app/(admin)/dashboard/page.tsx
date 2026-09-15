"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Building2, CheckCircle2, AlertTriangle, XCircle, CreditCard, Tag } from "lucide-react";
import { Topbar } from "@/components/layout/topbar";
import { StatCard } from "@/components/shared/stat-card";
import { ErrorBanner } from "@/components/shared/error-banner";
import { RefreshingBar } from "@/components/shared/loading";
import { EmptyState } from "@/components/shared/empty-state";
import { AdminTable, THead, Th, TBody, Tr, Td, TableFooter, AdminTableSkeleton } from "@/components/shared/admin-table";
import { SubscriptionStatusBadge, PaymentStatusBadge, PlanBadge } from "@/components/shared/status-badges";
import { listOrganizations } from "@/api/organizations";
import {
  getPlatformDashboard,
  listPlatformPayments,
  listPlatformAudit,
  type PlatformDashboard,
  type PlatformPaymentRow,
  type PlatformAuditRow,
} from "@/api/platform";
import { formatCurrency, formatDate, daysRemainingLabel } from "@/lib/utils";
import type { OrgListItem } from "@/types";

export default function DashboardPage() {
  const [orgs, setOrgs] = useState<OrgListItem[]>([]);
  const [dash, setDash] = useState<PlatformDashboard | null>(null);
  const [payments, setPayments] = useState<PlatformPaymentRow[]>([]);
  const [logs, setLogs] = useState<PlatformAuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  async function load(silent = false) {
    if (!silent) setLoading(true); else setRefreshing(true);
    setError(null);
    try {
      const [dashData, orgsData, paymentsRes, auditRes] = await Promise.all([
        getPlatformDashboard(),
        listOrganizations(),
        listPlatformPayments({ limit: 5 }).catch(() => ({ payments: [], total: 0 })),
        listPlatformAudit({ limit: 5 }).catch(() => ({ logs: [], total: 0 })),
      ]);
      setDash(dashData);
      setOrgs(orgsData);
      setPayments(paymentsRes.payments);
      setLogs(auditRes.logs);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { load(); }, []);

  const expiringSoon = useMemo(() => {
    const now = Date.now();
    return orgs.filter((o) => {
      const exp = o.subscription.expiresAt ? new Date(o.subscription.expiresAt).getTime() : null;
      return exp != null && exp - now > 0 && exp - now < 30 * 86400000;
    }).length;
  }, [orgs]);

  const statusBreakdown = useMemo(() => {
    const breakdown = dash?.subscriptionStatusBreakdown ?? {};
    const entries = [
      { key: "ACTIVE", label: "Active", color: "#16a34a" },
      { key: "PAST_DUE", label: "Past Due", color: "#3b82f6" },
      { key: "EXPIRED", label: "Expired", color: "#dc2626" },
      { key: "CANCELLED", label: "Cancelled", color: "#94a3b8" },
    ];
    const total = Math.max(Object.values(breakdown).reduce((s, n) => s + n, 0), 1);
    return entries.map((e) => {
      const count = breakdown[e.key] ?? 0;
      return { ...e, count, pct: Math.round((count / total) * 100) };
    });
  }, [dash]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      <RefreshingBar show={refreshing} />
      <Topbar title="Dashboard" description="Platform overview" />
      <div style={{ flex: 1, overflowY: "auto", padding: "clamp(12px, 2.5vw, 20px) clamp(12px, 3vw, 24px)", background: "var(--page-bg)" }}>
        {error && <div style={{ marginBottom: "16px" }}><ErrorBanner message={error} onRetry={load} /></div>}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "12px", marginBottom: "20px" }}>
          <StatCard label="Total Orgs" value={loading ? "—" : dash?.organizations.total ?? 0} icon={Building2} iconBg="#eff6ff" iconColor="#2563eb" loading={loading} />
          <StatCard label="Active Orgs" value={loading ? "—" : dash?.organizations.active ?? 0} sub="isActive" icon={CheckCircle2} iconBg="#f0fdf4" iconColor="#16a34a" loading={loading} />
          <StatCard label="Expiring Soon" value={loading ? "—" : expiringSoon} sub="within 30 days" icon={AlertTriangle} iconBg="#fffbeb" iconColor="#d97706" loading={loading} />
          <StatCard label="Pending Payments" value={loading ? "—" : dash?.pendingPayments ?? 0} sub="awaiting" icon={CreditCard} iconBg="#fff7ed" iconColor="#ea580c" loading={loading} />
          <StatCard label="Paid this month" value={loading ? "—" : formatCurrency(dash?.revenueMtd.amount ?? 0, dash?.revenueMtd.currency)} sub={`${dash?.revenueMtd.paidPaymentCount ?? 0} payments`} icon={CreditCard} iconBg="#f0fdf4" iconColor="#16a34a" loading={loading} />
          <StatCard label="Active Referrals" value={loading ? "—" : dash?.activeReferrals ?? 0} icon={Tag} iconBg="#eff6ff" iconColor="#2563eb" loading={loading} />
        </div>

        <div style={{ marginBottom: "20px" }}>
          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "12px", padding: "16px" }}>
            <h3 style={{ fontSize: "14px", fontWeight: 600, marginBottom: "16px", color: "var(--foreground)" }}>Subscription Overview</h3>
            <div style={{ display: "flex", gap: "8px", height: "8px", borderRadius: "4px", overflow: "hidden", marginBottom: "12px", background: "var(--secondary)" }}>
              {statusBreakdown.filter((s) => s.count > 0).map((s) => (
                <div key={s.key} style={{ width: `${Math.max(s.pct, 2)}%`, background: s.color }} title={`${s.label} (${s.count})`} />
              ))}
            </div>
            <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", fontSize: "12px", color: "var(--muted-foreground)" }}>
              {statusBreakdown.map((s) => (
                <div key={s.key} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: s.color }} />
                  {s.label} ({loading ? "—" : s.count})
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "12px", overflow: "hidden", marginBottom: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px 10px", borderBottom: "1px solid var(--border)" }}>
            <p style={{ fontSize: "13px", fontWeight: 600, color: "var(--foreground)", margin: 0 }}>Recent Organizations</p>
            <Link href="/organizations" style={{ fontSize: "12px", color: "#2563eb", textDecoration: "none", fontWeight: 500 }}>View all →</Link>
          </div>
          {loading ? <AdminTableSkeleton rows={5} cols={6} /> : orgs.length === 0 ? (
            <EmptyState icon={Building2} title="No organizations yet" />
          ) : (
            <>
              <div className="hidden md:block">
                <AdminTable>
                  <THead><tr><Th>Organization</Th><Th>Plan</Th><Th>Status</Th><Th>Expiry</Th><Th>Payment</Th><Th>Usage</Th></tr></THead>
                  <TBody>
                    {orgs.slice(0, 8).map((org) => (
                      <Tr key={org.organization.id}>
                        <Td><Link href={`/organizations/${org.organization.id}`} style={{ color: "#2563eb", textDecoration: "none", fontWeight: 500 }}>{org.organization.name}</Link></Td>
                        <Td><PlanBadge planCode={org.subscription.planCode} /></Td>
                        <Td><SubscriptionStatusBadge status={org.subscription.status} /></Td>
                        <Td muted nowrap><div>{formatDate(org.subscription.expiresAt)}</div><div style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>{daysRemainingLabel(org.subscription.daysRemaining)}</div></Td>
                        <Td><PaymentStatusBadge status={org.subscription.paymentStatus} /></Td>
                        <Td muted>{org.usage.branchesUsed}/{org.subscription.effectiveMaxBranches ?? "∞"} br · {org.usage.usersUsed}/{org.subscription.effectiveMaxUsers ?? org.subscription.limits.maxStaff ?? "∞"} users</Td>
                      </Tr>
                    ))}
                  </TBody>
                </AdminTable>
              </div>
              <div className="flex flex-col md:hidden divide-y" style={{ borderTop: "1px solid var(--border)" }}>
                {orgs.slice(0, 8).map((org) => (
                  <div key={org.organization.id} style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
                    <Link href={`/organizations/${org.organization.id}`} style={{ fontSize: 14, fontWeight: 600, color: "#2563eb", textDecoration: "none" }}>{org.organization.name}</Link>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      <PlanBadge planCode={org.subscription.planCode} />
                      <SubscriptionStatusBadge status={org.subscription.status} />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
          {!loading && orgs.length > 0 && <TableFooter showing={Math.min(orgs.length, 8)} total={orgs.length} label="organizations" />}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }} className="md:grid-cols-2 grid-cols-1">
          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "12px", overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px 10px", borderBottom: "1px solid var(--border)" }}>
              <p style={{ fontSize: "13px", fontWeight: 600, color: "var(--foreground)", margin: 0 }}>Recent Payments</p>
              <Link href="/payments" style={{ fontSize: "12px", color: "#2563eb", textDecoration: "none", fontWeight: 500 }}>View all →</Link>
            </div>
            {loading ? <AdminTableSkeleton rows={3} cols={4} /> : payments.length === 0 ? (
              <EmptyState icon={CreditCard} title="No payments yet" />
            ) : (
              <div className="overflow-x-auto">
                <AdminTable>
                  <THead><tr><Th>Organization</Th><Th>Amount</Th><Th>Status</Th><Th>Date</Th></tr></THead>
                  <TBody>
                    {payments.map((p) => (
                      <Tr key={p.id}>
                        <Td><Link href={`/organizations/${p.organizationId}`} style={{ color: "#2563eb", textDecoration: "none", fontWeight: 500 }}>{p.organizationName}</Link></Td>
                        <Td>{formatCurrency(p.amount, p.currency)}</Td>
                        <Td><PaymentStatusBadge status={p.status} /></Td>
                        <Td muted>{formatDate(p.createdAt)}</Td>
                      </Tr>
                    ))}
                  </TBody>
                </AdminTable>
              </div>
            )}
          </div>

          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "12px", overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px 10px", borderBottom: "1px solid var(--border)" }}>
              <p style={{ fontSize: "13px", fontWeight: 600, color: "var(--foreground)", margin: 0 }}>Recent Activity</p>
              <Link href="/audit" style={{ fontSize: "12px", color: "#2563eb", textDecoration: "none", fontWeight: 500 }}>View all →</Link>
            </div>
            {loading ? <AdminTableSkeleton rows={3} cols={3} /> : logs.length === 0 ? (
              <EmptyState icon={AlertTriangle} title="No activity yet" />
            ) : (
              <div className="overflow-x-auto">
                <AdminTable>
                  <THead><tr><Th>Action</Th><Th>Organization</Th><Th>Date</Th></tr></THead>
                  <TBody>
                    {logs.map((log) => (
                      <Tr key={log.id}>
                        <Td mono>{log.action}</Td>
                        <Td>
                          {log.organizationId ? (
                            <Link href={`/organizations/${log.organizationId}`} style={{ color: "#2563eb", textDecoration: "none", fontWeight: 500 }}>{log.organizationName || "—"}</Link>
                          ) : (
                            <span style={{ color: "var(--muted-foreground)" }}>{log.organizationName || "Platform"}</span>
                          )}
                        </Td>
                        <Td muted>{formatDate(log.createdAt)}</Td>
                      </Tr>
                    ))}
                  </TBody>
                </AdminTable>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
