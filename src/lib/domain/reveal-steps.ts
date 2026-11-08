/**
 * Group ranked rows into reveal steps for the round suspense reveal.
 * Rows sharing a (competition) rank share one step, so ties are revealed
 * together. Steps are ordered lowest place first: 3rd → 2nd → 1st.
 */
export function groupRevealSteps<T extends { rank: number }>(rows: readonly T[]): T[][] {
  const byRank = new Map<number, T[]>();
  for (const r of rows) byRank.set(r.rank, [...(byRank.get(r.rank) ?? []), r]);
  return Array.from(byRank.entries())
    .sort((a, b) => b[0] - a[0])
    .map(([, group]) => group);
}

/**
 * How many reveal steps start uncovered. A round whose reveal already
 * finished (e.g. on another TV tab) starts fully revealed; otherwise the
 * envelopes start sealed.
 */
export function initialRevealCount(stepCount: number, alreadyRevealed: boolean): number {
  return alreadyRevealed ? stepCount : 0;
}
