"use client";

import { useEffect } from "react";
import { useRequireAuth } from "@/hooks/use-auth";
import { Sidebar } from "@/components/layout/sidebar";
import { PageSkeleton } from "@/components/ui/skeleton";
import { useSidebarStore } from "@/store/sidebar-store";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { ready } = useRequireAuth();
  const { mobileOpen, closeMobile } = useSidebarStore();

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") closeMobile(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [closeMobile]);

  if (!ready) return <PageSkeleton />;

  return (
    <div className="flex h-dvh overflow-hidden" style={{ background: "var(--page-bg)" }}>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          style={{ background: "rgba(0,0,0,0.55)" }}
          onClick={closeMobile}
          aria-hidden="true"
        />
      )}

      {/* Sidebar — drawer on mobile, static on desktop */}
      <div className={`
        fixed inset-y-0 left-0 z-50 shrink-0 h-dvh
        md:relative md:z-auto md:h-full md:translate-x-0!
        transition-transform duration-200 ease-in-out
        ${mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
      `}>
        <Sidebar />
      </div>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {children}
      </main>
    </div>
  );
}
