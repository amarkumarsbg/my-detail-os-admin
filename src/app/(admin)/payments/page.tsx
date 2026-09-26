"use client";
import { Suspense, useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FileText, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Topbar } from "@/components/layout/topbar";
import { ErrorBanner } from "@/components/shared/error-banner";
import { RefreshingBar } from "@/components/shared/loading";
import { EmptyState } from "@/components/shared/empty-state";
import { FilterBar, FilterSelect } from "@/components/shared/filter-bar";
import { AdminTable, THead, Th, TBody, Tr, Td, TableFooter, AdminTableSkeleton } from "@/components/shared/admin-table";
import { PaymentStatusBadge } from "@/components/shared/status-badges";
import { listPlatformPayments, type PlatformPaymentRow } from "@/api/platform";
import { verifyPayment } from "@/api/organizations";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { usePendingPaymentsStore } from "@/store/pending-payments-store";

function normalizeStatusFilter(raw: string | null): string {
  if (!raw) return "all";
  const v = raw.trim().toUpperCase();
  if (v === "REVIEW" || v === "NEEDS_REVIEW") return "review";
  if (["PENDING", "PROCESSING", "PAID", "FAILED", "ALL"].includes(v)) {
    return v === "ALL" ? "all" : v;
  }
  if (raw === "review") return "review";
  return "all";
}

export default function PaymentsPage() {
  return (
    <Suspense
      fallback={
        <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
          <Topbar title="Payments" description="Loading…" />
          <div style={{ flex: 1, padding: "clamp(10px, 2vw, 16px) clamp(12px, 3vw, 24px)", background: "var(--page-bg)" }}>
            <AdminTableSkeleton rows={8} cols={10} />
          </div>
        </div>
      }
    >
      <PaymentsPageInner />
    </Suspense>
  );
}

function PaymentsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const refreshPendingBadge = usePendingPaymentsStore((s) => s.refresh);
  const [rows, setRows] = useState<PlatformPaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState(() =>
    normalizeStatusFilter(searchParams.get("status"))
  );
  const [filterPlan, setFilterPlan] = useState("all");
  const [search, setSearch] = useState("");
  const [verifying, setVerifying] = useState<string | null>(null); // payment id being verified

  useEffect(() => {
    setFilterStatus(normalizeStatusFilter(searchParams.get("status")));
  }, [searchParams]);

  async function load(silent = false) {
    if (!silent) setLoading(true); else setRefreshing(true);
    setError(null);
    try {
      if (filterStatus === "review") {
        const [pendingRes, processingRes] = await Promise.all([
          listPlatformPayments({ limit: 200, status: "PENDING" }),
          listPlatformPayments({ limit: 200, status: "PROCESSING" }),
        ]);
        const byId = new Map<string, PlatformPaymentRow>();
        for (const p of [...pendingRes.payments, ...processingRes.payments]) {
          byId.set(p.id, p);
        }
        setRows(
          Array.from(byId.values()).sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )
        );
      } else {
        const res = await listPlatformPayments({
          limit: 200,
          status: filterStatus !== "all" ? filterStatus : undefined,
        });
        setRows(res.payments);
      }
      void refreshPendingBadge({ silentToast: true });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [filterStatus]);

  const pending = useMemo(() => rows.filter((r) => r.status === "PENDING" || r.status === "PROCESSING"), [rows]);
  const others = useMemo(() => rows.filter((r) => r.status !== "PENDING" && r.status !== "PROCESSING"), [rows]);

  const displayed = useMemo(() => {
    let all = filterStatus === "review" ? [...pending] : [...pending, ...others];
    if (filterPlan !== "all") {
      all = all.filter(r => r.planName.toUpperCase() === filterPlan || r.planName.toLowerCase() === filterPlan.toLowerCase());
    }
    if (!search) return all;
    const q = search.toLowerCase();
    return all.filter((r) => r.organizationName.toLowerCase().includes(q) || (r.txnReference ?? "").toLowerCase().includes(q));
  }, [pending, others, search, filterPlan, filterStatus]);

  function onStatusChange(value: string) {
    setFilterStatus(value);
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") params.delete("status");
    else params.set("status", value);
    const qs = params.toString();
    router.replace(qs ? `/payments?${qs}` : "/payments");
  }

  async function handleVerify(row: PlatformPaymentRow, outcome: "PAID" | "FAILED") {
    if (verifying) return; // prevent duplicate
    setVerifying(row.id);
    try {
      await verifyPayment(row.organizationId, { paymentId: row.id, outcome });
      toast.success(`Payment marked as ${outcome}.`);
      await load(true);
      void refreshPendingBadge({ silentToast: true });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setVerifying(null);
    }
  }

  const reviewCount = pending.length;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      <RefreshingBar show={refreshing} />
      <Topbar
        title="Payments"
        description={
          filterStatus === "review"
            ? `${reviewCount} payment${reviewCount === 1 ? "" : "s"} awaiting review`
            : `${rows.length} payment records`
        }
      />
      <FilterBar searchValue={search} onSearch={setSearch} searchPlaceholder="Search org or txn ref…" onRefresh={() => load(true)} refreshing={refreshing}>
        <FilterSelect value={filterStatus} onChange={onStatusChange} options={[
          { value: "all", label: "All Statuses" },
          { value: "review", label: "Needs review" },
          { value: "PENDING", label: "Pending" },
          { value: "PROCESSING", label: "Processing" },
          { value: "PAID", label: "Paid" },
          { value: "FAILED", label: "Failed" },
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
        {loading ? <AdminTableSkeleton rows={8} cols={10} /> : displayed.length === 0 ? (
          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "12px" }}><EmptyState icon={FileText} title="No payments found" /></div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block">
              <AdminTable>
                <THead><tr><Th>Organization</Th><Th>Plan</Th><Th>Bill</Th><Th>Amount</Th><Th>Method</Th><Th>Status</Th><Th>Txn Ref</Th><Th>Created</Th><Th>Verified</Th><Th></Th></tr></THead>
                <TBody>
                  {displayed.map((r) => (
                    <Tr key={r.id}>
                      <Td><Link href={`/organizations/${r.organizationId}`} style={{ color: "#50B0A0", textDecoration: "none", fontWeight: 500 }}>{r.organizationName}</Link></Td>
                      <Td muted>{r.planName}</Td>
                      <Td mono muted>{r.billNumber ?? "—"}</Td>
                      <Td style={{ fontWeight: 500 }}>{r.amount != null ? formatCurrency(r.amount, r.currency) : "—"}</Td>
                      <Td muted>{r.method ?? "—"}</Td>
                      <Td><PaymentStatusBadge status={r.status} /></Td>
                      <Td mono muted nowrap>{r.txnReference ?? "—"}</Td>
                      <Td muted nowrap>{formatDateTime(r.createdAt)}</Td>
                      <Td muted nowrap>{r.verifiedAt ? formatDateTime(r.verifiedAt) : "—"}</Td>
                      <Td>
                        {(r.status === "PENDING" || r.status === "PROCESSING") && (
                          <div style={{ display: "flex", gap: "4px" }}>
                            <button disabled={!!verifying} onClick={() => handleVerify(r, "PAID")} style={{ display: "flex", alignItems: "center", gap: "3px", padding: "3px 8px", border: "1px solid #bbf7d0", borderRadius: "5px", background: "#f0fdf4", color: "#15803d", fontSize: "11px", fontWeight: 500, cursor: verifying ? "not-allowed" : "pointer", opacity: verifying ? 0.6 : 1 }}>{verifying === r.id ? <Loader2 style={{ width: "11px", height: "11px", animation: "spin 1s linear infinite" }} /> : <CheckCircle2 style={{ width: "11px", height: "11px" }} />} Paid</button>
                            <button disabled={!!verifying} onClick={() => handleVerify(r, "FAILED")} style={{ display: "flex", alignItems: "center", gap: "3px", padding: "3px 8px", border: "1px solid #fecaca", borderRadius: "5px", background: "#fef2f2", color: "#dc2626", fontSize: "11px", fontWeight: 500, cursor: verifying ? "not-allowed" : "pointer", opacity: verifying ? 0.6 : 1 }}>{verifying === r.id ? <Loader2 style={{ width: "11px", height: "11px", animation: "spin 1s linear infinite" }} /> : <XCircle style={{ width: "11px", height: "11px" }} />} Failed</button>
                          </div>
                        )}
                      </Td>
                    </Tr>
                  ))}
              </TBody>
            </AdminTable>
            <TableFooter showing={displayed.length} total={rows.length} label="payments" />
            </div>

            {/* Mobile cards */}
            <div className="flex flex-col gap-3 md:hidden">
              {displayed.map((r) => (
                <div key={r.id} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                    <div>
                      <Link href={`/organizations/${r.organizationId}`} style={{ fontSize: 14, fontWeight: 600, color: "#50B0A0", textDecoration: "none" }}>{r.organizationName}</Link>
                      <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{r.planName}{r.billNumber ? ` · ${r.billNumber}` : ""}</div>
                    </div>
                    <PaymentStatusBadge status={r.status} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 16px" }}>
                    {[
                      { label: "Amount", value: r.amount != null ? formatCurrency(r.amount, r.currency) : "—" },
                      { label: "Method", value: r.method ?? "—" },
                      { label: "Created", value: formatDateTime(r.createdAt) },
                      { label: "Txn Ref", value: r.txnReference ?? "—" },
                    ].map(({ label, value }) => (
                      <div key={label}>
                        <div style={{ fontSize: 10, fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>{label}</div>
                        <div style={{ fontSize: 13, color: "var(--foreground)" }}>{value}</div>
                      </div>
                    ))}
                  </div>
                  {(r.status === "PENDING" || r.status === "PROCESSING") && (
                    <div style={{ display: "flex", gap: 8 }}>
                      <button disabled={!!verifying} onClick={() => handleVerify(r, "PAID")} style={{ flex: 1, padding: "8px", border: "1px solid #bbf7d0", borderRadius: 8, background: "#f0fdf4", color: "#15803d", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>✓ Mark Paid</button>
                      <button disabled={!!verifying} onClick={() => handleVerify(r, "FAILED")} style={{ flex: 1, padding: "8px", border: "1px solid #fecaca", borderRadius: 8, background: "#fef2f2", color: "#dc2626", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>✗ Mark Failed</button>
                    </div>
                  )}
                </div>
              ))}
              <div style={{ fontSize: 12, color: "var(--muted-foreground)", textAlign: "center", paddingTop: 4 }}>Showing {displayed.length} of {rows.length} payments</div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}