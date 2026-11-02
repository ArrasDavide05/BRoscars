// Submission deadline countdown for upcoming nights. Display only.
// Pure: no React/data imports. Reused verbatim in the real build.

import { startOfLocalDay } from "./event-draft";
import { plural } from "./format";

const DAY_MS = 24 * 60 * 60 * 1000;

export type DeadlineKind = "open" | "tomorrow" | "today" | "passed";

export interface DeadlineStatus {
  kind: DeadlineKind;
  /** Calendar days (local time) from today to the deadline's day; 0 = today, negative once passed on an earlier day. */
  daysLeft: number;
  label: string;
}

/** `(deadline, now)` epoch ms -> "5 days left" / "Due tomorrow" / "Due today" / "Deadline passed". */
export function deadlineStatus(deadline: number, now: number): DeadlineStatus {
  // Round, not floor: a DST switch makes one local day 23h or 25h long.
  const daysLeft = Math.round((startOfLocalDay(deadline) - startOfLocalDay(now)) / DAY_MS);
  if (deadline < now) return { kind: "passed", daysLeft, label: "Deadline passed" };
  if (daysLeft === 0) return { kind: "today", daysLeft, label: "Due today" };
  if (daysLeft === 1) return { kind: "tomorrow", daysLeft, label: "Due tomorrow" };
  return { kind: "open", daysLeft, label: `${plural(daysLeft, "day")} left` };
}
