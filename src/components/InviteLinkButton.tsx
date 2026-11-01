"use client";

import { useEffect, useRef, useState } from "react";
import { inviteLinkPath } from "@/lib/domain/invite-code";

// Copies <origin>/join/<CODE> with the local Clipboard API (no network). If the
// clipboard is missing (non-secure context) or rejects, show the link as
// selectable text so it can still be copied by hand.
export function InviteLinkButton({ inviteCode }: { inviteCode: string }) {
  const [status, setStatus] = useState<"idle" | "copied" | "fallback">("idle");
  const [link, setLink] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const copy = async () => {
    const url = window.location.origin + inviteLinkPath(inviteCode);
    setLink(url);
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(url);
      setStatus("copied");
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setStatus("idle"), 2000);
    } catch {
      setStatus("fallback");
    }
  };

  return (
    <span className="stack" style={{ gap: 6, alignItems: "flex-end" }}>
      <button type="button" className="btn btn-sm" onClick={copy}>
        Copy invite link
      </button>
      <span role="status" aria-live="polite" className="faint" style={{ fontSize: 12 }}>
        {status === "copied" && <span style={{ color: "var(--gold-soft)" }}>Copied!</span>}
        {status === "fallback" && (
          <>
            Copy this link:{" "}
            <span className="pill-code" style={{ userSelect: "all", letterSpacing: 0.5 }}>{link}</span>
          </>
        )}
      </span>
    </span>
  );
}
