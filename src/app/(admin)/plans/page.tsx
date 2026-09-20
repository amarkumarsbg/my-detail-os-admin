"use client";

import { useEffect, useState } from "react";
import { Info, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Topbar } from "@/components/layout/topbar";
import { ErrorBanner } from "@/components/shared/error-banner";
import { RefreshingBar } from "@/components/shared/loading";
import { FilterBar } from "@/components/shared/filter-bar";
import { AdminTable, THead, Th, TBody, Tr, Td } from "@/components/shared/admin-table";
import { Badge } from "@/components/ui/badge";
import {
  getPlatformPlans,
  putPlatformPlans,
  createPlatformPlan,
  deletePlatformPlan,
  type PlatformPlanTemplate,
  type PlatformPlanOverride,
  type PlatformPlansPricing,
  type PlanTermMonths,
} from "@/api/platform";
import { formatCurrency } from "@/lib/utils";

const ALL_TERMS: PlanTermMonths[] = [1, 3, 12, 24, 36, 60];

const TERM_LABELS: Record<string, string> = {
  "1": "Monthly (1 month)",
  "3": "Quarterly (3 months)",
  "12": "Yearly (12 months)",
  "24": "24 months",
  "36": "36 months",
  "60": "60 months",
};

const TERM_SHORT: Record<PlanTermMonths, string> = {
  1: "Monthly",
  3: "Quarterly",
  12: "Yearly",
  24: "24 mo",
  36: "36 mo",
  60: "60 mo",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  height: 34,
  padding: "0 10px",
  border: "1px solid var(--border)",
  borderRadius: 6,
  fontSize: 13,
  boxSizing: "border-box",
  background: "var(--card)",
  color: "var(--foreground)",
};

function limitInput(value: number | null | undefined): string {
  return value == null ? "" : String(value);
}

function parseLimit(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : null;
}

function numOr(raw: string, fallback: number): number {
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

function normalizeCodePreview(raw: string): string {
  return raw.trim().toUpperCase().replace(/[\s-]+/g, "_");
}

function normalizeAllowedTerms(raw: unknown): PlanTermMonths[] {
  if (!Array.isArray(raw) || raw.length === 0) return [...ALL_TERMS];
  const out: PlanTermMonths[] = [];
  for (const v of raw) {
    const n = Number(v) as PlanTermMonths;
    if (ALL_TERMS.includes(n) && !out.includes(n)) out.push(n);
  }
  return out.length ? out.sort((a, b) => a - b) : [...ALL_TERMS];
}

function termPriceKey(m: PlanTermMonths): string {
  return String(m);
}

type PlanDraft = {
  planName: string;
  maxBranches: string;
  maxStaff: string;
  publicVisible: boolean;
  multiplier: string;
  allowedTerms: PlanTermMonths[];
};

type PricingDraft = {
  currency: string;
  gstPercent: string;
  termBasePrices: Record<string, string>;
  addOns: {
    extraBranchPrice: string;
    extraUserPrice: string;
    onboardingFee: string;
    referralDiscount: string;
  };
};

type CreateDraft = {
  planCode: string;
  planName: string;
  maxBranches: string;
  maxStaff: string;
  multiplier: string;
  publicVisible: boolean;
  allowedTerms: PlanTermMonths[];
};

const emptyCreate = (): CreateDraft => ({
  planCode: "",
  planName: "",
  maxBranches: "1",
  maxStaff: "3",
  multiplier: "1",
  publicVisible: true,
  allowedTerms: [...ALL_TERMS],
});

function TermCheckboxes({
  value,
  onChange,
}: {
  value?: PlanTermMonths[] | null;
  onChange: (next: PlanTermMonths[]) => void;
}) {
  const selected = normalizeAllowedTerms(value);
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {ALL_TERMS.map((m) => {
        const checked = selected.includes(m);
        return (
          <label
            key={m}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              fontSize: 11,
              padding: "3px 8px",
              borderRadius: 6,
              border: `1px solid ${checked ? "#B8E0D8" : "var(--border)"}`,
              background: checked ? "#EFF8F6" : "transparent",
              color: checked ? "#3D8F82" : "var(--muted-foreground)",
              cursor: "pointer",
              userSelect: "none",
            }}
          >
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => {
                if (e.target.checked) {
                  onChange([...selected, m].sort((a, b) => a - b));
                } else {
                  const next = selected.filter((t) => t !== m);
                  if (next.length === 0) {
                    toast.error("Select at least one billing term.");
                    return;
                  }
                  onChange(next);
                }
              }}
              style={{ margin: 0 }}
            />
            {TERM_SHORT[m]}
          </label>
        );
      })}
    </div>
  );
}

