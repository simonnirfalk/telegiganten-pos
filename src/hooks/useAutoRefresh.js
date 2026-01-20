// src/hooks/useAutoRefresh.js
import { useEffect, useRef } from "react";

/**
 * useAutoRefresh
 * - Polling (interval)
 * - Refetch on window focus
 * - Refetch on tab visibility change
 * - Forhindrer overlappende fetches (inFlight)
 *
 * Params:
 * - enabled: boolean (fx pause under modal/redigering)
 * - intervalMs: number
 * - refresh: async () => void
 */
export function useAutoRefresh({ enabled = true, intervalMs = 20000, refresh }) {
  const inFlightRef = useRef(false);
  const lastRunRef = useRef(0);

  async function safeRefresh() {
    if (!enabled) return;
    if (document.visibilityState !== "visible") return;
    if (inFlightRef.current) return;

    // lille throttle så focus/visibility ikke spammer
    const now = Date.now();
    if (now - lastRunRef.current < 800) return;

    inFlightRef.current = true;
    lastRunRef.current = now;

    try {
      await refresh();
    } finally {
      inFlightRef.current = false;
    }
  }

  useEffect(() => {
    if (!enabled) return;

    // Polling
    const id = window.setInterval(() => {
      safeRefresh();
    }, intervalMs);

    // Focus + visibility triggers
    const onFocus = () => safeRefresh();
    const onVisibility = () => safeRefresh();

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.clearInterval(id);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, intervalMs]);

  useEffect(() => {
    // Når enabled slår til igen (fx modal lukker), så opdater straks
    if (!enabled) return;
    safeRefresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);
}
