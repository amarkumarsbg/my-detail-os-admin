import type { OrgListItem } from "@/types";
import type { PlatformPlansPricing } from "@/api/platform";

export interface ExecutiveMetrics {
  mrr: number;
  arr: number;
  arpu: number;
  churnRate: number;
  nrr: number;
  activePaying: number;
  cancelledOrExpired: number;
  currency: string;
}

function monthlyFromTerm(amount: number, termMonths: number): number {
  if (!termMonths || termMonths <= 0) return 0;
  return amount / termMonths;
}

export function estimatePlanAmount(
  planCode: string,
  termMonths: number,
  pricing: PlatformPlansPricing | null
): number {
  if (!pricing) return 0;
  const base = pricing.termBasePrices[String(termMonths)] ?? pricing.termBasePrices["12"] ?? 0;
  const mult = pricing.planMultipliers[planCode] ?? 1;
  return base * mult;
}

export function estimateCheckoutQuote(
  planCode: string,
  termMonths: number,
  pricing: PlatformPlansPricing | null,
  opts?: {
    extraBranches?: number;
    extraUsers?: number;
    applyReferralDiscount?: boolean;
    isFirstSubscription?: boolean;
    discountType?: "NONE" | "FLAT" | "PERCENTAGE" | "CODE";
    discountValue?: number;
  }
): {
  baseAmount: number;
  extraBranchCost: number;
  extraUserCost: number;
  onboardingFee: number;
  referralDiscount: number;
  discountLabel: string;
  subTotalBeforeTax: number;
  gstPercent: number;
  gstAmount: number;
  finalAmount: number;
  currency: string;
} {
  const currency = pricing?.currency ?? "INR";
  const gstPercent = pricing?.gstPercent ?? 0;
  const baseAmount = estimatePlanAmount(planCode, termMonths, pricing);
  const extraBranches = Math.max(0, opts?.extraBranches ?? 0);
  const extraUsers = Math.max(0, opts?.extraUsers ?? 0);
  const extraBranchCost = extraBranches * (pricing?.addOns.extraBranchPrice ?? 0);
  const extraUserCost = extraUsers * (pricing?.addOns.extraUserPrice ?? 0);
  const onboardingFee =
    opts?.isFirstSubscription === false ? 0 : (pricing?.addOns.onboardingFee ?? 0);
  const preDiscount = baseAmount + extraBranchCost + extraUserCost + onboardingFee;

  let referralDiscount = 0;
  let discountLabel = "No discount";
  const dtype = opts?.discountType ?? (opts?.applyReferralDiscount ? "CODE" : "NONE");
  const dval = Math.max(0, opts?.discountValue ?? 0);

  if (dtype === "FLAT") {
    referralDiscount = Math.min(preDiscount, dval);
    discountLabel = "Flat discount";
  } else if (dtype === "PERCENTAGE") {
    referralDiscount = Math.min(preDiscount, (preDiscount * Math.min(100, dval)) / 100);
    discountLabel = `${Math.min(100, dval)}% discount`;
  } else if (dtype === "CODE" || opts?.applyReferralDiscount) {
    referralDiscount = pricing?.addOns.referralDiscount ?? 0;
    discountLabel = "Code discount";
  }

  const subTotalBeforeTax = Math.max(0, preDiscount - referralDiscount);
  const gstAmount = (subTotalBeforeTax * gstPercent) / 100;
  return {
    baseAmount,
    extraBranchCost,
    extraUserCost,
    onboardingFee,
    referralDiscount,
    discountLabel,
    subTotalBeforeTax,
    gstPercent,
    gstAmount,
    finalAmount: subTotalBeforeTax + gstAmount,
    currency,
  };
}

export function computeExecutiveMetrics(
  orgs: OrgListItem[],
  pricing: PlatformPlansPricing | null
): ExecutiveMetrics {
  const currency = pricing?.currency ?? "INR";
  let mrr = 0;
  let lostMrr = 0;
  let activePaying = 0;
  let cancelledOrExpired = 0;

  for (const o of orgs) {
    const term = o.subscription.termMonths || 12;
    const amount = estimatePlanAmount(o.subscription.planCode, term, pricing);
    const monthly = monthlyFromTerm(amount, term);
    if (o.subscription.status === "ACTIVE") {
      mrr += monthly;
      activePaying += 1;
    } else if (o.subscription.status === "CANCELLED" || o.subscription.status === "EXPIRED") {
      lostMrr += monthly;
      cancelledOrExpired += 1;
    }
  }

  const denom = activePaying + cancelledOrExpired;
  const churnRate = denom === 0 ? 0 : cancelledOrExpired / denom;
  const nrr = mrr + lostMrr <= 0 ? 1 : mrr / (mrr + lostMrr);
  const arpu = activePaying === 0 ? 0 : mrr / activePaying;

  return {
    mrr,
    arr: mrr * 12,
    arpu,
    churnRate,
    nrr,
    activePaying,
    cancelledOrExpired,
    currency,
  };
}

export function prorateCredit(opts: {
  oldAmount: number;
  oldTermMonths: number;
  daysRemaining: number | null;
}): number {
  const { oldAmount, oldTermMonths, daysRemaining } = opts;
  if (daysRemaining == null || daysRemaining <= 0 || oldTermMonths <= 0) return 0;
  const termDays = oldTermMonths * 30;
  return (oldAmount * daysRemaining) / termDays;
}
