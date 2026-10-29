"use client";

import { useData } from "@/lib/data";

export function ordinal(n: number): string {
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) return `${n}th`;
  return `${n}${["th", "st", "nd", "rd"][n % 10] ?? "th"}`;
}

const signed = (n: number) => (n > 0 ? `+${n}` : String(n));
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/**
 * Phone-only personal recap, shown once the TV has finished the round's top-3
 * reveal (live.revealedRoundIndex). The viewer's own place + net, then where
 * they stand in the race to the BRoscar.
 */
export function PhoneRecap({
  eventId,
  roundId,
  userId,
}: {
  eventId: string;
  roundId: string;
  userId: string;
}) {
  const data = useData();
  const roundNo = data.live.roundIndex + 1;

  const standings = data.getRoundStandings(roundId);
  const mine = standings.find((s) => s.userId === userId);
  const tied = mine ? standings.filter((s) => s.rank === mine.rank).length > 1 : false;

  const race = data.getRaceStandings(eventId, roundNo);
  const myRace = race.find((r) => r.userId === userId);
  const leader = race[0];

  let raceLine = "";
  if (myRace && leader) {
    const raceTied = race.filter((r) => r.rank === myRace.rank).length > 1;
    if (myRace.rank === 1) {
      raceLine = raceTied ? "You're tied for the lead in the race to the BRoscar" : "You lead the race to the BRoscar";
    } else {
      const gap = leader.crowns - myRace.crowns;
      const place = `${raceTied ? "tied " : ""}${ordinal(myRace.rank)}`;
      raceLine =
        gap > 0
          ? `You're ${place} in the race to the BRoscar, ${plural(gap, "crown")} behind`
          : `You're ${place} in the race to the BRoscar, level on crowns but behind on upvotes`;
    }
  }

  return (
    <div className="tv-stage" style={{ minHeight: "40vh" }}>
      <div className="spotlight">{mine?.rank === 1 ? "👑" : mine ? "🎬" : "🍿"}</div>
      <span className="eyebrow">Round {roundNo} recap</span>
      {mine ? (
        <h2 style={{ fontSize: 24 }} role="status">
          You placed {tied ? "tied " : ""}{ordinal(mine.rank)}{" "}
          <span className="muted">(net {signed(mine.net)})</span>
        </h2>
      ) : (
        <h2 style={{ fontSize: 24 }} role="status">You sat this one out</h2>
      )}
      {raceLine && (
        <div className="note" style={{ textAlign: "center" }} role="status">
          🏆 {raceLine}
          {myRace && <> · 👑 ×{myRace.crowns} · ▲ {myRace.upvotes}</>}
        </div>
      )}
      <p className="faint" style={{ fontSize: 12 }}>Next round soon. Eyes on the TV.</p>
    </div>
  );
}
