// Career stats: a member's lifetime crowns, BRoscars and upvotes.
// Pure: careerBaseline (pre-app history) plus every completed event, across all
// groups. A tied round or BRoscar counts for every tied winner.

import type { HallOfFameEventInput } from "./hall-of-fame";

export interface CareerStats {
  crowns: number;
  broscars: number;
  upvotes: number;
}

/**
 * `events` must already be filtered to completed events. A missing baseline
 * counts as zeros. Duplicate ids within one round or BRoscar count once.
 */
export function computeCareerStats(
  userId: string,
  baseline: Partial<CareerStats> | undefined,
  events: readonly HallOfFameEventInput[],
): CareerStats {
  const total: CareerStats = {
    crowns: baseline?.crowns ?? 0,
    broscars: baseline?.broscars ?? 0,
    upvotes: baseline?.upvotes ?? 0,
  };
  for (const ev of events) {
    for (const winners of ev.roundWinnerUserIds) if (winners.includes(userId)) total.crowns += 1;
    if (ev.broscarUserIds.includes(userId)) total.broscars += 1;
    total.upvotes += ev.upvotesByUser[userId] ?? 0;
  }
  return total;
}
