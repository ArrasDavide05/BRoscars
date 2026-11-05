"use client";

import { inviteLinkPath } from "@/lib/domain/invite-code";
import { useCopyText } from "./useCopyText";

// Copies <origin>/join/<CODE>. If the clipboard is unavailable, show the link as
// selectable text so it can still be copied by hand.
export function InviteLinkButton({ inviteCode }: { inviteCode: string }) {
  const { status, text: link, copy } = useCopyText();

  return (
    <span className="stack" style={{ gap: 6, alignItems: "flex-end" }}>
      <button
        type="button"
        className="btn btn-sm"
        onClick={() => copy(window.location.origin + inviteLinkPath(inviteCode))}
      >
        Copy invite link
      </button>
      <span role="status" aria-live="polite" className="faint" style={{ fontSize: 12 }}>
        {status === "copied" && <span style={{ color: "var(--gold-soft)" }}>Copied!</span>}
        {status === "fallback" && (
          <>
            Copy this link:{" "}
            <span className="pill-code" style={{ userSelect: "all", letterSpacing: 0.5, overflowWrap: "anywhere" }}>{link}</span>
          </>
        )}
      </span>
    </span>
  );
}
