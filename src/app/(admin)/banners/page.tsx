"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { Megaphone, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Topbar } from "@/components/layout/topbar";
import { EmptyState } from "@/components/shared/empty-state";
import { FilterSelect } from "@/components/shared/filter-bar";
import { loadGrowthConfig, saveGrowthConfig, uid, type MarketingBanner, type BannerAudience } from "@/lib/growth-store";

const fieldStyle: CSSProperties = {
  height: 36,
  width: "100%",
  padding: "0 10px",
  border: "1px solid var(--border)",
  borderRadius: 6,
  fontSize: 13,
  color: "var(--foreground)",
  background: "var(--card)",
  outline: "none",
  boxSizing: "border-box",
};

const labelStyle: CSSProperties = {
  fontSize: 11,
  fontWeight: 500,
  color: "var(--muted-foreground)",
  marginBottom: 4,
};

const AUDIENCE_OPTIONS: { value: BannerAudience; label: string }[] = [
  { value: "TRIAL", label: "Trial users only" },
  { value: "ACTIVE", label: "Active customers" },
  { value: "ALL", label: "All organizations" },
];

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
      <div style={{ flex: 1, overflowY: "auto", padding: "clamp(10px, 2vw, 16px) clamp(12px, 3vw, 24px)", background: "var(--page-bg)" }}>
        <form
          onSubmit={add}
          style={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            padding: 16,
            display: "grid",
            gap: 12,
            maxWidth: 720,
            marginBottom: 16,
          }}
        >
          <div>
            <div style={labelStyle}>Title</div>
            <input
              placeholder="e.g. Trial ending — upgrade for 10% off"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={fieldStyle}
            />
          </div>
          <div>
            <div style={labelStyle}>Body</div>
            <textarea
              placeholder="Short message shown in the workshop app"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={3}
              style={{
                ...fieldStyle,
                height: "auto",
                padding: "8px 10px",
                resize: "vertical",
                fontFamily: "inherit",
                lineHeight: 1.45,
              }}
            />
          </div>
          <div>
            <FilterSelect
              label="Audience"
              fullWidth
              value={audience}
              onChange={(v) => setAudience(v as BannerAudience)}
              options={AUDIENCE_OPTIONS}
              aria-label="Audience"
            />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 12 }}>
            <div>
              <div style={labelStyle}>CTA label</div>
              <input
                placeholder="Upgrade"
                value={ctaLabel}
                onChange={(e) => setCtaLabel(e.target.value)}
                style={fieldStyle}
              />
            </div>
            <div>
              <div style={labelStyle}>CTA URL</div>
              <input
                placeholder="https://… or /settings"
                value={ctaUrl}
                onChange={(e) => setCtaUrl(e.target.value)}
                style={fieldStyle}
              />
            </div>
          </div>
          <button
            type="submit"
            style={{
              height: 36,
              border: "none",
              borderRadius: 6,
              background: "#50B0A0",
              color: "#fff",
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Publish banner
          </button>
        </form>

        {banners.length === 0 ? (
          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, maxWidth: 720 }}>
            <EmptyState icon={Megaphone} title="No banners yet" description="Publish your first in-app banner using the form above." />
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 720 }}>
            {banners.map((b) => (
              <div
                key={b.id}
                style={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  padding: 14,
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--foreground)" }}>
                    {b.title}
                    {!b.enabled ? (
                      <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 500, color: "var(--muted-foreground)" }}>(off)</span>
                    ) : null}
                  </div>
                  {b.body ? (
                    <div style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 4, lineHeight: 1.4 }}>{b.body}</div>
                  ) : null}
                  <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 6 }}>
                    Audience: {AUDIENCE_OPTIONS.find((o) => o.value === b.audience)?.label ?? b.audience}
                    {b.ctaLabel ? ` · CTA: ${b.ctaLabel}` : ""}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "flex-start", flexShrink: 0 }}>
                  <button
                    type="button"
                    onClick={() => persist(banners.map((x) => x.id === b.id ? { ...x, enabled: !x.enabled } : x))}
                    style={{
                      height: 30,
                      padding: "0 10px",
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 500,
                      border: "1px solid var(--border)",
                      background: "var(--card)",
                      color: "#50B0A0",
                      cursor: "pointer",
                    }}
                  >
                    {b.enabled ? "Disable" : "Enable"}
                  </button>
                  <button
                    type="button"
                    onClick={() => persist(banners.filter((x) => x.id !== b.id))}
                    aria-label="Delete"
                    style={{
                      height: 30,
                      width: 30,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: 6,
                      border: "1px solid #fecaca",
                      background: "#fef2f2",
                      cursor: "pointer",
                    }}
                  >
                    <Trash2 style={{ width: 14, height: 14, color: "#dc2626" }} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
