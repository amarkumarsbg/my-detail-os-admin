"use client";

import { create } from "zustand";
import type { AdminUser } from "@/types";

interface AuthState {
  user: AdminUser | null;
  token: string | null;
  isAuthenticated: boolean;
  setSession: (token: string, user: AdminUser) => void;
  clearSession: () => void;
  hydrate: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,

  setSession: (token, user) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("admin_token", token);
      localStorage.setItem("admin_user", JSON.stringify(user));
    }
    set({ token, user, isAuthenticated: true });
  },

  clearSession: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("admin_token");
      localStorage.removeItem("admin_user");
    }
    set({ token: null, user: null, isAuthenticated: false });
  },

  hydrate: () => {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem("admin_token");
    const userRaw = localStorage.getItem("admin_user");
    if (token && userRaw) {
      try {
        const user = JSON.parse(userRaw) as AdminUser;
        set({ token, user, isAuthenticated: true });
      } catch {
        localStorage.removeItem("admin_token");
        localStorage.removeItem("admin_user");
      }
    }
  },
}));

const PORTAL_ROLES = new Set([
  "PLATFORM_OWNER",
  "SUPER_ADMIN",
  "SALES_REP",
  "BILLING_SPEC",
]);

/** Platform admin portal roles from the operations spec. */
export function isAdminRole(role: string | undefined): boolean {
  return !!role && PORTAL_ROLES.has(role);
}

export function canAccessNav(role: string | undefined, href: string): boolean {
  if (role === "SALES_REP") {
    return [
      "/dashboard",
      "/organizations",
      "/free-trials",
      "/upcoming-renewals",
      "/contacts",
      "/support-tickets",
      "/referrals",
    ].some((p) => href === p || href.startsWith(`${p}/`));
  }
  if (role === "BILLING_SPEC") {
    return [
      "/dashboard",
      "/organizations",
      "/subscriptions",
      "/payments",
      "/renewals",
      "/upcoming-renewals",
      "/bills",
      "/plans",
    ].some((p) => href === p || href.startsWith(`${p}/`));
  }
  return true;
}
