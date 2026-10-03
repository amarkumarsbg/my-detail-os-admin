import type { OrgListItem } from "@/types";

export interface LeadScoreResult {
  score: number;
  hot: boolean;
  reasons: string[];
}

/** Engagement score 0–100 from usage + recency (spec Module A). */
export function computeLeadScore(
  org: OrgListItem,
  lastLoginAt?: string | null
): LeadScoreResult {
  let score = 0;
  const reasons: string[] = [];
  const users = org.usage.usersUsed ?? 0;
  const branches = org.usage.branchesUsed ?? 0;

  const userPts = Math.min(30, users * 10);
  score += userPts;
  if (users > 0) reasons.push(`${users} user${users === 1 ? "" : "s"} seated`);

  const branchPts = Math.min(20, branches * 10);
  score += branchPts;
  if (branches > 1) reasons.push(`${branches} branches`);

  if (lastLoginAt) {
    const days = (Date.now() - new Date(lastLoginAt).getTime()) / 86_400_000;
    if (days <= 2) {
      score += 35;
      reasons.push("Logged in last 48h");
    } else if (days <= 7) {
      score += 20;
      reasons.push("Logged in this week");
    } else if (days <= 14) {
      score += 8;
      reasons.push("Logged in last 2 weeks");
    }
  }

  const remaining = org.subscription.daysRemaining;
  if (remaining != null && remaining >= 0 && remaining <= 7 && score >= 25) {
    score += 15;
    reasons.push("Trial ending soon + engaged");
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  return { score, hot: score >= 70, reasons };
}
