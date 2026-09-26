"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { CreditCard, Activity, User, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Topbar } from "@/components/layout/topbar";
import { ErrorBanner } from "@/components/shared/error-banner";
import { RefreshingBar } from "@/components/shared/loading";
import { FilterSelect } from "@/components/shared/filter-bar";
import { getMe, type MeResponse } from "@/api/auth";
import {
  getPlatformSettings,
  putPlatformSettings,
  type PlatformSettingsValues,
} from "@/api/platform";
import { useAuthStore } from "@/store/auth-store";

const NAV_ITEMS = [
  { id: "session", name: "Session", icon: User },
  { id: "defaults", name: "Billing Defaults", icon: CreditCard },
  { id: "trial", name: "Trial Defaults", icon: Activity },
] as const;

type SectionId = (typeof NAV_ITEMS)[number]["id"];

function SectionCard({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden", boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}>
      <div style={{ padding: "16px 18px", borderBottom: "1px solid var(--border)" }}>
        <div style={{ fontSize: 15, fontWeight: 600 }}>{title}</div>
        {description && <div style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 2 }}>{description}</div>}
      </div>
      <div style={{ padding: 18 }}>{children}</div>
    </div>
  );
}

function FieldLabel({ children }: { children: ReactNode }) {
  return <div style={{ fontSize: 12, fontWeight: 500, color: "var(--muted-foreground)", marginBottom: 6 }}>{children}</div>;
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  height: 38,
  padding: "0 12px",
  border: "1px solid var(--border)",
  borderRadius: 8,
  background: "var(--card)",
  color: "var(--foreground)",
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
};

/** Digits-only field that won't turn `0` + `5` into `05`. */
function IntField({
  value,
  onChange,
  min,
  max,
}: {
  value: number;
  onChange: (n: number) => void;
  min: number;
  max: number;
}) {
  const [text, setText] = useState(() => String(value));
  const focusedRef = useRef(false);

  useEffect(() => {
    if (!focusedRef.current) setText(String(value));
  }, [value]);

  function commit(raw: string) {
    if (raw.trim() === "") {
      onChange(min);
      setText(String(min));
      return;
    }
    const n = Math.min(max, Math.max(min, Number.parseInt(raw, 10) || min));
    onChange(n);
    setText(String(n));
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      autoComplete="off"
      value={text}
      onFocus={(e) => {
        focusedRef.current = true;
        e.currentTarget.select();
      }}
      onBlur={() => {
        focusedRef.current = false;
        commit(text);
      }}
      onChange={(e) => {
        const digits = e.target.value.replace(/\D/g, "");
        // "05" / "005" → "5"; keep "" while clearing
        const cleaned = digits.replace(/^0+(?=\d)/, "");
        setText(cleaned);
        if (cleaned === "") return;
        const n = Math.min(max, Math.max(min, Number.parseInt(cleaned, 10)));
        onChange(n);
      }}
      style={inputStyle}
    />
  );
}

