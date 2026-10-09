"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getMe } from "@/api/auth";
import { useAuthStore, isAdminRole } from "@/store/auth-store";

/**
 * Gate admin routes: hydrate from localStorage, then verify the JWT with
 * `/api/auth/me`. Invalid / expired / non-admin sessions are cleared.
 */
export function useRequireAuth() {
  const { user, isAuthenticated, hydrate, setSession, clearSession } = useAuthStore();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function verify() {
      hydrate();
      const token =
        typeof window !== "undefined" ? localStorage.getItem("admin_token") : null;

      if (!token) {
        if (!cancelled) {
          clearSession();
          setReady(false);
          router.replace("/login");
        }
        return;
      }

      try {
        const me = await getMe();
        if (cancelled) return;

        if (!isAdminRole(me.user?.role)) {
          clearSession();
          setReady(false);
          router.replace("/login");
          return;
        }

        setSession(token, {
          id: me.user.id,
          name: me.user.name,
          email: me.user.email,
          role: me.user.role,
          organizationId: me.user.organizationId ?? null,
          branchId: me.user.branchId ?? null,
          mustChangePassword: me.user.mustChangePassword,
        });
        setReady(true);
      } catch {
        if (cancelled) return;
        // Never trust a stale localStorage token — force a fresh login.
        clearSession();
        setReady(false);
        router.replace("/login");
      }
    }

    void verify();
    return () => {
      cancelled = true;
    };
  }, [hydrate, setSession, clearSession, router]);

  return {
    user,
    ready: ready && isAuthenticated && isAdminRole(user?.role),
  };
}
