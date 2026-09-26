"use client";

import { create } from "zustand";
import { toast } from "sonner";
import { getPlatformDashboard, listPlatformPayments, type PlatformPaymentRow } from "@/api/platform";

interface PendingPaymentsState {
  count: number;
  items: PlatformPaymentRow[];
  loading: boolean;
  lastFetchedAt: number;
  refresh: (opts?: { silentToast?: boolean }) => Promise<void>;
  startPolling: (intervalMs?: number) => () => void;
}

let pollTimer: ReturnType<typeof setInterval> | null = null;
let inflight: Promise<void> | null = null;

async function fetchPendingItems(): Promise<PlatformPaymentRow[]> {
  const [pendingRes, processingRes] = await Promise.all([
    listPlatformPayments({ limit: 10, status: "PENDING" }).catch(() => ({
      payments: [] as PlatformPaymentRow[],
    })),
    listPlatformPayments({ limit: 10, status: "PROCESSING" }).catch(() => ({
      payments: [] as PlatformPaymentRow[],
    })),
  ]);
  const byId = new Map<string, PlatformPaymentRow>();
  for (const p of [...pendingRes.payments, ...processingRes.payments]) {
    byId.set(p.id, p);
  }
  return Array.from(byId.values())
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10);
}

export const usePendingPaymentsStore = create<PendingPaymentsState>((set, get) => ({
  count: 0,
  items: [],
  loading: false,
  lastFetchedAt: 0,

  refresh: async (opts) => {
    if (inflight) return inflight;
    inflight = (async () => {
      set({ loading: true });
      try {
        const prevCount = get().count;
        const hadFetched = get().lastFetchedAt > 0;
        const [dash, items] = await Promise.all([
          getPlatformDashboard(),
          fetchPendingItems(),
        ]);
        const nextCount = dash.pendingPayments ?? 0;
        set({
          count: nextCount,
          items,
          lastFetchedAt: Date.now(),
          loading: false,
        });

        if (!opts?.silentToast && hadFetched && nextCount > prevCount) {
          const delta = nextCount - prevCount;
          toast.info(
            delta === 1
              ? "1 payment awaiting review"
              : `${delta} payments awaiting review`,
            {
              description: "A workshop requested renewal payment.",
              action: {
                label: "Review",
                onClick: () => {
                  window.location.assign("/payments?status=review");
                },
              },
            }
          );
        }
      } catch {
        // Keep last known count on network blips
        set({ loading: false });
      } finally {
        inflight = null;
      }
    })();
    return inflight;
  },

  startPolling: (intervalMs = 45_000) => {
    void get().refresh({ silentToast: true });
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
      void get().refresh();
    }, intervalMs);

    const onVisible = () => {
      if (document.visibilityState === "visible") void get().refresh({ silentToast: true });
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
      document.removeEventListener("visibilitychange", onVisible);
    };
  },
}));
