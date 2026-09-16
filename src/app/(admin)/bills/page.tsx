"use client";
import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Receipt } from "lucide-react";
import { Topbar } from "@/components/layout/topbar";
import { ErrorBanner } from "@/components/shared/error-banner";
import { EmptyState } from "@/components/shared/empty-state";
import { FilterBar, FilterSelect } from "@/components/shared/filter-bar";
import { AdminTable, THead, Th, TBody, Tr, Td, TableFooter, AdminTableSkeleton } from "@/components/shared/admin-table";
import { PaymentStatusBadge } from "@/components/shared/status-badges";
import { listPlatformBills, type PlatformBillRow } from "@/api/platform";
import { formatCurrency, formatDate, termLabel } from "@/lib/utils";

export default function BillsPage() {
  const [rows, setRows] = useState<PlatformBillRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterPlan, setFilterPlan] = useState("all");

  async function load(silent = false) {
    if (!silent) setLoading(true); else setRefreshing(true);
    setError(null);
    try { const res = await listPlatformBills({ limit: 200 }); setRows(res.bills); }
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
      <Topbar title="Bills" description={`${rows.length} subscription bills`} />
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
        {loading ? <AdminTableSkeleton rows={8} cols={11} /> : filtered.length === 0 ? (
          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "12px" }}><EmptyState icon={Receipt} title="No bills found" /></div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block">
              <AdminTable>
                <THead><tr><Th>Organization</Th><Th>Bill #</Th><Th>Plan</Th><Th>Term</Th><Th>Base</Th><Th>Extras</Th><Th>Referral</Th><Th>GST</Th><Th>Total</Th><Th>Payment</Th><Th>Date</Th></tr></THead>
                <TBody>
                  {filtered.map((b) => (
                    <Tr key={b.id}>
                      <Td><Link href={`/organizations/${b.organizationId}`} style={{ color: "#50B0A0", textDecoration: "none", fontWeight: 500 }}>{b.organizationName}</Link></Td>
                      <Td mono muted>{b.billNumber}</Td>
                      <Td muted>{b.planName}</Td>
                      <Td muted nowrap>{termLabel(b.termMonths)}</Td>
                      <Td muted>{formatCurrency(b.baseAmount)}</Td>
                      <Td muted>{(b.extraBranchCost + b.extraUserCost + b.onboardingFee) > 0 ? formatCurrency(b.extraBranchCost + b.extraUserCost + b.onboardingFee) : "—"}</Td>
                      <Td><span style={{ color: b.referralDiscount > 0 ? "#16a34a" : "#94a3b8" }}>{b.referralDiscount > 0 ? `-${formatCurrency(b.referralDiscount)}` : "—"}</span></Td>
                      <Td muted>{formatCurrency(b.gstAmount)}</Td>
                      <Td style={{ fontWeight: 500 }}>{formatCurrency(b.totalAmount, b.currency)}</Td>
                      <Td><PaymentStatusBadge status={b.paymentStatus} /></Td>
                      <Td muted nowrap>{formatDate(b.createdAt)}</Td>
                    </Tr>
                  ))}
                </TBody>
              </AdminTable>
              <TableFooter showing={filtered.length} total={rows.length} label="bills" />
            </div>
            {/* Mobile cards */}
            <div className="flex flex-col gap-3 md:hidden">
              {filtered.map((b) => (
                <div key={b.id} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                    <div>
                      <Link href={`/organizations/${b.organizationId}`} style={{ fontSize: 14, fontWeight: 600, color: "#50B0A0", textDecoration: "none" }}>{b.organizationName}</Link>
                      <div style={{ fontSize: 11, color: "var(--muted-foreground)", fontFamily: "monospace" }}>{b.billNumber}</div>
                    </div>
                    <PaymentStatusBadge status={b.paymentStatus} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 16px" }}>
                    {[
                      { label: "Plan", value: b.planName },
                      { label: "Term", value: termLabel(b.termMonths) },
                      { label: "Total", value: formatCurrency(b.totalAmount, b.currency) },
                      { label: "GST", value: formatCurrency(b.gstAmount) },
                      { label: "Date", value: formatDate(b.createdAt) },
                    ].map(({ label, value }) => (
                      <div key={label}>
                        <div style={{ fontSize: 10, fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>{label}</div>
                        <div style={{ fontSize: 13, color: "var(--foreground)" }}>{value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <div style={{ fontSize: 12, color: "var(--muted-foreground)", textAlign: "center", paddingTop: 4 }}>Showing {filtered.length} of {rows.length} bills</div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}