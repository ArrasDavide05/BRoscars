// Maps events in the DB to the plain inputs computeNextUp takes. Pure (no React);
// reads the DB shape, so it lives in the data layer and gets swapped with the rest
// of it later.

import type { NextUpItem } from "@/lib/domain/next-up";
import { submissionProgress } from "@/lib/domain/submission-progress";
import type { Database } from "./types";

/**
 * One input per event in a group the user belongs to, in `db.events` order.
 * Real build: `clipsOwed` comes from the same count-only view as getSubmissionProgress,
 * so RLS still hides other members' Submission rows.
 */
export function nextUpInputs(db: Database, userId: string): NextUpItem[] {
  const groupNames = new Map(db.groups.filter((g) => g.memberIds.includes(userId)).map((g) => [g.id, g.name]));
  return db.events.flatMap((ev) => {
    const groupName = groupNames.get(ev.groupId);
    if (groupName === undefined) return [];
    const [{ submitted, total }] = submissionProgress([userId], ev.roundIds, db.submissions);
    return [{
      eventId: ev.id,
      title: ev.title,
      groupName,
      status: ev.status,
      date: ev.date,
      deadline: ev.deadline,
      clipsOwed: total - submitted,
    }];
  });
}
