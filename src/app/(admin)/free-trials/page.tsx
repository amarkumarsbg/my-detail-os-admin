"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Timer,
  AlertTriangle,
  CalendarPlus,
  CalendarClock,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Topbar } from "@/components/layout/topbar";
import { StatCard } from "@/components/shared/stat-card";
import { ErrorBanner } from "@/components/shared/error-banner";
import { EmptyState } from "@/components/shared/empty-state";
import { FilterBar, FilterSelect } from "@/components/shared/filter-bar";
import { ExportButtons } from "@/components/shared/export-buttons";
import {
  AdminTable,
  THead,
  Th,
  TBody,
  Tr,
  Td,
  TableFooter,
  AdminTableSkeleton,
} from "@/components/shared/admin-table";
import { PlanBadge, SubscriptionStatusBadge } from "@/components/shared/status-badges";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  convertTrial,
  listOrganizations,
  patchOrganizationSubscription,
} from "@/api/organizations";
import { formatDate, daysRemainingLabel, termLabel } from "@/lib/utils";
import { computeLeadScore } from "@/lib/lead-score";
import { csvDateStamp, downloadCsv } from "@/lib/download-csv";
import { downloadXlsx } from "@/lib/download-xlsx";
import { downloadPdfTable } from "@/lib/download-pdf";
import { listPlatformUsers } from "@/api/platform";
import type { OrgListItem, PlanCode } from "@/types";

function addDaysIso(fromIso: string | null | undefined, days: number): string {
  const base = fromIso ? new Date(fromIso) : new Date();
  const now = new Date();
  const start = base.getTime() > now.getTime() ? base : now;
  const next = new Date(start.getTime() + days * 24 * 60 * 60 * 1000);
  return next.toISOString();
}

type TabId = "active" | "expired";
type QuickFilter = "all" | "ending_soon" | "expiring_today" | "expired";

function isExpiredTrial(o: OrgListItem): boolean {
  const days = o.subscription.daysRemaining;
  return days != null && days < 0;
}

function isActiveTrial(o: OrgListItem): boolean {
  return !isExpiredTrial(o);
}

function trialVisualStatus(o: OrgListItem): "ACTIVE_TRIAL" | "ENDING_SOON" | "EXPIRED" {
  const days = o.subscription.daysRemaining;
  if (days != null && days < 0) return "EXPIRED";
  if (days != null && days <= 7) return "ENDING_SOON";
  return "ACTIVE_TRIAL";
}

function TrialVisualBadge({ org }: { org: OrgListItem }) {
  const status = trialVisualStatus(org);
  if (status === "EXPIRED") return <Badge variant="destructive">Expired</Badge>;
  if (status === "ENDING_SOON") return <Badge variant="warning">Ending Soon</Badge>;
  return <Badge variant="success">Active Trial</Badge>;
}

function inSameUtcMonth(iso: string | null | undefined, ref = new Date()): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  return d.getUTCFullYear() === ref.getUTCFullYear() && d.getUTCMonth() === ref.getUTCMonth();
}

export default function FreeTrialsPage() {
  return (
    <Suspense
      fallback={
        <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
          <Topbar title="Free Trials" description="Loading…" />
          <div style={{ flex: 1, padding: "clamp(10px, 2vw, 16px) clamp(12px, 3vw, 24px)" }}>
            <AdminTableSkeleton rows={8} cols={10} />
          </div>
        </div>
      }
    >
      <FreeTrialsPageInner />
    </Suspense>
  );
}

