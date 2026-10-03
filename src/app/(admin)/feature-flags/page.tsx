"use client";

import { useEffect, useState } from "react";
import { Flag, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Topbar } from "@/components/layout/topbar";
import { EmptyState } from "@/components/shared/empty-state";
import { loadGrowthConfig, saveGrowthConfig, uid, type FeatureFlag } from "@/lib/growth-store";
import { listOrganizations } from "@/api/organizations";

export default function FeatureFlagsPage() {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [key, setKey] = useState("");
  const [label, setLabel] = useState("");
  const [orgId, setOrgId] = useState("");
  const [orgs, setOrgs] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    setFlags(loadGrowthConfig().flags);
    listOrganizations().then((list) => setOrgs(list.map((o) => ({ id: o.organization.id, name: o.organization.name })))).catch(() => {});
  }, []);

  function persist(next: FeatureFlag[]) {
    const cfg = loadGrowthConfig();
    cfg.flags = next;
    saveGrowthConfig(cfg);
    setFlags(next);
  }

  function add(e: React.FormEvent) {
    e.preventDefault();
    const k = key.trim().toUpperCase().replace(/\s+/g, "_");
    if (!k) { toast.error("Flag key required"); return; }
    persist([{ id: uid("ff"), key: k, label: label.trim() || k, enabled: true, organizationIds: orgId ? [orgId] : [] }, ...flags]);
    setKey(""); setLabel(""); setOrgId("");
    toast.success("Flag saved.");
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      <Topbar title="Feature Flags" description="Toggle functionality on or off for designated organizations" />
      <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
        <form onSubmit={add} style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
          <input placeholder="FLAG_KEY" value={key} onChange={(e) => setKey(e.target.value)} style={{ height: 36, borderRadius: 6, border: "1px solid var(--border)", padding: "0 10px" }} />
          <input placeholder="Label" value={label} onChange={(e) => setLabel(e.target.value)} style={{ height: 36, borderRadius: 6, border: "1px solid var(--border)", padding: "0 10px" }} />
          <select value={orgId} onChange={(e) => setOrgId(e.target.value)} style={{ height: 36, borderRadius: 6, border: "1px solid var(--border)", minWidth: 180 }}>
            <option value="">All organizations</option>
            {orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
          <button type="submit" style={{ height: 36, padding: "0 14px", border: "none", borderRadius: 6, background: "#50B0A0", color: "#fff", fontWeight: 600 }}>Add flag</button>
        </form>
        {flags.length === 0 ? <EmptyState icon={Flag} title="No feature flags" /> : flags.map((f) => (
          <div key={f.id} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, padding: 12, marginBottom: 8, display: "flex", justifyContent: "space-between", gap: 8 }}>
            <div>
              <div style={{ fontWeight: 600 }}>{f.label} <span style={{ fontFamily: "monospace", fontSize: 12, color: "var(--muted-foreground)" }}>{f.key}</span></div>
              <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{f.organizationIds.length ? `${f.organizationIds.length} org(s)` : "All orgs"} · {f.enabled ? "On" : "Off"}</div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" onClick={() => persist(flags.map((x) => x.id === f.id ? { ...x, enabled: !x.enabled } : x))} style={{ fontSize: 12, color: "#50B0A0", background: "none", border: "none", cursor: "pointer" }}>{f.enabled ? "Turn off" : "Turn on"}</button>
              <button type="button" onClick={() => persist(flags.filter((x) => x.id !== f.id))} aria-label="Delete"><Trash2 style={{ width: 16, height: 16, color: "#dc2626" }} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
