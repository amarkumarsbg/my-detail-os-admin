"use client";

import { useEffect, useState } from "react";
import { Mail, MessageSquare, Smartphone } from "lucide-react";
import { Topbar } from "@/components/layout/topbar";
import { ErrorBanner } from "@/components/shared/error-banner";
import { RefreshingBar } from "@/components/shared/loading";
import { FilterBar } from "@/components/shared/filter-bar";
import { Badge } from "@/components/ui/badge";
import { getPlatformMessaging, type PlatformMessagingStatus } from "@/api/platform";

export default function MessagingPage() {
  const [status, setStatus] = useState<PlatformMessagingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load(silent = false) {
    if (!silent) setLoading(true); else setRefreshing(true);
    setError(null);
    try {
      setStatus(await getPlatformMessaging());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load messaging status");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { load(); }, []);

  const cards = status
    ? [
        {
          name: "SMS (Twilio)",
          enabled: status.smsEnabled,
          detail: status.twilioFromSet ? "From number configured" : "From number missing",
          icon: Smartphone,
          tone: { bg: "#eff6ff", color: "#2563eb" },
        },
        {
          name: "WhatsApp (Twilio)",
          enabled: status.whatsappEnabled,
          detail: status.twilioWhatsappFromSet ? "WhatsApp from configured" : "WhatsApp from missing",
          icon: MessageSquare,
          tone: { bg: "#faf5ff", color: "#7c3aed" },
        },
        {
          name: "Email (Resend)",
          enabled: status.emailEnabled,
          detail: status.mailFromSet ? "MAIL_FROM configured" : "MAIL_FROM missing",
          icon: Mail,
          tone: { bg: "#f0fdf4", color: "#16a34a" },
        },
      ]
    : [];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      <RefreshingBar show={refreshing} />
      <Topbar title="Messaging" description="Provider capability flags from backend configuration" />
      <FilterBar onRefresh={() => load(true)} refreshing={refreshing || loading} />
      <div style={{ flex: 1, overflowY: "auto", padding: "clamp(10px, 2vw, 16px) clamp(12px, 3vw, 24px)", background: "var(--page-bg)", display: "flex", flexDirection: "column", gap: 16 }}>
        {error && <ErrorBanner message={error} onRetry={load} />}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
          {(loading ? [1, 2, 3] : cards).map((item, i) => {
            if (loading || typeof item === "number") {
              return <div key={i} style={{ height: 120, borderRadius: 14, background: "var(--card)", border: "1px solid var(--border)" }} />;
            }
            const Icon = item.icon;
            return (
              <div key={item.name} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, padding: "16px 18px", boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: item.tone.bg, color: item.tone.color, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Icon style={{ width: 18, height: 18 }} />
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{item.name}</div>
                  </div>
                  <Badge variant={item.enabled ? "success" : "muted"}>{item.enabled ? "Enabled" : "Disabled"}</Badge>
                </div>
                <div style={{ marginTop: 12, fontSize: 13, color: "var(--muted-foreground)" }}>{item.detail}</div>
              </div>
            );
          })}
        </div>

        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, padding: 18 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>Notes</div>
          <div style={{ fontSize: 13, color: "var(--muted-foreground)", lineHeight: 1.5 }}>
            This endpoint reports capability flags only (no secrets, no templates). Provider credentials remain in backend environment variables.
          </div>
        </div>
      </div>
    </div>
  );
}
