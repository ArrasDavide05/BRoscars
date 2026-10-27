"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useData } from "@/lib/data";
import {
  EVENT_TITLE_MAX_LENGTH,
  deadlineFromDateInput,
  toDateInputValue,
  validateEventDraft,
} from "@/lib/domain/event-draft";
import { surprisePicks } from "@/lib/domain/surprise-picks";

function defaultDeadline(): string {
  return toDateInputValue(Date.now() + 5 * 24 * 60 * 60 * 1000);
}

export default function NewEventPage({ params }: { params: { groupId: string } }) {
  const data = useData();
  const router = useRouter();
  const group = data.getGroup(params.groupId);
  const themes = data.getThemes();

  const [title, setTitle] = useState("Friday Night");
  const [deadline, setDeadline] = useState(defaultDeadline());
  // themeId -> selected promptId
  const [picks, setPicks] = useState<Record<string, string>>({});

  const promptIds = useMemo(
    () => themes.map((t) => picks[t.id]).filter((p): p is string => Boolean(p)),
    [themes, picks]
  );

  if (!group) {
    return <div className="pad"><p className="muted">Group not found.</p></div>;
  }

  const toggle = (themeId: string, promptId: string) => {
    setPicks((prev) => {
      const next = { ...prev };
      if (next[themeId] === promptId) delete next[themeId];
      else next[themeId] = promptId;
      return next;
    });
  };

  const deadlineMs = deadlineFromDateInput(deadline);
  const draft = validateEventDraft({
    title,
    promptCount: promptIds.length,
    deadline: deadlineMs,
    now: Date.now(),
  });
  const reason = draft.errors[0] ?? draft.warnings[0];

  const create = async () => {
    if (!draft.ok) return;
    const id = await data.createEvent(
      group.id,
      data.currentUserId,
      title.trim(),
      promptIds,
      deadlineMs
    );
    router.push(`/events/${id}`);
  };

  return (
    <div className="stack" style={{ gap: 22, paddingTop: 24 }}>
      <Link href={`/groups/${group.id}`} className="faint" style={{ fontSize: 13 }}>← {group.name}</Link>

      <div className="stack" style={{ gap: 8 }}>
        <span className="eyebrow">Host a night</span>
        <h1 style={{ fontSize: 34, fontWeight: 900 }}>Build your event</h1>
        <p className="muted" style={{ fontSize: 15 }}>
          Pick one prompt from each theme you want — each pick becomes a round. Aim for ~6.
        </p>
      </div>

      <div className="panel pad row between wrap" style={{ gap: 12 }}>
        <div className="row wrap" style={{ gap: 12, flex: 1 }}>
          <label className="stack" style={{ gap: 4, flex: 1, minWidth: 200 }}>
            <span className="faint" style={{ fontSize: 12 }}>Event name</span>
            <input
              className="input"
              value={title}
              maxLength={EVENT_TITLE_MAX_LENGTH}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          <label className="stack" style={{ gap: 4 }}>
            <span className="faint" style={{ fontSize: 12 }}>Submission deadline</span>
            <input className="input" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </label>
        </div>
        <div className="stack" style={{ gap: 6, alignItems: "flex-end" }}>
          <div className="row" style={{ gap: 8 }}>
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              onClick={() => setPicks(surprisePicks(themes, String(Date.now())))}
            >
              Surprise me 🎲
            </button>
            {promptIds.length > 0 && (
              <button type="button" className="btn btn-sm btn-ghost" onClick={() => setPicks({})}>
                Clear picks
              </button>
            )}
            <span className={`badge ${promptIds.length ? "revealed" : ""}`}>{promptIds.length} rounds selected</span>
          </div>
          <button type="button" className="btn btn-gold btn-lg" disabled={!draft.ok} onClick={create}>
            Create event →
          </button>
          {reason && (
            <span className="note" role="status">
              {draft.ok ? reason : `Can't create yet: ${reason}`}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-2">
        {themes.map((t) => (
          <div key={t.id} className={`panel pad stack${picks[t.id] ? " " : ""}`} style={{ gap: 10, borderColor: picks[t.id] ? "var(--gold)" : undefined }}>
            <div className="row between">
              <strong>{t.name}</strong>
              {picks[t.id] && <span className="badge revealed" style={{ fontSize: 11 }}>picked</span>}
            </div>
            <div className="row wrap" style={{ gap: 8 }}>
              {t.promptIds.map((pid) => {
                const prompt = data.getPrompt(pid);
                const active = picks[t.id] === pid;
                return (
                  <button
                    type="button"
                    key={pid}
                    className={`btn btn-sm${active ? " btn-gold" : " btn-ghost"}`}
                    aria-pressed={active}
                    onClick={() => toggle(t.id, pid)}
                  >
                    {prompt?.text}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
