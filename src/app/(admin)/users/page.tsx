"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Users } from "lucide-react";
import { Topbar } from "@/components/layout/topbar";
import { ErrorBanner } from "@/components/shared/error-banner";
import { RefreshingBar } from "@/components/shared/loading";
import { FilterBar, FilterSelect } from "@/components/shared/filter-bar";
import { EmptyState } from "@/components/shared/empty-state";
import { AdminTable, THead, Th, TBody, Tr, Td, TableFooter, AdminTableSkeleton } from "@/components/shared/admin-table";
import { Badge } from "@/components/ui/badge";
import { listPlatformUsers, type PlatformUserRow } from "@/api/platform";
import { formatDateTime } from "@/lib/utils";

const ROLE_OPTIONS = [
  { value: "all", label: "All roles" },
  { value: "SUPER_ADMIN", label: "Super Admin" },
  { value: "ADMIN", label: "Admin" },
  { value: "BRANCH_MANAGER", label: "Branch Manager" },
  { value: "MANAGER", label: "Manager" },
  { value: "SUPERVISOR", label: "Supervisor" },
  { value: "RECEPTIONIST", label: "Receptionist" },
  { value: "MECHANIC", label: "Mechanic" },
];

export default function UsersPage() {
  const [rows, setRows] = useState<PlatformUserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("all");
  const [activeFilter, setActiveFilter] = useState<"all" | "true" | "false">("all");

  async function load(silent = false) {
    if (!silent) setLoading(true); else setRefreshing(true);
    setError(null);
    try {
      const res = await listPlatformUsers({
        search: search.trim() || undefined,
        role: role === "all" ? undefined : role,
        isActive: activeFilter === "all" ? undefined : activeFilter === "true",
        limit: 100,
      });
      setRows(res.users);
      setTotal(res.total);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load users");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    const t = setTimeout(() => load(), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, role, activeFilter]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      <RefreshingBar show={refreshing} />
      <Topbar title="Users" description="Cross-organization user directory" />
      <FilterBar
        searchValue={search}
        onSearch={setSearch}
        searchPlaceholder="Search name, email, or phone…"
        onRefresh={() => load(true)}
        refreshing={refreshing || loading}
      >
        <FilterSelect value={role} onChange={setRole} options={ROLE_OPTIONS} label="Role" />
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
          <AdminTableSkeleton rows={8} cols={6} />
        ) : rows.length === 0 ? (
          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 }}>
            <EmptyState icon={Users} title="No users found" description="Try adjusting search or filters." />
          </div>
        ) : (
          <>
            <div className="hidden md:block">
              <AdminTable>
                <THead>
                  <tr>
                    <Th>Name</Th>
                    <Th>Organization</Th>
                    <Th>Branch</Th>
                    <Th>Role</Th>
                    <Th>Status</Th>
                    <Th>Last login</Th>
                  </tr>
                </THead>
                <TBody>
                  {rows.map((u) => (
                    <Tr key={u.id}>
                      <Td>
                        <div style={{ fontWeight: 500 }}>{u.name}</div>
                        <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>{u.email}</div>
                      </Td>
                      <Td>
                        <Link href={`/organizations/${u.organizationId}`} style={{ color: "#2563eb", textDecoration: "none", fontWeight: 500 }}>
                          {u.organizationName}
                        </Link>
                      </Td>
                      <Td muted>{u.branchName}</Td>
                      <Td muted>{u.role.replaceAll("_", " ")}</Td>
                      <Td>
                        <Badge variant={u.isActive ? "success" : "muted"}>{u.isActive ? "Active" : "Inactive"}</Badge>
                      </Td>
                      <Td muted nowrap>{formatDateTime(u.lastLoginAt)}</Td>
                    </Tr>
                  ))}
                </TBody>
              </AdminTable>
              <TableFooter showing={rows.length} total={total} label="users" />
            </div>

            <div className="flex flex-col gap-3 md:hidden">
              {rows.map((u) => (
                <div key={u.id} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{u.name}</div>
                      <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{u.email}</div>
                    </div>
                    <Badge variant={u.isActive ? "success" : "muted"}>{u.isActive ? "Active" : "Inactive"}</Badge>
                  </div>
                  <Link href={`/organizations/${u.organizationId}`} style={{ fontSize: 13, color: "#2563eb", textDecoration: "none" }}>
                    {u.organizationName}
                  </Link>
                  <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
                    {u.role.replaceAll("_", " ")} · {u.branchName}
                  </div>
                </div>
              ))}
              <div style={{ fontSize: 12, color: "var(--muted-foreground)", textAlign: "center" }}>Showing {rows.length} of {total} users</div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
