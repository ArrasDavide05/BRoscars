"use client";

import { useData } from "@/lib/data";
import { Avatar } from "@/components/Avatar";

/** TV-only running tally between rounds: crowns so far, upvotes as tiebreak. */
export function RaceScoreboard({
  eventId,
  roundsCompleted,
  totalRounds,
}: {
  eventId: string;
  roundsCompleted: number;
  totalRounds: number;
}) {
  const data = useData();
  const rows = data.getRaceStandings(eventId, roundsCompleted);
  const isFinal = roundsCompleted >= totalRounds;

  return (
    <section className="race stack" style={{ gap: 8 }} aria-label="Race to the BRoscar">
      <div className="stack" style={{ gap: 2, textAlign: "center" }}>
        <div className="section-title">Race to the BRoscar</div>
        <span className="faint" style={{ fontSize: 12 }}>
          {isFinal ? "Final standings before the envelope" : `After round ${roundsCompleted} of ${totalRounds}`}
        </span>
      </div>
      <ol className="race-list">
        {rows.map((row) => {
          const user = data.getUser(row.userId);
          if (!user) return null;
          const leader = row.rank === 1 && row.crowns > 0;
          return (
            <li key={row.userId} className={leader ? "race-row race-leader" : "race-row"}>
              <span className="race-rank">{row.rank}</span>
              <Avatar user={user} size={30} />
              <span className="race-name">{user.name}</span>
              <span className="race-crowns" aria-label={`${row.crowns} crowns`}>👑 ×{row.crowns}</span>
              <span className="race-upvotes" aria-label={`${row.upvotes} upvotes`}>▲ {row.upvotes}</span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
