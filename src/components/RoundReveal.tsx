"use client";

import { useEffect, useRef, useState } from "react";
import { useData, type Submission } from "@/lib/data";
import { Avatar } from "./Avatar";
import { VideoModal } from "./VideoModal";

const MEDAL = ["🥇", "🥈", "🥉"];
const PLACE = ["1st", "2nd", "3rd"];
const STEP_MS = 2000;

/**
 * Group ranked rows into reveal steps: rows sharing a (competition) rank share
 * a step; steps are ordered from the lowest place up to 1st.
 * Pure — could move to `src/lib/domain/` later.
 */
export function groupRevealSteps<T extends { rank: number }>(rows: readonly T[]): T[][] {
  const byRank = new Map<number, T[]>();
  for (const r of rows) byRank.set(r.rank, [...(byRank.get(r.rank) ?? []), r]);
  return Array.from(byRank.entries())
    .sort((a, b) => b[0] - a[0])
    .map(([, group]) => group);
}

/**
 * TV round results as a suspense reveal: 3rd → 2nd → 1st (ties together),
 * auto-advancing every ~2s or on "Reveal next". Reveal progress is local UI
 * state; remount with `key={roundId}` to reset it.
 */
export function RoundReveal({ roundId, onDone }: { roundId: string; onDone?: () => void }) {
  const data = useData();
  const standings = data.getRoundStandings(roundId).slice(0, 3);
  const steps = groupRevealSteps(standings);
  const [revealed, setRevealed] = useState(0);
  const [openSub, setOpenSub] = useState<Submission | null>(null);
  const done = revealed >= steps.length;

  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    if (done) return;
    const t = setTimeout(() => setRevealed((r) => r + 1), STEP_MS);
    return () => clearTimeout(t);
  }, [revealed, done]);

  useEffect(() => {
    if (done) onDoneRef.current?.();
  }, [done]);

  if (steps.length === 0) {
    return <p className="muted" style={{ textAlign: "center" }}>No entries this round.</p>;
  }

  // Steps run lowest place first, so step index i is revealed once revealed > i.
  const isRevealed = (rank: number) => steps.findIndex((g) => g[0].rank === rank) < revealed;
  const lastStep = revealed > 0 ? steps[revealed - 1] : null;
  const announcement = lastStep
    ? `${lastStep[0].rank === 1 ? "Winner" : `${PLACE[lastStep[0].rank - 1]} place`}: ${lastStep
        .map((s) => data.getUser(s.userId)?.name ?? "")
        .join(" & ")}`
    : "Opening the envelopes…";

  return (
    <div className="stack" style={{ gap: 10 }}>
      <p className="reveal-announce" aria-live="polite">{announcement}</p>
      {standings.map((s) => {
        const big = s.rank === 1;
        const medal = MEDAL[s.rank - 1] ?? s.rank;
        if (!isRevealed(s.rank)) {
          return (
            <div
              key={s.submissionId}
              className={`standing-row reveal-sealed${big ? " reveal-big" : ""}`}
              aria-hidden
            >
              <span style={{ fontSize: 22, width: 30 }}>{medal}</span>
              <span className="reveal-envelope">✉️</span>
              <span className="faint" style={{ flex: 1 }}>Sealed</span>
              <span className="net-score">?</span>
            </div>
          );
        }
        const u = data.getUser(s.userId)!;
        const sub = data.getSubmissions(roundId).find((x) => x.id === s.submissionId) ?? null;
        return (
          <button
            key={s.submissionId}
            className={`standing-row clickable reveal-in${big ? " top reveal-big reveal-winner" : ""}`}
            onClick={() => setOpenSub(sub)}
          >
            <span style={{ fontSize: big ? 30 : 22, width: big ? 40 : 30 }}>{medal}</span>
            <Avatar user={u} size={big ? 56 : 40} />
            <div className="stack" style={{ gap: 2, flex: 1 }}>
              {big && <span className="eyebrow">Winner</span>}
              <strong style={big ? { fontSize: 22 } : undefined}>{u.name}</strong>
              <span className="watch-hint">▶ Watch clip · ▲ {s.up} · ▼ {s.down}</span>
            </div>
            <span className="net-score" style={big ? { fontSize: 26 } : undefined}>
              {s.net > 0 ? `+${s.net}` : s.net}
            </span>
          </button>
        );
      })}
      {!done && (
        <div className="row" style={{ justifyContent: "center" }}>
          <button className="btn btn-sm" onClick={() => setRevealed((r) => r + 1)}>
            Reveal next ✉️
          </button>
        </div>
      )}
      <VideoModal submission={openSub} onClose={() => setOpenSub(null)} />
    </div>
  );
}
