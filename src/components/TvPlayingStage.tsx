"use client";

import { useData, ROUND_SECONDS } from "@/lib/data";
import { NO_ENTRIES_TEXT, plural } from "@/lib/domain/format";
import { Avatar } from "./Avatar";
import { RaterStrip } from "./RaterStrip";
import { TimerRing } from "./TimerRing";

// Defensive: "playing" with nothing to play would otherwise leave the TV blank and stuck.
export function EmptyPlayingStage() {
  const data = useData();
  return (
    <div className="tv-stage">
      <p className="muted">{NO_ENTRIES_TEXT}</p>
      <button type="button" className="btn btn-gold btn-lg" onClick={() => data.advance()}>Skip round ▶</button>
    </div>
  );
}

export function PlayingStage({ roundId, mounted }: { roundId: string; mounted: boolean }) {
  const data = useData();
  const live = data.live;
  const order = data.getPlayOrder(roundId);
  const sub = order[live.submissionIndex];
  if (!sub) return <EmptyPlayingStage />;
  const uploader = data.getUser(sub.userId);
  const rs = data.getVideoRatingState(sub.id);
  const remaining = mounted
    ? ROUND_SECONDS - (Date.now() - (live.videoStartedAt ?? Date.now())) / 1000
    : ROUND_SECONDS;

  return (
    <div className="tv-stage" style={{ gap: 14 }}>
      <span className="faint" style={{ fontSize: 13 }}>
        Video {live.submissionIndex + 1} of {order.length}
      </span>
      <div
        className="tv-video"
        style={{ background: `linear-gradient(150deg, ${sub.tileFrom}, ${sub.tileTo})` }}
      >
        <div className="tile-play" aria-hidden>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
        </div>
        <span className="tile-dur">0:{String(sub.durationSec).padStart(2, "0")}</span>
      </div>

      <div className="row" style={{ gap: 10 }}>
        {uploader && <Avatar user={uploader} size={34} />}
        <strong style={{ fontSize: 18 }}>{uploader?.name ?? "Unknown player"}</strong>
      </div>
      <div className="subcard-caption" style={{ fontSize: 16 }}>&ldquo;{sub.caption}&rdquo;</div>

      <TimerRing remaining={remaining} total={ROUND_SECONDS} />
      <RaterStrip eligible={rs.eligible} ratedBy={rs.ratedBy} />
      <div className="muted">{rs.ratedBy.length} / {plural(rs.eligible.length, "player")} rated</div>

      <div className="row" style={{ gap: 10 }}>
        <button type="button" className="btn btn-sm" onClick={() => data.castBotRatings()}>🤖 Cast bot ratings</button>
        <button type="button" className="btn btn-sm btn-ghost" onClick={() => data.advance()}>Skip ⏭</button>
      </div>
      <p className="note">Ratings are hidden until the round ends.</p>
    </div>
  );
}
