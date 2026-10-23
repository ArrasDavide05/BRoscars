"use client";

import { useData } from "@/lib/data";
import { Avatar } from "@/components/Avatar";

/** TV strip: one avatar per eligible rater, lit up once they've rated. Never shows the value. */
export function RaterStrip({ eligible, ratedBy }: { eligible: string[]; ratedBy: string[] }) {
  const data = useData();
  const rated = new Set(ratedBy);

  return (
    <div className="rater-strip" role="list" aria-label="Who has rated">
      {eligible.map((id) => {
        const user = data.getUser(id);
        if (!user) return null;
        const done = rated.has(id);
        return (
          <div
            key={id}
            role="listitem"
            aria-label={`${user.name}: ${done ? "rated" : "waiting"}`}
            className={`rater ${done ? "rater-done" : "rater-waiting"}`}
          >
            <span className="rater-avatar" aria-hidden>
              <Avatar user={user} size={40} />
              {done && <span className="rater-check">✓</span>}
            </span>
            <span className="rater-name" aria-hidden>{user.name}</span>
          </div>
        );
      })}
    </div>
  );
}
