// Pure head-to-head rivalry logic. No React/data imports.
// In every completed round where both users have a standing, the lower (better)
// competition rank wins the meeting; a shared rank is a draw. Nemesis = the rival
// with the most wins over this user; favourite victim = the rival beaten most.

export interface RivalryRoundInput {
  /** One completed round's standings (rank as in computeRoundStandings; ties share a rank). */
  standings: readonly { userId: string; rank: number }[];
}

export interface RivalryRow {
  rivalId: string;
  wins: number;
  draws: number;
  losses: number;
  meetings: number;
}

export interface RivalryResult {
  /** Sorted by meetings desc, then losses desc, then rivalId. */
  rows: RivalryRow[];
  /** Most losses (>= 1); tiebreak worse net (losses - wins), then rivalId. */
  nemesisId: string | null;
  /** Most wins (>= 1); tiebreak better net (wins - losses), then rivalId. */
  victimId: string | null;
}

/** Best (lowest) rank per user in one round. Two submissions by one user shouldn't happen; if so, the best counts. */
function bestRanks(standings: RivalryRoundInput["standings"]): Map<string, number> {
  const out = new Map<string, number>();
  for (const s of standings) {
    const prev = out.get(s.userId);
    if (prev === undefined || s.rank < prev) out.set(s.userId, s.rank);
  }
  return out;
}

export function computeRivalries(userId: string, rounds: readonly RivalryRoundInput[]): RivalryResult {
  const byRival = new Map<string, RivalryRow>();

  for (const round of rounds) {
    const ranks = bestRanks(round.standings);
    const mine = ranks.get(userId);
    if (mine === undefined) continue;
    for (const [rivalId, theirs] of ranks) {
      if (rivalId === userId) continue;
      let row = byRival.get(rivalId);
      if (!row) {
        row = { rivalId, wins: 0, draws: 0, losses: 0, meetings: 0 };
        byRival.set(rivalId, row);
      }
      row.meetings += 1;
      if (mine < theirs) row.wins += 1;
      else if (mine > theirs) row.losses += 1;
      else row.draws += 1;
    }
  }

  const rows = [...byRival.values()].sort(
    (a, b) => b.meetings - a.meetings || b.losses - a.losses || a.rivalId.localeCompare(b.rivalId)
  );

  const nemesis = rows
    .filter((r) => r.losses >= 1)
    .sort((a, b) => b.losses - a.losses || (b.losses - b.wins) - (a.losses - a.wins) || a.rivalId.localeCompare(b.rivalId))[0];
  const victim = rows
    .filter((r) => r.wins >= 1)
    .sort((a, b) => b.wins - a.wins || (b.wins - b.losses) - (a.wins - a.losses) || a.rivalId.localeCompare(b.rivalId))[0];

  return { rows, nemesisId: nemesis?.rivalId ?? null, victimId: victim?.rivalId ?? null };
}
