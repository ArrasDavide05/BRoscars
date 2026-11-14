// "Everyone's best clip": each entrant's top entry of a night.
// Pure: no React/data imports. Reused verbatim in the real build.
// Net scores come in already computed by scoring.ts (via the round standings).

export interface PersonalBestEntry {
  submissionId: string;
  userId: string;
  roundId: string;
  /** 0-based position of the round within the event */
  roundOrder: number;
  net: number;
}

export interface PersonalBest {
  userId: string;
  submissionId: string;
  roundId: string;
  net: number;
}

/** Higher net first; tie -> earlier round, then lower submission id. */
function compareEntries(a: PersonalBestEntry, b: PersonalBestEntry): number {
  if (a.net !== b.net) return b.net - a.net;
  if (a.roundOrder !== b.roundOrder) return a.roundOrder - b.roundOrder;
  if (a.submissionId !== b.submissionId) return a.submissionId < b.submissionId ? -1 : 1;
  return 0;
}

/**
 * One row per user who entered: their best net entry of the night, sorted by
 * net desc (same tiebreak, then userId for stability). Users with no entries are absent.
 */
export function computePersonalBests(rounds: readonly (readonly PersonalBestEntry[])[]): PersonalBest[] {
  const best = new Map<string, PersonalBestEntry>();
  for (const entries of rounds) {
    for (const e of entries) {
      const cur = best.get(e.userId);
      if (!cur || compareEntries(e, cur) < 0) best.set(e.userId, e);
    }
  }
  return [...best.values()]
    .sort((a, b) => compareEntries(a, b) || (a.userId < b.userId ? -1 : a.userId > b.userId ? 1 : 0))
    .map(({ userId, submissionId, roundId, net }) => ({ userId, submissionId, roundId, net }));
}
