"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X, LayoutDashboard, Building2, CreditCard, FileText, RefreshCw, Receipt, Tag, ClipboardList, LogOut, Settings, Mail, Timer, CalendarClock, Megaphone, Flag, BarChart3, LifeBuoy } from "lucide-react";
import { useAuthStore, canAccessNav } from "@/store/auth-store";
import { useSidebarStore } from "@/store/sidebar-store";
import { usePendingPaymentsStore } from "@/store/pending-payments-store";
import { useSupportTicketsStore } from "@/store/support-tickets-store";

const NAV_SECTIONS = [
  {
    label: "Overview",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "Organizations", href: "/organizations", icon: Building2 },
      { label: "Free Trials", href: "/free-trials", icon: Timer },
    ],
  },
  {
    label: "Billing",
    items: [
      { label: "Subscriptions", href: "/subscriptions", icon: CreditCard },
      { label: "Payments", href: "/payments", icon: FileText },
      { label: "Upcoming Renewals", href: "/upcoming-renewals", icon: CalendarClock },
      { label: "Renewals", href: "/renewals", icon: RefreshCw },
      { label: "Bills", href: "/bills", icon: Receipt },
      { label: "Plans", href: "/plans", icon: Tag },
    ],
  },
  {
    label: "Growth",
    items: [
      { label: "Referrals", href: "/referrals", icon: Tag },
      { label: "Banners", href: "/banners", icon: Megaphone },
    ],
  },
  {
    label: "Platform",
    items: [
      { label: "Usage", href: "/usage", icon: BarChart3 },
      { label: "Support Tickets", href: "/support-tickets", icon: LifeBuoy },
      { label: "Contact Messages", href: "/contacts", icon: Mail },
      { label: "Audit Logs", href: "/audit", icon: ClipboardList },
      { label: "Messaging", href: "/messaging", icon: FileText },
      { label: "Feature Flags", href: "/feature-flags", icon: Flag },
    ],
  },
  {
    label: "System",
    items: [
      { label: "Settings", href: "/settings", icon: Settings },
    ],
  },
];

function isActive(pathname: string, href: string) {
  return pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
}

