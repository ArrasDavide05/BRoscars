"use client";

import { useEffect, useRef, useState } from "react";

export type CopyStatus = "idle" | "copied" | "fallback";

// Copies with the local Clipboard API (no network). "copied" clears itself after
// 2s; "fallback" means the clipboard is missing (non-secure context) or rejected,
// so the caller should show `text` for copying by hand.
export function useCopyText() {
  const [status, setStatus] = useState<CopyStatus>("idle");
  const [text, setText] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const copy = async (value: string) => {
    setText(value);
    if (timer.current) clearTimeout(timer.current);
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(value);
      setStatus("copied");
      timer.current = setTimeout(() => setStatus("idle"), 2000);
    } catch {
      setStatus("fallback");
    }
  };

  return { status, text, copy };
}
