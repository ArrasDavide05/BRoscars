/**
 * Who is still to rate the current video, as a short human list.
 * `eligible` / `ratedBy` are user ids; `names` maps id -> display name.
 * Returns "" when nobody is left, "Sam", "Sam and Jo", "Sam, Jo and Al",
 * or "Sam, Jo and 2 others" once more than `maxNamed` (default 3) are waiting.
 * Order follows `eligible`; ids without a name are skipped.
 */
export function waitingOnNames(
  eligible: readonly string[],
  ratedBy: readonly string[],
  names: Readonly<Record<string, string>>,
  maxNamed = 3,
): string {
  const rated = new Set(ratedBy);
  const waiting = eligible
    .filter((id) => !rated.has(id))
    .map((id) => names[id])
    .filter((n): n is string => Boolean(n));

  if (waiting.length === 0) return "";
  if (waiting.length === 1) return waiting[0];
  if (waiting.length <= maxNamed) {
    return `${waiting.slice(0, -1).join(", ")} and ${waiting[waiting.length - 1]}`;
  }
  const shown = waiting.slice(0, 2);
  const rest = waiting.length - shown.length;
  return `${shown.join(", ")} and ${rest} other${rest === 1 ? "" : "s"}`;
}
