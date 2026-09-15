import { apiClient } from "@/lib/api-client";
import type { SubscriptionPaymentRow, SubscriptionBillRow } from "@/types";

// ─── Renewal ──────────────────────────────────────────────────────────────────

export interface PlatformRenewalRow {
  billId: string;
  billNumber: string;
  organizationId: string;
  organizationName: string;
  planName: string;
  termMonths: number;
  termLabel: string;
  previousExpiry: string;
  newExpiry: string;
  baseAmount: number;
  referralDiscount: number;
  gstAmount: number;
  totalAmount: number;
  currency: string;
  paymentStatus: string | null;
  txnReference: string | null;
  renewalDate: string;
}

export async function listPlatformRenewals(params?: {
  orgId?: string;
  paymentStatus?: string;
  since?: string;
  until?: string;
  page?: number;
  limit?: number;
}): Promise<{ renewals: PlatformRenewalRow[]; total: number }> {
  const q = new URLSearchParams();
  if (params?.orgId) q.set("orgId", params.orgId);
  if (params?.paymentStatus) q.set("paymentStatus", params.paymentStatus);
  if (params?.since) q.set("since", params.since);
  if (params?.until) q.set("until", params.until);
  if (params?.page) q.set("page", String(params.page));
  if (params?.limit) q.set("limit", String(params.limit));
  const qs = q.toString() ? `?${q}` : "";
  return apiClient.get(`/api/platform/renewals${qs}`);
}

// ─── Bills ────────────────────────────────────────────────────────────────────

export interface PlatformBillRow extends SubscriptionBillRow {
  organizationId: string;
  organizationName: string;
  verifiedAt: string | null;
}

export async function listPlatformBills(params?: {
  orgId?: string;
  search?: string;
  paymentStatus?: string;
  since?: string;
  until?: string;
  page?: number;
  limit?: number;
}): Promise<{ bills: PlatformBillRow[]; total: number }> {
  const q = new URLSearchParams();
  if (params?.orgId) q.set("orgId", params.orgId);
  if (params?.search) q.set("search", params.search);
  if (params?.paymentStatus) q.set("paymentStatus", params.paymentStatus);
  if (params?.since) q.set("since", params.since);
  if (params?.until) q.set("until", params.until);
  if (params?.page) q.set("page", String(params.page));
  if (params?.limit) q.set("limit", String(params.limit));
  const qs = q.toString() ? `?${q}` : "";
  return apiClient.get(`/api/platform/bills${qs}`);
}

// ─── Payments ─────────────────────────────────────────────────────────────────

export interface PlatformPaymentRow extends SubscriptionPaymentRow {
  organizationId: string;
  organizationName: string;
  planCode: string;
  planName: string;
  billNumber: string | null;
}

export async function listPlatformPayments(params?: {
  orgId?: string;
  status?: string;
  since?: string;
  until?: string;
  page?: number;
  limit?: number;
}): Promise<{ payments: PlatformPaymentRow[]; total: number }> {
  const q = new URLSearchParams();
  if (params?.orgId) q.set("orgId", params.orgId);
  if (params?.status) q.set("status", params.status);
  if (params?.since) q.set("since", params.since);
  if (params?.until) q.set("until", params.until);
  if (params?.page) q.set("page", String(params.page));
  if (params?.limit) q.set("limit", String(params.limit));
  const qs = q.toString() ? `?${q}` : "";
  return apiClient.get(`/api/platform/payments${qs}`);
}

// ─── Audit ────────────────────────────────────────────────────────────────────

export interface PlatformAuditRow {
  id: string;
  organizationId: string | null;
  organizationName: string | null;
  actor: string;
  action: string;
  before: unknown;
  after: unknown;
  createdAt: string;
}

export async function listPlatformAudit(params?: {
  orgId?: string;
  action?: string;
  since?: string;
  until?: string;
  page?: number;
  limit?: number;
}): Promise<{ logs: PlatformAuditRow[]; total: number }> {
  const q = new URLSearchParams();
  if (params?.orgId) q.set("orgId", params.orgId);
  if (params?.action) q.set("action", params.action);
  if (params?.since) q.set("since", params.since);
  if (params?.until) q.set("until", params.until);
  if (params?.page) q.set("page", String(params.page));
  if (params?.limit) q.set("limit", String(params.limit));
  const qs = q.toString() ? `?${q}` : "";
  return apiClient.get(`/api/platform/audit${qs}`);
}

// ─── Referrals ────────────────────────────────────────────────────────────────

