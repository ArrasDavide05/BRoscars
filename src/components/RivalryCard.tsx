"use client";

import Link from "next/link";
import { useData, type RivalryRow } from "@/lib/data";
import { Avatar } from "./Avatar";

const record = (r: RivalryRow) => `${r.wins}W ${r.draws}D ${r.losses}L`;

/** Head-to-head records vs every rival over finished nights, with nemesis + favourite victim. */
export function RivalryCard({ userId }: { userId: string }) {
  const data = useData();
  const isMe = userId === data.currentUserId;
  const name = data.getUser(userId)?.name ?? "This member";
  const { rows, nemesisId, victimId } = data.getRivalries(userId);

  const highlight = (icon: string, label: string, hint: string, rivalId: string | null) => {
    const row = rows.find((r) => r.rivalId === rivalId);
    const rival = rivalId ? data.getUser(rivalId) : undefined;
    if (!row || !rival) return null;
    return (
      <div className="row wrap" style={{ gap: 10 }}>
        <Avatar user={rival} size={34} />
        <div className="stack" style={{ gap: 2 }}>
          <span>
            {icon} <strong>{label}:</strong>{" "}
            <Link href={`/profile/${rival.id}`}>{rival.name}</Link>
            <span className="muted"> — {record(row)}</span>
          </span>
          <span className="faint" style={{ fontSize: 12 }}>{hint}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="panel pad stack" style={{ gap: 14 }}>
      <div className="section-title">Rivalries</div>

      {rows.length === 0 ? (
        <p className="faint">No head-to-heads yet — finish a night to start a rivalry.</p>
      ) : (
        <>
          {(nemesisId || victimId) && (
            <div className="stack" style={{ gap: 10 }}>
              {highlight("😈", "Nemesis", isMe ? "Beats you most often" : `Beats ${name} most often`, nemesisId)}
              {highlight("🎯", "Favourite victim", isMe ? "You beat them most often" : `${name} beats them most often`, victimId)}
            </div>
          )}

          <div className="stack" style={{ gap: 6 }}>
            <span className="faint" style={{ fontSize: 12 }}>
              {isMe ? "Your" : `${name}'s`} record vs each rival (W–D–L, finished rounds)
            </span>
            {rows.map((r) => {
              const rival = data.getUser(r.rivalId);
              if (!rival) return null;
              return (
                <div key={r.rivalId} className="row between" style={{ gap: 10 }}>
                  <span className="row" style={{ gap: 8 }}>
                    <Avatar user={rival} size={24} />
                    <Link href={`/profile/${rival.id}`} style={{ fontSize: 14 }}>{rival.name}</Link>
                  </span>
                  <span className="muted" style={{ fontSize: 13, fontVariantNumeric: "tabular-nums" }}>
                    {r.wins}–{r.draws}–{r.losses}
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
