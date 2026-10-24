"use client";

import { useData } from "@/lib/data";
import { Avatar } from "@/components/Avatar";

/** Pre-event lobby: each member's clip count. Counts only; other entries stay sealed. */
export function SubmissionProgress({ eventId }: { eventId: string }) {
  const data = useData();
  const progress = data.getSubmissionProgress(eventId);

  return (
    <div className="stack" style={{ gap: 8 }}>
      <div className="section-title">Who&apos;s in</div>
      <div className="row wrap" role="list" aria-label="Submission progress" style={{ gap: 8 }}>
        {progress.map((p) => {
          const user = data.getUser(p.userId);
          if (!user) return null;
          return (
            <div
              key={p.userId}
              role="listitem"
              aria-label={`${user.name}: ${p.submitted} of ${p.total} clips`}
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
            </div>
          );
        })}
      </div>
    </div>
  );
}
