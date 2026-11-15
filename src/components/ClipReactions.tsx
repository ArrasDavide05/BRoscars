"use client";

import { useData } from "@/lib/data";

/**
 * Emoji reactions under a finished night's winning clip. A member who didn't post
 * it gets toggle chips (tap again to clear, another to switch); everyone else
 * sees the non-zero counts only.
 */
export function ClipReactions({ submissionId }: { submissionId: string }) {
  const data = useData();
  const sub = data.getSubmission(submissionId);
  if (!sub) return null;
  const round = data.getRound(sub.roundId);
  const event = round ? data.getEvent(round.eventId) : undefined;
  const isMember = Boolean(event && data.getGroup(event.groupId)?.memberIds.includes(data.currentUserId));
  const canReact = event?.status === "complete" && isMember && sub.userId !== data.currentUserId;
  const mine = data.getMyReaction(submissionId);
  const counts = data.getReactions(submissionId);
  const shown = canReact ? counts : counts.filter((c) => c.count > 0);
  if (shown.length === 0) return null;

  return (
    <div className="reaction-row" role="group" aria-label="Reactions">
      {shown.map((c) =>
        canReact ? (
          <button
            type="button"
            key={c.emoji}
            className="reaction-chip"
            aria-pressed={mine === c.emoji}
            aria-label={`React ${c.label}, ${c.count} so far`}
            onClick={() => data.reactToSubmission(data.currentUserId, submissionId, c.emoji)}
          >
            <span aria-hidden="true">{c.emoji}</span>
            <span aria-hidden="true">{c.count}</span>
          </button>
        ) : (
          <span key={c.emoji} className="reaction-chip" aria-label={`${c.label}: ${c.count}`} role="img">
            <span aria-hidden="true">{c.emoji}</span>
            <span aria-hidden="true">{c.count}</span>
          </span>
        )
      )}
    </div>
  );
}
