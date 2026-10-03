"use client";

import { useEffect, useState } from "react";
import { Megaphone, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Topbar } from "@/components/layout/topbar";
import { EmptyState } from "@/components/shared/empty-state";
import { loadGrowthConfig, saveGrowthConfig, uid, type MarketingBanner, type BannerAudience } from "@/lib/growth-store";

export default function BannersPage() {
  const [banners, setBanners] = useState<MarketingBanner[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState<BannerAudience>("TRIAL");
  const [ctaLabel, setCtaLabel] = useState("Upgrade");
  const [ctaUrl, setCtaUrl] = useState("");

  useEffect(() => { setBanners(loadGrowthConfig().banners); }, []);

  function persist(next: MarketingBanner[]) {
    const cfg = loadGrowthConfig();
    cfg.banners = next;
    saveGrowthConfig(cfg);
    setBanners(next);
  }

  function add(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { toast.error("Title required"); return; }
    persist([{ id: uid("bn"), title: title.trim(), body: body.trim(), audience, enabled: true, ctaLabel, ctaUrl }, ...banners]);
    setTitle(""); setBody("");
    toast.success("Banner saved. Workshop app will pick this up once the growth API is wired.");
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      <Topbar title="In-app Marketing Banners" description="Targeted upgrade banners (e.g. trial-only discounts)" />
      <div style={{ flex: 1, overflowY: "auto", padding: 24, display: "flex", flexDirection: "column", gap: 16, maxWidth: 720 }}>
        <form onSubmit={add} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, padding: 16, display: "grid", gap: 10 }}>
          <input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} style={{ height: 36, borderRadius: 6, border: "1px solid var(--border)", padding: "0 10px" }} />
          <textarea placeholder="Body" value={body} onChange={(e) => setBody(e.target.value)} rows={3} style={{ borderRadius: 6, border: "1px solid var(--border)", padding: 10 }} />
          <select value={audience} onChange={(e) => setAudience(e.target.value as BannerAudience)} style={{ height: 36, borderRadius: 6, border: "1px solid var(--border)" }}>
            <option value="TRIAL">Trial users only</option>
            <option value="ACTIVE">Active customers</option>
            <option value="ALL">All organizations</option>
          </select>
          <input placeholder="CTA label" value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)} style={{ height: 36, borderRadius: 6, border: "1px solid var(--border)", padding: "0 10px" }} />
          <input placeholder="CTA URL" value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)} style={{ height: 36, borderRadius: 6, border: "1px solid var(--border)", padding: "0 10px" }} />
          <button type="submit" style={{ height: 36, border: "none", borderRadius: 6, background: "#50B0A0", color: "#fff", fontWeight: 600 }}>Publish banner</button>
        </form>
        {banners.length === 0 ? <EmptyState icon={Megaphone} title="No banners yet" /> : banners.map((b) => (
          <div key={b.id} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, padding: 14, display: "flex", justifyContent: "space-between", gap: 12 }}>
            <div>
              <div style={{ fontWeight: 600 }}>{b.title} {b.enabled ? "" : "(off)"}</div>
              <div style={{ fontSize: 13, color: "var(--muted-foreground)" }}>{b.body}</div>
              <div style={{ fontSize: 11, marginTop: 4 }}>Audience: {b.audience}</div>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
              <button type="button" onClick={() => persist(banners.map((x) => x.id === b.id ? { ...x, enabled: !x.enabled } : x))} style={{ fontSize: 12, background: "none", border: "none", color: "#50B0A0", cursor: "pointer" }}>{b.enabled ? "Disable" : "Enable"}</button>
              <button type="button" onClick={() => persist(banners.filter((x) => x.id !== b.id))} aria-label="Delete"><Trash2 style={{ width: 16, height: 16, color: "#dc2626" }} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
