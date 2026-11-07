"use client";

import { useData } from "@/lib/data";
import { Avatar } from "@/components/Avatar";
import { nudgeLine } from "@/lib/domain/nudge";

/** Pre-event lobby: each member's clip count. Counts only; other entries stay sealed. */
export function SubmissionProgress({ eventId }: { eventId: string }) {
  const data = useData();
  const progress = data.getSubmissionProgress(eventId);
  const event = data.getEvent(eventId);
  const canNudge = event?.status === "upcoming" && event.hostId === data.currentUserId;
  const myNudge = data.getNudgeFor(eventId, data.currentUserId);
  const nudger = myNudge ? data.getUser(myNudge.fromUserId) : undefined;

  return (
    <div className="stack" style={{ gap: 8 }}>
      <div className="section-title">Who&apos;s in</div>
      {myNudge && nudger && (
        <div role="status" style={{ fontSize: 13, fontWeight: 600, color: "var(--gold)" }}>
          {nudgeLine(nudger.name, myNudge.clipsOwed)}
        </div>
      )}
      <div className="row wrap" role="list" aria-label="Submission progress" style={{ gap: 8 }}>
        {progress.map((p) => {
          const user = data.getUser(p.userId);
          if (!user) return null;
          const showNudge = canNudge && !p.complete && p.userId !== event.hostId;
          const nudged = showNudge && data.getNudgeFor(eventId, p.userId) !== null;
          return (
            <div
              key={p.userId}
              role="listitem"
              aria-label={`${user.name}: ${p.submitted} of ${p.total} clips${nudged ? ", nudged" : ""}`}
              className="panel row"
              style={{
                gap: 8,
                padding: "6px 12px 6px 6px",
                borderRadius: 999,
                borderColor: p.complete ? "var(--gold-deep)" : undefined,
              }}
            >
              <Avatar user={user} size={26} />
              <span style={{ fontSize: 13 }}>{user.name}</span>
              <span className={p.complete ? "" : "muted"} style={{ fontSize: 13, fontWeight: 700, color: p.complete ? "var(--gold)" : undefined }}>
                {p.submitted}/{p.total}
                {p.complete && " ✓"}
              </span>
              {showNudge && (
                <button
                  type="button"
                  className="btn btn-sm btn-ghost"
                  style={{ padding: "2px 10px", fontSize: 12 }}
                  disabled={nudged}
                  aria-label={nudged ? `Nudged ${user.name}` : `Nudge ${user.name}`}
                  onClick={() => data.nudgeMember(eventId, data.currentUserId, p.userId)}
                >
                  {nudged ? "Nudged ✓" : "Nudge"}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
