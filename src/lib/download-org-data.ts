"use client";

import JSZip from "jszip";
import {
  listPlatformAudit,
  listPlatformBranches,
  listPlatformOrganizationActivity,
  listPlatformUsers,
  type OrganizationActivityRow,
  type PlatformAuditRow,
  type PlatformBranchRow,
  type PlatformUserRow,
} from "@/api/platform";
import { buildCsvString, csvDateStamp } from "@/lib/download-csv";
import { downloadPdfTable } from "@/lib/download-pdf";
import type { OrgDetail } from "@/types";

function jsonCell(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

async function fetchAllActivity(orgId: string): Promise<OrganizationActivityRow[]> {
  const pageSize = 100;
  let page = 1;
  const all: OrganizationActivityRow[] = [];
  for (let i = 0; i < 20; i++) {
    const res = await listPlatformOrganizationActivity(orgId, { page, limit: pageSize });
    all.push(...res.activities);
    if (all.length >= res.total || res.activities.length < pageSize) break;
    page += 1;
  }
  return all;
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function downloadOrganizationDataZip(
  org: OrgDetail,
  cached?: {
    users?: PlatformUserRow[];
    branches?: PlatformBranchRow[];
    audit?: PlatformAuditRow[];
  }
): Promise<{ fileCount: number; filename: string }> {
  const orgId = org.organization.id;
  const slug = org.organization.slug || orgId;
  const stamp = csvDateStamp();

  const [usersRes, branchesRes, auditRes, activities] = await Promise.all([
    cached?.users
      ? Promise.resolve({ users: cached.users })
      : listPlatformUsers({ orgId, limit: 200 }),
    cached?.branches
      ? Promise.resolve({ branches: cached.branches })
      : listPlatformBranches({ orgId, limit: 200 }),
    cached?.audit
      ? Promise.resolve({ logs: cached.audit })
      : listPlatformAudit({ orgId, limit: 200 }),
    fetchAllActivity(orgId).catch(() => [] as OrganizationActivityRow[]),
  ]);

  const zip = new JSZip();
  const folder = zip.folder(`org-${slug}-admin-data-${stamp}`) ?? zip;

  folder.file(
    "organization.csv",
    buildCsvString(
      [
        "Organization ID",
        "Name",
        "Slug",
        "Is Active",
        "Owner Name",
        "Owner Email",
        "Owner Phone",
        "Primary Branch",
        "Signup Source",
        "Referral Code",
        "Created At",
        "Activated At",
        "Branches Used",
        "Users Used",
      ],
      [
        [
          org.organization.id,
          org.organization.name,
          org.organization.slug ?? "",
          org.organization.isActive === false ? "false" : "true",
          org.organization.ownerName ?? "",
          org.organization.ownerEmail ?? "",
          org.organization.ownerPhone ?? "",
          org.organization.primaryBranchName ?? "",
          org.organization.signupSource ?? "",
          org.organization.referralCode ?? "",
          org.organization.createdAt ?? "",
          org.organization.activatedAt ?? "",
          org.usage.branchesUsed,
          org.usage.usersUsed,
        ],
      ]
    )
  );

  const s = org.subscription;
  folder.file(
    "subscription.csv",
    buildCsvString(
      [
        "Plan Code",
        "Plan Name",
        "Status",
        "Payment Status",
        "Term Months",
        "Starts At",
        "Expires At",
        "Days Remaining",
        "Grace Or Lock",
        "Export Locked",
        "Max Branches",
        "Max Staff",
      ],
      [
        [
          s.planCode,
          s.planName,
          s.status,
          s.paymentStatus ?? "",
          s.termMonths,
          s.startsAt ?? "",
          s.expiresAt ?? "",
          s.daysRemaining ?? "",
          s.graceOrLock ?? "",
          s.exportLocked ? "true" : "false",
          s.effectiveMaxBranches ?? "",
          s.limits.maxStaff ?? "",
        ],
      ]
    )
  );

  folder.file(
    "payments.csv",
    buildCsvString(
      [
        "Payment ID",
        "Amount",
        "Currency",
        "Status",
        "Method",
        "Txn Reference",
        "Notes",
        "Recorded By",
        "Verified At",
        "Created At",
      ],
      org.payments.map((p) => [
        p.id,
        p.amount ?? "",
        p.currency,
        p.status,
        p.method ?? "",
        p.txnReference ?? "",
        p.notes ?? "",
        p.recordedBy ?? "",
        p.verifiedAt ?? "",
        p.createdAt,
      ])
    )
  );

  folder.file(
    "bills.csv",
    buildCsvString(
      [
        "Bill Number",
        "Plan",
        "Term Months",
        "Period Start",
        "Period End",
        "Total Amount",
        "Currency",
        "Payment Status",
        "Txn Reference",
        "Created At",
      ],
      org.bills.map((b) => [
        b.billNumber,
        b.planName,
        b.termMonths,
        b.periodStart,
        b.periodEnd,
        b.totalAmount,
        b.currency,
        b.paymentStatus ?? "",
        b.txnReference ?? "",
        b.createdAt,
      ])
    )
  );

  folder.file(
    "users.csv",
    buildCsvString(
      [
        "User ID",
        "Name",
        "Email",
        "Phone",
        "Role",
        "Active",
        "Branch",
        "Last Login At",
      ],
      usersRes.users.map((u) => [
        u.id,
        u.name,
        u.email,
        u.phone ?? "",
        u.role,
        u.isActive ? "true" : "false",
        u.branchName,
        u.lastLoginAt ?? "",
      ])
    )
  );

  folder.file(
    "branches.csv",
    buildCsvString(
      [
        "Branch ID",
        "Name",
        "Code",
        "Address",
        "City",
        "State",
        "Pincode",
        "Phone",
        "Email",
        "Manager",
        "Manager Phone",
        "Active",
      ],
      branchesRes.branches.map((b) => [
        b.id,
        b.name,
        b.code ?? "",
        b.address ?? "",
        b.city ?? "",
        b.state ?? "",
        b.pincode ?? "",
        b.phone ?? "",
        b.email ?? "",
        b.managerName ?? "",
        b.managerPhone ?? "",
        b.isActive ? "true" : "false",
      ])
    )
  );

  folder.file(
    "platform-audit.csv",
    buildCsvString(
      ["Audit ID", "Actor", "Action", "Before", "After", "Created At"],
      auditRes.logs.map((l) => [
        l.id,
        l.actor,
        l.action,
        jsonCell(l.before),
        jsonCell(l.after),
        l.createdAt,
      ])
    )
  );

  folder.file(
    "activity.csv",
    buildCsvString(
      [
        "Activity ID",
        "Action",
        "Entity Type",
        "Entity ID",
        "Entity Label",
        "User",
        "Details",
        "Created At",
      ],
      activities.map((a) => [
        a.id,
        a.action,
        a.entityType,
        a.entityId,
        a.entityLabel ?? "",
        a.userName ?? "",
        a.details ?? "",
        a.createdAt,
      ])
    )
  );

  folder.file(
    "README.txt",
    [
      "MY DETAIL OS — Platform Admin organization export",
      `Organization: ${org.organization.name} (${orgId})`,
      `Exported: ${new Date().toISOString()}`,
      "",
      "Contents are SaaS / control-plane records available to Platform Admin:",
      "- organization, subscription, payments, bills",
      "- users, branches",
      "- platform audit, workshop activity log",
      "",
      "This export does NOT include full workshop operational dumps",
      "(customers, vehicles, job cards, invoices collections).",
      "",
    ].join("\n")
  );

  const blob = await zip.generateAsync({ type: "blob" });
  const filename = `org-${slug}-admin-data-${stamp}.zip`;
  triggerBlobDownload(blob, filename);
  return { fileCount: 8, filename };
}

export function downloadOrganizationSummaryPdf(org: OrgDetail): void {
  const s = org.subscription;
  const o = org.organization;
  downloadPdfTable({
    filename: `org-${o.slug || o.id}-summary-${csvDateStamp()}.pdf`,
    title: o.name,
    subtitle: `Organization summary · ${o.id} · ${csvDateStamp()}`,
    headers: ["Field", "Value"],
    rows: [
      ["Organization ID", o.id],
      ["Slug", o.slug ?? ""],
      ["Owner", o.ownerName ?? ""],
      ["Owner Email", o.ownerEmail ?? ""],
      ["Owner Phone", o.ownerPhone ?? ""],
      ["Account Active", o.isActive === false ? "No" : "Yes"],
      ["Signup Source", o.signupSource ?? ""],
      ["Plan", `${s.planCode} (${s.planName})`],
      ["Subscription Status", s.status],
      ["Payment Status", s.paymentStatus ?? ""],
      ["Term Months", s.termMonths],
      ["Starts At", s.startsAt ?? ""],
      ["Expires At", s.expiresAt ?? ""],
      ["Days Remaining", s.daysRemaining ?? ""],
      ["Export Locked", s.exportLocked ? "Yes" : "No"],
      ["Branches Used", `${org.usage.branchesUsed} / ${s.effectiveMaxBranches ?? "∞"}`],
      ["Users Used", `${org.usage.usersUsed} / ${s.limits.maxStaff ?? "∞"}`],
      ["Payments", org.payments.length],
      ["Bills", org.bills.length],
    ],
  });
}
