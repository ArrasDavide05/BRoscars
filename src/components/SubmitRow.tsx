"use client";

import { useState } from "react";
import { useData, type Submission } from "@/lib/data";
import { Avatar } from "./Avatar";
import { VideoTile } from "./VideoTile";
import { VideoModal } from "./VideoModal";

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

  const [open, setOpen] = useState(false);
  const [caption, setCaption] = useState("");
  const [openSub, setOpenSub] = useState<Submission | null>(null);

  return (
    <div className="panel pad stack" style={{ gap: 12 }}>
      <button className="acc-head" onClick={() => setOpen((o) => !o)}>
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
        <div className="stack" style={{ gap: 12 }}>
          <hr className="divider" />

          {/* my own submission / submit control (only my clip is watchable) */}
          {mine ? (
            <div className="row" style={{ gap: 12 }}>
              <button
                onClick={() => setOpenSub(mine)}
                style={{ width: 70, background: "none", border: "none", padding: 0, cursor: "pointer" }}
                title="Watch your clip"
              >
                <VideoTile submission={mine} />
              </button>
              <div className="stack" style={{ gap: 4 }}>
                <strong style={{ color: "var(--ok)" }}>Your entry ✓</strong>
                <span className="muted" style={{ fontSize: 13 }}>&ldquo;{mine.caption}&rdquo;</span>
                <span className="watch-hint">▶ Tap to watch your clip</span>
              </div>
            </div>
          ) : (
            <div className="row wrap" style={{ gap: 8 }}>
              <input
                className="input"
                style={{ flex: 1, minWidth: 200 }}
                placeholder="Caption your clip… (recording/upload faked)"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                maxLength={80}
              />
              <button
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
