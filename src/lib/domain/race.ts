// Race to the BRoscar: running event standings after the rounds finished so far.
// Pure: plain input in, ranked rows out. Same rule as computeBroscar: most rounds
// won (co-winners each get a crown), tiebreak most upvotes.

import { computeBroscar } from "./standings";

/** One member's place in tonight's race. */
export interface RaceRow {
  userId: string;
  crowns: number;
  upvotes: number;
  /** 1-based; rows tied on both crowns and upvotes share a rank (1, 1, 3). */
  rank: number;
}

/**
 * Every member gets a row, sorted by crowns desc, then upvotes desc, then
 * userId. Ids outside `memberIds` are ignored.
 */
export function computeRaceStandings(
  memberIds: readonly string[],
  roundWinnerUserIds: readonly (readonly string[])[],
  upvotesByUser: Record<string, number>,
): RaceRow[] {
  const { roundsWonByUser } = computeBroscar(roundWinnerUserIds, upvotesByUser);
  const rows = [...new Set(memberIds)].map((userId) => ({
    userId,
    crowns: roundsWonByUser[userId] ?? 0,
    upvotes: upvotesByUser[userId] ?? 0,
  }));
  rows.sort((a, b) => b.crowns - a.crowns || b.upvotes - a.upvotes || a.userId.localeCompare(b.userId));

  const result: RaceRow[] = [];
  rows.forEach((row, i) => {
    const prev = result[i - 1];
    const tied = prev && prev.crowns === row.crowns && prev.upvotes === row.upvotes;
    result.push({ ...row, rank: tied ? prev.rank : i + 1 });
  });
  return result;
}
