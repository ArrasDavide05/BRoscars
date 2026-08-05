// Pure standings + Broscar logic. No React/data imports.
// Round winner = highest net score. Broscar (event champion) = most rounds won,
// tiebreak most total upvotes. Ties resolve to co-winners / co-champions.

import { computeSubmissionScore, type RatingLike } from "./scoring";

export interface SubmissionLike {
  id: string;
  userId: string;
}

export interface RoundStanding {
  submissionId: string;
  userId: string;
  up: number;
  down: number;
  neutral: number;
  net: number;
  /** competition rank by net score (1-based; ties share a rank) */
  rank: number;
}

/** Ranks a round's submissions by net score (desc), tiebreak upvotes then userId. */
export function computeRoundStandings(
  submissions: readonly SubmissionLike[],
  ratings: readonly RatingLike[]
): RoundStanding[] {
  const rows = submissions.map((s) => {
    const score = computeSubmissionScore(ratings.filter((r) => r.submissionId === s.id));
    return { submissionId: s.id, userId: s.userId, ...score };
  });

  rows.sort((a, b) => b.net - a.net || b.up - a.up || a.userId.localeCompare(b.userId));

  let lastNet: number | null = null;
  let rank = 0;
  return rows.map((row, i) => {
    if (row.net !== lastNet) {
      rank = i + 1;
      lastNet = row.net;
    }
    return { ...row, rank };
  });
}

/** Winner user id(s) of a round — everyone tied at the highest net score. */
export function computeRoundWinnerUserIds(
  submissions: readonly SubmissionLike[],
  ratings: readonly RatingLike[]
): string[] {
  if (submissions.length === 0) return [];
  const standings = computeRoundStandings(submissions, ratings);
  const topNet = standings[0].net;
  return standings.filter((s) => s.net === topNet).map((s) => s.userId);
}

/** Total upvotes received by each user across a set of submissions + ratings. */
export function upvotesByUserFrom(
  submissions: readonly SubmissionLike[],
  ratings: readonly RatingLike[]
): Record<string, number> {
  const owner: Record<string, string> = {};
  for (const s of submissions) owner[s.id] = s.userId;
  const out: Record<string, number> = {};
  for (const r of ratings) {
    if (r.value === 1 && owner[r.submissionId]) {
      const uid = owner[r.submissionId];
      out[uid] = (out[uid] ?? 0) + 1;
    }
  }
  return out;
}

export interface BroscarResult {
  championUserIds: string[];
  roundsWonByUser: Record<string, number>;
  upvotesByUser: Record<string, number>;
}

/**
 * Event champion from each round's winner set and per-user total upvotes.
 * Co-winners of a round each count as a win. Champion = most rounds won;
 * tiebreak most total upvotes; still tied → co-champions.
 */
export function computeBroscar(
  roundWinnerUserIds: readonly (readonly string[])[],
  upvotesByUser: Record<string, number>
): BroscarResult {
  const roundsWonByUser: Record<string, number> = {};
  for (const winners of roundWinnerUserIds) {
    for (const uid of winners) roundsWonByUser[uid] = (roundsWonByUser[uid] ?? 0) + 1;
  }

  const contenders = Object.keys(roundsWonByUser);
  if (contenders.length === 0) {
    return { championUserIds: [], roundsWonByUser, upvotesByUser };
  }

  const maxWins = Math.max(...contenders.map((u) => roundsWonByUser[u]));
  const mostWins = contenders.filter((u) => roundsWonByUser[u] === maxWins);
  const maxUp = Math.max(...mostWins.map((u) => upvotesByUser[u] ?? 0));
  const championUserIds = mostWins.filter((u) => (upvotesByUser[u] ?? 0) === maxUp);

  return { championUserIds, roundsWonByUser, upvotesByUser };
}

export interface CareerContribution {
  crowns: number;
  broscars: number;
  upvotes: number;
}

/** Per-user career contribution of one completed event. */
export function computeEventCareerContribution(
  roundWinnerUserIds: readonly (readonly string[])[],
  broscar: BroscarResult
): Record<string, CareerContribution> {
  const out: Record<string, CareerContribution> = {};
  const ensure = (uid: string) => (out[uid] ??= { crowns: 0, broscars: 0, upvotes: 0 });

  for (const winners of roundWinnerUserIds) {
    for (const uid of winners) ensure(uid).crowns += 1;
  }
  for (const uid of broscar.championUserIds) ensure(uid).broscars += 1;
  for (const [uid, up] of Object.entries(broscar.upvotesByUser)) ensure(uid).upvotes += up;

  return out;
}
