"use client";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Bell, PanelLeft, Sun, Moon, Menu } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { useSidebarStore } from "@/store/sidebar-store";

interface TopbarProps { title?: string; description?: string; actions?: ReactNode; }

export function Topbar({ title, description, actions }: TopbarProps) {
  const user = useAuthStore((s) => s.user);
  const { collapsed, expand, openMobile } = useSidebarStore();
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("admin_dark_mode");
    const isDark = stored === "true";
    setDark(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  function toggleDark() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("admin_dark_mode", String(next));
  }

  const iconBtn = (props: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode }) => (
    <button
      {...props}
      style={{ width: 36, height: 36, minWidth: 36, borderRadius: 8, border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted-foreground)", transition: "background 0.15s", flexShrink: 0 }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--accent)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    />
  );

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
        {/* Page actions — sm+ only to avoid topbar crowding on mobile */}
        <div className="hidden sm:flex" style={{ alignItems: "center", gap: 4 }}>
          {actions}
        </div>

        {/* Dark mode toggle */}
        <button
          aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
          onClick={toggleDark}
          style={{ width: 36, height: 36, borderRadius: 8, border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.15s", flexShrink: 0, color: "var(--muted-foreground)" }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "transparent")}
          onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "transparent")}
        >
          {dark ? <Sun style={{ width: 18, height: 18 }} /> : <Moon style={{ width: 18, height: 18 }} />}
        </button>

        <button
          aria-label="Notifications"
          style={{ width: 36, height: 36, borderRadius: 8, border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted-foreground)", transition: "background 0.15s", flexShrink: 0 }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "transparent")}
          onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "transparent")}
        >
          <Bell style={{ width: 16, height: 16 }} />
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 8, paddingLeft: 8, borderLeft: "1px solid var(--border)" }}>
          <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#50B0A0", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
            {user?.name?.[0]?.toUpperCase() ?? "A"}
          </div>
        </div>
      </div>
    </header>
  );
}
