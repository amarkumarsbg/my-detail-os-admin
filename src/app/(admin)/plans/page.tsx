"use client";

import { useEffect, useState } from "react";
import { Info, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Topbar } from "@/components/layout/topbar";
import { ErrorBanner } from "@/components/shared/error-banner";
import { RefreshingBar } from "@/components/shared/loading";
import { FilterBar } from "@/components/shared/filter-bar";
import { AdminTable, THead, Th, TBody, Tr, Td } from "@/components/shared/admin-table";
import {
  getPlatformPlans,
  putPlatformPlans,
  type PlatformPlanTemplate,
  type PlatformPlanOverride,
} from "@/api/platform";

const TERM_PRICING = [
  { label: "1 Year (12 months)", env: "SUBSCRIPTION_BASE_PRICE_12", default: "₹9,999" },
  { label: "2 Years (24 months)", env: "SUBSCRIPTION_BASE_PRICE_24", default: "₹18,999" },
  { label: "3 Years (36 months)", env: "SUBSCRIPTION_BASE_PRICE_36", default: "₹26,999" },
  { label: "5 Years (60 months)", env: "SUBSCRIPTION_BASE_PRICE_60", default: "₹41,999" },
];

const ADDONS = [
  { label: "Extra Branch", env: "SUBSCRIPTION_EXTRA_BRANCH_PRICE", default: "₹2,500 / branch" },
  { label: "Extra User", env: "SUBSCRIPTION_EXTRA_USER_PRICE", default: "₹750 / user" },
  { label: "Onboarding Fee", env: "SUBSCRIPTION_ONBOARDING_FEE", default: "₹1,500 (first sub only)" },
  { label: "Referral Discount", env: "SUBSCRIPTION_REFERRAL_DISCOUNT", default: "₹1,000" },
  { label: "GST Rate", env: "SUBSCRIPTION_GST_PERCENT", default: "18%" },
];

function limitInput(value: number | null | undefined): string {
  return value == null ? "" : String(value);
}

function parseLimit(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : null;
}

