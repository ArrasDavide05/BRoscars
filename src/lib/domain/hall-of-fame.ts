// Group Hall of Fame: all-time leaderboard of one group's members.
// Pure: plain input in, ranked rows out. Group-scoped, completed events only,
// and no careerBaseline (that belongs to career stats, which span all groups).

/** One member's all-time record inside a group. */
export interface HallOfFameRow {
  userId: string;
  crowns: number;
  broscars: number;
  upvotes: number;
  /** 1-based; rows with identical stats share a rank (1, 1, 3). */
  rank: number;
}

/** What one finished event contributes to the Hall of Fame. */
export interface HallOfFameEventInput {
  /** Frozen winners per round (more than one id on a tied round). */
  roundWinnerUserIds: readonly (readonly string[])[];
  broscarUserIds: readonly string[];
  upvotesByUser: Readonly<Record<string, number>>;
}

/**
 * Group leaderboard: every member gets a row, sorted by crowns, then BRoscars,
 * then upvotes (all desc). Ties keep `memberIds` order. Ids outside
 * `memberIds` are ignored.
 */
export function computeHallOfFame(
  memberIds: readonly string[],
  events: readonly HallOfFameEventInput[],
): HallOfFameRow[] {
  const stats = new Map(memberIds.map((id) => [id, { crowns: 0, broscars: 0, upvotes: 0 }]));
  for (const ev of events) {
    for (const winners of ev.roundWinnerUserIds) {
      for (const id of new Set(winners)) {
        const s = stats.get(id);
        if (s) s.crowns += 1;
      }
    }
    for (const id of new Set(ev.broscarUserIds)) {
      const s = stats.get(id);
      if (s) s.broscars += 1;
    }
    for (const [id, n] of Object.entries(ev.upvotesByUser)) {
      const s = stats.get(id);
      if (s) s.upvotes += n;
    }
  }

  const rows = [...stats.entries()].map(([userId, s], order) => ({ userId, ...s, order }));
  rows.sort((a, b) => b.crowns - a.crowns || b.broscars - a.broscars || b.upvotes - a.upvotes || a.order - b.order);

  const result: HallOfFameRow[] = [];
  rows.forEach(({ userId, crowns, broscars, upvotes }, i) => {
    const prev = result[i - 1];
    const tied = prev && prev.crowns === crowns && prev.broscars === broscars && prev.upvotes === upvotes;
    result.push({ userId, crowns, broscars, upvotes, rank: tied ? prev.rank : i + 1 });
  });
  return result;
}
