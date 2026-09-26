"use client";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Bell, PanelLeft, Sun, Moon, Menu, CreditCard } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { useSidebarStore } from "@/store/sidebar-store";
import { usePendingPaymentsStore } from "@/store/pending-payments-store";
import { formatCurrency, formatDateTime } from "@/lib/utils";

const PAYMENTS_REVIEW_HREF = "/payments?status=review";

interface TopbarProps { title?: string; description?: string; actions?: ReactNode; }

export function Topbar({ title, description, actions }: TopbarProps) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { collapsed, expand, openMobile } = useSidebarStore();
  const pendingCount = usePendingPaymentsStore((s) => s.count);
  const unreadCount = usePendingPaymentsStore((s) => s.unreadCount);
  const pendingItems = usePendingPaymentsStore((s) => s.items);
  const refreshPending = usePendingPaymentsStore((s) => s.refresh);
  const markSeen = usePendingPaymentsStore((s) => s.markSeen);
  const [dark, setDark] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem("admin_dark_mode");
    const isDark = stored === "true";
    setDark(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  useEffect(() => {
    if (!notifOpen) return;
    void refreshPending({ silentToast: true }).then(() => markSeen());

    function onPointerDown(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setNotifOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [notifOpen, refreshPending, markSeen]);

  function toggleDark() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("admin_dark_mode", String(next));
  }

  function goToPaymentsReview() {
    markSeen();
    setNotifOpen(false);
    router.push(PAYMENTS_REVIEW_HREF);
  }

  const badgeLabel =
    unreadCount > 0 ? (unreadCount > 99 ? "99+" : String(unreadCount)) : null;

  return (
    <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 56, padding: "0 16px", background: "var(--topbar-bg)", borderBottom: "1px solid var(--topbar-border)", flexShrink: 0, gap: 8, transition: "background 0.2s, border-color 0.2s" }}
      className="md:h-16 md:px-6"
    >
      {/* Mobile hamburger */}
      <button
        aria-label="Open navigation"
        className="flex md:hidden"
        onClick={openMobile}
        style={{ width: 36, height: 36, borderRadius: 8, border: "none", background: "transparent", cursor: "pointer", alignItems: "center", justifyContent: "center", color: "var(--muted-foreground)", flexShrink: 0 }}
      >
        <Menu style={{ width: 20, height: 20 }} />
      </button>

      {/* Desktop: expand collapsed sidebar */}
      {collapsed && (
        <button
          aria-label="Expand sidebar"
          className="hidden md:flex"
          onClick={expand}
          style={{ width: 32, height: 32, borderRadius: 8, border: "none", background: "transparent", cursor: "pointer", alignItems: "center", justifyContent: "center", color: "var(--muted-foreground)", flexShrink: 0, transition: "background 0.15s" }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "var(--accent)")}
          onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "transparent")}
        >
          <PanelLeft style={{ width: 16, height: 16 }} />
        </button>
      )}

      {/* Title */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {title && <h1 style={{ fontSize: 15, fontWeight: 600, color: "var(--foreground)", margin: 0, lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} className="md:text-base">{title}</h1>}
        {description && <p className="hidden sm:block" style={{ fontSize: 12, color: "var(--muted-foreground)", margin: "1px 0 0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{description}</p>}
      </div>

      {/* Right controls */}
      <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
        <div className="hidden sm:flex" style={{ alignItems: "center", gap: 4 }}>
          {actions}
        </div>

        <button
          aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
          onClick={toggleDark}
          style={{ width: 36, height: 36, borderRadius: 8, border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.15s", flexShrink: 0, color: "var(--muted-foreground)" }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "var(--accent)")}
          onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "transparent")}
        >
          {dark ? <Sun style={{ width: 18, height: 18 }} /> : <Moon style={{ width: 18, height: 18 }} />}
        </button>

        <div ref={notifRef} style={{ position: "relative" }}>
          <button
            aria-label={
              badgeLabel
                ? `Notifications, ${badgeLabel} unread`
                : "Notifications"
            }
            aria-expanded={notifOpen}
            aria-haspopup="dialog"
            onClick={() => setNotifOpen((v) => !v)}
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              border: "none",
              background: notifOpen ? "var(--accent)" : "transparent",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--muted-foreground)",
              transition: "background 0.15s",
              flexShrink: 0,
              position: "relative",
            }}
            onMouseEnter={(e) => {
              if (!notifOpen) (e.currentTarget as HTMLButtonElement).style.background = "var(--accent)";
            }}
            onMouseLeave={(e) => {
              if (!notifOpen) (e.currentTarget as HTMLButtonElement).style.background = "transparent";
            }}
          >
            <Bell style={{ width: 16, height: 16 }} />
            {badgeLabel && (
              <span
                style={{
                  position: "absolute",
                  top: 4,
                  right: 4,
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
                  boxShadow: "0 0 0 2px var(--topbar-bg)",
                }}
              >
                {badgeLabel}
              </span>
            )}
          </button>

          {notifOpen && (
            <div
              role="dialog"
              aria-label="Notifications"
              style={{
                position: "absolute",
                top: "calc(100% + 8px)",
                right: 0,
                width: "min(360px, calc(100vw - 24px))",
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                boxShadow: "0 12px 40px rgba(15, 23, 42, 0.12)",
                zIndex: 50,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                  padding: "12px 14px",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <div>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "var(--foreground)" }}>
                    Notifications
                  </p>
                  <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--muted-foreground)" }}>
                    {pendingCount > 0
                      ? `${pendingCount} payment${pendingCount === 1 ? "" : "s"} awaiting review`
                      : "You're all caught up"}
                  </p>
                </div>
                {pendingCount > 0 && (
                  <button
                    type="button"
                    onClick={goToPaymentsReview}
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: "#c2410c",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                      padding: 0,
                    }}
                  >
                    Review all
                  </button>
                )}
              </div>

              <div style={{ maxHeight: 320, overflowY: "auto" }}>
                {pendingItems.length === 0 ? (
                  <div
                    style={{
                      padding: "28px 16px",
                      textAlign: "center",
                      color: "var(--muted-foreground)",
                      fontSize: 13,
                    }}
                  >
                    No pending renewals right now.
                  </div>
                ) : (
                  pendingItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={goToPaymentsReview}
                      style={{
                        display: "flex",
                        gap: 10,
                        width: "100%",
                        padding: "12px 14px",
                        border: "none",
                        borderBottom: "1px solid var(--border)",
                        background: "transparent",
                        cursor: "pointer",
                        textAlign: "left",
                        color: "inherit",
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.background = "var(--accent)";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                      }}
                    >
                      <span
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 8,
                          background: "#fff7ed",
                          border: "1px solid #fed7aa",
                          color: "#ea580c",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <CreditCard style={{ width: 14, height: 14 }} />
                      </span>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <p
                          style={{
                            margin: 0,
                            fontSize: 13,
                            fontWeight: 600,
                            color: "var(--foreground)",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {item.organizationName}
                        </p>
                        <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--muted-foreground)" }}>
                          {item.planName}
                          {item.amount != null
                            ? ` · ${formatCurrency(item.amount, item.currency)}`
                            : ""}
                          {" · "}
                          {item.status === "PROCESSING" ? "Processing" : "Pending"}
                        </p>
                        <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--muted-foreground)" }}>
                          {formatDateTime(item.createdAt)}
                        </p>
                      </div>
                    </button>
                  ))
                )}
              </div>

              {pendingCount > 0 && (
                <div style={{ padding: "10px 14px", borderTop: "1px solid var(--border)" }}>
                  <button
                    type="button"
                    onClick={goToPaymentsReview}
                    style={{
                      display: "block",
                      width: "100%",
                      textAlign: "center",
                      fontSize: 13,
                      fontWeight: 600,
                      color: "#50B0A0",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: 0,
                    }}
                  >
                    Open payments queue →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, paddingLeft: 8, borderLeft: "1px solid var(--border)" }}>
          <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#50B0A0", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
            {user?.name?.[0]?.toUpperCase() ?? "A"}
          </div>
        </div>
      </div>
    </header>
  );
}
