"use client";

import Link from "next/link";
import { useData } from "@/lib/data";
import { Avatar } from "@/components/Avatar";

/** All-time group leaderboard, on the page background (no card). */
export function HallOfFame({ groupId }: { groupId: string }) {
  const data = useData();
  const hasFinished = data.getEvents(groupId).some((e) => e.status === "complete");
  const rows = data.getGroupHallOfFame(groupId);

  return (
    <section className="stack">
      <div className="stack" style={{ gap: 4 }}>
        <div className="section-title">Hall of Fame</div>
        <span className="faint" style={{ fontSize: 12 }}>All-time, finished nights only</span>
      </div>
      {!hasFinished ? (
        <div className="note">No finished nights yet.</div>
      ) : (
        <ol className="stack" style={{ gap: 0, listStyle: "none", margin: 0, padding: 0 }}>
          {rows.map((row) => {
            const user = data.getUser(row.userId);
            if (!user) return null;
            const top = row.rank === 1;
            return (
              <li
                key={row.userId}
                className="row between"
                style={{
                  gap: 12,
                  padding: "10px 4px",
                  borderBottom: "1px solid var(--line)",
                  borderLeft: top ? "3px solid var(--gold)" : "3px solid transparent",
                  paddingLeft: 10,
                }}
              >
                <span className="row" style={{ gap: 12 }}>
                  <span
                    style={{
                      width: 22,
                      textAlign: "right",
                      fontWeight: 800,
                      color: top ? "var(--gold)" : "var(--faint)",
                    }}
                  >
                    {row.rank}
                  </span>
                  <Avatar user={user} size={32} />
                  <Link
                    href={`/profile/${user.id}`}
                    style={{ fontWeight: top ? 800 : 600, color: top ? "var(--gold-soft)" : undefined }}
                  >
                    {user.name}
                  </Link>
                </span>
                <span className={top ? undefined : "faint"} style={{ fontSize: 13, color: top ? "var(--gold)" : undefined }}>
                  👑 {row.crowns} · 🏆 {row.broscars} · ▲ {row.upvotes}
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
