"use client";

import { useEffect, useState } from "react";

/**
 * Forces a re-render every `intervalMs` after mount (client-only), so
 * Date.now()-derived UI (the 30s live timer) updates smoothly. Returns whether
 * the component has mounted, to gate time-derived text against SSR mismatch.
 */
export function useTick(intervalMs = 250): boolean {
  const [, setN] = useState(0);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    const id = setInterval(() => setN((n) => n + 1), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return mounted;
}
