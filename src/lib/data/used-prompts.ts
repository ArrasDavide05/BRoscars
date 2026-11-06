// Maps a group's nights in the DB to the prompts they use, for the event builder.
// Pure (no React); reads the DB shape, so it lives in the data layer and gets
// swapped with the rest of it later.

import type { Database } from "./types";

export interface UsedPrompt {
  date: number; // the night, epoch ms
  played: boolean; // that night is complete; false means it is still to come
}

/**
 * promptId -> the group's latest night using it. Every status counts: a prompt on
 * an upcoming night is as much a repeat as a played one.
 */
export function usedPrompts(db: Database, groupId: string): Record<string, UsedPrompt> {
  const used: Record<string, UsedPrompt> = {};
  for (const ev of db.events.filter((e) => e.groupId === groupId)) {
    for (const round of db.rounds.filter((r) => ev.roundIds.includes(r.id))) {
      const seen = used[round.promptId];
      if (!seen || ev.date > seen.date) {
        used[round.promptId] = { date: ev.date, played: ev.status === "complete" };
      }
    }
  }
  return used;
}
