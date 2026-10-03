"use client";

import { useEffect, useState } from "react";
import { Handshake, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Topbar } from "@/components/layout/topbar";
import { EmptyState } from "@/components/shared/empty-state";
import { AdminTable, THead, Th, TBody, Tr, Td } from "@/components/shared/admin-table";
import { loadGrowthConfig, saveGrowthConfig, uid, type AffiliatePartner } from "@/lib/growth-store";

export default function AffiliatesPage() {
  const [rows, setRows] = useState<AffiliatePartner[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [commission, setCommission] = useState(10);

  useEffect(() => { setRows(loadGrowthConfig().affiliates); }, []);

  function persist(next: AffiliatePartner[]) {
    const cfg = loadGrowthConfig();
    cfg.affiliates = next;
    saveGrowthConfig(cfg);
    setRows(next);
  }

  function add(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { toast.error("Name required"); return; }
    const trackingCode = `AFF${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    persist([{
      id: uid("aff"),
      name: name.trim(),
      email: email.trim(),
      trackingCode,
      commissionPercent: commission,
      payoutNotes: "",
      createdAt: new Date().toISOString(),
    }, ...rows]);
    setName(""); setEmail("");
    toast.success(`Tracking link code ${trackingCode} created.`);
  }

  const origin = typeof window !== "undefined" ? window.location.origin.replace("admin.", "") : "https://mydetailos.com";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      <Topbar title="Affiliate Partners" description="Agency / influencer tracking codes and commission payouts" />
      <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
        <form onSubmit={add} style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
          <input placeholder="Partner name" value={name} onChange={(e) => setName(e.target.value)} style={{ height: 36, borderRadius: 6, border: "1px solid var(--border)", padding: "0 10px", minWidth: 180 }} />
          <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} style={{ height: 36, borderRadius: 6, border: "1px solid var(--border)", padding: "0 10px", minWidth: 180 }} />
          <input type="number" min={0} max={100} value={commission} onChange={(e) => setCommission(Number(e.target.value) || 0)} style={{ height: 36, width: 90, borderRadius: 6, border: "1px solid var(--border)", padding: "0 10px" }} />
          <button type="submit" style={{ height: 36, padding: "0 14px", border: "none", borderRadius: 6, background: "#50B0A0", color: "#fff", fontWeight: 600 }}>Add partner</button>
        </form>
        {rows.length === 0 ? <EmptyState icon={Handshake} title="No affiliates" /> : (
          <AdminTable>
            <THead><tr><Th>Partner</Th><Th>Code</Th><Th>Tracking URL</Th><Th>Commission</Th><Th></Th></tr></THead>
            <TBody>
              {rows.map((r) => (
                <Tr key={r.id}>
                  <Td><div style={{ fontWeight: 600 }}>{r.name}</div><div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{r.email}</div></Td>
                  <Td mono>{r.trackingCode}</Td>
                  <Td muted style={{ fontSize: 12 }}>{`${origin}/?ref=${r.trackingCode}`}</Td>
                  <Td>{r.commissionPercent}%</Td>
                  <Td>
                    <button type="button" onClick={() => persist(rows.filter((x) => x.id !== r.id))} aria-label="Remove"><Trash2 style={{ width: 16, height: 16, color: "#dc2626" }} /></button>
                  </Td>
                </Tr>
              ))}
            </TBody>
          </AdminTable>
        )}
      </div>
    </div>
  );
}
