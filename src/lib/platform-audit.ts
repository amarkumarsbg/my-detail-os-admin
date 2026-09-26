/** Human-friendly labels for platform audit log rows. */

export type AuditBadgeVariant =
  | "success"
  | "info"
  | "warning"
  | "destructive"
  | "muted"
  | "default";

const ACTION_META: Record<
  string,
  { title: string; badge: string; variant: AuditBadgeVariant }
> = {
  "subscription.restored": {
    title: "Subscription restored",
    badge: "Restored",
    variant: "success",
  },
  "subscription.suspended": {
    title: "Organization suspended",
    badge: "Suspended",
    variant: "destructive",
  },
  "subscription.patch": {
    title: "Subscription updated",
    badge: "Updated",
    variant: "info",
  },
  "organization.provisioned": {
    title: "Organization created",
    badge: "Created",
    variant: "success",
  },
  "branch.created": {
    title: "Branch added",
    badge: "Branch",
    variant: "success",
  },
  "referral.created": {
    title: "Referral code created",
    badge: "Referral",
    variant: "info",
  },
  "plans.created": {
    title: "Plan created",
    badge: "Plan",
    variant: "success",
  },
  "plans.updated": {
    title: "Plans updated",
    badge: "Plan",
    variant: "info",
  },
  "plans.patched": {
    title: "Plan updated",
    badge: "Plan",
    variant: "info",
  },
  "plans.deleted": {
    title: "Plan deleted",
    badge: "Deleted",
    variant: "destructive",
  },
  "settings.updated": {
    title: "Platform settings updated",
    badge: "Settings",
    variant: "muted",
  },
};

const FIELD_LABELS: Record<string, string> = {
  status: "Status",
  isActive: "Access",
  reason: "Reason",
  planCode: "Plan",
  planName: "Plan name",
  name: "Name",
  code: "Code",
  branchId: "Branch",
  limitRaisedTo: "Branch limit raised to",
  maxBranches: "Max branches",
  maxBranchesOverride: "Branch limit override",
  maxUsersOverride: "User limit override",
  paymentStatus: "Payment status",
  notes: "Notes",
  email: "Email",
  phone: "Phone",
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function formatValue(key: string, value: unknown): string {
  if (value == null || value === "") return "—";
  if (typeof value === "boolean") {
    if (key === "isActive") return value ? "Active (access allowed)" : "Inactive (access blocked)";
    return value ? "Yes" : "No";
  }
  if (typeof value === "string") {
    if (key === "status") {
      const map: Record<string, string> = {
        ACTIVE: "Active",
        TRIAL: "Trial",
        CANCELLED: "Cancelled / suspended",
        PAST_DUE: "Past due",
        EXPIRED: "Expired",
        PENDING: "Pending",
        PAID: "Paid",
        FAILED: "Failed",
        PROCESSING: "Processing",
      };
      return map[value] ?? value.replace(/_/g, " ");
    }
    return value;
  }
  if (typeof value === "number") return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function fieldLabel(key: string): string {
  return FIELD_LABELS[key] ?? key.replace(/([A-Z])/g, " $1").replace(/[._]/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

export function platformAuditTitle(action: string): string {
  if (ACTION_META[action]) return ACTION_META[action].title;
  // Fallback: "subscription.foo_bar" → "Subscription foo bar"
  const pretty = action
    .replace(/[._]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
  return pretty || "Platform event";
}

export function platformAuditBadge(action: string): { label: string; variant: AuditBadgeVariant } {
  if (ACTION_META[action]) {
    return { label: ACTION_META[action].badge, variant: ACTION_META[action].variant };
  }
  const a = action.toUpperCase();
  if (a.includes("DELETE") || a.includes("SUSPEND") || a.includes("CANCEL")) {
    return { label: "Alert", variant: "destructive" };
  }
  if (a.includes("CREATE") || a.includes("PROVISION") || a.includes("RESTORE")) {
    return { label: "Created", variant: "success" };
  }
  if (a.includes("UPDATE") || a.includes("PATCH")) {
    return { label: "Updated", variant: "info" };
  }
  return { label: "Event", variant: "muted" };
}

export function platformAuditActorLabel(actor: string): string {
  const raw = (actor ?? "").trim();
  if (!raw) return "Unknown";
  if (raw.startsWith("public:::")) return "System (public signup)";
  if (raw.toLowerCase() === "system") return "System";
  return raw;
}

/** Plain-language change summary lines (no JSON). */
export function platformAuditChangeLines(before: unknown, after: unknown): string[] {
  const beforeObj = isRecord(before) ? before : null;
  const afterObj = isRecord(after) ? after : null;
  const lines: string[] = [];

  if (!beforeObj && !afterObj) return lines;

  if (!beforeObj && afterObj) {
    for (const [key, value] of Object.entries(afterObj)) {
      if (value == null || value === "") continue;
      lines.push(`${fieldLabel(key)}: ${formatValue(key, value)}`);
    }
    return lines.slice(0, 8);
  }

  if (beforeObj && !afterObj) {
    lines.push("Details were cleared for this event.");
    return lines;
  }

  const keys = new Set([...Object.keys(beforeObj!), ...Object.keys(afterObj!)]);
  for (const key of keys) {
    const b = beforeObj![key];
    const a = afterObj![key];
    if (JSON.stringify(b) === JSON.stringify(a)) continue;

    if (key === "reason" && a != null && a !== "") {
      lines.push(`Reason: ${formatValue(key, a)}`);
      continue;
    }
    if (b === undefined && a !== undefined) {
      lines.push(`${fieldLabel(key)} set to ${formatValue(key, a)}`);
      continue;
    }
    if (a === undefined && b !== undefined) {
      lines.push(`${fieldLabel(key)} removed (was ${formatValue(key, b)})`);
      continue;
    }
    lines.push(`${fieldLabel(key)}: ${formatValue(key, b)} → ${formatValue(key, a)}`);
  }

  return lines.slice(0, 8);
}
