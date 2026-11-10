/**
 * The nominees of a round: the members who submitted a clip, in group member order,
 * each once. Submitters who aren't (or are no longer) members are dropped.
 */
export function nominees(memberIds: string[], submissions: { userId: string }[]): string[] {
  const submitted = new Set(submissions.map((s) => s.userId));
  return [...new Set(memberIds)].filter((id) => submitted.has(id));
}
