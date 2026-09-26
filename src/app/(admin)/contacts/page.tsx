"use client";

import { useEffect, useState } from "react";
import { Mail } from "lucide-react";
import { Topbar } from "@/components/layout/topbar";
import { ErrorBanner } from "@/components/shared/error-banner";
import { RefreshingBar } from "@/components/shared/loading";
import { EmptyState } from "@/components/shared/empty-state";
import { FilterBar } from "@/components/shared/filter-bar";
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
import { listPlatformContacts, type PlatformContactMessage } from "@/api/platform";
import { formatDate } from "@/lib/utils";

export default function ContactsPage() {
  const [contacts, setContacts] = useState<PlatformContactMessage[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<PlatformContactMessage | null>(null);

  async function load(silent = false) {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError(null);
    try {
      const res = await listPlatformContacts({
        limit: 200,
        search: search.trim() || undefined,
      });
      setContacts(res.contacts);
      setTotal(res.total);
      if (selected) {
        const next = res.contacts.find((c) => c.id === selected.id) ?? null;
        setSelected(next);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load contact messages");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    const t = setTimeout(() => {
      void load();
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      <RefreshingBar show={refreshing} />
      <Topbar
        title="Contact Messages"
        description="Website contact form submissions from MY DETAIL OS marketing site"
      />

      <FilterBar onRefresh={() => load(true)} refreshing={loading || refreshing}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, email, phone, business…"
          style={{
            height: 34,
            minWidth: 260,
            padding: "0 12px",
            borderRadius: 8,
            border: "1px solid var(--border)",
            background: "var(--card)",
            color: "var(--foreground)",
            fontSize: 13,
            outline: "none",
          }}
        />
      </FilterBar>

      {error && <ErrorBanner message={error} onRetry={() => load()} />}

      <div style={{ flex: 1, minHeight: 0, display: "flex", overflow: "hidden" }}>
        <div style={{ flex: 1, minWidth: 0, overflow: "auto" }}>
          {loading ? (
            <AdminTableSkeleton rows={8} cols={5} />
          ) : contacts.length === 0 ? (
            <EmptyState
              icon={Mail}
              title="No contact messages yet"
              description="When someone submits the website contact form, their message will show up here."
            />
          ) : (
            <AdminTable>
              <THead>
                <Tr>
                  <Th>Received</Th>
                  <Th>Name</Th>
                  <Th>Business</Th>
                  <Th>Email / Phone</Th>
                  <Th>Message</Th>
                </Tr>
              </THead>
              <TBody>
                {contacts.map((row) => (
                  <Tr key={row.id} onClick={() => setSelected(row)}>
                    <Td>{formatDate(row.createdAt)}</Td>
                    <Td>
                      <div style={{ fontWeight: 600 }}>{row.name || "—"}</div>
                      {row.source ? (
                        <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
                          {row.source}
                        </div>
                      ) : null}
                    </Td>
                    <Td>{row.businessName || "—"}</Td>
                    <Td>
                      <div>{row.email || "—"}</div>
                      <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
                        {row.phone || "—"}
                      </div>
                    </Td>
                    <Td>
                      <div
                        style={{
                          maxWidth: 320,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          fontWeight: selected?.id === row.id ? 600 : 400,
                        }}
                      >
                        {row.message}
                      </div>
                    </Td>
                  </Tr>
                ))}
              </TBody>
            </AdminTable>
          )}
          {!loading && contacts.length > 0 && (
            <TableFooter showing={contacts.length} total={total} label="messages" />
          )}
        </div>

        {selected && (
          <aside
            style={{
              width: 360,
              maxWidth: "42vw",
              borderLeft: "1px solid var(--border)",
              background: "var(--card)",
              overflow: "auto",
              padding: 20,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 12,
                marginBottom: 16,
              }}
            >
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--muted-foreground)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                  Message detail
                </div>
                <h2 style={{ margin: "4px 0 0", fontSize: 18, fontWeight: 700 }}>
                  {selected.name}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                style={{
                  height: 30,
                  padding: "0 10px",
                  borderRadius: 6,
                  border: "1px solid var(--border)",
                  background: "transparent",
                  cursor: "pointer",
                  fontSize: 12,
                }}
              >
                Close
              </button>
            </div>

            <dl style={{ display: "grid", gap: 12, margin: 0 }}>
              <Detail label="Received" value={formatDate(selected.createdAt)} />
              <Detail label="Business" value={selected.businessName || "—"} />
              <Detail label="Email" value={selected.email || "—"} />
              <Detail label="Phone" value={selected.phone || "—"} />
              <Detail label="Source" value={selected.source || "—"} />
              <div>
                <dt style={{ fontSize: 11, fontWeight: 600, color: "var(--muted-foreground)", marginBottom: 6 }}>
                  Message
                </dt>
                <dd
                  style={{
                    margin: 0,
                    whiteSpace: "pre-wrap",
                    fontSize: 13,
                    lineHeight: 1.55,
                    color: "var(--foreground)",
                    background: "var(--page-bg)",
                    border: "1px solid var(--border)",
                    borderRadius: 10,
                    padding: 12,
                  }}
                >
                  {selected.message}
                </dd>
              </div>
            </dl>
          </aside>
        )}
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt style={{ fontSize: 11, fontWeight: 600, color: "var(--muted-foreground)", marginBottom: 4 }}>
        {label}
      </dt>
      <dd style={{ margin: 0, fontSize: 13, color: "var(--foreground)" }}>{value}</dd>
    </div>
  );
}
