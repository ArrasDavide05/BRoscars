"use client";

import { useState } from "react";
import { useData, type Submission } from "@/lib/data";
import { Avatar } from "./Avatar";
import { VideoModal } from "./VideoModal";

const MEDAL = ["🥇", "🥈", "🥉"];

/**
 * Post-round standings: top `limit` by net score. Each ranked row is clickable
 * to watch that member's clip for the round.
 */
export function RoundStandings({ roundId, limit = 3 }: { roundId: string; limit?: number }) {
  const data = useData();
  const standings = data.getRoundStandings(roundId).slice(0, limit);
  const [openSub, setOpenSub] = useState<Submission | null>(null);

  return (
    <div className="stack" style={{ gap: 10 }}>
      {standings.map((s, i) => {
        const u = data.getUser(s.userId)!;
        const sub = data.getSubmissions(roundId).find((x) => x.id === s.submissionId) ?? null;
        return (
          <button
            key={s.submissionId}
            className={`standing-row clickable${i === 0 ? " top" : ""}`}
            onClick={() => setOpenSub(sub)}
          >
            <span style={{ fontSize: 22, width: 30 }}>{MEDAL[i] ?? i + 1}</span>
            <Avatar user={u} size={40} />
            <div className="stack" style={{ gap: 2, flex: 1 }}>
              <strong>{u.name}</strong>
              <span className="watch-hint">▶ Watch clip · ▲ {s.up} · ▼ {s.down}</span>
            </div>
            <span className="net-score">{s.net > 0 ? `+${s.net}` : s.net}</span>
          </button>
        );
      })}
      <VideoModal submission={openSub} onClose={() => setOpenSub(null)} />
    </div>
  );
}