export interface PlatformReferralCode {
  id: string;
  code: string;
  discountAmount: number;
  isActive: boolean;
  createdBy: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export async function listPlatformReferrals(showInactive = false): Promise<{
  referralCodes: PlatformReferralCode[];
}> {
  const qs = showInactive ? "?showInactive=true" : "";
  return apiClient.get(`/api/platform/referrals${qs}`);
}

export async function createPlatformReferral(input: {
  code: string;
  discountAmount?: number;
  notes?: string;
}): Promise<PlatformReferralCode> {
  return apiClient.post("/api/platform/referrals", input);
}

export async function patchPlatformReferral(
  id: string,
  input: { discountAmount?: number; notes?: string | null; isActive?: boolean }
): Promise<PlatformReferralCode> {
  return apiClient.patch(`/api/platform/referrals/${id}`, input);
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export interface PlatformDashboard {
  organizations: { total: number; active: number; inactive: number };
  subscriptionStatusBreakdown: Record<string, number>;
  revenueMtd: {
    amount: number;
    paidPaymentCount: number;
    currency: string;
    periodStart: string;
  };
  pendingPayments: number;
  activeReferrals: number;
}

export async function getPlatformDashboard(): Promise<PlatformDashboard> {
  return apiClient.get("/api/platform/dashboard");
}

// ─── Users ────────────────────────────────────────────────────────────────────

export interface PlatformUserRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  isActive: boolean;
  branchId: string;
  branchName: string;
  organizationId: string;
  organizationName: string;
  lastLoginAt: string | null;
}

export async function listPlatformUsers(params?: {
  orgId?: string;
  role?: string;
  isActive?: boolean;
  search?: string;
  includePlatformOwner?: boolean;
  page?: number;
  limit?: number;
}): Promise<{ users: PlatformUserRow[]; total: number }> {
  const q = new URLSearchParams();
  if (params?.orgId) q.set("orgId", params.orgId);
  if (params?.role) q.set("role", params.role);
  if (params?.isActive !== undefined) q.set("isActive", String(params.isActive));
  if (params?.search) q.set("search", params.search);
  if (params?.includePlatformOwner) q.set("includePlatformOwner", "true");
  if (params?.page) q.set("page", String(params.page));
  if (params?.limit) q.set("limit", String(params.limit));
  const qs = q.toString() ? `?${q}` : "";
  return apiClient.get(`/api/platform/users${qs}`);
}

// ─── Branches ─────────────────────────────────────────────────────────────────

export interface PlatformBranchRow {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  isActive: boolean;
  code: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  email: string | null;
  managerName: string | null;
  managerPhone: string | null;
  organizationId: string;
  organizationName: string;
}

export async function listPlatformBranches(params?: {
  orgId?: string;
  isActive?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<{ branches: PlatformBranchRow[]; total: number }> {
  const q = new URLSearchParams();
  if (params?.orgId) q.set("orgId", params.orgId);
  if (params?.isActive !== undefined) q.set("isActive", String(params.isActive));
  if (params?.search) q.set("search", params.search);
  if (params?.page) q.set("page", String(params.page));
  if (params?.limit) q.set("limit", String(params.limit));
  const qs = q.toString() ? `?${q}` : "";
  return apiClient.get(`/api/platform/branches${qs}`);
}

// ─── Plans ────────────────────────────────────────────────────────────────────

export interface PlatformPlanTemplate {
  planCode: string;
  planName: string;
  limits: {
    maxBranches: number | null;
    maxStaff?: number | null;
    maxCustomers?: number | null;
  };
}

export interface PlatformPlanOverride {
  planName?: string;
  limits?: {
    maxBranches?: number | null;
    maxStaff?: number | null;
    maxCustomers?: number | null;
  };
}

export async function getPlatformPlans(): Promise<{
  plans: PlatformPlanTemplate[];
  overrides: Partial<Record<string, PlatformPlanOverride>>;
}> {
  return apiClient.get("/api/platform/plans");
}

export async function putPlatformPlans(planOverrides: Partial<Record<string, PlatformPlanOverride>>): Promise<{
  plans: PlatformPlanTemplate[];
  overrides: Partial<Record<string, PlatformPlanOverride>>;
}> {
  return apiClient.put("/api/platform/plans", { planOverrides });
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export interface PlatformSettingsValues {
  trialDaysDefault: number;
  defaultTermMonths: number;
  defaultGstPercent: number;
  defaultContactUsUrl: string | null;
  defaultContactPhone: string | null;
  defaultUpgradeUrl: string | null;
}

export interface PlatformSettingsResponse {
  settings: PlatformSettingsValues;
  meta: {
    updatedAt: string;
    updatedBy: string | null;
    envFallbacks?: {
      defaultContactUsUrl: string | null;
      defaultUpgradeUrl: string | null;
      defaultContactPhone: string | null;
    };
  };
}

export async function getPlatformSettings(): Promise<PlatformSettingsResponse> {
  return apiClient.get("/api/platform/settings");
}

export async function putPlatformSettings(
  input: Partial<PlatformSettingsValues>
): Promise<PlatformSettingsResponse> {
  return apiClient.put("/api/platform/settings", input);
}

// ─── Messaging ────────────────────────────────────────────────────────────────

export interface PlatformMessagingStatus {
  smsEnabled: boolean;
  whatsappEnabled: boolean;
  emailEnabled: boolean;
  mailFromSet: boolean;
  twilioFromSet: boolean;
  twilioWhatsappFromSet: boolean;
}

export async function getPlatformMessaging(): Promise<PlatformMessagingStatus> {
  return apiClient.get("/api/platform/messaging");
}

// ─── Suspend / Restore ────────────────────────────────────────────────────────

export async function suspendOrg(orgId: string, reason: string): Promise<{ suspended: boolean; reason: string }> {
  return apiClient.post(`/api/platform/organizations/${orgId}/suspend`, { reason });
}

export async function restoreOrg(orgId: string, reason?: string): Promise<{ restored: boolean }> {
  return apiClient.post(`/api/platform/organizations/${orgId}/restore`, { reason });
}
