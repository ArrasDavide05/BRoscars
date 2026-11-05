"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useData, type Submission } from "@/lib/data";
import { Avatar } from "./Avatar";
import { VideoTile } from "./VideoTile";
import { VideoModal } from "./VideoModal";

/**
 * "Retake clip" with an inline confirm that opens on the safe option. Mounted
 * only while the viewer has a clip and keyed by viewer, so the confirm can't
 * survive a retake or carry over through the "Viewing as" switcher.
 */
function RetakeControl({ onRetake }: { onRetake: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const retakeRef = useRef<HTMLButtonElement>(null);
  const keepRef = useRef<HTMLButtonElement>(null);
  const wasConfirming = useRef(false);

  useEffect(() => {
    if (confirming) keepRef.current?.focus();
    else if (wasConfirming.current) retakeRef.current?.focus();
    wasConfirming.current = confirming;
  }, [confirming]);

  if (!confirming) {
    return (
      <div className="row" style={{ marginTop: 4 }}>
        <button ref={retakeRef} type="button" className="btn btn-sm btn-ghost" onClick={() => setConfirming(true)}>
          Retake clip
        </button>
      </div>
    );
  }

  return (
    <div className="row wrap" role="group" aria-label="Replace this clip?" style={{ gap: 8, marginTop: 4 }}>
      <span className="muted" style={{ fontSize: 13 }}>Replace this clip?</span>
      <button ref={keepRef} type="button" className="btn btn-sm btn-ghost" onClick={() => setConfirming(false)}>
        Keep it
      </button>
      <button
        type="button"
        className="btn btn-sm btn-ghost"
        onClick={() => {
          setConfirming(false);
          onRetake();
        }}
      >
        Yes, retake
      </button>
    </div>
  );
}

/**
 * Pre-event round row: collapsed summary that expands (like the results rows)
 * to reveal who has submitted. Privacy rule — you can see that a member
 * submitted, but only your OWN clip is watchable until the night goes live.
 */
export function SubmitRow({ roundId, index }: { roundId: string; index: number }) {
  const data = useData();
  const round = data.getRound(roundId)!;
  const event = data.getEvent(round.eventId)!;
  const theme = data.getThemeForRound(roundId);
  const prompt = data.getPromptForRound(roundId);
  const members = data.getMembers(event.groupId);
  const mine = data.getSubmissionByUser(roundId, data.currentUserId);
  const count = data.getSubmissions(roundId).length;
  const isMember = members.some((m) => m.id === data.currentUserId);

  const [open, setOpen] = useState(false);
  const panelId = useId();
  const [caption, setCaption] = useState("");
  const [openSub, setOpenSub] = useState<Submission | null>(null);
  const captionRef = useRef<HTMLInputElement>(null);
  const focusCaption = useRef(false);

  // The switcher keeps this row mounted: a prefilled caption is one member's sealed text.
  useEffect(() => {
    setCaption("");
  }, [data.currentUserId]);

  // After a retake the button that had focus is gone; hand it to the submit form.
  useEffect(() => {
    if (!mine && focusCaption.current) {
      focusCaption.current = false;
      captionRef.current?.focus();
    }
  }, [mine]);

  const retake = (clip: Submission) => {
    focusCaption.current = true;
    data.withdrawSubmission(roundId, data.currentUserId);
    setCaption(clip.caption === "My entry" ? "" : clip.caption);
    setOpenSub(null);
  };

  return (
    <div className="panel pad stack" style={{ gap: 12 }}>
      <button
        type="button"
        className="acc-head"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="row" style={{ gap: 10 }}>
          <span className="faint" style={{ fontSize: 12 }}>#{index + 1}</span>
          <span className="badge" style={{ fontSize: 11 }}>{theme?.name}</span>
          <strong style={{ fontSize: 15 }}>{prompt?.text}</strong>
        </span>
        <span className="row" style={{ gap: 10 }}>
          <span className={`badge ${mine ? "revealed" : ""}`} style={{ fontSize: 11 }}>
            {count} / {members.length} submitted
          </span>
          <span className={`acc-chevron${open ? " open" : ""}`}>▶</span>
        </span>
      </button>

      {open && (
        <div id={panelId} className="stack" style={{ gap: 12 }}>
          <hr className="divider" />

          {/* my own submission / submit control (only my clip is watchable) */}
          {mine ? (
            <div className="row" style={{ gap: 12 }}>
              <button
                type="button"
                onClick={() => setOpenSub(mine)}
                style={{ width: 70, background: "none", border: "none", padding: 0, cursor: "pointer" }}
                title="Watch your clip"
                aria-label="Watch your clip"
              >
                <VideoTile submission={mine} />
              </button>
              <div className="stack" style={{ gap: 4 }}>
                <strong style={{ color: "var(--ok)" }}>Your entry ✓</strong>
                <span className="muted" style={{ fontSize: 13 }}>&ldquo;{mine.caption}&rdquo;</span>
                <span className="watch-hint">▶ Tap to watch your clip</span>
                {event.status === "upcoming" && (
                  <RetakeControl key={data.currentUserId} onRetake={() => retake(mine)} />
                )}
              </div>
            </div>
          ) : !isMember ? (
            <p className="note">Only members of this group can submit.</p>
          ) : (
            <div className="row wrap" style={{ gap: 8 }}>
              <input
                ref={captionRef}
                className="input"
                style={{ flex: 1, minWidth: 200 }}
                placeholder="Caption your clip… (recording/upload faked)"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                maxLength={80}
              />
              <button
                type="button"
                className="btn btn-gold"
                onClick={() => {
                  data.submitVideo(roundId, data.currentUserId, caption);
                  setCaption("");
                }}
              >
                Submit clip
              </button>
            </div>
          )}

          {/* who submitted — statuses only, clips sealed until live */}
          <div className="stack" style={{ gap: 0 }}>
            {members.map((m) => {
              const done = Boolean(data.getSubmissionByUser(roundId, m.id));
              const isMe = m.id === data.currentUserId;
              return (
                <div key={m.id} className="status-row">
                  <span className="row" style={{ gap: 10 }}>
                    <Avatar user={m} size={28} />
                    <span style={{ fontWeight: 600, fontSize: 14 }}>
                      {m.name}
                      {isMe && <span className="faint"> (you)</span>}
                    </span>
                  </span>
                  {done ? (
                    <span className="row" style={{ gap: 8 }}>
                      {!isMe && <span className="watch-hint">🔒 sealed until live</span>}
                      <span className="badge revealed" style={{ fontSize: 11 }}>Submitted ✓</span>
                    </span>
                  ) : (
                    <span className="badge" style={{ fontSize: 11 }}>Waiting</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <VideoModal submission={openSub} onClose={() => setOpenSub(null)} />
    </div>
  );
}
