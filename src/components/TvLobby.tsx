"use client";

import Link from "next/link";
import { useData } from "@/lib/data";
import { plural } from "@/lib/domain/format";
import { buildLineup } from "@/lib/domain/lineup";
import { TvHeader } from "./TvHeader";

/** TV before the night starts: lineup, host Start button or waiting text. */
export function TvLobby({ eventId }: { eventId: string }) {
  const data = useData();
  const event = data.getEvent(eventId);
  if (!event) return null;
  const group = data.getGroup(event.groupId);
  const rounds = data.getEventRounds(event.id);
  const isHost = event.hostId === data.currentUserId;
  const liveEvent = data.getLiveEvent();
  const otherLive = liveEvent?.id === event.id ? undefined : liveEvent;
  const lineup = buildLineup(rounds, data.getThemeForRound, data.getPromptForRound);
  return (
    <div className="stack" style={{ gap: 20, paddingTop: 24 }}>
      <TvHeader groupName={group?.name} event={event} label="Ready" />
      <div className="tv-stage">
        <div className="spotlight">📺</div>
        <h1 className="tv-title-card">{event.title}</h1>
        <p className="muted">{plural(rounds.length, "round")} · {plural(data.getMembers(event.groupId).length, "player")}</p>
        {lineup.length > 0 && (
          <section className="tv-lineup" aria-labelledby="tv-lineup-title">
            <h2 id="tv-lineup-title" className="section-title">Tonight&apos;s categories</h2>
            <ol>
              {lineup.map((e) => (
                <li key={e.roundId}>
                  <span className="tv-lineup-no">Round {e.roundNo}</span> · <span className="tv-lineup-theme">{e.themeName}</span> · {e.promptText}
                </li>
              ))}
            </ol>
          </section>
        )}
        {isHost && otherLive ? (
          <>
            <p className="muted">Another night is live right now.</p>
            {otherLive.groupId === event.groupId && (
              <Link href={`/events/${otherLive.id}/tv`} className="btn btn-sm">{otherLive.title} →</Link>
            )}
          </>
        ) : isHost ? (
          <button type="button" className="btn btn-gold btn-lg" onClick={() => data.startLiveEvent(event.id)}>
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
