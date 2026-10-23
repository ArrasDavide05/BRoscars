"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useData, ROUND_SECONDS } from "@/lib/data";
import { Avatar } from "@/components/Avatar";
import { TimerRing } from "@/components/TimerRing";
import { RaterStrip } from "@/components/RaterStrip";
import { RoundReveal } from "@/components/RoundReveal";
import { BroscarPanel } from "@/components/BroscarPanel";
import { SuperlativesPanel } from "@/components/SuperlativesPanel";
import { useTick } from "@/components/useTick";

export default function TvPage({ params }: { params: { eventId: string } }) {
  const data = useData();
  const mounted = useTick(250);
  const event = data.getEvent(params.eventId);
  const live = data.live;
  const advanceRef = useRef("");
  // Round whose top-3 reveal has reached the winner (UI-only; gates "Next round").
  const [revealedRoundId, setRevealedRoundId] = useState<string | null>(null);

  const isThisLive = Boolean(event && event.status === "live" && live.eventId === event.id);

  // The TV is the single driver of auto-advance (timer expiry OR all present rated).
  useEffect(() => {
    if (!isThisLive || live.phase !== "playing") return;
    const sub = data.getCurrentSubmission();
    if (!sub) return;
    const slot = `${live.roundIndex}:${live.submissionIndex}`;
    const rs = data.getVideoRatingState(sub.id);
    const rem = ROUND_SECONDS - (Date.now() - (live.videoStartedAt ?? Date.now())) / 1000;
    if ((rs.allRated || rem <= 0) && advanceRef.current !== slot) {
      advanceRef.current = slot;
      data.advance();
    }
  });

  if (!event) {
    return <div className="pad"><p className="muted">Event not found.</p></div>;
  }

  const group = data.getGroup(event.groupId);
  const rounds = data.getEventRounds(event.id);

  // Completed night — show the final result on the TV.
  if (event.status === "complete") {
    return (
      <div className="stack" style={{ gap: 20, paddingTop: 24 }}>
        <TvHeader groupName={group?.name} event={event} label="Final result" />
        <BroscarPanel eventId={event.id} />
        <SuperlativesPanel eventId={event.id} />
        <Link href={`/events/${event.id}`} className="btn btn-ghost btn-sm">← Event page</Link>
      </div>
    );
  }

  // Not started yet — lobby / start screen.
  if (!isThisLive) {
    const isHost = event.hostId === data.currentUserId;
    return (
      <div className="stack" style={{ gap: 20, paddingTop: 24 }}>
        <TvHeader groupName={group?.name} event={event} label="Ready" />
        <div className="tv-stage">
          <div className="spotlight">📺</div>
          <h1 className="tv-title-card">{event.title}</h1>
          <p className="muted">{rounds.length} rounds · {data.getMembers(event.groupId).length} players</p>
          {isHost ? (
            <button className="btn btn-gold btn-lg" onClick={() => data.startLiveEvent(event.id)}>
              Start the night ▶
            </button>
          ) : (
            <p className="muted">Waiting for the host to start the night.</p>
          )}
          <p className="note">Open <code>/events/{event.id}/play</code> in another tab to rate from a phone.</p>
        </div>
      </div>
    );
  }

  const round = data.getCurrentRound();
  const theme = round ? data.getThemeForRound(round.id) : undefined;
  const prompt = round ? data.getPromptForRound(round.id) : undefined;
  const roundNo = live.roundIndex + 1;

  return (
    <div className="stack" style={{ gap: 18, paddingTop: 24 }}>
      <TvHeader
        groupName={group?.name}
        event={event}
        label={`Round ${roundNo}/${rounds.length} · ${theme?.name ?? ""}`}
      />

      {live.phase === "round-intro" && (
        <div className="tv-stage">
          <span className="eyebrow">Round {roundNo} · {theme?.name}</span>
          <h1 className="tv-title-card">{prompt?.text}</h1>
          <button className="btn btn-gold btn-lg" onClick={() => data.advance()}>Start round ▶</button>
        </div>
      )}

      {live.phase === "playing" && round && <PlayingStage roundId={round.id} mounted={mounted} />}

      {live.phase === "round-results" && round && (
        <div className="stack" style={{ gap: 16 }}>
          <div className="tv-stage" style={{ minHeight: "auto", gap: 8 }}>
            <span className="eyebrow">Round {roundNo} results</span>
            <h2 style={{ fontSize: 28 }}>{prompt?.text}</h2>
          </div>
          <RoundReveal
            key={round.id}
            roundId={round.id}
            onDone={() => setRevealedRoundId(round.id)}
          />
          {revealedRoundId === round.id && (
            <div className="row" style={{ justifyContent: "center" }}>
              <button className="btn btn-gold btn-lg" onClick={() => data.advance()}>
                {roundNo < rounds.length ? "Next round ▶" : "Reveal the BRoscar 🏆"}
              </button>
            </div>
          )}
        </div>
      )}

      {live.phase === "broscar" && (
        <div className="stack" style={{ gap: 16 }}>
          <BroscarPanel eventId={event.id} />
          <SuperlativesPanel eventId={event.id} />
          <div className="row" style={{ justifyContent: "center" }}>
            <button className="btn btn-gold btn-lg" onClick={() => data.advance()}>
              Finish &amp; save to history
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function TvHeader({
  groupName,
  event,
  label,
}: {
  groupName?: string;
  event: { title: string; date: number };
  label: string;
}) {
  return (
    <div className="tv-bar">
      <div className="row" style={{ gap: 10 }}>
        <span className="brand-mark">🏆</span>
        <div className="stack" style={{ gap: 2 }}>
          <strong>{groupName}</strong>
          <span className="faint" style={{ fontSize: 12 }}>
            {event.title} · {new Date(event.date).toLocaleDateString()}
          </span>
        </div>
      </div>
      <span className="badge revealed">{label}</span>
    </div>
  );
}

function PlayingStage({ roundId, mounted }: { roundId: string; mounted: boolean }) {
  const data = useData();
  const live = data.live;
  const order = data.getPlayOrder(roundId);
  const sub = order[live.submissionIndex];
  if (!sub) return null;
  const uploader = data.getUser(sub.userId)!;
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
        <Avatar user={uploader} size={34} />
        <strong style={{ fontSize: 18 }}>{uploader.name}</strong>
      </div>
      <div className="subcard-caption" style={{ fontSize: 16 }}>&ldquo;{sub.caption}&rdquo;</div>

      <TimerRing remaining={remaining} total={ROUND_SECONDS} />
      <RaterStrip eligible={rs.eligible} ratedBy={rs.ratedBy} />
      <div className="muted">{rs.ratedBy.length} / {rs.eligible.length} players rated</div>

      <div className="row" style={{ gap: 10 }}>
        <button className="btn btn-sm" onClick={() => data.castBotRatings()}>🤖 Cast bot ratings</button>
        <button className="btn btn-sm btn-ghost" onClick={() => data.advance()}>Skip ⏭</button>
      </div>
      <p className="note">Ratings are hidden until the round ends.</p>
    </div>
  );
}
