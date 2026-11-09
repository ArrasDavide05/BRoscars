export interface ReelStandingLike {
  submissionId: string;
  userId: string;
  net: number;
  rank: number;
}

export interface ReelRoundInput {
  roundId: string;
  /** the round's standings, already ranked (rank 1 first) */
  standings: readonly ReelStandingLike[];
}

export interface ReelClip {
  roundId: string;
  /** 1-based position of the round in the night (skipped rounds leave a gap) */
  roundNumber: number;
  submissionId: string;
  userId: string;
  net: number;
}

/**
 * The "Watch the winners" playlist: every rank-1 clip of each round, in round
 * order, ties in standings order. Rounds with no entries are skipped.
 */
export function buildWinnersReel(rounds: readonly ReelRoundInput[]): ReelClip[] {
  return rounds.flatMap((round, i) =>
    round.standings
      .filter((s) => s.rank === 1)
      .map((s) => ({
        roundId: round.roundId,
        roundNumber: i + 1,
        submissionId: s.submissionId,
        userId: s.userId,
        net: s.net,
      }))
  );
}
