"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useData } from "@/lib/data";

function defaultDeadline(): string {
  const d = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
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

  const create = async () => {
    const id = await data.createEvent(
      group.id,
      data.currentUserId,
      title,
      promptIds,
      new Date(deadline).getTime()
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
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>
          <label className="stack" style={{ gap: 4 }}>
            <span className="faint" style={{ fontSize: 12 }}>Submission deadline</span>
            <input className="input" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </label>
        </div>
        <div className="stack" style={{ gap: 6, alignItems: "flex-end" }}>
          <span className={`badge ${promptIds.length ? "revealed" : ""}`}>{promptIds.length} rounds selected</span>
          <button className="btn btn-gold btn-lg" disabled={promptIds.length === 0} onClick={create}>
            Create event →
          </button>
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
                    key={pid}
                    className={`btn btn-sm${active ? " btn-gold" : " btn-ghost"}`}
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