export default function PlansPage() {
  const [plans, setPlans] = useState<PlatformPlanTemplate[]>([]);
  const [pricing, setPricing] = useState<PlatformPlansPricing | null>(null);
  const [planDraft, setPlanDraft] = useState<Record<string, PlanDraft>>({});
  const [pricingDraft, setPricingDraft] = useState<PricingDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deletingCode, setDeletingCode] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createDraft, setCreateDraft] = useState<CreateDraft>(emptyCreate);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function hydrate(nextPlans: PlatformPlanTemplate[], nextPricing: PlatformPlansPricing) {
    setPlans(nextPlans);
    setPricing(nextPricing);
    const pd: Record<string, PlanDraft> = {};
    for (const p of nextPlans) {
      pd[p.planCode] = {
        planName: p.planName,
        maxBranches: limitInput(p.limits.maxBranches),
        maxStaff: limitInput(p.limits.maxStaff),
        publicVisible: p.publicVisible !== false,
        multiplier: String(nextPricing.planMultipliers[p.planCode] ?? 1),
        allowedTerms: normalizeAllowedTerms(p.allowedTerms),
      };
    }
    setPlanDraft(pd);
    const termBasePrices: Record<string, string> = {};
    for (const m of ALL_TERMS) {
      const key = termPriceKey(m);
      termBasePrices[key] = String(
        nextPricing.termBasePrices[key] ?? nextPricing.termBasePrices[m as unknown as string] ?? 0
      );
    }
    setPricingDraft({
      currency: nextPricing.currency,
      gstPercent: String(nextPricing.gstPercent),
      termBasePrices,
      addOns: {
        extraBranchPrice: String(nextPricing.addOns.extraBranchPrice),
        extraUserPrice: String(nextPricing.addOns.extraUserPrice),
        onboardingFee: String(nextPricing.addOns.onboardingFee),
        referralDiscount: String(nextPricing.addOns.referralDiscount),
      },
    });
  }

  async function load(silent = false) {
    if (!silent) setLoading(true); else setRefreshing(true);
    setError(null);
    try {
      const res = await getPlatformPlans();
      hydrate(res.plans, res.pricing);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load plans");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleSave() {
    if (!pricingDraft || !pricing) return;
    for (const p of plans) {
      const d = planDraft[p.planCode];
      if (d && normalizeAllowedTerms(d.allowedTerms).length === 0) {
        toast.error(`${p.planCode}: select at least one billing term.`);
        return;
      }
    }
    setSaving(true);
    try {
      const planOverrides: Partial<Record<string, PlatformPlanOverride>> = {};
      const planMultipliers: Record<string, number> = {};
      for (const p of plans) {
        const d = planDraft[p.planCode];
        if (!d) continue;
        planOverrides[p.planCode] = {
          planName: d.planName.trim() || p.planName,
          publicVisible: d.publicVisible,
          allowedTerms: normalizeAllowedTerms(d.allowedTerms),
          limits: {
            maxBranches: parseLimit(d.maxBranches),
            maxStaff: parseLimit(d.maxStaff),
          },
        };
        planMultipliers[p.planCode] = numOr(d.multiplier, pricing.planMultipliers[p.planCode] ?? 1);
      }

      const termBasePrices: Partial<Record<PlanTermMonths, number>> = {};
      for (const m of ALL_TERMS) {
        termBasePrices[m] = numOr(pricingDraft.termBasePrices[termPriceKey(m)], 0);
      }

      const res = await putPlatformPlans({
        planOverrides,
        pricing: {
          currency: pricingDraft.currency.trim() || "INR",
          gstPercent: numOr(pricingDraft.gstPercent, pricing.gstPercent),
          termBasePrices,
          planMultipliers,
          addOns: {
            extraBranchPrice: numOr(pricingDraft.addOns.extraBranchPrice, 0),
            extraUserPrice: numOr(pricingDraft.addOns.extraUserPrice, 0),
            onboardingFee: numOr(pricingDraft.addOns.onboardingFee, 0),
            referralDiscount: numOr(pricingDraft.addOns.referralDiscount, 0),
          },
        },
      });
      hydrate(res.plans, res.pricing);
      toast.success("Plans & pricing saved. Public website will use these values.");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleCreate() {
    const code = normalizeCodePreview(createDraft.planCode);
    if (!/^[A-Z][A-Z0-9_]{1,23}$/.test(code)) {
      toast.error("Plan code must be 2–24 chars: A–Z, 0–9, underscore (e.g. PRO_PLUS).");
      return;
    }
    if (!createDraft.planName.trim()) {
      toast.error("Display name is required.");
      return;
    }
    if (createDraft.allowedTerms.length === 0) {
      toast.error("Select at least one billing term.");
      return;
    }
    setCreating(true);
    try {
      const res = await createPlatformPlan({
        planCode: code,
        planName: createDraft.planName.trim(),
        limits: {
          maxBranches: parseLimit(createDraft.maxBranches),
          maxStaff: parseLimit(createDraft.maxStaff),
        },
        publicVisible: createDraft.publicVisible,
        allowedTerms: createDraft.allowedTerms,
        multiplier: numOr(createDraft.multiplier, 1),
      });
      hydrate(res.plans, res.pricing);
      setShowCreate(false);
      setCreateDraft(emptyCreate());
      toast.success(`Plan ${code} created.`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to create plan");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(planCode: string) {
    if (!window.confirm(`Delete plan ${planCode}? This cannot be undone. Orgs still on this plan must be reassigned first.`)) {
      return;
    }
    setDeletingCode(planCode);
    try {
      const res = await deletePlatformPlan(planCode);
      hydrate(res.plans, res.pricing);
      toast.success(`Plan ${planCode} deleted.`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to delete plan");
    } finally {
      setDeletingCode(null);
    }
  }

  const currency = pricingDraft?.currency || pricing?.currency || "INR";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      <RefreshingBar show={refreshing} />
      <Topbar title="Plans & Pricing" description="Create, edit, and delete plans shown on the public website" />
      <FilterBar
        onRefresh={() => load(true)}
        refreshing={refreshing || loading}
        rightSlot={
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={() => { setCreateDraft(emptyCreate()); setShowCreate(true); }}
              disabled={loading}
              style={{
                height: 34, padding: "0 12px", borderRadius: 6,
                border: "1px solid var(--border)", background: "var(--card)",
                color: "var(--foreground)", fontSize: 12, fontWeight: 500,
                cursor: loading ? "not-allowed" : "pointer",
                display: "inline-flex", alignItems: "center", gap: 6,
              }}
            >
              <Plus style={{ width: 14, height: 14 }} />
              New plan
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || loading || !pricingDraft}
              style={{
                height: 34, padding: "0 14px", borderRadius: 6, border: "none",
                background: saving || loading ? "#A8D9D0" : "#50B0A0", color: "#fff",
                fontSize: 12, fontWeight: 500, cursor: saving || loading ? "not-allowed" : "pointer",
                display: "inline-flex", alignItems: "center", gap: 6,
              }}
            >
              {saving && <Loader2 style={{ width: 13, height: 13, animation: "spin 1s linear infinite" }} />}
              {saving ? "Saving…" : "Save all changes"}
            </button>
          </div>
        }
      />
      <div style={{ flex: 1, overflowY: "auto", padding: "clamp(12px, 2.5vw, 20px) clamp(12px, 3vw, 24px)", background: "var(--page-bg)" }}>
        {error && <div style={{ marginBottom: 16 }}><ErrorBanner message={error} onRetry={load} /></div>}

        <div style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "10px 14px", background: "#EFF8F6", border: "1px solid #B8E0D8", borderRadius: 8, marginBottom: 20, fontSize: 13, color: "#3D8F82" }}>
          <Info style={{ width: 14, height: 14, marginTop: 2, flexShrink: 0 }} />
          <span>
            Create custom plan codes, edit limits/pricing, or delete unused plans.
            Choose which billing terms each plan offers (Monthly, Quarterly, Yearly, 24/36/60 months).
            Source: <strong>{pricing?.source === "platform_settings" ? "Admin (saved)" : "Server defaults"}</strong>.
            Delete fails if any organization still uses that plan.
          </span>
        </div>

        <h2 style={{ fontSize: 13, fontWeight: 600, margin: "0 0 12px" }}>Plan catalog</h2>
        {loading ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} style={{ height: 280, borderRadius: 12, background: "var(--card)", border: "1px solid var(--border)" }} />
            ))}
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
            {plans.map((p) => {
              const d = planDraft[p.planCode];
              if (!d) return null;
              const annual = numOr(pricingDraft?.termBasePrices["12"] ?? "0", 0) * numOr(d.multiplier, 1);
              const deleting = deletingCode === p.planCode;
              return (
                <div key={p.planCode} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, padding: 16, display: "flex", flexDirection: "column", gap: 10, opacity: d.publicVisible ? 1 : 0.65 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "#50B0A0", background: "#EFF8F6", padding: "2px 8px", borderRadius: 12, border: "1px solid #B8E0D8" }}>{p.planCode}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <Badge variant={d.publicVisible ? "success" : "muted"}>{d.publicVisible ? "Public" : "Hidden"}</Badge>
                      <button
                        type="button"
                        title="Delete plan"
                        onClick={() => handleDelete(p.planCode)}
                        disabled={deleting || saving}
                        style={{
                          width: 28, height: 28, borderRadius: 6, border: "1px solid var(--border)",
                          background: "transparent", color: "#dc2626", cursor: deleting ? "wait" : "pointer",
                          display: "inline-flex", alignItems: "center", justifyContent: "center",
                        }}
                      >
                        {deleting ? <Loader2 style={{ width: 13, height: 13, animation: "spin 1s linear infinite" }} /> : <Trash2 style={{ width: 13, height: 13 }} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginBottom: 4 }}>Display name</div>
                    <input value={d.planName} onChange={(e) => setPlanDraft({ ...planDraft, [p.planCode]: { ...d, planName: e.target.value } })} style={inputStyle} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                    <div>
                      <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginBottom: 4 }}>Branches</div>
                      <input value={d.maxBranches} placeholder="∞" onChange={(e) => setPlanDraft({ ...planDraft, [p.planCode]: { ...d, maxBranches: e.target.value } })} style={inputStyle} />
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginBottom: 4 }}>Staff</div>
                      <input value={d.maxStaff} placeholder="∞" onChange={(e) => setPlanDraft({ ...planDraft, [p.planCode]: { ...d, maxStaff: e.target.value } })} style={inputStyle} />
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginBottom: 4 }}>Multiplier</div>
                      <input value={d.multiplier} onChange={(e) => setPlanDraft({ ...planDraft, [p.planCode]: { ...d, multiplier: e.target.value } })} style={inputStyle} />
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginBottom: 6 }}>Billing terms</div>
                    <TermCheckboxes
                      value={d.allowedTerms}
                      onChange={(allowedTerms) =>
                        setPlanDraft({ ...planDraft, [p.planCode]: { ...d, allowedTerms } })
                      }
                    />
                  </div>
                  <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
                    1-year base ≈ <strong style={{ color: "var(--foreground)" }}>{formatCurrency(annual, currency)}</strong>
                  </div>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--foreground)", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={d.publicVisible}
                      onChange={(e) => setPlanDraft({ ...planDraft, [p.planCode]: { ...d, publicVisible: e.target.checked } })}
                    />
                    Show on public website
                  </label>
                </div>
              );
            })}
          </div>
        )}

        <div style={{ marginTop: 28, marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
          <h2 style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>Term base prices</h2>
          <Badge variant="info">Editable</Badge>
        </div>
        {pricingDraft && (
          <AdminTable>
            <THead><tr><Th>Term</Th><Th>Amount ({currency})</Th></tr></THead>
            <TBody>
              {ALL_TERMS.map((m) => {
                const key = termPriceKey(m);
                return (
                  <Tr key={key}>
                    <Td style={{ fontWeight: 500 }}>{TERM_LABELS[key]}</Td>
                    <Td>
                      <input
                        value={pricingDraft.termBasePrices[key] ?? ""}
                        onChange={(e) => setPricingDraft({
                          ...pricingDraft,
                          termBasePrices: { ...pricingDraft.termBasePrices, [key]: e.target.value },
                        })}
                        style={{ ...inputStyle, maxWidth: 160 }}
                      />
                    </Td>
                  </Tr>
                );
              })}
            </TBody>
          </AdminTable>
        )}

        <div style={{ marginTop: 24, marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
          <h2 style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>Add-ons, GST & currency</h2>
          <Badge variant="info">Editable</Badge>
        </div>
        {pricingDraft && (
          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, padding: 16, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
            {([
              ["extraBranchPrice", "Extra branch"],
              ["extraUserPrice", "Extra user"],
              ["onboardingFee", "Onboarding fee"],
              ["referralDiscount", "Referral discount"],
            ] as const).map(([key, label]) => (
              <div key={key}>
                <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginBottom: 4 }}>{label}</div>
                <input
                  value={pricingDraft.addOns[key]}
                  onChange={(e) => setPricingDraft({
                    ...pricingDraft,
                    addOns: { ...pricingDraft.addOns, [key]: e.target.value },
                  })}
                  style={inputStyle}
                />
              </div>
            ))}
            <div>
              <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginBottom: 4 }}>GST %</div>
              <input
                value={pricingDraft.gstPercent}
                onChange={(e) => setPricingDraft({ ...pricingDraft, gstPercent: e.target.value })}
                style={inputStyle}
              />
            </div>
            <div>
              <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginBottom: 4 }}>Currency</div>
              <input
                value={pricingDraft.currency}
                onChange={(e) => setPricingDraft({ ...pricingDraft, currency: e.target.value.toUpperCase() })}
                style={inputStyle}
              />
            </div>
          </div>
        )}
      </div>

      {showCreate && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed", inset: 0, zIndex: 50,
            background: "rgba(15, 23, 42, 0.45)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 16,
          }}
          onClick={() => !creating && setShowCreate(false)}
        >
          <div
            style={{
              width: "100%", maxWidth: 440, background: "var(--card)",
              border: "1px solid var(--border)", borderRadius: 12, padding: 20,
              display: "flex", flexDirection: "column", gap: 12,
              maxHeight: "90vh", overflowY: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Create plan</h3>
            <div>
              <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginBottom: 4 }}>Plan code</div>
              <input
                value={createDraft.planCode}
                placeholder="PRO_PLUS"
                onChange={(e) => setCreateDraft({ ...createDraft, planCode: e.target.value.toUpperCase() })}
                style={inputStyle}
              />
              <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 4 }}>
                Saved as: {normalizeCodePreview(createDraft.planCode) || "—"}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginBottom: 4 }}>Display name</div>
              <input
                value={createDraft.planName}
                placeholder="Pro Plus"
                onChange={(e) => setCreateDraft({ ...createDraft, planName: e.target.value })}
                style={inputStyle}
              />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              <div>
                <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginBottom: 4 }}>Branches</div>
                <input value={createDraft.maxBranches} placeholder="∞" onChange={(e) => setCreateDraft({ ...createDraft, maxBranches: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginBottom: 4 }}>Staff</div>
                <input value={createDraft.maxStaff} placeholder="∞" onChange={(e) => setCreateDraft({ ...createDraft, maxStaff: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginBottom: 4 }}>Multiplier</div>
                <input value={createDraft.multiplier} onChange={(e) => setCreateDraft({ ...createDraft, multiplier: e.target.value })} style={inputStyle} />
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginBottom: 6 }}>Billing terms</div>
              <TermCheckboxes
                value={createDraft.allowedTerms}
                onChange={(allowedTerms) => setCreateDraft({ ...createDraft, allowedTerms })}
              />
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={createDraft.publicVisible}
                onChange={(e) => setCreateDraft({ ...createDraft, publicVisible: e.target.checked })}
              />
              Show on public website
            </label>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 4 }}>
              <button
                type="button"
                disabled={creating}
                onClick={() => setShowCreate(false)}
                style={{
                  height: 34, padding: "0 12px", borderRadius: 6,
                  border: "1px solid var(--border)", background: "transparent",
                  fontSize: 12, cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={creating}
                onClick={handleCreate}
                style={{
                  height: 34, padding: "0 14px", borderRadius: 6, border: "none",
                  background: creating ? "#A8D9D0" : "#50B0A0", color: "#fff",
                  fontSize: 12, fontWeight: 500, cursor: creating ? "wait" : "pointer",
                  display: "inline-flex", alignItems: "center", gap: 6,
                }}
              >
                {creating && <Loader2 style={{ width: 13, height: 13, animation: "spin 1s linear infinite" }} />}
                {creating ? "Creating…" : "Create plan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
