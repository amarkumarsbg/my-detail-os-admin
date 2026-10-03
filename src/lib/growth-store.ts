const KEY = "admin_growth_config_v1";

export type BannerAudience = "TRIAL" | "ACTIVE" | "ALL";

export interface MarketingBanner {
  id: string;
  title: string;
  body: string;
  audience: BannerAudience;
  enabled: boolean;
  ctaLabel: string;
  ctaUrl: string;
}

export interface FeatureFlag {
  id: string;
  key: string;
  label: string;
  enabled: boolean;
  organizationIds: string[];
}

export interface DunningConfig {
  graceDays: number;
  dunningDays: number[];
  trialDripDays: number[];
}

export interface GrowthConfig {
  banners: MarketingBanner[];
  flags: FeatureFlag[];
  dunning: DunningConfig;
  billingEmails: Record<string, string>;
}

export const DEFAULT_GROWTH: GrowthConfig = {
  banners: [],
  flags: [],
  dunning: { graceDays: 7, dunningDays: [1, 3, 6], trialDripDays: [3, 1, 0] },
  billingEmails: {},
};

export function loadGrowthConfig(): GrowthConfig {
  if (typeof window === "undefined") return DEFAULT_GROWTH;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_GROWTH;
    const parsed = JSON.parse(raw) as Partial<GrowthConfig>;
    return {
      banners: parsed.banners ?? [],
      flags: parsed.flags ?? [],
      dunning: { ...DEFAULT_GROWTH.dunning, ...parsed.dunning },
      billingEmails: parsed.billingEmails ?? {},
    };
  } catch {
    return DEFAULT_GROWTH;
  }
}

export function saveGrowthConfig(config: GrowthConfig): void {
  localStorage.setItem(KEY, JSON.stringify(config));
}

export function uid(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}
