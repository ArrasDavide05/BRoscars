// Maps finished rounds in the DB to the plain inputs computeRivalries takes. Pure
// (no React); reads the DB shape, so it lives in the data layer and gets swapped
// with the rest of it later.

import { computeRoundStandings } from "@/lib/domain/standings";
import type { RivalryRoundInput } from "@/lib/domain/rivalries";
import type { Database } from "./types";

/**
 * One input per round of every `status === "complete"` event in a group the user
 * belongs to (all of their groups), in `db.events` then `event.roundIds` order.
 */
export function completedRivalryInputs(db: Database, userId: string): RivalryRoundInput[] {
  const groupIds = new Set(db.groups.filter((g) => g.memberIds.includes(userId)).map((g) => g.id));
  return db.events
    .filter((e) => e.status === "complete" && groupIds.has(e.groupId))
    .flatMap((ev) => ev.roundIds)
    .map((rid) => ({
      standings: computeRoundStandings(
        db.submissions.filter((s) => s.roundId === rid),
        db.ratings.filter((r) => r.roundId === rid)
      ),
    }));
}
