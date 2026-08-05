"use client";

import { useEffect } from "react";
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
  useEffect(() => {
    if (!submission) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [submission, onClose]);

  const data = useData();
  if (!submission) return null;
  const uploader = data.getUser(submission.userId);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
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
            <strong>{uploader?.name}</strong>
            <span className="muted" style={{ fontSize: 13 }}>&ldquo;{submission.caption}&rdquo;</span>
          </div>
        </div>
      </div>
    </div>
  );
}
