"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  CreditCard,
  FileText,
  Users,
  UserCog,
  Building2,
  MapPin,
  ClipboardList,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import { Topbar } from "@/components/layout/topbar";
import { ErrorBanner } from "@/components/shared/error-banner";
import { RefreshingBar } from "@/components/shared/loading";
import { FilterSelect } from "@/components/shared/filter-bar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  SubscriptionStatusBadge,
  PaymentStatusBadge,
  PlanBadge,
  GraceStatusBadge,
} from "@/components/shared/status-badges";
import {
  getOrganization,
  patchOrganizationSubscription,
  verifyPayment,
  markPaid,
  convertTrial,
} from "@/api/organizations";
import {
  getPlatformPlans,
  listPlatformUsers,
  listPlatformBranches,
  createPlatformBranch,
  listPlatformAudit,
  suspendOrg,
  restoreOrg,
  type PlatformUserRow,
  type PlatformBranchRow,
  type PlatformAuditRow,
} from "@/api/platform";
import { ApiError } from "@/lib/api-client";
import { OrganizationActivityPanel } from "@/components/shared/organization-activity-panel";
import { PlatformAuditList } from "@/components/shared/platform-audit-list";
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  daysRemainingLabel,
  termLabel,
} from "@/lib/utils";
import type {
  OrgDetail,
  PlanCode,
  SubscriptionPaymentRow,
  SubscriptionBillRow,
} from "@/types";

// ─── Design constants ─────────────────────────────────────────────────────────

const CARD_STYLE: React.CSSProperties = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: 14,
  boxShadow: "0 1px 2px rgba(0,0,0,0.04), 0 2px 6px rgba(0,0,0,0.04)",
  overflow: "hidden",
};

/** Matches workshop Users tab (office roles). Everyone else is Staff. */
const WORKSHOP_USER_ROLES = new Set([
  "BRANCH_MANAGER",
  "MANAGER",
  "SUPERVISOR",
  "RECEPTIONIST",
]);

const ROLE_DISPLAY: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  BRANCH_MANAGER: "Branch Manager",
  MANAGER: "Manager",
  SUPERVISOR: "Supervisor",
  RECEPTIONIST: "Receptionist",
  MECHANIC: "Mechanic",
  PLATFORM_OWNER: "Platform Owner",
};

function roleDisplayLabel(role: string): string {
  return ROLE_DISPLAY[role] ?? role.replace(/_/g, " ");
}

// ─── Card building blocks ─────────────────────────────────────────────────────

function OrgCard({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ ...CARD_STYLE, ...style }}>{children}</div>;
}

function OrgCardHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: React.ReactNode }) {
  return (
    <div style={{ padding: "20px 24px 0" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "var(--foreground)", letterSpacing: "-0.1px" }}>
            {title}
          </h3>
          {subtitle && (
            <p style={{ margin: "3px 0 0", fontSize: 12, color: "var(--muted-foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {subtitle}
            </p>
          )}
        </div>
        {right && <div style={{ flexShrink: 0 }}>{right}</div>}
      </div>
    </div>
  );
}

function OrgCardBody({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ padding: "16px 24px 24px", ...style }}>{children}</div>;
}

// ─── Field components ─────────────────────────────────────────────────────────

function InfoField({ label, children }: { label: string; children?: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 5 }}>
        {label}
      </div>
      <div style={{ fontSize: 14, fontWeight: 500, color: "var(--foreground)", lineHeight: 1.4 }}>
        {children ?? "—"}
      </div>
    </div>
  );
}

function UsageField({ label, used, limit }: { label: string; used: number; limit: number | null | undefined }) {
  const isOver = limit != null && used > limit;
  const pct = limit != null && limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 5 }}>
        {label}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 7 }}>
        <span style={{ fontSize: 14, fontWeight: 500, color: isOver ? "#d97706" : "var(--foreground)" }}>
          {used} / {limit ?? "∞"}
        </span>
        {isOver && <AlertTriangle style={{ width: 13, height: 13, color: "#f59e0b", flexShrink: 0 }} />}
      </div>
      {limit != null && (
        <div style={{ height: 3, borderRadius: 2, background: "var(--secondary)", overflow: "hidden" }}>
          <div style={{ height: "100%", borderRadius: 2, width: `${pct}%`, background: isOver ? "#f59e0b" : "#50B0A0", transition: "width 0.3s ease" }} />
        </div>
      )}
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontSize: 11, fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}
      </label>
      {children}
    </div>
  );
}

// ─── Table helpers ────────────────────────────────────────────────────────────

