"use client";
import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { RefreshCw } from "lucide-react";
import { Topbar } from "@/components/layout/topbar";
import { ErrorBanner } from "@/components/shared/error-banner";
import { EmptyState } from "@/components/shared/empty-state";
import { FilterBar, FilterSelect } from "@/components/shared/filter-bar";
import { AdminTable, THead, Th, TBody, Tr, Td, TableFooter, AdminTableSkeleton } from "@/components/shared/admin-table";
import { PaymentStatusBadge } from "@/components/shared/status-badges";
import { listPlatformRenewals, type PlatformRenewalRow } from "@/api/platform";
import { formatCurrency, formatDate, termLabel } from "@/lib/utils";

export default function RenewalsPage() {
  const [rows, setRows] = useState<PlatformRenewalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterPlan, setFilterPlan] = useState("all");

  async function load(silent = false) {
    if (!silent) setLoading(true); else setRefreshing(true);
    setError(null);
    try { const res = await listPlatformRenewals({ limit: 200 }); setRows(res.renewals); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed to load"); }
    finally { setLoading(false); setRefreshing(false); }
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    let result = rows;
    if (filterPlan !== "all") {
      result = result.filter(r => r.planName.toUpperCase() === filterPlan || r.planName.toLowerCase() === filterPlan.toLowerCase());
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((r) => r.organizationName.toLowerCase().includes(q) || r.billNumber.toLowerCase().includes(q));
    }
    return result;
  }, [rows, search, filterPlan]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      <Topbar title="Renewals" description={`${rows.length} renewal records`} />
      <FilterBar searchValue={search} onSearch={setSearch} searchPlaceholder="Search org or bill…" onRefresh={() => load(true)} refreshing={refreshing}>
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
        {loading ? <AdminTableSkeleton rows={8} cols={9} /> : filtered.length === 0 ? (
          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "12px" }}><EmptyState icon={RefreshCw} title="No renewals found" /></div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block">
              <AdminTable>
                <THead><tr><Th>Organization</Th><Th>Bill</Th><Th>Plan</Th><Th>Term</Th><Th>Prev. Expiry</Th><Th>New Expiry</Th><Th>Total</Th><Th>Payment</Th><Th>Date</Th></tr></THead>
                <TBody>
                  {filtered.map((r) => (
                    <Tr key={r.billId}>
                      <Td><Link href={`/organizations/${r.organizationId}`} style={{ color: "#2563eb", textDecoration: "none", fontWeight: 500 }}>{r.organizationName}</Link></Td>
                      <Td mono muted>{r.billNumber}</Td>
                      <Td muted>{r.planName}</Td>
                      <Td muted nowrap>{termLabel(r.termMonths)}</Td>
                      <Td muted nowrap>{formatDate(r.previousExpiry)}</Td>
                      <Td muted nowrap>{formatDate(r.newExpiry)}</Td>
                      <Td style={{ fontWeight: 500 }}>{formatCurrency(r.totalAmount, r.currency)}</Td>
                      <Td><PaymentStatusBadge status={r.paymentStatus as never} /></Td>
                      <Td muted nowrap>{formatDate(r.renewalDate)}</Td>
                    </Tr>
                  ))}
                </TBody>
              </AdminTable>
              <TableFooter showing={filtered.length} total={rows.length} label="renewals" />
            </div>
            {/* Mobile cards */}
            <div className="flex flex-col gap-3 md:hidden">
              {filtered.map((r) => (
                <div key={r.billId} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                    <div>
                      <Link href={`/organizations/${r.organizationId}`} style={{ fontSize: 14, fontWeight: 600, color: "#2563eb", textDecoration: "none" }}>{r.organizationName}</Link>
                      <div style={{ fontSize: 11, color: "var(--muted-foreground)", fontFamily: "monospace" }}>{r.billNumber}</div>
                    </div>
                    <PaymentStatusBadge status={r.paymentStatus as never} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 16px" }}>
                    {[
                      { label: "Plan", value: r.planName },
                      { label: "Term", value: termLabel(r.termMonths) },
                      { label: "Total", value: formatCurrency(r.totalAmount, r.currency) },
                      { label: "Date", value: formatDate(r.renewalDate) },
                      { label: "Prev. Expiry", value: formatDate(r.previousExpiry) },
                      { label: "New Expiry", value: formatDate(r.newExpiry) },
                    ].map(({ label, value }) => (
                      <div key={label}>
                        <div style={{ fontSize: 10, fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>{label}</div>
                        <div style={{ fontSize: 13, color: "var(--foreground)" }}>{value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <div style={{ fontSize: 12, color: "var(--muted-foreground)", textAlign: "center", paddingTop: 4 }}>Showing {filtered.length} of {rows.length} renewals</div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}