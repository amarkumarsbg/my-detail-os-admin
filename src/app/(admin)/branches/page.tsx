"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Building2, MapPin } from "lucide-react";
import { Topbar } from "@/components/layout/topbar";
import { ErrorBanner } from "@/components/shared/error-banner";
import { RefreshingBar } from "@/components/shared/loading";
import { FilterBar, FilterSelect } from "@/components/shared/filter-bar";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { listPlatformBranches, type PlatformBranchRow } from "@/api/platform";

export default function BranchesPage() {
  const [rows, setRows] = useState<PlatformBranchRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "true" | "false">("all");

  async function load(silent = false) {
    if (!silent) setLoading(true); else setRefreshing(true);
    setError(null);
    try {
      const res = await listPlatformBranches({
        search: search.trim() || undefined,
        isActive: activeFilter === "all" ? undefined : activeFilter === "true",
        limit: 100,
      });
      setRows(res.branches);
      setTotal(res.total);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load branches");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    const t = setTimeout(() => load(), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, activeFilter]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      <RefreshingBar show={refreshing} />
      <Topbar title="Branches" description="Cross-organization branch directory" />
      <FilterBar
        searchValue={search}
        onSearch={setSearch}
        searchPlaceholder="Search name, city, or code…"
        onRefresh={() => load(true)}
        refreshing={refreshing || loading}
        rightSlot={
          <span style={{ fontSize: 12, color: "var(--muted-foreground)", whiteSpace: "nowrap" }}>
            {loading ? "—" : `${total} branches`}
          </span>
        }
      >
        <FilterSelect
          value={activeFilter}
          onChange={(v) => setActiveFilter(v as "all" | "true" | "false")}
          options={[
            { value: "all", label: "All statuses" },
            { value: "true", label: "Active" },
            { value: "false", label: "Inactive" },
          ]}
          label="Status"
        />
      </FilterBar>
      <div style={{ flex: 1, overflowY: "auto", padding: "clamp(10px, 2vw, 16px) clamp(12px, 3vw, 24px)", background: "var(--page-bg)" }}>
        {error && <div style={{ marginBottom: 12 }}><ErrorBanner message={error} onRetry={load} /></div>}
        {loading ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} style={{ height: 170, borderRadius: 14, background: "var(--card)", border: "1px solid var(--border)" }} />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 }}>
            <EmptyState icon={Building2} title="No branches found" description="Try adjusting search or filters." />
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
            {rows.map((b) => {
              const location = [b.city, b.state].filter(Boolean).join(", ") || b.address || "—";
              return (
                <div
                  key={b.id}
                  style={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 14,
                    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 15, fontWeight: 600, color: "var(--foreground)" }}>{b.name}</div>
                        {b.code && <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 2, fontFamily: "monospace" }}>{b.code}</div>}
                      </div>
                      <Badge variant={b.isActive ? "success" : "muted"}>{b.isActive ? "Active" : "Inactive"}</Badge>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--muted-foreground)" }}>
                      <Building2 style={{ width: 14, height: 14, flexShrink: 0 }} />
                      <Link href={`/organizations/${b.organizationId}`} style={{ color: "#2563eb", textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {b.organizationName}
                      </Link>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--muted-foreground)" }}>
                      <MapPin style={{ width: 14, height: 14, flexShrink: 0 }} />
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{location}</span>
                    </div>
                    {b.managerName && (
                      <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
                        Manager: {b.managerName}{b.managerPhone ? ` · ${b.managerPhone}` : ""}
                      </div>
                    )}
                  </div>
                  <div style={{ padding: "12px 18px", borderTop: "1px solid var(--border)" }}>
                    <Link href={`/organizations/${b.organizationId}`} style={{ fontSize: 12, fontWeight: 500, color: "#2563eb", textDecoration: "none" }}>
                      View organization →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
