"use client";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Bell, PanelLeft, Sun, Moon, Menu, CreditCard, LifeBuoy, CalendarClock } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { useSidebarStore } from "@/store/sidebar-store";
import { usePendingPaymentsStore } from "@/store/pending-payments-store";
import { useSupportTicketsStore } from "@/store/support-tickets-store";
import { useDemoRequestsStore } from "@/store/demo-requests-store";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";

const PAYMENTS_REVIEW_HREF = "/payments?status=review";
const SUPPORT_HREF = "/support-tickets";
const DEMOS_HREF = "/demo-requests";

interface TopbarProps { title?: string; description?: string; actions?: ReactNode; }

export function Topbar({ title, description, actions }: TopbarProps) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { collapsed, expand, openMobile } = useSidebarStore();
  const pendingCount = usePendingPaymentsStore((s) => s.count);
  const paymentUnread = usePendingPaymentsStore((s) => s.unreadCount);
  const pendingItems = usePendingPaymentsStore((s) => s.items);
  const refreshPending = usePendingPaymentsStore((s) => s.refresh);
  const markPaymentsSeen = usePendingPaymentsStore((s) => s.markSeen);

  const supportOpenCount = useSupportTicketsStore((s) => s.openCount);
  const supportUnread = useSupportTicketsStore((s) => s.unreadCount);
  const supportItems = useSupportTicketsStore((s) => s.items);
  const refreshSupport = useSupportTicketsStore((s) => s.refresh);
  const markSupportSeen = useSupportTicketsStore((s) => s.markSeen);

  const demoScheduledCount = useDemoRequestsStore((s) => s.scheduledCount);
  const demoUnread = useDemoRequestsStore((s) => s.unreadCount);
  const demoItems = useDemoRequestsStore((s) => s.items);
  const refreshDemos = useDemoRequestsStore((s) => s.refresh);
  const markDemosSeen = useDemoRequestsStore((s) => s.markSeen);

  const [dark, setDark] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  const unreadTotal = paymentUnread + supportUnread + demoUnread;

  useEffect(() => {
    const stored = localStorage.getItem("admin_dark_mode");
    const isDark = stored === "true";
    setDark(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  useEffect(() => {
    if (!notifOpen) return;
    void Promise.all([
      refreshPending({ silentToast: true }),
      refreshSupport({ silentToast: true }),
      refreshDemos({ silentToast: true }),
    ]).then(() => {
      markPaymentsSeen();
      markSupportSeen();
      markDemosSeen();
    });

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
  }, [
    notifOpen,
    refreshPending,
    refreshSupport,
    refreshDemos,
    markPaymentsSeen,
    markSupportSeen,
    markDemosSeen,
  ]);

  function toggleDark() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("admin_dark_mode", String(next));
  }

  function goToPaymentsReview() {
    markPaymentsSeen();
    setNotifOpen(false);
    router.push(PAYMENTS_REVIEW_HREF);
  }

  function goToSupport(ticketId?: string) {
    markSupportSeen();
    setNotifOpen(false);
    router.push(ticketId ? `${SUPPORT_HREF}?ticket=${encodeURIComponent(ticketId)}` : SUPPORT_HREF);
  }

  function goToDemos() {
    markDemosSeen();
    setNotifOpen(false);
    router.push(DEMOS_HREF);
  }

  const badgeLabel =
    unreadTotal > 0 ? (unreadTotal > 99 ? "99+" : String(unreadTotal)) : null;

  const summaryParts: string[] = [];
  if (pendingCount > 0) {
    summaryParts.push(
      `${pendingCount} payment${pendingCount === 1 ? "" : "s"} awaiting review`
    );
  }
  if (supportOpenCount > 0) {
    summaryParts.push(
      `${supportOpenCount} open support ticket${supportOpenCount === 1 ? "" : "s"}`
    );
  }
  if (demoScheduledCount > 0) {
    summaryParts.push(
      `${demoScheduledCount} scheduled demo${demoScheduledCount === 1 ? "" : "s"}`
    );
  }
  const summaryText = summaryParts.length > 0 ? summaryParts.join(" · ") : "You're all caught up";
  const hasAnyItems =
    pendingItems.length > 0 || supportItems.length > 0 || demoItems.length > 0;

  return (
    <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 56, padding: "0 16px", background: "var(--topbar-bg)", borderBottom: "1px solid var(--topbar-border)", flexShrink: 0, gap: 8, transition: "background 0.2s, border-color 0.2s" }}
      className="md:h-16 md:px-6"
    >
      <button
        aria-label="Open navigation"
        className="flex md:hidden"
        onClick={openMobile}
        style={{ width: 36, height: 36, borderRadius: 8, border: "none", background: "transparent", cursor: "pointer", alignItems: "center", justifyContent: "center", color: "var(--muted-foreground)", flexShrink: 0 }}
      >
        <Menu style={{ width: 20, height: 20 }} />
      </button>

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

      <div style={{ flex: 1, minWidth: 0 }}>
        {title && <h1 style={{ fontSize: 15, fontWeight: 600, color: "var(--foreground)", margin: 0, lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} className="md:text-base">{title}</h1>}
        {description && <p className="hidden sm:block" style={{ fontSize: 12, color: "var(--muted-foreground)", margin: "1px 0 0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{description}</p>}
      </div>

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
              className="fixed top-14 left-3 right-3 z-50 w-auto max-w-none sm:absolute sm:top-[calc(100%+8px)] sm:left-auto sm:right-0 sm:w-[min(360px,calc(100vw-24px))]"
              style={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                boxShadow: "0 12px 40px rgba(15, 23, 42, 0.12)",
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
                <div style={{ minWidth: 0, flex: 1 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "var(--foreground)" }}>
                    Notifications
                  </p>
                  <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--muted-foreground)" }}>
                    {summaryText}
                  </p>
                </div>
              </div>

              <div style={{ maxHeight: 360, overflowY: "auto" }}>
                {!hasAnyItems ? (
                  <div
                    style={{
                      padding: "28px 16px",
                      textAlign: "center",
                      color: "var(--muted-foreground)",
                      fontSize: 13,
                    }}
                  >
                    No pending payments, demos, or support replies right now.
                  </div>
                ) : (
                  <>
                    {demoItems.map((item) => (
                      <button
                        key={`demo-${item.id}`}
                        type="button"
                        onClick={goToDemos}
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
                            background: "#EFF8F6",
                            border: "1px solid #A8D9D0",
                            color: "#3D8F82",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          <CalendarClock style={{ width: 14, height: 14 }} />
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
                            {item.workshopName || "Demo request"}
                          </p>
                          <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--muted-foreground)" }}>
                            {formatDate(item.slotDate)} · {item.slotLabel}
                          </p>
                          <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--muted-foreground)" }}>
                            {item.fullName}
                            {item.city ? ` · ${item.city}` : ""}
                          </p>
                        </div>
                      </button>
                    ))}

                    {supportItems.map((item) => (
                      <button
                        key={`support-${item.id}`}
                        type="button"
                        onClick={() => goToSupport(item.id)}
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
                            background: "#EFF8F6",
                            border: "1px solid #A8D9D0",
                            color: "#3D8F82",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          <LifeBuoy style={{ width: 14, height: 14 }} />
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
                            {item.subject}
                          </p>
                          <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--muted-foreground)" }}>
                            {item.organizationName || "Workshop"}
                            {" · "}
                            {item.messageCount} msg{item.messageCount === 1 ? "" : "s"}
                            {" · "}
                            {item.status.replace(/_/g, " ")}
                          </p>
                          <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--muted-foreground)" }}>
                            {item.lastMessagePreview
                              ? item.lastMessagePreview.slice(0, 80)
                              : formatDateTime(item.lastMessageAt ?? item.updatedAt)}
                          </p>
                        </div>
                      </button>
                    ))}

                    {pendingItems.map((item) => (
                      <button
                        key={`pay-${item.id}`}
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
                    ))}
                  </>
                )}
              </div>

              {(supportOpenCount > 0 || pendingCount > 0 || demoScheduledCount > 0) && (
                <div
                  style={{
                    padding: "10px 14px",
                    borderTop: "1px solid var(--border)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                  }}
                >
                  {demoScheduledCount > 0 && (
                    <button
                      type="button"
                      onClick={goToDemos}
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
                      Open demo requests →
                    </button>
                  )}
                  {supportOpenCount > 0 && (
                    <button
                      type="button"
                      onClick={() => goToSupport()}
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
                      Open support inbox →
                    </button>
                  )}
                  {pendingCount > 0 && (
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
                  )}
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