export function Sidebar() {
  const pathname = usePathname();
  const { user, clearSession } = useAuthStore();
  const { collapsed, closeMobile, collapse } = useSidebarStore();
  const pendingPayments = usePendingPaymentsStore((s) => s.count);
  const startPaymentPolling = usePendingPaymentsStore((s) => s.startPolling);
  const supportUnreadCount = useSupportTicketsStore((s) => s.unreadCount);
  const startSupportPolling = useSupportTicketsStore((s) => s.startPolling);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => startPaymentPolling(), [startPaymentPolling]);
  useEffect(() => startSupportPolling(), [startSupportPolling]);

  // On mobile always show full sidebar; collapsed only applies on desktop
  const W = (collapsed && !isMobile) ? "56px" : "260px";
  const isCollapsed = collapsed && !isMobile;

  function handleNav() {
    closeMobile();
    if (!isMobile) collapse();
  }

  return (
    <aside
      style={{
        width: W,
        height: "100%",
        maxHeight: "100%",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        background: "var(--card)",
        borderRight: "1px solid var(--border)",
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        transition: "width 0.2s ease",
        overflow: "hidden",
      }}
    >
      {/* Brand header — click → dashboard */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          height: "56px",
          padding: isCollapsed ? "0 10px" : "0 10px",
          borderBottom: "1px solid var(--border)",
          flexShrink: 0,
        }}
        className="md:h-16"
      >
        <Link
          href="/dashboard"
          onClick={handleNav}
          title="Go to dashboard"
          aria-label="MY DETAIL OS Admin — Dashboard"
          style={{
            display: "flex",
            alignItems: "center",
            gap: isCollapsed ? 0 : "12px",
            minWidth: 0,
            flex: 1,
            textDecoration: "none",
            color: "inherit",
            justifyContent: isCollapsed ? "center" : undefined,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/my-detail-os-mark.png"
            alt=""
            width={36}
            height={36}
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              flexShrink: 0,
              display: "block",
              objectFit: "cover",
            }}
          />
          {!isCollapsed && (
            <div style={{ minWidth: 0, overflow: "hidden", flex: 1 }}>
              <p style={{ fontSize: "15px", fontWeight: 700, color: "var(--foreground)", margin: 0, lineHeight: 1.2, whiteSpace: "nowrap" }}>
                MY DETAIL OS
              </p>
              <p style={{ fontSize: "11px", color: "var(--muted-foreground)", margin: 0, opacity: 0.8 }}>Admin</p>
            </div>
          )}
        </Link>
        {/* Close button — mobile only */}
        <button
          aria-label="Close navigation"
          onClick={closeMobile}
          className="flex md:hidden"
          style={{ width: 32, height: 32, borderRadius: 8, border: "none", background: "transparent", cursor: "pointer", alignItems: "center", justifyContent: "center", color: "var(--muted-foreground)", flexShrink: 0 }}
        >
          <X style={{ width: 16, height: 16 }} />
        </button>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, minHeight: 0, overflowY: "auto", overflowX: "hidden", padding: isCollapsed ? "12px 0" : "12px 10px", display: "flex", flexDirection: "column", gap: isCollapsed ? "4px" : "12px" }}>
        {NAV_SECTIONS.map((section) => ({
          ...section,
          items: section.items.filter((item) => canAccessNav(user?.role, item.href)),
        })).filter((section) => section.items.length > 0).map((section, groupIdx) => (
          <section key={section.label} style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
            {!isCollapsed && (
              <div style={{ padding: groupIdx === 0 ? "0 12px 6px" : "16px 12px 6px" }}>
                <h2 style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--foreground)", margin: 0 }}>
                  {section.label}
                </h2>
              </div>
            )}
            {isCollapsed && groupIdx > 0 && (
              <div style={{ height: "1px", background: "var(--border)", margin: "6px 8px" }} />
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: "2px", padding: isCollapsed ? "0 4px" : "0 6px" }}>
              {section.items.map(({ label, href, icon: Icon }) => {
                const active = isActive(pathname, href);
                const badge =
                  href === "/payments" && pendingPayments > 0
                    ? pendingPayments > 99
                      ? "99+"
                      : String(pendingPayments)
                    : href === "/support-tickets" && supportUnreadCount > 0
                      ? supportUnreadCount > 99
                        ? "99+"
                        : String(supportUnreadCount)
                      : null;
                const badgeKind =
                  href === "/payments"
                    ? "pending"
                    : href === "/support-tickets"
                      ? "unread"
                      : null;
                const navHref =
                  href === "/payments" && pendingPayments > 0
                    ? "/payments?status=review"
                    : href;
                return (
                  <Link
                    key={href}
                    href={navHref}
                    title={
                      isCollapsed
                        ? badge && badgeKind
                          ? `${label} (${badge} ${badgeKind})`
                          : label
                        : undefined
                    }
                    aria-label={
                      badge && badgeKind ? `${label}, ${badge} ${badgeKind}` : label
                    }
                    onClick={handleNav}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: isCollapsed ? 0 : "10px",
                      padding: isCollapsed ? "9px" : "9px 12px",
                      borderRadius: "10px",
                      fontSize: "13px",
                      fontWeight: 500,
                      textDecoration: "none",
                      transition: "background 0.15s, color 0.15s, transform 0.15s",
                      background: active ? "#50B0A0" : "transparent",
                      color: active ? "#ffffff" : "var(--sidebar-foreground)",
                      justifyContent: isCollapsed ? "center" : undefined,
                      transformOrigin: "left center",
                      position: "relative",
                    }}
                    onMouseEnter={(e) => {
                      const el = e.currentTarget as HTMLAnchorElement;
                      el.style.transform = "scale(1.04)";
                      if (!active) {
                        el.style.background = "var(--sidebar-accent)";
                        el.style.color = "var(--foreground)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      const el = e.currentTarget as HTMLAnchorElement;
                      el.style.transform = "scale(1)";
                      if (!active) {
                        el.style.background = "transparent";
                        el.style.color = "var(--sidebar-foreground)";
                      }
                    }}
                  >
                    <span style={{ position: "relative", display: "inline-flex", flexShrink: 0 }}>
                      <Icon style={{ width: "16px", height: "16px", opacity: active ? 1 : 0.9 }} />
                      {badge && isCollapsed && (
                        <span
                          style={{
                            position: "absolute",
                            top: -6,
                            right: -8,
                            minWidth: 16,
                            height: 16,
                            padding: "0 4px",
                            borderRadius: 999,
                            background: "#ea580c",
                            color: "#fff",
                            fontSize: 9,
                            fontWeight: 700,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            lineHeight: 1,
                            boxShadow: "0 0 0 2px var(--card)",
                          }}
                        >
                          {badge}
                        </span>
                      )}
                    </span>
                    {!isCollapsed && (
                      <>
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                          {label}
                        </span>
                        {badge && (
                          <span
                            style={{
                              minWidth: 20,
                              height: 20,
                              padding: "0 6px",
                              borderRadius: 999,
                              background: active ? "rgba(255,255,255,0.25)" : "#ea580c",
                              color: "#fff",
                              fontSize: 11,
                              fontWeight: 700,
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                            }}
                          >
                            {badge}
                          </span>
                        )}
                      </>
                    )}
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </nav>

      {/* Footer / Profile — always pinned so Sign out stays visible */}
      <div
        style={{
          flexShrink: 0,
          marginTop: "auto",
          borderTop: "1px solid var(--border)",
          padding: isCollapsed ? "10px 4px" : "10px",
          display: "flex",
          flexDirection: "column",
          gap: "2px",
          background: "var(--card)",
          position: "relative",
          zIndex: 1,
        }}
      >
        {!isCollapsed && (
          <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 12px", borderRadius: "10px" }}>
            <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "#50B0A0", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 700, flexShrink: 0 }}>
              {user?.name?.[0]?.toUpperCase() ?? "A"}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <p style={{ fontSize: "13px", fontWeight: 500, color: "var(--foreground)", margin: 0, lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user?.name ?? "Admin"}</p>
              <p style={{ fontSize: "10px", color: "var(--muted-foreground)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user?.role}</p>
            </div>
          </div>
        )}
        <button
          type="button"
          title="Sign out"
          aria-label="Sign out"
          onClick={() => { clearSession(); window.location.href = "/login"; }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: isCollapsed ? 0 : "10px",
            padding: isCollapsed ? "9px" : "8px 12px",
            borderRadius: "10px",
            fontSize: "13px",
            fontWeight: 500,
            color: "#dc2626",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            width: "100%",
            justifyContent: isCollapsed ? "center" : undefined,
            transition: "background 0.15s",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#fef2f2"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
        >
          <LogOut style={{ width: "16px", height: "16px", flexShrink: 0 }} />
          {!isCollapsed && <span>Sign out</span>}
        </button>
      </div>
    </aside>
  );
}
