// Pure event superlatives ("special awards"). No React/data imports.
// People's Champion = most total upvotes across the event (ties -> all tied).
// Most Divisive = submission with the highest min(up, down); needs up>=1 and down>=1.
// Robbed = non-winning submission closest to its round's top net score.
// On a roll = longest run of consecutive round wins (rounds in array order; co-winners
// all extend their streak; empty rounds break it). Needs >= 2; ties -> all tied.
// Output order is fixed: peoples-champion, most-divisive, robbed, on-a-roll. No UI text here.

import type { RatingLike } from "./scoring";
import {
  computeRoundStandings,
  computeRoundWinnerUserIds,
  upvotesByUserFrom,
  type SubmissionLike,
} from "./standings";

export type Superlative =
  | { kind: "peoples-champion"; userIds: string[]; detail: { up: number } }
  | {
      kind: "most-divisive";
      userIds: string[];
      submissionId: string;
      roundId: string;
      detail: { up: number; down: number; net: number };
    }
  | {
      kind: "robbed";
      userIds: string[];
      submissionId: string;
      roundId: string;
      detail: { up: number; down: number; net: number; gap: number };
    }
  | { kind: "on-a-roll"; userIds: string[]; detail: { streak: number } };

export type SuperlativeKind = Superlative["kind"];

export interface SuperlativeRound {
  roundId: string;
  submissions: readonly SubmissionLike[];
}

export function computeSuperlatives(
  rounds: readonly SuperlativeRound[],
  ratings: readonly (RatingLike & { roundId?: string })[]
): Superlative[] {
  const out: Superlative[] = [];
  const standingsByRound = rounds.map((r) => ({
    roundId: r.roundId,
    standings: computeRoundStandings(r.submissions, ratings),
  }));

  // People's Champion
  const upvotes = upvotesByUserFrom(
    rounds.flatMap((r) => r.submissions),
    ratings
  );
  const maxUp = Math.max(0, ...Object.values(upvotes));
  if (maxUp > 0) {
    const userIds = Object.keys(upvotes)
      .filter((u) => upvotes[u] === maxUp)
      .sort();
    out.push({ kind: "peoples-champion", userIds, detail: { up: maxUp } });
  }

  // Most Divisive
  const all = standingsByRound.flatMap((r) => r.standings.map((s) => ({ ...s, roundId: r.roundId })));
  const divisive = all
    .filter((s) => s.up >= 1 && s.down >= 1)
    .sort(
      (a, b) =>
        Math.min(b.up, b.down) - Math.min(a.up, a.down) ||
        b.up + b.down - (a.up + a.down) ||
        a.submissionId.localeCompare(b.submissionId)
    )[0];
  if (divisive) {
    out.push({
      kind: "most-divisive",
      userIds: [divisive.userId],
      submissionId: divisive.submissionId,
      roundId: divisive.roundId,
      detail: { up: divisive.up, down: divisive.down, net: divisive.net },
    });
  }

  // Robbed
  const losers = standingsByRound.flatMap((r) => {
    if (r.standings.length === 0) return [];
    const topNet = r.standings[0].net;
    return r.standings
      .filter((s) => s.net < topNet)
      .map((s) => ({ ...s, roundId: r.roundId, gap: topNet - s.net }));
  });
  const robbed = losers.sort(
    (a, b) => a.gap - b.gap || b.net - a.net || b.up - a.up || a.submissionId.localeCompare(b.submissionId)
  )[0];
  if (robbed) {
    out.push({
      kind: "robbed",
      userIds: [robbed.userId],
      submissionId: robbed.submissionId,
      roundId: robbed.roundId,
      detail: { up: robbed.up, down: robbed.down, net: robbed.net, gap: robbed.gap },
    });
  }

  // On a roll
  const current: Record<string, number> = {};
  const best: Record<string, number> = {};
  for (const r of rounds) {
    const winners = new Set(computeRoundWinnerUserIds(r.submissions, ratings));
    for (const u of Object.keys(current)) if (!winners.has(u)) current[u] = 0;
    for (const u of winners) {
      current[u] = (current[u] ?? 0) + 1;
      best[u] = Math.max(best[u] ?? 0, current[u]);
    }
  }
  const maxStreak = Math.max(0, ...Object.values(best));
  if (maxStreak >= 2) {
    const userIds = Object.keys(best)
      .filter((u) => best[u] === maxStreak)
      .sort();
    out.push({ kind: "on-a-roll", userIds, detail: { streak: maxStreak } });
  }

  return out;
}
