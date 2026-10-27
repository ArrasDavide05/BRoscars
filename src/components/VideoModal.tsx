"use client";

import { useEffect, useId, useRef } from "react";
import { useData, type Submission } from "@/lib/data";
import { Avatar } from "./Avatar";

/** Lightbox "player" for a placeholder clip. No real playback. */
export function VideoModal({
  submission,
  onClose,
}: {
  submission: Submission | null;
  onClose: () => void;
}) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const open = submission !== null;

  useEffect(() => {
    if (!submission) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      // Close is the only focusable element in the card, so Tab/Shift+Tab stay on it.
      if (e.key === "Tab") {
        e.preventDefault();
        closeRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [submission, onClose]);

  // Dialog focus management: focus Close on open, restore the opener's focus on close.
  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeRef.current?.focus();
    return () => opener?.focus();
  }, [open]);

  const data = useData();
  if (!submission) return null;
  const uploader = data.getUser(submission.userId);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" ref={closeRef} className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        <div
          className="modal-video"
          style={{ background: `linear-gradient(150deg, ${submission.tileFrom}, ${submission.tileTo})` }}
        >
          <div className="tile-play" aria-hidden>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
          </div>
          <span className="tile-dur">0:{String(submission.durationSec).padStart(2, "0")}</span>
        </div>
        <div className="row" style={{ gap: 10, marginTop: 14 }}>
          {uploader && <Avatar user={uploader} size={34} />}
          <div className="stack" style={{ gap: 2 }}>
            <strong id={titleId}>{uploader?.name}</strong>
            <span className="muted" style={{ fontSize: 13 }}>&ldquo;{submission.caption}&rdquo;</span>
          </div>
        </div>
      </div>
    </div>
  );
}
