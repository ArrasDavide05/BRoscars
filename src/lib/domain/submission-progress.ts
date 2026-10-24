/** One member's pre-event progress: counts only, never the entries themselves. */
export interface MemberSubmissionProgress {
  userId: string;
  submitted: number;
  total: number;
  complete: boolean;
}

/**
 * Per-member submission counts for an event, in `memberIds` order.
 * Submissions for rounds outside `roundIds` are ignored, and each
 * (user, round) pair counts at most once. A 0-round event counts as complete.
 */
export function submissionProgress(
  memberIds: readonly string[],
  roundIds: readonly string[],
  submissions: readonly { roundId: string; userId: string }[],
): MemberSubmissionProgress[] {
  const rounds = new Set(roundIds);
  const seen = new Map<string, Set<string>>();
  for (const s of submissions) {
    if (!rounds.has(s.roundId)) continue;
    let set = seen.get(s.userId);
    if (!set) seen.set(s.userId, (set = new Set()));
    set.add(s.roundId);
  }
  const total = rounds.size;
  return memberIds.map((userId) => {
    const submitted = seen.get(userId)?.size ?? 0;
    return { userId, submitted, total, complete: submitted >= total };
  });
}

/** How many members still have at least one round without a clip. */
export function missingCount(progress: readonly MemberSubmissionProgress[]): number {
  return progress.filter((p) => !p.complete).length;
}