export default function PlansPage() {
  const [plans, setPlans] = useState<PlatformPlanTemplate[]>([]);
  const [draft, setDraft] = useState<Record<string, { planName: string; maxBranches: string; maxStaff: string }>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function hydrate(nextPlans: PlatformPlanTemplate[]) {
    setPlans(nextPlans);
    const next: Record<string, { planName: string; maxBranches: string; maxStaff: string }> = {};
    for (const p of nextPlans) {
      next[p.planCode] = {
        planName: p.planName,
        maxBranches: limitInput(p.limits.maxBranches),
        maxStaff: limitInput(p.limits.maxStaff),
      };
    }
    setDraft(next);
  }

  async function load(silent = false) {
    if (!silent) setLoading(true); else setRefreshing(true);
    setError(null);
    try {
      const res = await getPlatformPlans();
      hydrate(res.plans);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load plans");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const planOverrides: Partial<Record<string, PlatformPlanOverride>> = {};
      for (const p of plans) {
        const d = draft[p.planCode];
        if (!d) continue;
        planOverrides[p.planCode] = {
          planName: d.planName.trim() || p.planName,
          limits: {
            maxBranches: parseLimit(d.maxBranches),
            maxStaff: parseLimit(d.maxStaff),
          },
        };
      }
      const res = await putPlatformPlans(planOverrides);
      hydrate(res.plans);
      toast.success("Plan catalog saved.");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to save plans");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      <RefreshingBar show={refreshing} />
      <Topbar title="Plans & Pricing" description="Effective plan catalog with PlatformSettings overrides" />
      <FilterBar
        onRefresh={() => load(true)}
        refreshing={refreshing || loading}
        rightSlot={
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || loading || plans.length === 0}
            style={{
              height: 34, padding: "0 14px", borderRadius: 6, border: "none",
              background: saving || loading ? "#93c5fd" : "#2563eb", color: "#fff",
              fontSize: 12, fontWeight: 500, cursor: saving || loading ? "not-allowed" : "pointer",
              display: "inline-flex", alignItems: "center", gap: 6,
            }}
          >
            {saving && <Loader2 style={{ width: 13, height: 13, animation: "spin 1s linear infinite" }} />}
            {saving ? "Saving…" : "Save overrides"}
          </button>
        }
      />
      <div style={{ flex: 1, overflowY: "auto", padding: "clamp(12px, 2.5vw, 20px) clamp(12px, 3vw, 24px)", background: "var(--page-bg)" }}>
        {error && <div style={{ marginBottom: 16 }}><ErrorBanner message={error} onRetry={load} /></div>}

        <div style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "10px 14px", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 8, marginBottom: 20, fontSize: 13, color: "#1d4ed8" }}>
          <Info style={{ width: 14, height: 14, marginTop: 2, flexShrink: 0 }} />
          <span>
            Limits and display names are editable via <code style={{ background: "#dbeafe", padding: "1px 4px", borderRadius: 3 }}>PUT /api/platform/plans</code>.
            Term base prices and add-ons still come from backend environment variables.
          </span>
        </div>

        <h2 style={{ fontSize: 13, fontWeight: 600, margin: "0 0 12px" }}>Plan Catalog</h2>
        {loading ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} style={{ height: 180, borderRadius: 12, background: "var(--card)", border: "1px solid var(--border)" }} />
            ))}
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
            {plans.map((p) => {
              const d = draft[p.planCode] ?? { planName: p.planName, maxBranches: "", maxStaff: "" };
              return (
                <div key={p.planCode} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "#2563eb", background: "#eff6ff", padding: "2px 8px", borderRadius: 12, border: "1px solid #bfdbfe" }}>{p.planCode}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginBottom: 4 }}>Display name</div>
                    <input
                      value={d.planName}
                      onChange={(e) => setDraft({ ...draft, [p.planCode]: { ...d, planName: e.target.value } })}
                      style={{ width: "100%", height: 34, padding: "0 10px", border: "1px solid var(--border)", borderRadius: 6, fontSize: 13, boxSizing: "border-box" }}
                    />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <div>
                      <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginBottom: 4 }}>Max branches</div>
                      <input
                        value={d.maxBranches}
                        placeholder="∞"
                        onChange={(e) => setDraft({ ...draft, [p.planCode]: { ...d, maxBranches: e.target.value } })}
                        style={{ width: "100%", height: 34, padding: "0 10px", border: "1px solid var(--border)", borderRadius: 6, fontSize: 13, boxSizing: "border-box" }}
                      />
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginBottom: 4 }}>Max staff</div>
                      <input
                        value={d.maxStaff}
                        placeholder="∞"
                        onChange={(e) => setDraft({ ...draft, [p.planCode]: { ...d, maxStaff: e.target.value } })}
                        style={{ width: "100%", height: 34, padding: "0 10px", border: "1px solid var(--border)", borderRadius: 6, fontSize: 13, boxSizing: "border-box" }}
                      />
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>Empty limit = unlimited</div>
                </div>
              );
            })}
          </div>
        )}

        <div style={{ marginTop: 24 }}>
          <h2 style={{ fontSize: 13, fontWeight: 600, margin: "0 0 8px" }}>Base Term Pricing (env)</h2>
          <AdminTable>
            <THead><tr><Th>Term</Th><Th>Environment Variable</Th><Th>Default</Th></tr></THead>
            <TBody>{TERM_PRICING.map((p) => (<Tr key={p.env}><Td style={{ fontWeight: 500 }}>{p.label}</Td><Td mono muted>{p.env}</Td><Td muted>{p.default}</Td></Tr>))}</TBody>
          </AdminTable>
        </div>

        <div style={{ marginTop: 20 }}>
          <h2 style={{ fontSize: 13, fontWeight: 600, margin: "0 0 8px" }}>Add-on Pricing (env)</h2>
          <AdminTable>
            <THead><tr><Th>Add-on</Th><Th>Environment Variable</Th><Th>Default</Th></tr></THead>
            <TBody>{ADDONS.map((a) => (<Tr key={a.env}><Td style={{ fontWeight: 500 }}>{a.label}</Td><Td mono muted>{a.env}</Td><Td muted>{a.default}</Td></Tr>))}</TBody>
          </AdminTable>
        </div>
      </div>
    </div>
  );
}
