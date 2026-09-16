"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X, LayoutDashboard, Building2, CreditCard, FileText, RefreshCw, Receipt, Tag, ClipboardList, LogOut, Settings } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { useSidebarStore } from "@/store/sidebar-store";

const NAV_SECTIONS = [
  {
    label: "Overview",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "Organizations", href: "/organizations", icon: Building2 },
    ],
  },
  {
    label: "Billing",
    items: [
      { label: "Subscriptions", href: "/subscriptions", icon: CreditCard },
      { label: "Payments", href: "/payments", icon: FileText },
      { label: "Renewals", href: "/renewals", icon: RefreshCw },
      { label: "Bills", href: "/bills", icon: Receipt },
      { label: "Plans", href: "/plans", icon: Tag },
    ],
  },
  {
    label: "Platform",
    items: [
      { label: "Usage", href: "/usage", icon: LayoutDashboard },
      { label: "Referrals", href: "/referrals", icon: Tag },
      { label: "Audit Logs", href: "/audit", icon: ClipboardList },
      { label: "Messaging", href: "/messaging", icon: FileText },
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
  const { collapsed, collapse, closeMobile } = useSidebarStore();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // On mobile always show full sidebar; collapsed only applies on desktop
  const W = (collapsed && !isMobile) ? "56px" : "260px";
  const isCollapsed = collapsed && !isMobile;

  function handleNav() {
    collapse();
    closeMobile();
  }

  return (
    <aside
      style={{
        width: W,
        minHeight: "100vh",
        height: "100%",
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
          aria-label="Prime Detailers Admin — Dashboard"
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
            src="/icon.svg"
            alt=""
            width={36}
            height={36}
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              flexShrink: 0,
              display: "block",
              objectFit: "contain",
            }}
          />
          {!isCollapsed && (
            <div style={{ minWidth: 0, overflow: "hidden", flex: 1 }}>
              <p style={{ fontSize: "15px", fontWeight: 700, color: "var(--foreground)", margin: 0, lineHeight: 1.2, whiteSpace: "nowrap" }}>
                Prime Detailers
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
      <nav style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: isCollapsed ? "12px 0" : "12px 10px", display: "flex", flexDirection: "column", gap: isCollapsed ? "4px" : "12px" }}>
        {NAV_SECTIONS.map((section, groupIdx) => (
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
                return (
                  <Link
                    key={href}
                    href={href}
                    title={isCollapsed ? label : undefined}
                    aria-label={label}
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
                    <Icon style={{ width: "16px", height: "16px", flexShrink: 0, opacity: active ? 1 : 0.9 }} />
                    {!isCollapsed && <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>}
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </nav>

      {/* Footer / Profile */}
      <div
        style={{
          flexShrink: 0,
          borderTop: "1px solid var(--border)",
          padding: isCollapsed ? "10px 4px" : "10px",
          display: "flex",
          flexDirection: "column",
          gap: "2px",
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
          title={isCollapsed ? "Sign out" : undefined}
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
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--destructive-hover, #fef2f2)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
        >
          <LogOut style={{ width: "16px", height: "16px", flexShrink: 0 }} />
          {!isCollapsed && <span>Sign out</span>}
        </button>
      </div>
    </aside>
  );
}
