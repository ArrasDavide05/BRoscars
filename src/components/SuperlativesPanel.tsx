"use client";

import { useData, type Superlative, type User } from "@/lib/data";
import { plural } from "@/lib/domain/format";
import { AvatarStack } from "./Avatar";

const ICON: Record<Superlative["kind"], string> = {
  "peoples-champion": "🗳️",
  "most-divisive": "⚖️",
  robbed: "😤",
};

const TITLE: Record<Superlative["kind"], string> = {
  "peoples-champion": "People's Champion",
  "most-divisive": "Most Divisive",
  robbed: "Robbed",
};

/** Auto-computed fun awards shown under the Broscar. Renders nothing if none apply. */
export function SuperlativesPanel({ eventId }: { eventId: string }) {
  const data = useData();
  const awards = data.getEventSuperlatives(eventId);
  if (awards.length === 0) return null;

  return (
    <div className="stack" style={{ gap: 8 }}>
      <div className="section-title">Special awards</div>
      {awards.map((a) => {
        const users = a.userIds.map((id) => data.getUser(id)).filter((u): u is User => Boolean(u));
        const names = users.map((u) => u.name).join(" & ");
        let line: string | undefined;
        let score: string;
        switch (a.kind) {
          case "peoples-champion":
            score = plural(a.detail.up, "upvote");
            break;
          case "most-divisive": {
            const caption = data.getSubmission(a.submissionId)?.caption;
            line = caption ? `“${caption}”` : undefined;
            score = `${a.detail.up}▲ ${a.detail.down}▼`;
            break;
          }
          case "robbed": {
            const prompt = data.getPromptForRound(a.roundId)?.text;
            line = prompt ? `lost “${prompt}”` : undefined;
            score = `by ${a.detail.gap}`;
            break;
          }
        }

        return (
          <div key={a.kind} className="standing-row">
            <span style={{ fontSize: 22, width: 30 }} aria-hidden>{ICON[a.kind]}</span>
            <AvatarStack users={users} size={34} />
            <div className="stack" style={{ gap: 2, flex: 1, minWidth: 0 }}>
              <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                <span className="badge revealed">{TITLE[a.kind]}</span>
                <strong>{names}</strong>
              </div>
              {line && <span className="muted" style={{ fontSize: 13 }}>{line}</span>}
            </div>
            <span className="net-score">{score}</span>
          </div>
        );
      })}
    </div>
  );
}