function InlineTable({ heads, children }: { heads: { label: string; align?: "left" | "right" }[]; children: React.ReactNode }) {
  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead style={{ background: "var(--secondary)", borderBottom: "1px solid var(--border)" }}>
            <tr>
              {heads.map((h, i) => (
                <th key={i} style={{ padding: "9px 12px", textAlign: h.align ?? "left", fontSize: 11, fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.04em", whiteSpace: "nowrap" }}>
                  {h.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
      </div>
    </div>
  );
}

function InlineRow({ children, idx }: { children: React.ReactNode; idx: number }) {
  return (
    <tr
      style={{ borderTop: idx === 0 ? "none" : "1px solid #f1f5f9" }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(248,250,252,0.9)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "")}
    >
      {children}
    </tr>
  );
}

function InlineTd({ children, align = "left", muted, bold }: { children?: React.ReactNode; align?: "left" | "right"; muted?: boolean; bold?: boolean }) {
  return (
    <td style={{ padding: "10px 12px", textAlign: align, color: muted ? "var(--muted-foreground)" : "var(--foreground)", fontWeight: bold ? 600 : undefined, fontSize: muted ? 12 : 13 }}>
      {children ?? "—"}
    </td>
  );
}

// ─── Skeleton + Empty ─────────────────────────────────────────────────────────

function Skel({ h, w = "100%" }: { h: number | string; w?: string }) {
  return <div style={{ height: h, width: w, background: "var(--secondary)", borderRadius: 6 }} />;
}

function EmptyState({ icon: Icon, message }: { icon: React.ElementType; message: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: "24px 0" }}>
      <Icon style={{ width: 28, height: 28, color: "#cbd5e1" }} />
      <span style={{ fontSize: 13, color: "var(--muted-foreground)" }}>{message}</span>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OrgDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [org, setOrg] = useState<OrgDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const [patching, setPatching] = useState(false);
  const [patchStatus, setPatchStatus] = useState<string>("");
  const [patchPlan, setPatchPlan] = useState<PlanCode>("STARTER");
  const [planOptions, setPlanOptions] = useState<{ value: string; label: string }[]>([
    { value: "STARTER", label: "STARTER" },
    { value: "GROWTH", label: "GROWTH" },
    { value: "BUSINESS", label: "BUSINESS" },
    { value: "ENTERPRISE", label: "ENTERPRISE" },
    { value: "CUSTOM", label: "CUSTOM" },
  ]);
  const [patchNotes, setPatchNotes] = useState("");

  const [orgUsers, setOrgUsers] = useState<PlatformUserRow[]>([]);
  const [orgBranches, setOrgBranches] = useState<PlatformBranchRow[]>([]);
  const [orgLogs, setOrgLogs] = useState<PlatformAuditRow[]>([]);
  const [orgDirectoryLoading, setOrgDirectoryLoading] = useState(false);
  const [peopleTab, setPeopleTab] = useState<"staff" | "users">("staff");

  const [markPaidOpen, setMarkPaidOpen] = useState(false);
  const [markPaidAmount, setMarkPaidAmount] = useState("");
  const [markPaidTxn, setMarkPaidTxn] = useState("");
  const [markPaidNotes, setMarkPaidNotes] = useState("");
  const [markPaidLoading, setMarkPaidLoading] = useState(false);
  const [convertTrialOpen, setConvertTrialOpen] = useState(false);
  const [convertTrialLoading, setConvertTrialLoading] = useState(false);
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [suspendReason, setSuspendReason] = useState("Admin suspension");
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [lifecycleLoading, setLifecycleLoading] = useState(false);

  const [addBranchOpen, setAddBranchOpen] = useState(false);
  const [addBranchLoading, setAddBranchLoading] = useState(false);
  const [branchForm, setBranchForm] = useState({
    name: "",
    code: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    phone: "",
    email: "",
    managerName: "",
    managerPhone: "",
    isActive: true,
  });

  function resetBranchForm() {
    setBranchForm({
      name: "",
      code: "",
      address: "",
      city: "",
      state: "",
      pincode: "",
      phone: "",
      email: "",
      managerName: "",
      managerPhone: "",
      isActive: true,
    });
  }

  async function load(silent = false) {
    if (!silent) setLoading(true); else setRefreshing(true);
    setError(null);
    try {
      const data = await getOrganization(id);
      setOrg(data);
      setPatchStatus(data.subscription.status);
      setPatchPlan(data.subscription.planCode);
      setOrgDirectoryLoading(true);
      try {
        const [usersRes, branchesRes, auditRes] = await Promise.all([
          listPlatformUsers({ orgId: id, limit: 100 }),
          listPlatformBranches({ orgId: id, limit: 100 }),
          listPlatformAudit({ orgId: id, limit: 100 }),
        ]);
        setOrgUsers(usersRes.users);
        setOrgBranches(branchesRes.branches);
        setOrgLogs(auditRes.logs);
      } catch {
        setOrgUsers([]);
        setOrgBranches([]);
        setOrgLogs([]);
      } finally {
        setOrgDirectoryLoading(false);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load organization");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    getPlatformPlans()
      .then((res) => {
        const opts = res.plans.map((p) => ({
          value: p.planCode,
          label: `${p.planCode} — ${p.planName}`,
        }));
        if (opts.length) setPlanOptions(opts);
      })
      .catch(() => { /* keep defaults */ });
  }, []);

  async function handlePatchSubscription() {
    if (!org) return;
    setPatching(true);
    try {
      const updated = await patchOrganizationSubscription(org.organization.id, {
        status: patchStatus as OrgDetail["subscription"]["status"],
        planCode: patchPlan,
        notes: patchNotes || undefined,
      });
      setOrg(updated);
      toast.success("Subscription updated successfully.");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Update failed.");
    } finally {
      setPatching(false);
    }
  }

  async function handleMarkPaid() {
    if (!org) return;
    setMarkPaidLoading(true);
    try {
      await markPaid(org.organization.id, {
        amount: markPaidAmount ? Number(markPaidAmount) : undefined,
        txnReference: markPaidTxn || null,
        notes: markPaidNotes || null,
      });
      toast.success("Subscription marked as paid and activated.");
      setMarkPaidOpen(false);
      setMarkPaidAmount(""); setMarkPaidTxn(""); setMarkPaidNotes("");
      await load(true);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to mark as paid.");
    } finally {
      setMarkPaidLoading(false);
    }
  }


  async function handleConvertTrial() {
    if (!org) return;
    setConvertTrialLoading(true);
    try {
      await convertTrial(org.organization.id, {
        markPaid: true,
        termMonths: 12,
        notes: "Converted from trial via Admin Portal",
      });
      toast.success("Trial converted to ACTIVE subscription.");
      setConvertTrialOpen(false);
      await load(true);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to convert trial.");
    } finally {
      setConvertTrialLoading(false);
    }
  }

  async function handleVerifyPayment(payment: SubscriptionPaymentRow, outcome: "PAID" | "FAILED") {
    if (!org) return;
    try {
      await verifyPayment(org.organization.id, { paymentId: payment.id, outcome, txnReference: payment.txnReference });
      toast.success(`Payment marked as ${outcome}.`);
      await load(true);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Verification failed.");
    }
  }

  async function handleSuspend() {
    if (!org) return;
    const reason = suspendReason.trim();
    if (!reason) {
      toast.error("Suspension reason is required.");
      return;
    }
    setLifecycleLoading(true);
    try {
      await suspendOrg(org.organization.id, reason);
      toast.success("Organization suspended.");
      setSuspendOpen(false);
      setSuspendReason("Admin suspension");
      await load(true);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to suspend.");
    } finally {
      setLifecycleLoading(false);
    }
  }

  async function handleRestore() {
    if (!org) return;
    setLifecycleLoading(true);
    try {
      await restoreOrg(org.organization.id, "Admin restore");
      toast.success("Organization restored.");
      setRestoreOpen(false);
      await load(true);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to restore.");
    } finally {
      setLifecycleLoading(false);
    }
  }

  async function handleAddBranch() {
    if (!org) return;
    const name = branchForm.name.trim();
    const address = branchForm.address.trim();
    const phone = branchForm.phone.replace(/\D/g, "").slice(0, 10);
    const managerPhone = branchForm.managerPhone.replace(/\D/g, "").slice(0, 10);
    if (!name || !address) {
      toast.error("Name and address are required.");
      return;
    }
    if (phone.length !== 10) {
      toast.error("Enter a valid 10-digit phone number.");
      return;
    }
    if (managerPhone && managerPhone.length !== 10) {
      toast.error("Manager phone must be a 10-digit number.");
      return;
    }
    setAddBranchLoading(true);
    try {
      const result = await createPlatformBranch(org.organization.id, {
        name,
        address,
        phone,
        code: branchForm.code.trim() || null,
        city: branchForm.city.trim() || null,
        state: branchForm.state.trim() || null,
        pincode: branchForm.pincode.trim() || null,
        email: branchForm.email.trim() || null,
        managerName: branchForm.managerName.trim() || null,
        managerPhone: managerPhone || null,
        isActive: branchForm.isActive,
        raiseLimitIfNeeded: true,
      });
      if (result.limitRaisedTo != null) {
        toast.success(`Branch created. Branch limit raised to ${result.limitRaisedTo}.`);
      } else {
        toast.success("Branch created.");
      }
      setAddBranchOpen(false);
      resetBranchForm();
      await load(true);
    } catch (e: unknown) {
      const msg =
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Failed to create branch.";
      toast.error(msg);
    } finally {
      setAddBranchLoading(false);
    }
  }

  const staffDirectory = useMemo(
    () => orgUsers.filter((u) => !WORKSHOP_USER_ROLES.has(u.role)),
    [orgUsers]
  );
  const usersDirectory = useMemo(
    () => orgUsers.filter((u) => WORKSHOP_USER_ROLES.has(u.role)),
    [orgUsers]
  );
  const peopleRows = peopleTab === "staff" ? staffDirectory : usersDirectory;

  // ── Loading ───────────────────────────────────────────────────────────────

  if (loading) return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <Topbar />
      <div style={{ flex: 1, overflowY: "auto", background: "var(--page-bg)", padding: "clamp(12px, 3vw, 24px)" }}>
        <div style={{ maxWidth: 1400, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
          <OrgCard>
            <OrgCardBody>
              <Skel h={14} w="160px" />
              <div style={{ height: 16 }} />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "20px 24px" }}>
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i}><Skel h={10} w="50px" /><div style={{ height: 6 }} /><Skel h={14} /></div>
                ))}
              </div>
            </OrgCardBody>
          </OrgCard>
          <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 20 }}>
            {[0, 1].map((i) => (
              <OrgCard key={i}>
                <OrgCardBody>
                  <Skel h={14} w="140px" />
                  <div style={{ height: 16 }} />
                  {[0, 1, 2].map((j) => (
                    <div key={j} style={{ marginBottom: 14 }}><Skel h={10} w="60px" /><div style={{ height: 6 }} /><Skel h={36} /></div>
                  ))}
                </OrgCardBody>
              </OrgCard>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 20 }}>
            {[0, 1].map((i) => (
              <OrgCard key={i}>
                <OrgCardBody>
                  <Skel h={14} w="100px" />
                  <div style={{ height: 24 }} />
                  <div style={{ display: "flex", justifyContent: "center" }}><Skel h={56} w="50%" /></div>
                </OrgCardBody>
              </OrgCard>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  if (error || !org) return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <Topbar />
      <div style={{ padding: "clamp(12px, 3vw, 24px)" }}>
        <ErrorBanner message={error ?? "Organization not found."} onRetry={() => load()} />
      </div>
    </div>
  );

  const sub = org.subscription;
  const branchLimit = sub.effectiveMaxBranches ?? null;
  const staffLimit = sub.limits.maxStaff ?? null;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      <RefreshingBar show={refreshing} />

      <Topbar
        title={org.organization.name}
        description={
          org.organization.slug
            ? `/${org.organization.slug} · ${org.organization.id}`
            : `ID: ${org.organization.id}`
        }
        actions={
          <div style={{ display: "flex", gap: 6 }}>
            <Button variant="outline" size="sm" onClick={() => router.back()} style={{ minWidth: 80 }}>
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            <Button variant="outline" size="sm" onClick={() => load(true)} disabled={refreshing} style={{ minWidth: 90 }}>
              <RefreshCw className={`h-4 w-4${refreshing ? " animate-spin" : ""}`} />
              {refreshing ? "Refreshing…" : "Refresh"}
            </Button>
          </div>
        }
      />

      <div style={{ flex: 1, overflowY: "auto", background: "var(--page-bg)", padding: "clamp(12px, 3vw, 24px)" }}>
        <div style={{ maxWidth: 1400, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Mobile-only back/refresh row */}
          <div className="flex sm:hidden gap-2">
            <Button variant="outline" size="sm" onClick={() => router.back()} style={{ minWidth: 88, paddingLeft: 14, paddingRight: 14 }}>
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            <Button variant="outline" size="sm" onClick={() => load(true)} disabled={refreshing} style={{ minWidth: 100, paddingLeft: 14, paddingRight: 14 }}>
              <RefreshCw className={`h-4 w-4${refreshing ? " animate-spin" : ""}`} />
              {refreshing ? "Refreshing…" : "Refresh"}
            </Button>
          </div>

          {/* Row 0 – Organization profile (signup / provision details) */}
          <OrgCard>
            <OrgCardHeader
              title="Organization profile"
              subtitle="Details captured at signup / provisioning"
              right={
                <Badge variant={org.organization.isActive === false ? "muted" : "success"}>
                  {org.organization.isActive === false ? "Inactive" : "Active"}
                </Badge>
              }
            />
            <OrgCardBody>
              <dl className="grid grid-cols-2 sm:grid-cols-4" style={{ gap: "20px 32px" }}>
                <InfoField label="Business name">{org.organization.name}</InfoField>
                <InfoField label="Slug">
                  {org.organization.slug ? (
                    <span style={{ fontFamily: "monospace" }}>/{org.organization.slug}</span>
                  ) : (
                    "—"
                  )}
                </InfoField>
                <InfoField label="Organization ID">
                  <span style={{ fontFamily: "monospace", fontSize: 12 }}>{org.organization.id}</span>
                </InfoField>
                <InfoField label="Primary branch">
                  {org.organization.primaryBranchName ?? "—"}
                </InfoField>
                <InfoField label="Owner name">{org.organization.ownerName ?? "—"}</InfoField>
                <InfoField label="Owner email">
                  {org.organization.ownerEmail ? (
                    <a href={`mailto:${org.organization.ownerEmail}`} style={{ color: "#50B0A0", textDecoration: "none" }}>
                      {org.organization.ownerEmail}
                    </a>
                  ) : (
                    "—"
                  )}
                </InfoField>
                <InfoField label="Owner phone">
                  {org.organization.ownerPhone ? (
                    <a href={`tel:${org.organization.ownerPhone}`} style={{ color: "#50B0A0", textDecoration: "none" }}>
                      {org.organization.ownerPhone}
                    </a>
                  ) : (
                    "—"
                  )}
                </InfoField>
                <InfoField label="Signup source">{org.organization.signupSource ?? "—"}</InfoField>
                <InfoField label="Referral code">{org.organization.referralCode ?? "—"}</InfoField>
                <InfoField label="Created">{formatDateTime(org.organization.createdAt)}</InfoField>
                <InfoField label="Activated">{formatDateTime(org.organization.activatedAt)}</InfoField>
                <InfoField label="Account status">
                  {org.organization.isActive === false ? "Suspended / inactive" : "Active"}
                </InfoField>
              </dl>
            </OrgCardBody>
          </OrgCard>

          {/* Row 1 – Subscription overview */}
          <OrgCard>
            <OrgCardHeader
              title="Subscription"
              subtitle="Current subscription details"
              right={
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "flex-end" }}>
                  <PlanBadge planCode={sub.planCode} />
                  <SubscriptionStatusBadge status={sub.status} />
                  <PaymentStatusBadge status={sub.paymentStatus} />
                  <GraceStatusBadge status={sub.graceOrLock} />
                  {sub.exportLocked && <Badge variant="destructive">Export Locked</Badge>}
                </div>
              }
            />
            <OrgCardBody>
              <dl className="grid grid-cols-2 sm:grid-cols-4" style={{ gap: "20px 32px" }}>
                <InfoField label="Plan">{sub.planName}</InfoField>
                <InfoField label="Term">{termLabel(sub.termMonths)}</InfoField>
                <InfoField label="Start Date">{formatDate(sub.startsAt)}</InfoField>
                <InfoField label="Expiry Date">{formatDate(sub.expiresAt)}</InfoField>
                <InfoField label="Days Remaining">{daysRemainingLabel(sub.daysRemaining)}</InfoField>
                <UsageField label="Branches" used={org.usage.branchesUsed} limit={branchLimit} />
                <UsageField label="Users" used={org.usage.usersUsed} limit={staffLimit} />
                <InfoField label="Payment Status"><PaymentStatusBadge status={sub.paymentStatus} /></InfoField>
              </dl>
            </OrgCardBody>
          </OrgCard>

          {/* Row 2 – Management */}
          <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 20 }}>
            {/* Manage Subscription */}
            <OrgCard>
              <OrgCardHeader title="Manage Subscription" subtitle="Update the organization's subscription." />
              <OrgCardBody style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <FormField label="Plan">
                  <FilterSelect
                    value={patchPlan}
                    onChange={(v) => setPatchPlan(v as PlanCode)}
                    disabled={patching}
                    fullWidth
                    options={
                      planOptions.some((o) => o.value === patchPlan)
                        ? planOptions
                        : [{ value: patchPlan, label: patchPlan }, ...planOptions]
                    }
                  />
                </FormField>
                <FormField label="Status">
                  <FilterSelect
                    value={patchStatus}
                    onChange={setPatchStatus}
                    disabled={patching}
                    fullWidth
                    options={["TRIAL","ACTIVE","PAST_DUE","EXPIRED","CANCELLED"].map((s) => ({ value: s, label: s }))}
                  />
                </FormField>
                <FormField label="Notes (optional)">
                  <Input placeholder="Internal note…" value={patchNotes} onChange={(e) => setPatchNotes(e.target.value)} disabled={patching} />
                </FormField>
                <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: 4 }}>
                  <Button onClick={handlePatchSubscription} disabled={patching} className="min-w-30">
                    {patching ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : "Save Changes"}
                  </Button>
                </div>
              </OrgCardBody>
            </OrgCard>

            {/* Quick Actions */}
            <OrgCard>
              <OrgCardHeader title="Quick Actions" subtitle="Perform administrative actions on this organization." />
              <OrgCardBody>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {org.subscription.status === "TRIAL" && (
                  <button
                    type="button"
                    onClick={() => setConvertTrialOpen(true)}
                    disabled={convertTrialLoading || lifecycleLoading}
                    style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: "rgba(16,185,129,0.12)", border: "1px solid var(--border)", borderRadius: 10, cursor: convertTrialLoading ? "not-allowed" : "pointer", opacity: convertTrialLoading ? 0.7 : 1, textAlign: "left", transition: "background 0.12s" }}
                  >
                    <span style={{ flexShrink: 0, width: 34, height: 34, background: "rgba(16,185,129,0.2)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <CheckCircle2 style={{ width: 16, height: 16, color: "#059669" }} />
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--foreground)" }}>
                        {convertTrialLoading ? "Converting…" : "Convert Trial"}
                      </span>
                      <span style={{ display: "block", fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>
                        Move TRIAL → ACTIVE (manual; no payment gateway)
                      </span>
                    </span>
                    {convertTrialLoading && <Loader2 className="animate-spin" style={{ width: 14, height: 14, color: "var(--muted-foreground)", flexShrink: 0 }} />}
                  </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setMarkPaidOpen(true)}
                    disabled={markPaidLoading || lifecycleLoading}
                    style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: "rgba(99,120,150,0.12)", border: "1px solid var(--border)", borderRadius: 10, cursor: markPaidLoading ? "not-allowed" : "pointer", opacity: markPaidLoading ? 0.7 : 1, textAlign: "left", transition: "background 0.12s" }}
                    onMouseEnter={(e) => { if (!markPaidLoading) e.currentTarget.style.background = "rgba(99,120,150,0.22)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(99,120,150,0.12)"; }}
                  >
                    <span style={{ flexShrink: 0, width: 34, height: 34, background: "rgba(59,130,246,0.15)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <CreditCard style={{ width: 16, height: 16, color: "#50B0A0" }} />
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--foreground)" }}>
                        {markPaidLoading ? "Processing…" : "Mark as Paid"}
                      </span>
                      <span style={{ display: "block", fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>
                        Activate subscription and record payment
                      </span>
                    </span>
                    {markPaidLoading && <Loader2 className="animate-spin" style={{ width: 14, height: 14, color: "var(--muted-foreground)", flexShrink: 0 }} />}
                  </button>

                  {org.subscription.status === "CANCELLED" ? (
                    <button
                      type="button"
                      onClick={() => setRestoreOpen(true)}
                      disabled={lifecycleLoading}
                      style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, cursor: lifecycleLoading ? "not-allowed" : "pointer", opacity: lifecycleLoading ? 0.7 : 1, textAlign: "left" }}
                    >
                      <span style={{ flexShrink: 0, width: 34, height: 34, background: "#dcfce7", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <CheckCircle2 style={{ width: 16, height: 16, color: "#16a34a" }} />
                      </span>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--foreground)" }}>Restore Organization</span>
                        <span style={{ display: "block", fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>Set subscription status back to ACTIVE</span>
                      </span>
                      {lifecycleLoading && <Loader2 className="animate-spin" style={{ width: 14, height: 14, color: "var(--muted-foreground)", flexShrink: 0 }} />}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => { setSuspendReason("Admin suspension"); setSuspendOpen(true); }}
                      disabled={lifecycleLoading}
                      style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, cursor: lifecycleLoading ? "not-allowed" : "pointer", opacity: lifecycleLoading ? 0.7 : 1, textAlign: "left" }}
                    >
                      <span style={{ flexShrink: 0, width: 34, height: 34, background: "#fee2e2", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <AlertTriangle style={{ width: 16, height: 16, color: "#dc2626" }} />
                      </span>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--foreground)" }}>Suspend Organization</span>
                        <span style={{ display: "block", fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>Cancel subscription and restrict access</span>
                      </span>
                      {lifecycleLoading && <Loader2 className="animate-spin" style={{ width: 14, height: 14, color: "var(--muted-foreground)", flexShrink: 0 }} />}
                    </button>
                  )}
                </div>
              </OrgCardBody>
            </OrgCard>
          </div>

          {/* Row 3 – Payments + Bills */}
          <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 20 }}>
            {/* Payments */}
            <OrgCard>
              <OrgCardHeader title="Payments" subtitle={`${org.payments.length} record${org.payments.length !== 1 ? "s" : ""}`} />
              <OrgCardBody>
                {org.payments.length === 0 ? (
                  <EmptyState icon={CreditCard} message="No payments recorded yet." />
                ) : (
                  <InlineTable heads={[{ label: "Amount" }, { label: "Method" }, { label: "Status" }, { label: "Date" }, { label: "" }]}>
                    {org.payments.map((p: SubscriptionPaymentRow, idx: number) => (
                      <InlineRow key={p.id} idx={idx}>
                        <InlineTd bold>{p.amount != null ? formatCurrency(p.amount, p.currency) : "—"}</InlineTd>
                        <InlineTd muted>{p.method ?? "—"}</InlineTd>
                        <InlineTd><PaymentStatusBadge status={p.status} /></InlineTd>
                        <InlineTd muted>{formatDateTime(p.createdAt)}</InlineTd>
                        <InlineTd>
                          {(p.status === "PENDING" || p.status === "PROCESSING") && (
                            <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                              <Button size="sm" variant="outline" onClick={() => handleVerifyPayment(p, "PAID")} className="shrink-0 whitespace-nowrap text-emerald-600 border-emerald-200 hover:bg-emerald-50 h-8 min-w-[72px] px-3 text-xs gap-1.5">
                                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> Paid
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => handleVerifyPayment(p, "FAILED")} className="shrink-0 whitespace-nowrap text-red-600 border-red-200 hover:bg-red-50 h-8 min-w-[72px] px-3 text-xs gap-1.5">
                                <XCircle className="h-3.5 w-3.5 shrink-0" /> Failed
                              </Button>
                            </div>
                          )}
                        </InlineTd>
                      </InlineRow>
                    ))}
                  </InlineTable>
                )}
              </OrgCardBody>
            </OrgCard>

            {/* Bills */}
            <OrgCard>
              <OrgCardHeader title="Bills" subtitle={`${org.bills.length} record${org.bills.length !== 1 ? "s" : ""}`} />
              <OrgCardBody>
                {org.bills.length === 0 ? (
                  <EmptyState icon={FileText} message="No bills generated yet." />
                ) : (
                  <InlineTable heads={[{ label: "Bill #" }, { label: "Plan" }, { label: "Term" }, { label: "Base", align: "right" }, { label: "GST", align: "right" }, { label: "Total", align: "right" }, { label: "Payment" }]}>
                    {org.bills.map((b: SubscriptionBillRow, idx: number) => (
                      <InlineRow key={b.id} idx={idx}>
                        <InlineTd bold>{b.billNumber}</InlineTd>
                        <InlineTd muted>{b.planName}</InlineTd>
                        <InlineTd muted>{b.termLabel}</InlineTd>
                        <InlineTd align="right">{formatCurrency(b.baseAmount, b.currency)}</InlineTd>
                        <InlineTd align="right" muted>{formatCurrency(b.gstAmount, b.currency)}</InlineTd>
                        <InlineTd align="right" bold>{formatCurrency(b.totalAmount, b.currency)}</InlineTd>
                        <InlineTd><PaymentStatusBadge status={b.paymentStatus} /></InlineTd>
                      </InlineRow>
                    ))}
                  </InlineTable>
                )}
              </OrgCardBody>
            </OrgCard>
          </div>

          {/* Row 4 – Staff / Users (matches workshop directory split) */}
          <OrgCard>
            <OrgCardHeader
              title="Users & Staff"
              subtitle={
                orgDirectoryLoading
                  ? "Loading…"
                  : `${staffDirectory.length} staff · ${usersDirectory.length} user${usersDirectory.length !== 1 ? "s" : ""}`
              }
            />
            <OrgCardBody>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
                {(
                  [
                    { id: "staff" as const, label: "Staff", count: staffDirectory.length, icon: UserCog },
                    { id: "users" as const, label: "Users", count: usersDirectory.length, icon: Users },
                  ] as const
                ).map((tab) => {
                  const active = peopleTab === tab.id;
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setPeopleTab(tab.id)}
                      style={{
                        height: 34,
                        padding: "0 14px",
                        borderRadius: 8,
                        border: active ? "1px solid #50B0A0" : "1px solid var(--border)",
                        background: active ? "#EFF8F6" : "var(--card)",
                        color: active ? "#2F7D70" : "var(--foreground)",
                        fontSize: 13,
                        fontWeight: active ? 600 : 500,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <Icon style={{ width: 14, height: 14 }} />
                      {tab.label}
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          padding: "1px 7px",
                          borderRadius: 999,
                          background: active ? "#D5EFEA" : "var(--secondary)",
                          color: active ? "#2F7D70" : "var(--muted-foreground)",
                        }}
                      >
                        {tab.count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {orgDirectoryLoading ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {[0, 1, 2].map((i) => <Skel key={i} h={40} />)}
                </div>
              ) : peopleRows.length === 0 ? (
                <EmptyState
                  icon={peopleTab === "staff" ? UserCog : Users}
                  message={
                    peopleTab === "staff"
                      ? "No staff in this organization (mechanics, admins, etc.)."
                      : "No office users in this organization (branch managers, supervisors, receptionists)."
                  }
                />
              ) : (
                <InlineTable heads={[{ label: "Name" }, { label: "Contact" }, { label: "Branch" }, { label: "Role" }, { label: "Status" }, { label: "Last login" }]}>
                  {peopleRows.map((u, idx) => (
                    <InlineRow key={u.id} idx={idx}>
                      <InlineTd>
                        <div style={{ fontWeight: 600 }}>{u.name}</div>
                        <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>{u.email}</div>
                      </InlineTd>
                      <InlineTd muted>{u.phone ?? "—"}</InlineTd>
                      <InlineTd muted>{u.branchName ?? "—"}</InlineTd>
                      <InlineTd>
                        <Badge variant={peopleTab === "users" ? "info" : u.role === "SUPER_ADMIN" ? "default" : "success"}>
                          {roleDisplayLabel(u.role)}
                        </Badge>
                      </InlineTd>
                      <InlineTd>
                        <Badge variant={u.isActive ? "success" : "muted"}>{u.isActive ? "Active" : "Inactive"}</Badge>
                      </InlineTd>
                      <InlineTd muted>{u.lastLoginAt ? formatDateTime(u.lastLoginAt) : "—"}</InlineTd>
                    </InlineRow>
                  ))}
                </InlineTable>
              )}
            </OrgCardBody>
          </OrgCard>

          {/* Row 5 – Branches (org-scoped) */}
          <OrgCard>
            <OrgCardHeader
              title="Branches"
              subtitle={orgDirectoryLoading ? "Loading…" : `${orgBranches.length} branch${orgBranches.length !== 1 ? "es" : ""} in this organization`}
              right={
                <Button
                  size="sm"
                  onClick={() => {
                    resetBranchForm();
                    setAddBranchOpen(true);
                  }}
                  className="shrink-0 whitespace-nowrap"
                  style={{ paddingLeft: 14, paddingRight: 14, gap: 6 }}
                >
                  <Plus className="h-3.5 w-3.5 shrink-0" />
                  Add branch
                </Button>
              }
            />
            <OrgCardBody>
              {orgDirectoryLoading ? (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
                  {[0, 1].map((i) => <Skel key={i} h={110} />)}
                </div>
              ) : orgBranches.length === 0 ? (
                <EmptyState icon={Building2} message="No branches yet. Click Add branch to create one." />
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
                  {orgBranches.map((b) => {
                    const location = [b.city, b.state].filter(Boolean).join(", ") || b.address || "—";
                    return (
                      <div
                        key={b.id}
                        style={{
                          border: "1px solid var(--border)",
                          borderRadius: 10,
                          padding: "14px 16px",
                          background: "rgba(248,250,252,0.6)",
                          display: "flex",
                          flexDirection: "column",
                          gap: 8,
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 14, fontWeight: 600 }}>{b.name}</div>
                            {b.code && (
                              <div style={{ fontSize: 11, color: "var(--muted-foreground)", fontFamily: "monospace", marginTop: 2 }}>{b.code}</div>
                            )}
                          </div>
                          <Badge variant={b.isActive ? "success" : "muted"}>{b.isActive ? "Active" : "Inactive"}</Badge>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--muted-foreground)" }}>
                          <MapPin style={{ width: 13, height: 13, flexShrink: 0 }} />
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{location}</span>
                        </div>
                        {b.phone && (
                          <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>Phone: {b.phone}</div>
                        )}
                        {(b.managerName || b.managerPhone) && (
                          <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
                            Manager: {[b.managerName, b.managerPhone].filter(Boolean).join(" · ")}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </OrgCardBody>
          </OrgCard>

          {/* Row 6 – Organization Activity (Workshop activityLogs) */}
          <OrgCard>
            <OrgCardHeader
              title="Organization Activity"
              subtitle="Workshop operational events for this organization only"
            />
            <OrgCardBody>
              <OrganizationActivityPanel
                organizationId={org.organization.id}
                organizationName={org.organization.name}
                embedded
                pageSize={20}
              />
            </OrgCardBody>
          </OrgCard>

          {/* Row 7 – Platform audit (org-scoped SaaS events) */}
          <OrgCard>
            <OrgCardHeader
              title="Platform Audit"
              subtitle={
                orgDirectoryLoading
                  ? "Loading…"
                  : `${orgLogs.length} platform event${orgLogs.length !== 1 ? "s" : ""} for this organization`
              }
            />
            <OrgCardBody>
              {orgDirectoryLoading ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {[0, 1, 2].map((i) => <Skel key={i} h={36} />)}
                </div>
              ) : orgLogs.length === 0 ? (
                <EmptyState icon={ClipboardList} message="No platform audit events for this organization." />
              ) : (
                <PlatformAuditList rows={orgLogs} />
              )}
            </OrgCardBody>
          </OrgCard>

        </div>
      </div>

      {/* Mark Paid Modal */}
      {markPaidOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: "12px" }}>
          <div style={{ background: "var(--card)", borderRadius: 16, boxShadow: "0 20px 60px rgba(0,0,0,0.18)", width: "100%", maxWidth: 440, overflow: "hidden" }}>
            <div style={{ padding: "24px 24px 0" }}>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "var(--foreground)" }}>Mark Subscription Paid</h2>
              <p style={{ margin: "6px 0 0", fontSize: 13, color: "var(--muted-foreground)", lineHeight: 1.5 }}>
                This will immediately activate the subscription for{" "}
                <strong style={{ color: "var(--foreground)" }}>{org.organization.name}</strong>.
                A renewal record and bill will be generated.
              </p>
            </div>
            <div style={{ padding: "clamp(12px, 2.5vw, 20px) clamp(12px, 3vw, 24px)", display: "flex", flexDirection: "column", gap: 14 }}>
              <FormField label="Amount Received (optional)">
                <Input type="number" placeholder=" e.g. 9999" value={markPaidAmount} onChange={(e) => setMarkPaidAmount(e.target.value)} disabled={markPaidLoading} />
              </FormField>
              <FormField label="Transaction Reference">
                <Input placeholder=" e.g. UTR123456789" value={markPaidTxn} onChange={(e) => setMarkPaidTxn(e.target.value)} disabled={markPaidLoading} />
              </FormField>
              <FormField label="Admin Notes">
                <Input placeholder=" e.g. Cash payment received" value={markPaidNotes} onChange={(e) => setMarkPaidNotes(e.target.value)} disabled={markPaidLoading} />
              </FormField>
            </div>
            <div style={{ padding: "12px 24px 20px", display: "flex", justifyContent: "flex-end", gap: 8, borderTop: "1px solid var(--border)" }}>
              <Button variant="outline" onClick={() => setMarkPaidOpen(false)} disabled={markPaidLoading} style={{ minWidth: 100 }}>Cancel</Button>
              <Button onClick={handleMarkPaid} disabled={markPaidLoading} className="min-w-35">
                {markPaidLoading ? <><Loader2 className="h-4 w-4 animate-spin" /> Confirming…</> : "Confirm Mark Paid"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Convert Trial Modal */}
      {convertTrialOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: "12px" }}>
          <div style={{ background: "var(--card)", borderRadius: 16, boxShadow: "0 20px 60px rgba(0,0,0,0.18)", width: "100%", maxWidth: 440, overflow: "hidden" }}>
            <div style={{ padding: "24px 24px 0" }}>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "var(--foreground)" }}>Convert Trial</h2>
              <p style={{ margin: "6px 0 0", fontSize: 13, color: "var(--muted-foreground)", lineHeight: 1.5 }}>
                Convert the trial for{" "}
                <strong style={{ color: "var(--foreground)" }}>{org.organization.name}</strong>{" "}
                to an ACTIVE subscription. This does not charge a payment gateway — it activates with markPaid=true (manual conversion).
              </p>
            </div>
            <div style={{ padding: "12px 24px 20px", display: "flex", justifyContent: "flex-end", gap: 8, borderTop: "1px solid var(--border)", marginTop: 20 }}>
              <Button variant="outline" onClick={() => setConvertTrialOpen(false)} disabled={convertTrialLoading} style={{ minWidth: 100 }}>Cancel</Button>
              <Button onClick={handleConvertTrial} disabled={convertTrialLoading} className="min-w-35">
                {convertTrialLoading ? <><Loader2 className="h-4 w-4 animate-spin" /> Converting…</> : "Convert to Active"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Suspend Modal */}
      {suspendOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: "12px" }}>
          <div style={{ background: "var(--card)", borderRadius: 16, boxShadow: "0 20px 60px rgba(0,0,0,0.18)", width: "100%", maxWidth: 440, overflow: "hidden" }}>
            <div style={{ padding: "24px 24px 0" }}>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "var(--foreground)" }}>Suspend Organization</h2>
              <p style={{ margin: "6px 0 0", fontSize: 13, color: "var(--muted-foreground)", lineHeight: 1.5 }}>
                This will cancel the subscription and restrict access for{" "}
                <strong style={{ color: "var(--foreground)" }}>{org.organization.name}</strong>.
                A reason is required.
              </p>
            </div>
            <div style={{ padding: "clamp(12px, 2.5vw, 20px) clamp(12px, 3vw, 24px)", display: "flex", flexDirection: "column", gap: 14 }}>
              <FormField label="Suspension reason">
                <Input
                  placeholder="e.g. Non-payment / policy violation"
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                  disabled={lifecycleLoading}
                  autoFocus
                />
              </FormField>
            </div>
            <div style={{ padding: "12px 24px 20px", display: "flex", justifyContent: "flex-end", gap: 8, borderTop: "1px solid var(--border)" }}>
              <Button
                variant="outline"
                onClick={() => { setSuspendOpen(false); setSuspendReason("Admin suspension"); }}
                disabled={lifecycleLoading}
                style={{ minWidth: 100 }}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleSuspend}
                disabled={lifecycleLoading || !suspendReason.trim()}
                className="min-w-35"
              >
                {lifecycleLoading ? <><Loader2 className="h-4 w-4 animate-spin" /> Suspending…</> : "Suspend"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Restore Modal */}
      {restoreOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: "12px" }}>
          <div style={{ background: "var(--card)", borderRadius: 16, boxShadow: "0 20px 60px rgba(0,0,0,0.18)", width: "100%", maxWidth: 440, overflow: "hidden" }}>
            <div style={{ padding: "24px 24px 0" }}>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "var(--foreground)" }}>Restore Organization</h2>
              <p style={{ margin: "6px 0 0", fontSize: 13, color: "var(--muted-foreground)", lineHeight: 1.5 }}>
                Restore{" "}
                <strong style={{ color: "var(--foreground)" }}>{org.organization.name}</strong>{" "}
                and set the subscription status back to ACTIVE.
              </p>
            </div>
            <div style={{ padding: "12px 24px 20px", display: "flex", justifyContent: "flex-end", gap: 8, borderTop: "1px solid var(--border)", marginTop: 20 }}>
              <Button variant="outline" onClick={() => setRestoreOpen(false)} disabled={lifecycleLoading} style={{ minWidth: 100 }}>Cancel</Button>
              <Button onClick={handleRestore} disabled={lifecycleLoading} className="min-w-35">
                {lifecycleLoading ? <><Loader2 className="h-4 w-4 animate-spin" /> Restoring…</> : "Restore"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add Branch Modal */}
      {addBranchOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: "12px" }}>
          <div style={{ background: "var(--card)", borderRadius: 16, boxShadow: "0 20px 60px rgba(0,0,0,0.18)", width: "100%", maxWidth: 520, maxHeight: "90vh", overflow: "auto" }}>
            <div style={{ padding: "24px 24px 0" }}>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "var(--foreground)" }}>Add branch</h2>
              <p style={{ margin: "6px 0 0", fontSize: 13, color: "var(--muted-foreground)", lineHeight: 1.5 }}>
                Create a workshop location for{" "}
                <strong style={{ color: "var(--foreground)" }}>{org.organization.name}</strong>.
                {branchLimit != null && org.usage.branchesUsed >= branchLimit && (
                  <> If the plan is at its branch cap ({org.usage.branchesUsed}/{branchLimit}), the limit will be raised automatically.</>
                )}
              </p>
            </div>
            <div style={{ padding: "clamp(12px, 2.5vw, 20px) clamp(12px, 3vw, 24px)", display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 120px", gap: 12 }}>
                <FormField label="Branch name *">
                  <Input
                    placeholder="e.g. Kahalgaon"
                    value={branchForm.name}
                    onChange={(e) => setBranchForm((f) => ({ ...f, name: e.target.value }))}
                    disabled={addBranchLoading}
                    autoFocus
                  />
                </FormField>
                <FormField label="Code">
                  <Input
                    placeholder="e.g. KHL"
                    value={branchForm.code}
                    onChange={(e) => setBranchForm((f) => ({ ...f, code: e.target.value }))}
                    disabled={addBranchLoading}
                  />
                </FormField>
              </div>
              <FormField label="Address *">
                <Input
                  placeholder="Street / area"
                  value={branchForm.address}
                  onChange={(e) => setBranchForm((f) => ({ ...f, address: e.target.value }))}
                  disabled={addBranchLoading}
                />
              </FormField>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 100px", gap: 12 }}>
                <FormField label="City">
                  <Input
                    value={branchForm.city}
                    onChange={(e) => setBranchForm((f) => ({ ...f, city: e.target.value }))}
                    disabled={addBranchLoading}
                  />
                </FormField>
                <FormField label="State">
                  <Input
                    value={branchForm.state}
                    onChange={(e) => setBranchForm((f) => ({ ...f, state: e.target.value }))}
                    disabled={addBranchLoading}
                  />
                </FormField>
                <FormField label="PIN">
                  <Input
                    value={branchForm.pincode}
                    onChange={(e) => setBranchForm((f) => ({ ...f, pincode: e.target.value }))}
                    disabled={addBranchLoading}
                  />
                </FormField>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <FormField label="Phone *">
                  <Input
                    inputMode="numeric"
                    placeholder="10-digit mobile"
                    value={branchForm.phone}
                    onChange={(e) =>
                      setBranchForm((f) => ({
                        ...f,
                        phone: e.target.value.replace(/\D/g, "").slice(0, 10),
                      }))
                    }
                    disabled={addBranchLoading}
                  />
                </FormField>
                <FormField label="Email">
                  <Input
                    type="email"
                    value={branchForm.email}
                    onChange={(e) => setBranchForm((f) => ({ ...f, email: e.target.value }))}
                    disabled={addBranchLoading}
                  />
                </FormField>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <FormField label="Manager name">
                  <Input
                    value={branchForm.managerName}
                    onChange={(e) => setBranchForm((f) => ({ ...f, managerName: e.target.value }))}
                    disabled={addBranchLoading}
                  />
                </FormField>
                <FormField label="Manager phone">
                  <Input
                    inputMode="numeric"
                    placeholder="10-digit"
                    value={branchForm.managerPhone}
                    onChange={(e) =>
                      setBranchForm((f) => ({
                        ...f,
                        managerPhone: e.target.value.replace(/\D/g, "").slice(0, 10),
                      }))
                    }
                    disabled={addBranchLoading}
                  />
                </FormField>
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--foreground)", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={branchForm.isActive}
                  onChange={(e) => setBranchForm((f) => ({ ...f, isActive: e.target.checked }))}
                  disabled={addBranchLoading}
                />
                Site is active / accepting work
              </label>
            </div>
            <div style={{ padding: "12px 24px 20px", display: "flex", justifyContent: "flex-end", gap: 8, borderTop: "1px solid var(--border)" }}>
              <Button
                variant="outline"
                onClick={() => {
                  setAddBranchOpen(false);
                  resetBranchForm();
                }}
                disabled={addBranchLoading}
                style={{ minWidth: 100 }}
              >
                Cancel
              </Button>
              <Button onClick={() => void handleAddBranch()} disabled={addBranchLoading} className="min-w-35">
                {addBranchLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Creating…
                  </>
                ) : (
                  "Create branch"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
