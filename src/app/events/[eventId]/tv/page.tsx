"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { useData, ROUND_SECONDS } from "@/lib/data";
import { Avatar } from "@/components/Avatar";
import { RoundReveal } from "@/components/RoundReveal";
import { BroscarPanel } from "@/components/BroscarPanel";
import { SuperlativesPanel } from "@/components/SuperlativesPanel";
import { RaceScoreboard } from "@/components/RaceScoreboard";
import { TvHeader } from "@/components/TvHeader";
import { TvLobby } from "@/components/TvLobby";
import { EmptyPlayingStage, PlayingStage } from "@/components/TvPlayingStage";
import { useTick } from "@/components/useTick";
import { NO_ENTRIES_TEXT } from "@/lib/domain/format";
import { nominees } from "@/lib/domain/nominees";
import { UNKNOWN_PROMPT, UNKNOWN_THEME } from "@/lib/domain/lineup";

export default function TvPage({ params }: { params: { eventId: string } }) {
  const data = useData();
  const mounted = useTick(250);
  const event = data.getEvent(params.eventId);
  const live = data.live;
  const advanceRef = useRef("");

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
      data.advance({ roundIndex: live.roundIndex, submissionIndex: live.submissionIndex });
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
    return <TvLobby eventId={event.id} />;
  }

  const round = data.getCurrentRound();
  const themeName = (round && data.getThemeForRound(round.id)?.name) || UNKNOWN_THEME;
  const promptText = (round && data.getPromptForRound(round.id)?.text) || UNKNOWN_PROMPT;
  const roundNo = live.roundIndex + 1;
  const roundIsEmpty = !round || data.getPlayOrder(round.id).length === 0;

  return (
    <div className="stack" style={{ gap: 18, paddingTop: 24 }}>
      <TvHeader
        groupName={group?.name}
        event={event}
        label={`Round ${roundNo}/${rounds.length} · ${themeName}`}
      />

      {live.phase === "round-intro" && (
        <div className="tv-stage">
          <span className="eyebrow">Round {roundNo} · {themeName}</span>
          <h1 className="tv-title-card">{promptText}</h1>
          {roundIsEmpty && <p className="muted">{NO_ENTRIES_TEXT}</p>}
          {round && !roundIsEmpty && <NomineesStrip groupId={event.groupId} roundId={round.id} />}
          <button type="button" className="btn btn-gold btn-lg" onClick={() => data.advance()}>
            {roundIsEmpty ? "Skip round ▶" : "Start round ▶"}
          </button>
        </div>
      )}

      {live.phase === "playing" && (round ? <PlayingStage roundId={round.id} mounted={mounted} /> : <EmptyPlayingStage />)}

      {live.phase === "round-results" && round && (
        <div className="stack" style={{ gap: 16 }}>
          <div className="tv-stage" style={{ minHeight: "auto", gap: 8 }}>
            <span className="eyebrow">Round {roundNo} results</span>
            <h2 style={{ fontSize: 28 }}>{promptText}</h2>
          </div>
          <RoundReveal
            key={round.id}
            roundId={round.id}
            // Read once at mount: a tab opened after the reveal shows the podium.
            alreadyRevealed={live.revealedRoundIndex === live.roundIndex}
            onDone={() => data.markRoundRevealed(event.id)}
          />
          {/* Shared flag: also releases the personal recap on every phone. */}
          {live.revealedRoundIndex === live.roundIndex && (
            <>
              <RaceScoreboard eventId={event.id} roundsCompleted={roundNo} totalRounds={rounds.length} />
              <div className="row" style={{ justifyContent: "center" }}>
                <button type="button" className="btn btn-gold btn-lg" onClick={() => data.advance()}>
                  {roundNo < rounds.length ? "Next round ▶" : "Reveal the BRoscar 🏆"}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {live.phase === "broscar" && (
        <div className="stack" style={{ gap: 16 }}>
          <BroscarPanel eventId={event.id} />
          <SuperlativesPanel eventId={event.id} />
          <div className="row" style={{ justifyContent: "center" }}>
            <button type="button" className="btn btn-gold btn-lg" onClick={() => data.advance()}>
              Finish &amp; save to history
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Round intro: who entered this round. Clips, captions and play order stay hidden.
function NomineesStrip({ groupId, roundId }: { groupId: string; roundId: string }) {
  const data = useData();
  const ids = nominees(data.getMembers(groupId).map((m) => m.id), data.getSubmissions(roundId));
  const users = ids.map((id) => data.getUser(id)).filter((u): u is NonNullable<typeof u> => Boolean(u));
  if (users.length === 0) return null;
  const names = users.map((u) => u.name);
  return (
    <div className="stack" style={{ gap: 10, alignItems: "center" }} role="group" aria-label={`Nominees: ${names.join(", ")}`}>
      <span className="eyebrow">The nominees are…</span>
      <div className="row wrap" style={{ gap: 18, justifyContent: "center" }}>
        {users.map((u) => (
          <div key={u.id} className="row" style={{ gap: 8 }}>
            <Avatar user={u} size={34} />
            <strong style={{ fontSize: 18 }}>{u.name}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}
