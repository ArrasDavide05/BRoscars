// Trophy cabinet: the rounds (crowns) and nights (BRoscars) a member won.
// Pure: plain input in, plain lists out. Only completed events count, matching
// getCareerStats. A tied win counts for every tied winner.

export interface TrophyRoundInput {
  roundId: string;
  themeName: string;
  promptText: string;
  winnerUserIds: string[];
}

export interface TrophyEventInput {
  eventId: string;
  eventTitle: string;
  date: number; // epoch ms
  status: string;
  broscarUserIds: string[];
  rounds: TrophyRoundInput[];
}

export interface CrownTrophy {
  eventId: string;
  eventTitle: string;
  date: number;
  roundId: string;
  themeName: string;
  promptText: string;
  shared: boolean; // tied with another winner
}

export interface BroscarTrophy {
  eventId: string;
  eventTitle: string;
  date: number;
  roundsWon: number;
  roundCount: number;
  shared: boolean; // co-BRoscar
}

export interface Trophies {
  crowns: CrownTrophy[];
  broscars: BroscarTrophy[];
}

/** Newest event first; crowns keep round order within an event. */
export function buildTrophies(userId: string, events: TrophyEventInput[]): Trophies {
  const crowns: CrownTrophy[] = [];
  const broscars: BroscarTrophy[] = [];
  const completed = events
    .filter((e) => e.status === "complete")
    .slice()
    .sort((a, b) => b.date - a.date);

  for (const ev of completed) {
    let roundsWon = 0;
    for (const r of ev.rounds) {
      if (!r.winnerUserIds.includes(userId)) continue;
      roundsWon += 1;
      crowns.push({
        eventId: ev.eventId,
        eventTitle: ev.eventTitle,
        date: ev.date,
        roundId: r.roundId,
        themeName: r.themeName,
        promptText: r.promptText,
        shared: r.winnerUserIds.length > 1,
      });
    }
    if (ev.broscarUserIds.includes(userId)) {
      broscars.push({
        eventId: ev.eventId,
        eventTitle: ev.eventTitle,
        date: ev.date,
        roundsWon,
        roundCount: ev.rounds.length,
        shared: ev.broscarUserIds.length > 1,
      });
    }
  }

  return { crowns, broscars };
}
