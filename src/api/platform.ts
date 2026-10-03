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

// ─── Organization Activity (Workshop activityLogs) ────────────────────────────

export interface OrganizationActivityRow {
  id: string;
  organizationId: string;
  organizationName: string;
  action: string;
  entityType: string;
  entityId: string;
  entityLabel: string | null;
  userId: string | null;
  userName: string | null;
  details: string | null;
  createdAt: string;
}

export interface OrganizationActivityResponse {
  activities: OrganizationActivityRow[];
  total: number;
  page: number;
  pageSize: number;
  organization: { id: string; name: string };
}

export async function listPlatformOrganizationActivity(
  orgId: string,
  params?: {
    action?: string;
    entityType?: string;
    actor?: string;
    search?: string;
    since?: string;
    until?: string;
    page?: number;
    limit?: number;
  }
): Promise<OrganizationActivityResponse> {
  const q = new URLSearchParams();
  if (params?.action) q.set("action", params.action);
  if (params?.entityType) q.set("entityType", params.entityType);
  if (params?.actor) q.set("actor", params.actor);
  if (params?.search) q.set("search", params.search);
  if (params?.since) q.set("since", params.since);
  if (params?.until) q.set("until", params.until);
  if (params?.page) q.set("page", String(params.page));
  if (params?.limit) q.set("limit", String(params.limit));
  const qs = q.toString() ? `?${q}` : "";
  return apiClient.get(`/api/platform/organizations/${encodeURIComponent(orgId)}/activity${qs}`);
}

// ─── Referrals ────────────────────────────────────────────────────────────────

