"use client";

import { useCallback, useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

/**
 * `prefers-reduced-motion`, without a hydration mismatch.
 *
 * Reading matchMedia during the first client render disagrees with the server,
 * which always renders the non-reduced branch — React then throws away the
 * whole tree and regenerates it. useSyncExternalStore's server snapshot is
 * used for both SSR *and* hydration, so the first client render matches the
 * markup exactly and the real value is applied in the commit that follows.
 */
export function useReducedMotionSafe(): boolean {
  const subscribe = useCallback((onStoreChange: () => void) => {
    const mq = window.matchMedia(QUERY);
    mq.addEventListener("change", onStoreChange);
    return () => mq.removeEventListener("change", onStoreChange);
  }, []);

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  );
}
