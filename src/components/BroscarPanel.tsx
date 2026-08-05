"use client";

import { useData } from "@/lib/data";
import { Avatar } from "./Avatar";
import { OscarBadge } from "./OscarBadge";

/** Event champion + rounds-won leaderboard. */
export function BroscarPanel({ eventId }: { eventId: string }) {
  const data = useData();
  const event = data.getEvent(eventId);
  if (!event) return null;

  const rounds = data.getEventRounds(eventId);
  const champions = data.getBroscarUserIds(eventId);

  // rounds won per member
  const wonBy: Record<string, number> = {};
  for (const r of rounds) {
    for (const uid of data.getRoundWinnerUserIds(r.id)) {
      wonBy[uid] = (wonBy[uid] ?? 0) + 1;
    }
  }
  const board = Object.entries(wonBy)
    .map(([userId, wins]) => ({ userId, wins }))
    .sort((a, b) => b.wins - a.wins);

  return (
    <div className="stack" style={{ gap: 20 }}>
      <div className="winner-hero">
        <div className="eyebrow">Event champion</div>
        <div className="spotlight" aria-hidden style={{ marginTop: 8 }}>🏆</div>
        <div className="row" style={{ justifyContent: "center", gap: 28, marginTop: 14, flexWrap: "wrap" }}>
          {champions.map((id) => {
            const u = data.getUser(id)!;
            return (
              <div key={id} className="stack" style={{ alignItems: "center", gap: 8 }}>
                <Avatar user={u} size={76} />
                <div style={{ fontWeight: 900, fontSize: 22 }}>{u.name}</div>
                <OscarBadge label={champions.length > 1 ? "Co-BRoscar" : "BRoscar"} />
              </div>
            );
          })}
        </div>
        <p className="muted" style={{ marginTop: 14 }}>
          Won {champions.length ? wonBy[champions[0]] : 0} of {rounds.length} rounds.
        </p>
      </div>

      <div className="stack" style={{ gap: 8 }}>
        <div className="section-title">Rounds won</div>
        {board.map((row) => {
          const u = data.getUser(row.userId)!;
          return (
            <div key={row.userId} className="standing-row">
              <Avatar user={u} size={34} />
              <strong style={{ flex: 1 }}>{u.name}</strong>
              <span className="net-score">👑 {row.wins}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