export interface PlatformReferralCode {
  id: string;
  code: string;
  discountAmount: number;
  isActive: boolean;
  createdBy: string;
  notes: string | null;
  organizationId?: string | null;
  organizationName?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PlatformReferralWallet {
  id: string;
  organizationId: string;
  organizationName: string;
  points: number;
  updatedAt: string;
  transactions: Array<{
    id: string;
    type: string;
    points: number;
    amountInr: number;
    referralCode: string;
    sourceOrganizationId: string | null;
    paymentId: string | null;
    notes: string | null;
    createdAt: string;
  }>;
}

export async function listPlatformReferralWallets(): Promise<{
  wallets: PlatformReferralWallet[];
}> {
  return apiClient.get("/api/platform/referral-wallets");
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

// ─── Marketing banners ────────────────────────────────────────────────────────

export type MarketingBannerAudience = "TRIAL" | "ACTIVE" | "ALL";

export interface PlatformMarketingBanner {
  id: string;
  title: string;
  body: string;
  audience: MarketingBannerAudience;
  enabled: boolean;
  ctaLabel: string;
  ctaUrl: string;
  sortOrder: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export async function listPlatformBanners(): Promise<{
  banners: PlatformMarketingBanner[];
  total: number;
}> {
  return apiClient.get("/api/platform/banners");
}

export async function createPlatformBanner(input: {
  title: string;
  body?: string;
  audience?: MarketingBannerAudience;
  enabled?: boolean;
  ctaLabel?: string;
  ctaUrl?: string;
}): Promise<PlatformMarketingBanner> {
  return apiClient.post("/api/platform/banners", input);
}

export async function patchPlatformBanner(
  id: string,
  input: Partial<{
    title: string;
    body: string;
    audience: MarketingBannerAudience;
    enabled: boolean;
    ctaLabel: string;
    ctaUrl: string;
    sortOrder: number;
  }>
): Promise<PlatformMarketingBanner> {
  return apiClient.patch(`/api/platform/banners/${encodeURIComponent(id)}`, input);
}

export async function deletePlatformBanner(id: string): Promise<{ deleted: boolean; id: string }> {
  return apiClient.delete(`/api/platform/banners/${encodeURIComponent(id)}`);
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

export type CreatePlatformBranchInput = {
  name: string;
  address: string;
  phone: string;
  code?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  email?: string | null;
  managerName?: string | null;
  managerPhone?: string | null;
  isActive?: boolean;
  /** Default true on the API — raises plan branch cap when at limit. */
  raiseLimitIfNeeded?: boolean;
};

export async function createPlatformBranch(
  orgId: string,
  body: CreatePlatformBranchInput
): Promise<{ branch: PlatformBranchRow; limitRaisedTo: number | null }> {
  return apiClient.post(`/api/platform/organizations/${encodeURIComponent(orgId)}/branches`, body);
}

// ─── Plans ────────────────────────────────────────────────────────────────────

/** Supported billing term lengths in months. */
export type PlanTermMonths = 1 | 3 | 12 | 24 | 36 | 60;

export interface PlatformPlanTemplate {
  planCode: string;
  planName: string;
  limits: {
    maxBranches: number | null;
    maxStaff?: number | null;
    maxCustomers?: number | null;
  };
  publicVisible?: boolean;
  /** Term lengths this plan may be sold on. */
  allowedTerms?: PlanTermMonths[];
}

export interface PlatformPlanOverride {
  planName?: string;
  publicVisible?: boolean;
  allowedTerms?: PlanTermMonths[];
  limits?: {
    maxBranches?: number | null;
    maxStaff?: number | null;
    maxCustomers?: number | null;
  };
}

export interface PlatformPlansPricing {
  editableViaPlatformPlansApi: readonly string[];
  source: "environment" | "platform_settings" | string;
  currency: string;
  termBasePrices: Record<string, number>;
  planMultipliers: Record<string, number>;
  addOns: {
    extraBranchPrice: number;
    extraUserPrice: number;
    onboardingFee: number;
    referralDiscount: number;
  };
  gstPercent: number;
  envKeys?: readonly string[];
}

export interface PlatformPlansResponse {
  plans: PlatformPlanTemplate[];
  overrides: Partial<Record<string, PlatformPlanOverride>>;
  pricing: PlatformPlansPricing;
}

export async function getPlatformPlans(): Promise<PlatformPlansResponse> {
  return apiClient.get("/api/platform/plans");
}

export async function putPlatformPlans(input: {
  planOverrides?: Partial<Record<string, PlatformPlanOverride>>;
  pricing?: {
    currency?: string;
    gstPercent?: number;
    termBasePrices?: Partial<Record<PlanTermMonths, number>>;
    planMultipliers?: Partial<Record<string, number>>;
    addOns?: Partial<{
      extraBranchPrice: number;
      extraUserPrice: number;
      onboardingFee: number;
      referralDiscount: number;
    }>;
  };
}): Promise<PlatformPlansResponse> {
  return apiClient.put("/api/platform/plans", input);
}

export async function createPlatformPlan(input: {
  planCode: string;
  planName: string;
  limits?: {
    maxBranches?: number | null;
    maxStaff?: number | null;
    maxCustomers?: number | null;
  };
  publicVisible?: boolean;
  allowedTerms?: PlanTermMonths[];
  multiplier?: number;
}): Promise<PlatformPlansResponse> {
  return apiClient.post("/api/platform/plans", input);
}

export async function deletePlatformPlan(planCode: string): Promise<PlatformPlansResponse> {
  return apiClient.delete(`/api/platform/plans/${encodeURIComponent(planCode)}`);
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

export type PlatformMessagingChannel = "sms" | "whatsapp" | "email";

export async function sendPlatformMessagingTest(input: {
  channel: PlatformMessagingChannel;
  to: string;
  subject?: string;
  body?: string;
}): Promise<{ ok: true; channel: PlatformMessagingChannel; to: string }> {
  return apiClient.post("/api/platform/messaging/test", input);
}

// ─── Website contact messages ─────────────────────────────────────────────────

export interface PlatformContactMessage {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  businessName: string | null;
  subject: string | null;
  message: string;
  source: string | null;
  createdAt: string;
  ip: string | null;
  userAgent: string | null;
}

export async function listPlatformContacts(params?: {
  limit?: number;
  search?: string;
}): Promise<{ contacts: PlatformContactMessage[]; total: number }> {
  const qs = new URLSearchParams();
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.search) qs.set("search", params.search);
  const q = qs.toString();
  return apiClient.get(`/api/platform/contacts${q ? `?${q}` : ""}`);
}

// ─── Support tickets (workshop Help & Support) ────────────────────────────────

export type PlatformSupportTicketStatus =
  | "OPEN"
  | "IN_PROGRESS"
  | "WAITING_ON_CUSTOMER"
  | "RESOLVED"
  | "CLOSED";

export type PlatformSupportTicketPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export type PlatformSupportMessageAuthor = "WORKSHOP" | "SUPPORT";

export interface PlatformSupportTicketMessage {
  id: string;
  author: PlatformSupportMessageAuthor;
  authorName: string;
  body: string;
  createdAt: string;
  attachmentIds?: string[];
}

export interface PlatformSupportTicketAttachment {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  dataUrl: string;
  createdAt?: string;
  kind?: "file" | "voice";
}

export interface PlatformSupportTicketListItem {
  id: string;
  subject: string;
  category: string;
  priority: PlatformSupportTicketPriority;
  status: PlatformSupportTicketStatus;
  organizationId: string | null;
  organizationName: string | null;
  createdByName: string | null;
  messageCount: number;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  lastMessageAuthor: PlatformSupportMessageAuthor | null;
  createdAt: string;
  updatedAt: string;
}

export interface PlatformSupportTicket {
  id: string;
  subject: string;
  category: string;
  priority: PlatformSupportTicketPriority;
  description: string;
  status: PlatformSupportTicketStatus;
  createdByUserId?: string;
  createdByName?: string;
  organizationId?: string | null;
  organizationName?: string | null;
  attachments: PlatformSupportTicketAttachment[];
  messages: PlatformSupportTicketMessage[];
  createdAt: string;
  updatedAt: string;
}

export async function listPlatformSupportTickets(params?: {
  limit?: number;
  search?: string;
  status?: string;
  organizationId?: string;
}): Promise<{
  tickets: PlatformSupportTicketListItem[];
  total: number;
  openCount: number;
}> {
  const qs = new URLSearchParams();
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.search) qs.set("search", params.search);
  if (params?.status) qs.set("status", params.status);
  if (params?.organizationId) qs.set("organizationId", params.organizationId);
  const q = qs.toString();
  return apiClient.get(`/api/platform/support-tickets${q ? `?${q}` : ""}`);
}

export async function getPlatformSupportTicket(id: string): Promise<{
  ticket: PlatformSupportTicket;
  organization: { id: string; name: string; slug: string } | null;
}> {
  return apiClient.get(`/api/platform/support-tickets/${id}`);
}

export async function patchPlatformSupportTicket(
  id: string,
  input: { status?: PlatformSupportTicketStatus; priority?: PlatformSupportTicketPriority }
): Promise<{ ticket: PlatformSupportTicket }> {
  return apiClient.patch(`/api/platform/support-tickets/${id}`, input);
}

export async function replyPlatformSupportTicket(
  id: string,
  input: {
    body: string;
    status?: PlatformSupportTicketStatus;
    attachments?: PlatformSupportTicketAttachment[];
  }
): Promise<{
  ticket: PlatformSupportTicket;
  message: PlatformSupportTicketMessage;
  repliedBy: string;
}> {
  return apiClient.post(`/api/platform/support-tickets/${id}/reply`, input);
}

// ─── Suspend / Restore ────────────────────────────────────────────────────────

export async function suspendOrg(orgId: string, reason: string): Promise<{ suspended: boolean; reason: string }> {
  return apiClient.post(`/api/platform/organizations/${orgId}/suspend`, { reason });
}

export async function restoreOrg(orgId: string, reason?: string): Promise<{ restored: boolean }> {
  return apiClient.post(`/api/platform/organizations/${orgId}/restore`, { reason });
}
