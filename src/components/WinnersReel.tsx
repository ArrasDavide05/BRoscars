"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useData } from "@/lib/data";
import { buildWinnersReel } from "@/lib/domain/winners-reel";
import { Avatar } from "./Avatar";

/** "Watch the winners": steps through each round's winning placeholder clip. */
export function WinnersReel({ eventId }: { eventId: string }) {
  const data = useData();
  const titleId = useId();
  const [index, setIndex] = useState<number | null>(null);
  const openerRef = useRef<HTMLButtonElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const reel = buildWinnersReel(
    data.getEventRounds(eventId).map((r) => ({ roundId: r.id, standings: data.getRoundStandings(r.id) }))
  );
  const open = index !== null;
  const last = reel.length - 1;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIndex(null);
      if (e.key === "ArrowLeft") setIndex((i) => (i === null ? i : Math.max(0, i - 1)));
      if (e.key === "ArrowRight") setIndex((i) => (i === null ? i : Math.min(last, i + 1)));
      // Keep Tab/Shift+Tab cycling among the dialog's enabled buttons.
      if (e.key === "Tab") {
        const buttons = Array.from(cardRef.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") ?? []);
        if (buttons.length === 0) return;
        e.preventDefault();
        const at = buttons.indexOf(document.activeElement as HTMLButtonElement);
        const next = at === -1 ? 0 : (at + (e.shiftKey ? -1 : 1) + buttons.length) % buttons.length;
        buttons[next].focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, last]);

  // Dialog focus management: focus Close on open, return focus to the button on close.
  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const opener = openerRef.current;
    return () => opener?.focus();
  }, [open]);

  if (reel.length === 0) return null;

  const clip = open ? reel[Math.min(index, last)] : null;
  const submission = clip ? data.getSubmission(clip.submissionId) : undefined;
  const winner = clip ? data.getUser(clip.userId) : undefined;
  const theme = clip ? data.getThemeForRound(clip.roundId) : undefined;
  const prompt = clip ? data.getPromptForRound(clip.roundId) : undefined;
  const close = () => setIndex(null);

  return (
    <>
      <button type="button" ref={openerRef} className="btn btn-sm" onClick={() => setIndex(0)}>
        Watch the winners ▶
      </button>
      {clip && index !== null && (
        <div className="modal-backdrop" onClick={close}>
          <div
            ref={cardRef}
            className="modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            onClick={(e) => e.stopPropagation()}
          >
            <button type="button" ref={closeRef} className="modal-close" onClick={close} aria-label="Close">✕</button>
            <div className="stack" style={{ gap: 4, marginBottom: 12 }}>
              <span id={titleId} className="eyebrow">
                Round {clip.roundNumber}{theme ? ` · ${theme.name}` : ""}
              </span>
              <strong>{prompt?.text}</strong>
            </div>
            <div
              className="modal-video"
              style={
                submission
                  ? { background: `linear-gradient(150deg, ${submission.tileFrom}, ${submission.tileTo})` }
                  : undefined
              }
            >
              <div className="tile-play" aria-hidden>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
              </div>
              {submission && <span className="tile-dur">0:{String(submission.durationSec).padStart(2, "0")}</span>}
            </div>
            <div className="row between" style={{ gap: 10, marginTop: 14 }}>
              <div className="row" style={{ gap: 10 }}>
                {winner && <Avatar user={winner} size={34} />}
                <div className="stack" style={{ gap: 2 }}>
                  <strong>🏆 {winner?.name}</strong>
                  {submission && (
                    <span className="muted" style={{ fontSize: 13 }}>&ldquo;{submission.caption}&rdquo;</span>
                  )}
                </div>
              </div>
              <span className="net-score" aria-label={`Net score ${clip.net}`}>
                {clip.net > 0 ? `+${clip.net}` : clip.net}
              </span>
            </div>
            <div className="row between" style={{ gap: 10, marginTop: 16 }}>
              <button
                type="button"
                className="btn btn-sm"
                aria-label="Previous winner"
                disabled={index === 0}
                onClick={() => setIndex(Math.max(0, index - 1))}
              >
                ← Previous
              </button>
              <span className="faint" style={{ fontSize: 13 }} aria-live="polite">
                {index + 1} / {reel.length}
              </span>
              <button
                type="button"
                className="btn btn-sm btn-gold"
                aria-label="Next winner"
                disabled={index === last}
                onClick={() => setIndex(Math.min(last, index + 1))}
              >
                Next →
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
