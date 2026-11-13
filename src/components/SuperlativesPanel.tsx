"use client";

import { useData, type User } from "@/lib/data";
import { plural } from "@/lib/domain/format";
import { SUPERLATIVE_ICON as ICON, SUPERLATIVE_TITLE as TITLE } from "@/lib/domain/superlative-labels";
import { AvatarStack } from "./Avatar";

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
        let label: string | undefined;
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
          case "on-a-roll":
            score = `${a.detail.streak} in a row`;
            label = `${TITLE[a.kind]}: ${names}, ${a.detail.streak} rounds in a row`;
            break;
        }

        return (
          <div key={a.kind} className="standing-row" role={label ? "group" : undefined} aria-label={label}>
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
