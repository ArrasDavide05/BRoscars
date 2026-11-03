// Ordering for the home page's "Up next" panel. Display strings and the clock stay
// in the component. Pure: no React/data imports. Reused verbatim in the real build.

/** One night in a user's groups. `clipsOwed` is that user's own count only. */
export interface NextUpItem {
  eventId: string;
  title: string;
  groupName: string;
  status: "upcoming" | "live" | "complete";
  date: number;
  deadline: number;
  clipsOwed: number;
}

/** Drops complete nights; live nights first, then soonest `date`, ties by `eventId`. Input is not mutated. */
export function computeNextUp(items: readonly NextUpItem[]): NextUpItem[] {
  const liveRank = (item: NextUpItem) => (item.status === "live" ? 0 : 1);
  return items
    .filter((item) => item.status !== "complete")
    .sort((a, b) => liveRank(a) - liveRank(b) || a.date - b.date || a.eventId.localeCompare(b.eventId));
}
