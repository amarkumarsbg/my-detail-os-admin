"use client";

import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { Loader2, Megaphone, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Topbar } from "@/components/layout/topbar";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorBanner } from "@/components/shared/error-banner";
import { RefreshingBar } from "@/components/shared/loading";
import { FilterSelect } from "@/components/shared/filter-bar";
import {
  createPlatformBanner,
  deletePlatformBanner,
  listPlatformBanners,
  patchPlatformBanner,
  type MarketingBannerAudience,
  type PlatformMarketingBanner,
} from "@/api/platform";
import { formatDate } from "@/lib/utils";

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

const AUDIENCE_OPTIONS: { value: MarketingBannerAudience; label: string }[] = [
  { value: "TRIAL", label: "Trial users only" },
  { value: "ACTIVE", label: "Active / paid customers" },
  { value: "ALL", label: "All organizations" },
];

export default function BannersPage() {
  const [banners, setBanners] = useState<PlatformMarketingBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState<MarketingBannerAudience>("TRIAL");
  const [ctaLabel, setCtaLabel] = useState("Upgrade");
  const [ctaUrl, setCtaUrl] = useState("");

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError(null);
    try {
      const res = await listPlatformBanners();
      setBanners(res.banners);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load banners");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Title required");
      return;
    }
    setPublishing(true);
    try {
      await createPlatformBanner({
        title: title.trim(),
        body: body.trim(),
        audience,
        ctaLabel: ctaLabel.trim() || "Upgrade",
        ctaUrl: ctaUrl.trim(),
        enabled: true,
      });
      setTitle("");
      setBody("");
      toast.success("Banner published — matching workshops will see it.");
      await load(true);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to publish");
    } finally {
      setPublishing(false);
    }
  }

  async function toggle(b: PlatformMarketingBanner) {
    setBusyId(b.id);
    try {
      await patchPlatformBanner(b.id, { enabled: !b.enabled });
      toast.success(b.enabled ? "Banner disabled." : "Banner enabled.");
      await load(true);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(b: PlatformMarketingBanner) {
    setBusyId(b.id);
    try {
      await deletePlatformBanner(b.id);
      toast.success("Banner deleted.");
      await load(true);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      <RefreshingBar show={refreshing} />
      <Topbar
        title="In-app Marketing Banners"
        description="Promo messages shown in the workshop app for trial, paid, or all orgs"
      />
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "clamp(10px, 2vw, 16px) clamp(12px, 3vw, 24px)",
          background: "var(--page-bg)",
        }}
      >
        {error && (
          <div style={{ marginBottom: 12, maxWidth: 720 }}>
            <ErrorBanner message={error} onRetry={() => void load()} />
          </div>
        )}

        <form
          onSubmit={(e) => void add(e)}
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
              onChange={(v) => setAudience(v as MarketingBannerAudience)}
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
              <div style={labelStyle}>CTA URL (optional)</div>
              <input
                placeholder="Leave blank to open upgrade dialog, or /settings"
                value={ctaUrl}
                onChange={(e) => setCtaUrl(e.target.value)}
                style={fieldStyle}
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={publishing}
            style={{
              height: 36,
              border: "none",
              borderRadius: 6,
              background: publishing ? "#A8D9D0" : "#50B0A0",
              color: "#fff",
              fontSize: 13,
              fontWeight: 500,
              cursor: publishing ? "not-allowed" : "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            }}
          >
            {publishing && <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} />}
            {publishing ? "Publishing…" : "Publish banner"}
          </button>
        </form>

        {loading ? (
          <div style={{ fontSize: 13, color: "var(--muted-foreground)", maxWidth: 720 }}>Loading banners…</div>
        ) : banners.length === 0 ? (
          <div
            style={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              maxWidth: 720,
            }}
          >
            <EmptyState
              icon={Megaphone}
              title="No banners yet"
              description="Publish a banner above. Trial orgs see TRIAL + ALL; paid orgs see ACTIVE + ALL."
            />
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
                  opacity: b.enabled ? 1 : 0.72,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--foreground)" }}>
                    {b.title}
                    {!b.enabled ? (
                      <span
                        style={{
                          marginLeft: 8,
                          fontSize: 11,
                          fontWeight: 500,
                          color: "var(--muted-foreground)",
                        }}
                      >
                        (off)
                      </span>
                    ) : null}
                  </div>
                  {b.body ? (
                    <div
                      style={{
                        fontSize: 13,
                        color: "var(--muted-foreground)",
                        marginTop: 4,
                        lineHeight: 1.4,
                      }}
                    >
                      {b.body}
                    </div>
                  ) : null}
                  <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 6 }}>
                    {AUDIENCE_OPTIONS.find((o) => o.value === b.audience)?.label ?? b.audience}
                    {b.ctaLabel ? ` · CTA: ${b.ctaLabel}` : ""}
                    {b.ctaUrl ? ` · ${b.ctaUrl}` : " · opens upgrade dialog"}
                    {" · "}
                    {formatDate(b.createdAt)}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "flex-start", flexShrink: 0 }}>
                  <button
                    type="button"
                    disabled={busyId === b.id}
                    onClick={() => void toggle(b)}
                    style={{
                      height: 30,
                      padding: "0 10px",
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 500,
                      border: "1px solid var(--border)",
                      background: "var(--card)",
                      color: "#50B0A0",
                      cursor: busyId === b.id ? "not-allowed" : "pointer",
                    }}
                  >
                    {busyId === b.id ? "…" : b.enabled ? "Disable" : "Enable"}
                  </button>
                  <button
                    type="button"
                    disabled={busyId === b.id}
                    onClick={() => void remove(b)}
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
                      cursor: busyId === b.id ? "not-allowed" : "pointer",
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
