// Maps finished events in the DB to the plain inputs the career-stats and Hall of
// Fame domain functions take. Pure (no React); reads the DB shape, so it lives in
// the data layer and gets swapped with the rest of it later.

import { upvotesByUserFrom } from "@/lib/domain/standings";
import type { HallOfFameEventInput } from "@/lib/domain/hall-of-fame";
import type { Database, Round } from "./types";

/**
 * One input per `status === "complete"` event, in `db.events` order, optionally
 * limited to one group. Round winners follow `event.roundIds` order.
 */
export function completedEventInputs(db: Database, groupId?: string): HallOfFameEventInput[] {
  return db.events
    .filter((e) => e.status === "complete" && (groupId === undefined || e.groupId === groupId))
    .map((ev) => {
      const rounds = ev.roundIds.map((rid) => db.rounds.find((r) => r.id === rid)).filter((r): r is Round => Boolean(r));
      const eventSubs = db.submissions.filter((s) => rounds.some((r) => r.id === s.roundId));
      const eventRatings = db.ratings.filter((rt) => rounds.some((r) => r.id === rt.roundId));
      return {
        roundWinnerUserIds: rounds.map((r) => r.winnerUserIds),
        broscarUserIds: ev.broscarUserIds,
        upvotesByUser: upvotesByUserFrom(eventSubs, eventRatings),
      };
    });
}
