"use client";

import { useData } from "@/lib/data";
import { ordinal } from "@/lib/domain/format";

const MEDALS: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

/**
 * Phone-only personal end of the night, shown in the `broscar` phase while the
 * TV crowns the champion: the viewer's final place in the race, crowns and
 * upvotes tonight, with a medal for the top 3 (ties share a place).
 */
export function PhoneEndCard({ eventId, userId }: { eventId: string; userId: string }) {
  const data = useData();
  const race = data.getRaceStandings(eventId, data.getEventRounds(eventId).length);
  const mine = race.find((r) => r.userId === userId);

  if (!mine) {
    return (
      <div className="tv-stage" style={{ minHeight: "40vh" }}>
        <div className="spotlight">🍿</div>
        <h2 style={{ fontSize: 24 }} role="status">Thanks for watching</h2>
        <p className="muted">That&apos;s a wrap on tonight. The champion is on the TV.</p>
      </div>
    );
  }

  // Same leader rule as the TV race board: place 1 with at least one crown.
  const champion = mine.rank === 1 && mine.crowns > 0;
  const tied = race.filter((r) => r.rank === mine.rank).length > 1;
  const medal = MEDALS[mine.rank];

  return (
    <div className="tv-stage" style={{ minHeight: "40vh" }}>
      <div className="spotlight">{champion ? "🏆" : medal ?? "🎬"}</div>
      <span className="eyebrow">Your night</span>
      <h2 style={{ fontSize: 24 }} role="status">
        {champion
          ? "🏆 You won the BRoscar"
          : `${medal ? `${medal} ` : ""}You finished ${tied ? "tied " : ""}${ordinal(mine.rank)} of ${race.length}`}
      </h2>
      {champion && (
        <p className="muted">
          {tied ? "Tied " : ""}{ordinal(mine.rank)} of {race.length}
        </p>
      )}
      <div className="note" style={{ textAlign: "center" }}>
        <span aria-label={`${mine.crowns} crowns tonight`}>👑 ×{mine.crowns}</span>
        {" · "}
        <span aria-label={`${mine.upvotes} upvotes tonight`}>▲ {mine.upvotes}</span>
      </div>
      <p className="faint" style={{ fontSize: 12 }}>That&apos;s a wrap. Thanks for playing!</p>
    </div>
  );
}