export default function SettingsPage() {
  const cachedUser = useAuthStore((s) => s.user);
  const [active, setActive] = useState<SectionId>("defaults");
  const [me, setMe] = useState<MeResponse | null>(null);
  const [settings, setSettings] = useState<PlatformSettingsValues | null>(null);
  const [meta, setMeta] = useState<{ updatedAt?: string; updatedBy?: string | null } | null>(null);
  const [draft, setDraft] = useState<PlatformSettingsValues | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load(silent = false) {
    if (!silent) setLoading(true); else setRefreshing(true);
    setError(null);
    try {
      const [meRes, settingsRes] = await Promise.all([
        getMe().catch(() => null),
        getPlatformSettings(),
      ]);
      if (meRes) setMe(meRes);
      setSettings(settingsRes.settings);
      setDraft(settingsRes.settings);
      setMeta(settingsRes.meta);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load settings");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleSave() {
    if (!draft) return;
    setSaving(true);
    try {
      const res = await putPlatformSettings(draft);
      setSettings(res.settings);
      setDraft(res.settings);
      setMeta(res.meta);
      toast.success("Settings saved.");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  const user = me?.user ?? cachedUser;
  const dirty = draft && settings
    ? JSON.stringify(draft) !== JSON.stringify(settings)
    : false;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      <RefreshingBar show={refreshing} />
      <Topbar title="Platform Settings" description="Trial and billing defaults from PlatformSettings" />
      <div style={{ flex: 1, overflowY: "auto", padding: "clamp(10px, 2vw, 16px) clamp(12px, 3vw, 24px)", background: "var(--page-bg)" }}>
        {error && <div style={{ marginBottom: 12 }}><ErrorBanner message={error} onRetry={load} /></div>}

        <div className="grid gap-4 lg:grid-cols-[minmax(200px,240px)_1fr] grid-cols-1">
          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, padding: 8, height: "fit-content" }}>
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = active === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActive(item.id)}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
                    borderRadius: 10, border: "none", background: isActive ? "#EFF8F6" : "transparent",
                    color: isActive ? "#50B0A0" : "var(--foreground)", fontSize: 13,
                    fontWeight: isActive ? 600 : 500, cursor: "pointer", textAlign: "left", marginBottom: 2,
                  }}
                >
                  <Icon style={{ width: 16, height: 16, flexShrink: 0 }} />
                  {item.name}
                </button>
              );
            })}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {(active === "defaults" || active === "trial") && (
              <SectionCard
                title={active === "trial" ? "Trial Defaults" : "Billing Defaults"}
                description="Stored in PlatformSettings (no secrets)."
              >
                {loading || !draft ? (
                  <div style={{ fontSize: 13, color: "var(--muted-foreground)" }}>Loading…</div>
                ) : (
                  <div className="grid gap-3.5 sm:grid-cols-2 grid-cols-1">
                    {active === "trial" && (
                      <div>
                        <FieldLabel>Trial days default</FieldLabel>
                        <IntField
                          value={draft.trialDaysDefault}
                          min={0}
                          max={90}
                          onChange={(n) => setDraft({ ...draft, trialDaysDefault: n })}
                        />
                      </div>
                    )}
                    {active === "defaults" && (
                      <>
                        <div>
                          <FieldLabel>Default term (months)</FieldLabel>
                          <FilterSelect
                            value={String(draft.defaultTermMonths)}
                            onChange={(v) => setDraft({ ...draft, defaultTermMonths: Number(v) })}
                            fullWidth
                            options={[
                              { value: "1", label: "Monthly (1 month)" },
                              { value: "3", label: "Quarterly (3 months)" },
                              { value: "12", label: "Yearly (12 months)" },
                              { value: "24", label: "24 months" },
                              { value: "36", label: "36 months" },
                              { value: "60", label: "60 months" },
                            ]}
                          />
                        </div>
                        <div>
                          <FieldLabel>Default GST %</FieldLabel>
                          <input
                            type="text"
                            inputMode="decimal"
                            autoComplete="off"
                            value={String(draft.defaultGstPercent)}
                            onFocus={(e) => e.currentTarget.select()}
                            onChange={(e) => {
                              const raw = e.target.value.trim().replace(/[^\d.]/g, "");
                              if (raw === "" || raw === ".") {
                                setDraft({ ...draft, defaultGstPercent: 0 });
                                return;
                              }
                              const n = Number(raw);
                              if (Number.isNaN(n)) return;
                              setDraft({
                                ...draft,
                                defaultGstPercent: Math.min(100, Math.max(0, n)),
                              });
                            }}
                            style={inputStyle}
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <FieldLabel>Default contact us URL</FieldLabel>
                          <input
                            value={draft.defaultContactUsUrl ?? ""}
                            onChange={(e) => setDraft({ ...draft, defaultContactUsUrl: e.target.value || null })}
                            style={inputStyle}
                            placeholder="https://…"
                          />
                        </div>
                        <div>
                          <FieldLabel>Default contact phone</FieldLabel>
                          <input
                            value={draft.defaultContactPhone ?? ""}
                            onChange={(e) => setDraft({ ...draft, defaultContactPhone: e.target.value || null })}
                            style={inputStyle}
                          />
                        </div>
                        <div>
                          <FieldLabel>Default upgrade URL</FieldLabel>
                          <input
                            value={draft.defaultUpgradeUrl ?? ""}
                            onChange={(e) => setDraft({ ...draft, defaultUpgradeUrl: e.target.value || null })}
                            style={inputStyle}
                            placeholder="https://…"
                          />
                        </div>
                      </>
                    )}
                    <div className="sm:col-span-2" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, paddingTop: 4 }}>
                      <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
                        {meta?.updatedAt ? `Updated ${new Date(meta.updatedAt).toLocaleString()} by ${meta.updatedBy ?? "—"}` : ""}
                      </div>
                      <button
                        type="button"
                        disabled={!dirty || saving}
                        onClick={handleSave}
                        style={{
                          height: 36, padding: "0 16px", borderRadius: 8, border: "none",
                          background: !dirty || saving ? "#A8D9D0" : "#50B0A0", color: "#fff",
                          fontSize: 13, fontWeight: 500, cursor: !dirty || saving ? "not-allowed" : "pointer",
                          display: "inline-flex", alignItems: "center", gap: 6,
                        }}
                      >
                        {saving && <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} />}
                        {saving ? "Saving…" : "Save changes"}
                      </button>
                    </div>
                  </div>
                )}
              </SectionCard>
            )}

            {active === "session" && (
              <SectionCard title="Current Session" description="From GET /api/auth/me">
                <div className="grid gap-3.5 sm:grid-cols-2 grid-cols-1">
                  <div><FieldLabel>Name</FieldLabel><div style={{ ...inputStyle, display: "flex", alignItems: "center", background: "var(--secondary)" }}>{user?.name ?? "—"}</div></div>
                  <div><FieldLabel>Email</FieldLabel><div style={{ ...inputStyle, display: "flex", alignItems: "center", background: "var(--secondary)" }}>{user?.email ?? "—"}</div></div>
                  <div><FieldLabel>Role</FieldLabel><div style={{ ...inputStyle, display: "flex", alignItems: "center", background: "var(--secondary)" }}>{user?.role ?? "—"}</div></div>
                  <div><FieldLabel>User ID</FieldLabel><div style={{ ...inputStyle, display: "flex", alignItems: "center", background: "var(--secondary)", fontFamily: "monospace", fontSize: 12 }}>{user?.id ?? "—"}</div></div>
                </div>
              </SectionCard>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
