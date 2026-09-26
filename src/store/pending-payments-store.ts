"use client";

import { create } from "zustand";
import { toast } from "sonner";
import { getPlatformDashboard, listPlatformPayments, type PlatformPaymentRow } from "@/api/platform";

const SEEN_KEY = "admin_pending_payment_seen_ids";

function loadSeenIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((id): id is string => typeof id === "string"));
  } catch {
    return new Set();
  }
}

function persistSeenIds(ids: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify([...ids]));
  } catch {
    /* ignore quota errors */
  }
}

function unreadFrom(items: PlatformPaymentRow[], seenIds: Set<string>): number {
  return items.filter((item) => !seenIds.has(item.id)).length;
}

interface PendingPaymentsState {
  count: number;
  unreadCount: number;
  items: PlatformPaymentRow[];
  seenIds: Set<string>;
  loading: boolean;
  lastFetchedAt: number;
  refresh: (opts?: { silentToast?: boolean }) => Promise<void>;
  markSeen: () => void;
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
  unreadCount: 0,
  items: [],
  seenIds: new Set(),
  loading: false,
  lastFetchedAt: 0,

  refresh: async (opts) => {
    if (inflight) return inflight;
    inflight = (async () => {
      set({ loading: true });
      try {
        const prevUnread = get().unreadCount;
        const hadFetched = get().lastFetchedAt > 0;
        const seenIds = get().seenIds.size > 0 || get().lastFetchedAt > 0
          ? get().seenIds
          : loadSeenIds();
        const [dash, items] = await Promise.all([
          getPlatformDashboard(),
          fetchPendingItems(),
        ]);
        const nextCount = dash.pendingPayments ?? 0;
        // Drop seen ids that no longer exist in the queue
        const activeIds = new Set(items.map((i) => i.id));
        const prunedSeen = new Set([...seenIds].filter((id) => activeIds.has(id)));
        if (prunedSeen.size !== seenIds.size) persistSeenIds(prunedSeen);
        const unreadCount = unreadFrom(items, prunedSeen);

        set({
          count: nextCount,
          items,
          seenIds: prunedSeen,
          unreadCount,
          lastFetchedAt: Date.now(),
          loading: false,
        });

        if (!opts?.silentToast && hadFetched && unreadCount > prevUnread) {
          const delta = unreadCount - prevUnread;
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
        set({ loading: false });
      } finally {
        inflight = null;
      }
    })();
    return inflight;
  },

  markSeen: () => {
    const { items } = get();
    const next = new Set(get().seenIds);
    for (const item of items) next.add(item.id);
    persistSeenIds(next);
    set({ seenIds: next, unreadCount: 0 });
  },

  startPolling: (intervalMs = 45_000) => {
    // Hydrate seen ids before first poll
    const seenIds = loadSeenIds();
    set({ seenIds });
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
