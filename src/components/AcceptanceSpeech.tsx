"use client";

import { useState } from "react";
import { useData } from "@/lib/data";
import { SPEECH_MAX, normalizeSpeech, validateSpeech } from "@/lib/domain/speech";

// A little over SPEECH_MAX so pasted text with extra spaces still fits before normalising.
const SPEECH_INPUT_MAX = 160;

/**
 * BRoscar acceptance speeches on a complete night's results. Every member sees
 * the saved ones; a winner without one gets a one-line editor, a winner with
 * one gets Edit. Nothing renders when there is nothing to show.
 */
export function AcceptanceSpeech({ eventId }: { eventId: string }) {
  const { currentUserId } = useData();
  // Keyed by viewer so switching "Viewing as" drops a half-typed draft.
  return <SpeechesFor key={currentUserId} eventId={eventId} />;
}

function SpeechesFor({ eventId }: { eventId: string }) {
  const data = useData();
  const event = data.getEvent(eventId);
  const champions = data.getBroscarUserIds(eventId);
  const speeches = data.getSpeeches(eventId);
  const mine = speeches.find((s) => s.userId === data.currentUserId);
  const isWinner = event?.status === "complete" && champions.includes(data.currentUserId);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  if (!event || event.status !== "complete") return null;
  const showEditor = isWinner && (!mine || editing);
  if (speeches.length === 0 && !showEditor) return null;

  const result = validateSpeech(draft);
  const save = async () => {
    if (!result.ok) return;
    await data.saveSpeech(eventId, data.currentUserId, result.text);
    setEditing(false);
  };

  return (
    <div className="panel pad stack" style={{ gap: 14 }}>
      <div className="section-title">{champions.length > 1 ? "Acceptance speeches" : "Acceptance speech"}</div>

      {speeches.map((s) => {
        if (showEditor && s.userId === data.currentUserId) return null;
        const name = data.getUser(s.userId)?.name ?? "Unknown";
        return (
          <figure key={s.userId} className="stack" style={{ gap: 6, margin: 0 }}>
            <blockquote style={{ margin: 0, fontSize: 18, fontStyle: "italic", color: "var(--gold-soft)" }}>
              “{s.text}”
            </blockquote>
            <figcaption className="row between wrap" style={{ gap: 8 }}>
              <span className="muted">— {name}</span>
              {isWinner && s.userId === data.currentUserId && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    setDraft(s.text);
                    setEditing(true);
                  }}
                >
                  Edit
                </button>
              )}
            </figcaption>
          </figure>
        );
      })}

      {showEditor && (
        <div className="stack" style={{ gap: 6 }}>
          <label htmlFor={`speech-${eventId}`} className="muted" style={{ fontSize: 13 }}>
            You won the BRoscar. Say a few words.
          </label>
          <div className="row wrap" style={{ gap: 8 }}>
            <input
              id={`speech-${eventId}`}
              className="input"
              style={{ flex: 1, minWidth: 200 }}
              placeholder="I'd like to thank…"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void save();
              }}
              maxLength={SPEECH_INPUT_MAX}
              aria-invalid={draft !== "" && !result.ok}
              aria-describedby={`speech-${eventId}-count`}
            />
            <button type="button" className="btn btn-gold btn-sm" disabled={!result.ok} onClick={() => void save()}>
              Save
            </button>
            {mine && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(false)}>
                Cancel
              </button>
            )}
          </div>
          <div id={`speech-${eventId}-count`} className="row between" style={{ fontSize: 12 }}>
            <span style={{ color: "var(--danger)" }}>{draft !== "" && !result.ok ? result.error : ""}</span>
            <span className="faint">{normalizeSpeech(draft).length}/{SPEECH_MAX}</span>
          </div>
        </div>
      )}
    </div>
  );
}