function FreeTrialsPageInner() {
  const searchParams = useSearchParams();
  const [orgs, setOrgs] = useState<OrgListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterPlan, setFilterPlan] = useState("all");
  const [quickFilter, setQuickFilter] = useState<QuickFilter>(() => {
    const f = searchParams.get("filter");
    if (f === "ending_soon" || f === "expiring_today" || f === "expired") return f;
    return "all";
  });
  const [tab, setTab] = useState<TabId>(() =>
    searchParams.get("filter") === "expired" ? "expired" : "active"
  );

  useEffect(() => {
    const f = searchParams.get("filter");
    if (f === "ending_soon" || f === "expiring_today" || f === "expired") {
      setQuickFilter(f);
      setTab(f === "expired" ? "expired" : "active");
    }
  }, [searchParams]);

  const [convertTarget, setConvertTarget] = useState<OrgListItem | null>(null);
  const [convertPlan, setConvertPlan] = useState<PlanCode>("STARTER");
  const [convertTerm, setConvertTerm] = useState<1 | 3 | 12 | 24 | 36 | 60>(12);
  const [converting, setConverting] = useState(false);

  const [extendTarget, setExtendTarget] = useState<OrgListItem | null>(null);
  const [extendDays, setExtendDays] = useState("7");
  const [extending, setExtending] = useState(false);
  const [lastLoginByOrg, setLastLoginByOrg] = useState<Record<string, string | null>>({});

  async function load(silent = false) {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError(null);
    try {
      const list = await listOrganizations({ subscriptionStatus: "TRIAL" });
      setOrgs(list);
      try {
        const usersRes = await listPlatformUsers({ limit: 500 });
        const map: Record<string, string | null> = {};
        for (const u of usersRes.users) {
          const prev = map[u.organizationId];
          if (!u.lastLoginAt) continue;
          if (!prev || new Date(u.lastLoginAt) > new Date(prev)) map[u.organizationId] = u.lastLoginAt;
        }
        setLastLoginByOrg(map);
      } catch {
        setLastLoginByOrg({});
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load free trials");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    load();
  }, []);

  const kpis = useMemo(() => {
    const active = orgs.filter(isActiveTrial);
    const endingSoon = active.filter((o) => {
      const d = o.subscription.daysRemaining;
      return d != null && d >= 0 && d <= 7;
    });
    const startedThisMonth = orgs.filter((o) => inSameUtcMonth(o.subscription.startsAt));
    const expiringThisMonth = orgs.filter((o) => inSameUtcMonth(o.subscription.expiresAt));
    return {
      active: active.length,
      endingSoon: endingSoon.length,
      startedThisMonth: startedThisMonth.length,
      expiringThisMonth: expiringThisMonth.length,
    };
  }, [orgs]);

  const filtered = useMemo(() => {
    let result = orgs.filter((o) => (tab === "active" ? isActiveTrial(o) : isExpiredTrial(o)));

    if (tab === "active") {
      if (quickFilter === "ending_soon") {
        result = result.filter((o) => {
          const d = o.subscription.daysRemaining;
          return d != null && d >= 0 && d <= 7;
        });
      } else if (quickFilter === "expiring_today") {
        result = result.filter((o) => o.subscription.daysRemaining === 0);
      } else if (quickFilter === "expired") {
        // switch to expired tab semantics when user picks Expired quick filter
        result = orgs.filter(isExpiredTrial);
      }
    }

    if (filterPlan !== "all") {
      result = result.filter((o) => o.subscription.planCode === filterPlan);
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((o) => {
        const org = o.organization;
        return (
          org.name.toLowerCase().includes(q) ||
          (org.slug ?? "").toLowerCase().includes(q) ||
          (org.ownerEmail ?? "").toLowerCase().includes(q) ||
          (org.ownerName ?? "").toLowerCase().includes(q)
        );
      });
    }

    return result.sort((a, b) => {
      const ad = a.subscription.daysRemaining ?? 9999;
      const bd = b.subscription.daysRemaining ?? 9999;
      return ad - bd;
    });
  }, [orgs, tab, quickFilter, filterPlan, search]);

  function openConvert(o: OrgListItem) {
    setConvertTarget(o);
    setConvertPlan(o.subscription.planCode);
    setConvertTerm(12);
  }

  function openExtend(o: OrgListItem) {
    setExtendTarget(o);
    setExtendDays("7");
  }

  function exportRows() {
    return {
      headers: [
        "Organization",
        "Slug",
        "Owner",
        "Owner Email",
        "Plan",
        "Trial Started",
        "Trial Ends",
        "Days Remaining",
        "Branches Used",
        "Users Used",
        "Lead Score",
        "Hot Lead",
        "Status",
        "Trial State",
        "Organization ID",
      ],
      rows: filtered.map((o) => {
        const lead = computeLeadScore(o, lastLoginByOrg[o.organization.id]);
        return [
        o.organization.name,
        o.organization.slug ?? "",
        o.organization.ownerName ?? "",
        o.organization.ownerEmail ?? "",
        o.subscription.planCode,
        o.subscription.startsAt ?? "",
        o.subscription.expiresAt ?? "",
        o.subscription.daysRemaining ?? "",
        o.usage.branchesUsed,
        o.usage.usersUsed,
        lead.score,
        lead.hot ? "YES" : "NO",
        o.subscription.status,
        trialVisualStatus(o),
        o.organization.id,
      ];
      }),
    };
  }

  function downloadFilteredCsv() {
    if (filtered.length === 0) {
      toast.error("No rows to download.");
      return;
    }
    const { headers, rows } = exportRows();
    downloadCsv(`free-trials-${tab}-${csvDateStamp()}.csv`, headers, rows);
    toast.success(`Downloaded CSV (${filtered.length} row${filtered.length === 1 ? "" : "s"}).`);
  }

  function downloadFilteredPdf() {
    if (filtered.length === 0) {
      toast.error("No rows to download.");
      return;
    }
    const { headers, rows } = exportRows();
    downloadPdfTable({
      filename: `free-trials-${tab}-${csvDateStamp()}.pdf`,
      title: "Free Trials",
      subtitle: `${tab === "active" ? "Active" : "Expired"} trials · ${filtered.length} row(s) · ${csvDateStamp()}`,
      headers,
      rows,
    });
    toast.success(`Downloaded PDF (${filtered.length} row${filtered.length === 1 ? "" : "s"}).`);
  }

  async function handleConvert() {
    if (!convertTarget) return;
    setConverting(true);
    try {
      await convertTrial(convertTarget.organization.id, {
        markPaid: true,
        termMonths: convertTerm,
        planCode: convertPlan,
        notes: "Converted from trial via Free Trials page",
      });
      toast.success(`${convertTarget.organization.name} converted to paid subscription.`);
      setConvertTarget(null);
      await load(true);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to convert trial");
    } finally {
      setConverting(false);
    }
  }

  async function handleExtend() {
    if (!extendTarget) return;
    const days = Number.parseInt(extendDays, 10);
    if (!Number.isFinite(days) || days < 1 || days > 90) {
      toast.error("Enter extend days between 1 and 90.");
      return;
    }
    setExtending(true);
    try {
      const nextExpiry = addDaysIso(extendTarget.subscription.expiresAt, days);
      await patchOrganizationSubscription(extendTarget.organization.id, {
        status: "TRIAL",
        expiresAt: nextExpiry,
        notes: `Trial extended by ${days} day(s) via Free Trials page`,
      });
      toast.success(
        `${extendTarget.organization.name} trial extended by ${days} day${days === 1 ? "" : "s"}.`
      );
      setExtendTarget(null);
      await load(true);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to extend trial");
    } finally {
      setExtending(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      <Topbar
        title="Free Trials"
        description="Organizations currently using the free trial period."
      />
      <FilterBar
        searchValue={search}
        onSearch={setSearch}
        searchPlaceholder="Search org, slug, or owner email…"
        onRefresh={() => load(true)}
        refreshing={refreshing}
        rightSlot={
          <ExportButtons
            disabled={loading || filtered.length === 0}
            onCsv={downloadFilteredCsv}
            onXlsx={() => {
              if (filtered.length === 0) { toast.error("No rows to download."); return; }
              const { headers, rows } = exportRows();
              downloadXlsx(`free-trials-${tab}-${csvDateStamp()}.xls`, headers, rows);
              toast.success(`Downloaded XLSX (${filtered.length} rows).`);
            }}
            onPdf={downloadFilteredPdf}
          />
        }
      >
        <FilterSelect
          value={filterPlan}
          onChange={setFilterPlan}
          options={[
            { value: "all", label: "All Plans" },
            { value: "STARTER", label: "Starter" },
            { value: "GROWTH", label: "Growth" },
            { value: "BUSINESS", label: "Business" },
            { value: "ENTERPRISE", label: "Enterprise" },
            { value: "CUSTOM", label: "Custom" },
          ]}
        />
        <FilterSelect
          value={quickFilter}
          onChange={(v) => {
            const next = v as QuickFilter;
            setQuickFilter(next);
            setTab(next === "expired" ? "expired" : "active");
          }}
          options={[
            { value: "all", label: "All" },
            { value: "ending_soon", label: "Ending Soon" },
            { value: "expiring_today", label: "Expiring Today" },
            { value: "expired", label: "Expired" },
          ]}
        />
      </FilterBar>

      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "clamp(10px, 2vw, 16px) clamp(12px, 3vw, 24px)",
          background: "var(--page-bg)",
        }}
      >
        {error && (
          <div style={{ marginBottom: 12 }}>
            <ErrorBanner message={error} onRetry={load} />
          </div>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
            gap: 12,
            marginBottom: 16,
          }}
        >
          <StatCard
            label="Total Active Trials"
            value={loading ? "—" : kpis.active}
            icon={Timer}
            iconBg="#EFF8F6"
            iconColor="#50B0A0"
            loading={loading}
          />
          <StatCard
            label="Ending Soon"
            value={loading ? "—" : kpis.endingSoon}
            sub="≤ 7 days"
            icon={AlertTriangle}
            iconBg="#fffbeb"
            iconColor="#d97706"
            loading={loading}
          />
          <StatCard
            label="Started This Month"
            value={loading ? "—" : kpis.startedThisMonth}
            icon={CalendarPlus}
            iconBg="#eff6ff"
            iconColor="#2563eb"
            loading={loading}
          />
          <StatCard
            label="Expiring This Month"
            value={loading ? "—" : kpis.expiringThisMonth}
            icon={CalendarClock}
            iconBg="#fff7ed"
            iconColor="#ea580c"
            loading={loading}
          />
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          {(
            [
              { id: "active" as const, label: "Active Trials" },
              { id: "expired" as const, label: "Expired Trials" },
            ] as const
          ).map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setTab(t.id);
                  setQuickFilter(t.id === "expired" ? "expired" : "all");
                }}
                style={{
                  padding: "8px 14px",
                  borderRadius: 8,
                  border: active ? "1px solid #50B0A0" : "1px solid var(--border)",
                  background: active ? "#EFF8F6" : "var(--card)",
                  color: active ? "#50B0A0" : "var(--foreground)",
                  fontSize: 13,
                  fontWeight: active ? 600 : 500,
                  cursor: "pointer",
                }}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {loading ? (
          <AdminTableSkeleton rows={8} cols={10} />
        ) : filtered.length === 0 ? (
          <div
            style={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: 12,
            }}
          >
            <EmptyState
              icon={Timer}
              title={tab === "active" ? "No active free trials" : "No expired trials"}
            />
          </div>
        ) : (
          <>
            <div className="hidden md:block">
              <AdminTable>
                <THead>
                  <tr>
                    <Th>Organization</Th>
                    <Th>Owner</Th>
                    <Th>Plan</Th>
                    <Th>Trial Started</Th>
                    <Th>Trial Ends</Th>
                    <Th>Days Remaining</Th>
                    <Th>Branches</Th>
                    <Th>Users</Th>
                    <Th>Lead</Th>
                    <Th>Status</Th>
                    <Th></Th>
                  </tr>
                </THead>
                <TBody>
                  {filtered.map((o) => {
                    const s = o.subscription;
                    return (
                      <Tr key={o.organization.id}>
                        <Td>
                          <Link
                            href={`/organizations/${o.organization.id}`}
                            style={{
                              color: "#50B0A0",
                              textDecoration: "none",
                              fontWeight: 500,
                            }}
                          >
                            {o.organization.name}
                          </Link>
                          {o.organization.slug && (
                            <div
                              style={{
                                fontSize: 11,
                                color: "var(--muted-foreground)",
                                marginTop: 2,
                              }}
                            >
                              /{o.organization.slug}
                            </div>
                          )}
                        </Td>
                        <Td>
                          <div style={{ fontWeight: 500 }}>
                            {o.organization.ownerName ?? "—"}
                          </div>
                          <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
                            {o.organization.ownerEmail ?? "—"}
                          </div>
                        </Td>
                        <Td>
                          <PlanBadge planCode={s.planCode} />
                        </Td>
                        <Td muted nowrap>
                          {formatDate(s.startsAt)}
                        </Td>
                        <Td muted nowrap>
                          {formatDate(s.expiresAt)}
                        </Td>
                        <Td muted nowrap>
                          {daysRemainingLabel(s.daysRemaining)}
                        </Td>
                        <Td muted>
                          {o.usage.branchesUsed}/{s.effectiveMaxBranches ?? "∞"}
                        </Td>
                        <Td muted>
                          {o.usage.usersUsed}/{s.limits.maxStaff ?? "∞"}
                        </Td>
                        <Td>
                          {(() => {
                            const lead = computeLeadScore(o, lastLoginByOrg[o.organization.id]);
                            return (
                              <div style={{ display: "flex", flexWrap: "wrap", gap: 4, alignItems: "center" }}>
                                <span style={{ fontWeight: 600, fontSize: 13 }}>{lead.score}</span>
                                {lead.hot && <Badge variant="destructive">HOT LEAD</Badge>}
                              </div>
                            );
                          })()}
                        </Td>
                        <Td>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                            <SubscriptionStatusBadge status={s.status} />
                            <TrialVisualBadge org={o} />
                          </div>
                        </Td>
                        <Td>
                          <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                            <Link
                              href={`/organizations/${o.organization.id}`}
                              style={{
                                fontSize: 12,
                                fontWeight: 500,
                                color: "#50B0A0",
                                textDecoration: "none",
                                padding: "4px 10px",
                                border: "1px solid #B8E0D8",
                                borderRadius: 5,
                                background: "#EFF8F6",
                                whiteSpace: "nowrap",
                              }}
                            >
                              Open
                            </Link>
                            <button
                              type="button"
                              onClick={() => openExtend(o)}
                              style={{
                                fontSize: 12,
                                fontWeight: 500,
                                color: "#b45309",
                                padding: "4px 10px",
                                border: "1px solid #fcd34d",
                                borderRadius: 5,
                                background: "#fffbeb",
                                cursor: "pointer",
                                whiteSpace: "nowrap",
                              }}
                            >
                              Extend Trial
                            </button>
                            <button
                              type="button"
                              onClick={() => openConvert(o)}
                              style={{
                                fontSize: 12,
                                fontWeight: 500,
                                color: "#15803d",
                                padding: "4px 10px",
                                border: "1px solid #bbf7d0",
                                borderRadius: 5,
                                background: "#f0fdf4",
                                cursor: "pointer",
                                whiteSpace: "nowrap",
                              }}
                            >
                              Convert to Paid
                            </button>
                          </div>
                        </Td>
                      </Tr>
                    );
                  })}
                </TBody>
              </AdminTable>
              <TableFooter
                showing={filtered.length}
                total={
                  tab === "active"
                    ? orgs.filter(isActiveTrial).length
                    : orgs.filter(isExpiredTrial).length
                }
                label="trials"
              />
            </div>

            <div className="flex flex-col gap-3 md:hidden">
              {filtered.map((o) => {
                const s = o.subscription;
                return (
                  <div
                    key={o.organization.id}
                    style={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: 12,
                      padding: "14px 16px",
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 8,
                        alignItems: "flex-start",
                      }}
                    >
                      <div>
                        <Link
                          href={`/organizations/${o.organization.id}`}
                          style={{
                            fontSize: 14,
                            fontWeight: 600,
                            color: "#50B0A0",
                            textDecoration: "none",
                          }}
                        >
                          {o.organization.name}
                        </Link>
                        <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>
                          {o.organization.ownerName ?? "—"}
                          {o.organization.ownerEmail ? ` · ${o.organization.ownerEmail}` : ""}
                        </div>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                        <TrialVisualBadge org={o} />
                        {computeLeadScore(o, lastLoginByOrg[o.organization.id]).hot && (
                          <Badge variant="destructive">HOT LEAD</Badge>
                        )}
                      </div>
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      <PlanBadge planCode={s.planCode} />
                      <SubscriptionStatusBadge status={s.status} />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 16px" }}>
                      {[
                        { label: "Trial Ends", value: formatDate(s.expiresAt) },
                        { label: "Days Left", value: daysRemainingLabel(s.daysRemaining) },
                        {
                          label: "Branches",
                          value: `${o.usage.branchesUsed}/${s.effectiveMaxBranches ?? "∞"}`,
                        },
                        {
                          label: "Users",
                          value: `${o.usage.usersUsed}/${s.limits.maxStaff ?? "∞"}`,
                        },
                      ].map(({ label, value }) => (
                        <div key={label}>
                          <div
                            style={{
                              fontSize: 10,
                              fontWeight: 600,
                              color: "var(--muted-foreground)",
                              textTransform: "uppercase",
                              letterSpacing: "0.05em",
                              marginBottom: 2,
                            }}
                          >
                            {label}
                          </div>
                          <div style={{ fontSize: 13 }}>{value}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <Link
                        href={`/organizations/${o.organization.id}`}
                        style={{
                          flex: 1,
                          textAlign: "center",
                          fontSize: 13,
                          fontWeight: 500,
                          color: "#50B0A0",
                          textDecoration: "none",
                          padding: "8px",
                          border: "1px solid #B8E0D8",
                          borderRadius: 8,
                          background: "#EFF8F6",
                        }}
                      >
                        Open
                      </Link>
                      <button
                        type="button"
                        onClick={() => openExtend(o)}
                        style={{
                          flex: 1,
                          fontSize: 13,
                          fontWeight: 500,
                          color: "#b45309",
                          padding: "8px",
                          border: "1px solid #fcd34d",
                          borderRadius: 8,
                          background: "#fffbeb",
                          cursor: "pointer",
                        }}
                      >
                        Extend
                      </button>
                      <button
                        type="button"
                        onClick={() => openConvert(o)}
                        style={{
                          flex: 1,
                          fontSize: 13,
                          fontWeight: 500,
                          color: "#15803d",
                          padding: "8px",
                          border: "1px solid #bbf7d0",
                          borderRadius: 8,
                          background: "#f0fdf4",
                          cursor: "pointer",
                        }}
                      >
                        Convert
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {extendTarget && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
            padding: 12,
          }}
        >
          <div
            style={{
              background: "var(--card)",
              borderRadius: 16,
              boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
              width: "100%",
              maxWidth: 440,
              overflow: "hidden",
            }}
          >
            <div style={{ padding: "24px 24px 0" }}>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Extend Trial</h2>
              <p
                style={{
                  margin: "6px 0 0",
                  fontSize: 13,
                  color: "var(--muted-foreground)",
                  lineHeight: 1.5,
                }}
              >
                Extend free trial for{" "}
                <strong style={{ color: "var(--foreground)" }}>
                  {extendTarget.organization.name}
                </strong>
                . Current end:{" "}
                <strong style={{ color: "var(--foreground)" }}>
                  {formatDate(extendTarget.subscription.expiresAt)}
                </strong>
                .
              </p>
            </div>
            <div style={{ padding: "16px 24px", display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 500,
                    color: "var(--muted-foreground)",
                    marginBottom: 6,
                  }}
                >
                  Extra days (1–90)
                </div>
                <FilterSelect
                  value={extendDays}
                  onChange={setExtendDays}
                  fullWidth
                  options={[
                    { value: "3", label: "3 days" },
                    { value: "7", label: "7 days" },
                    { value: "14", label: "14 days" },
                    { value: "30", label: "30 days" },
                  ]}
                />
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "var(--muted-foreground)",
                  background: "var(--secondary)",
                  borderRadius: 8,
                  padding: "10px 12px",
                }}
              >
                New trial end ≈{" "}
                <strong style={{ color: "var(--foreground)" }}>
                  {formatDate(
                    addDaysIso(
                      extendTarget.subscription.expiresAt,
                      Number.parseInt(extendDays, 10) || 7
                    )
                  )}
                </strong>
              </div>
            </div>
            <div
              style={{
                padding: "12px 24px 20px",
                display: "flex",
                justifyContent: "flex-end",
                gap: 8,
                borderTop: "1px solid var(--border)",
              }}
            >
              <Button variant="outline" onClick={() => setExtendTarget(null)} disabled={extending}>
                Cancel
              </Button>
              <Button onClick={handleExtend} disabled={extending}>
                {extending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Extending…
                  </>
                ) : (
                  "Confirm Extend"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {convertTarget && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
            padding: 12,
          }}
        >
          <div
            style={{
              background: "var(--card)",
              borderRadius: 16,
              boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
              width: "100%",
              maxWidth: 460,
              overflow: "hidden",
            }}
          >
            <div style={{ padding: "24px 24px 0" }}>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Convert to Paid</h2>
              <p
                style={{
                  margin: "6px 0 0",
                  fontSize: 13,
                  color: "var(--muted-foreground)",
                  lineHeight: 1.5,
                }}
              >
                Convert{" "}
                <strong style={{ color: "var(--foreground)" }}>
                  {convertTarget.organization.name}
                </strong>{" "}
                from trial to an ACTIVE subscription. Trial currently ends{" "}
                <strong style={{ color: "var(--foreground)" }}>
                  {formatDate(convertTarget.subscription.expiresAt)}
                </strong>
                .
              </p>
            </div>
            <div
              style={{
                padding: "16px 24px",
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 500,
                    color: "var(--muted-foreground)",
                    marginBottom: 6,
                  }}
                >
                  Paid plan
                </div>
                <FilterSelect
                  value={convertPlan}
                  onChange={(v) => setConvertPlan(v as PlanCode)}
                  fullWidth
                  options={[
                    { value: "STARTER", label: "Starter" },
                    { value: "GROWTH", label: "Growth" },
                    { value: "BUSINESS", label: "Business" },
                    { value: "ENTERPRISE", label: "Enterprise" },
                    { value: "CUSTOM", label: "Custom" },
                  ]}
                />
              </div>
              <div>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 500,
                    color: "var(--muted-foreground)",
                    marginBottom: 6,
                  }}
                >
                  Term
                </div>
                <FilterSelect
                  value={String(convertTerm)}
                  onChange={(v) =>
                    setConvertTerm(Number(v) as 1 | 3 | 12 | 24 | 36 | 60)
                  }
                  fullWidth
                  options={[
                    { value: "1", label: "1 month" },
                    { value: "3", label: "3 months" },
                    { value: "12", label: "1 year" },
                    { value: "24", label: "2 years" },
                    { value: "36", label: "3 years" },
                    { value: "60", label: "5 years" },
                  ]}
                />
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "var(--muted-foreground)",
                  background: "var(--secondary)",
                  borderRadius: 8,
                  padding: "10px 12px",
                }}
              >
                Result: <strong style={{ color: "var(--foreground)" }}>{convertPlan}</strong> ·{" "}
                {termLabel(convertTerm)} · status ACTIVE · marked paid (manual). New expiry
                starts from conversion date.
              </div>
            </div>
            <div
              style={{
                padding: "12px 24px 20px",
                display: "flex",
                justifyContent: "flex-end",
                gap: 8,
                borderTop: "1px solid var(--border)",
              }}
            >
              <Button
                variant="outline"
                onClick={() => setConvertTarget(null)}
                disabled={converting}
              >
                Cancel
              </Button>
              <Button onClick={handleConvert} disabled={converting}>
                {converting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Converting…
                  </>
                ) : (
                  "Confirm Convert"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
