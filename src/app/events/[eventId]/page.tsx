"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useData } from "@/lib/data";
import { Avatar } from "@/components/Avatar";
import { SubmitRow } from "@/components/SubmitRow";
import { RoundStandings } from "@/components/RoundStandings";
import { BroscarPanel } from "@/components/BroscarPanel";
import { SuperlativesPanel } from "@/components/SuperlativesPanel";

export default function EventPage({ params }: { params: { eventId: string } }) {
  const data = useData();
  const router = useRouter();
  const event = data.getEvent(params.eventId);

  if (!event) {
    return (
      <div className="pad">
        <p className="muted">Event not found.</p>
        <Link href="/" className="btn btn-ghost btn-sm">← Home</Link>
      </div>
    );
  }

  const group = data.getGroup(event.groupId);
  const rounds = data.getEventRounds(event.id);
  const isHost = event.hostId === data.currentUserId;
  const members = data.getMembers(event.groupId);

  const mySubmitted = rounds.filter((r) => data.getSubmissionByUser(r.id, data.currentUserId)).length;

  return (
    <div className="stack" style={{ gap: 24, paddingTop: 24 }}>
      <Link href={`/groups/${event.groupId}`} className="faint" style={{ fontSize: 13 }}>
        ← {group?.name}
      </Link>

      <div className="stack" style={{ gap: 8 }}>
        <span className="eyebrow">
          {event.status === "upcoming" ? "Upcoming night" : event.status === "live" ? "Live now" : "Past night"}
        </span>
        <h1 style={{ fontSize: 38, fontWeight: 900 }}>{event.title}</h1>
        <span className="faint" style={{ fontSize: 13 }}>
          {new Date(event.date).toLocaleDateString()} · {rounds.length} rounds · hosted by {data.getUser(event.hostId)?.name}
        </span>
      </div>

      {/* ---- LIVE ---- */}
      {event.status === "live" && (
        <div className="panel pad row between wrap" style={{ gap: 12 }}>
          <div className="stack" style={{ gap: 4 }}>
            <strong>This night is live 🔴</strong>
            <span className="muted" style={{ fontSize: 13 }}>Open the TV on the big screen and Play on each phone.</span>
          </div>
          <div className="row" style={{ gap: 10 }}>
            <Link href={`/events/${event.id}/tv`} className="btn btn-gold">📺 Open TV</Link>
            <Link href={`/events/${event.id}/play`} className="btn">📱 Play</Link>
          </div>
        </div>
      )}

      {/* ---- UPCOMING (pre-event submission) ---- */}
      {event.status === "upcoming" && (
        <div className="stack" style={{ gap: 16 }}>
          <div className="panel pad row between wrap" style={{ gap: 12 }}>
            <div className="stack" style={{ gap: 4 }}>
              <strong>Your submissions · {mySubmitted}/{rounds.length}</strong>
              <span className="muted" style={{ fontSize: 13 }}>
                Submit a clip for each round before the night. You only see your own entries until it goes live.
              </span>
            </div>
            <div className="row" style={{ gap: 10 }}>
              <span className="note">Deadline {new Date(event.deadline).toLocaleDateString()}</span>
              <button
                className="btn btn-gold"
                disabled={!isHost}
                title={isHost ? "Start the live ceremony" : "Only the host can start"}
                onClick={() => {
                  data.startLiveEvent(event.id);
                  router.push(`/events/${event.id}/tv`);
                }}
              >
                {isHost ? "Start the night ▶" : "Host starts the night"}
              </button>
            </div>
          </div>

          <div className="stack">
            <div className="section-title">Rounds</div>
            {rounds.map((r, i) => (
              <SubmitRow key={r.id} roundId={r.id} index={i} />
            ))}
          </div>
        </div>
      )}

      {/* ---- COMPLETE (results) ---- */}
      {event.status === "complete" && (
        <div className="stack" style={{ gap: 22 }}>
          <BroscarPanel eventId={event.id} />
          <SuperlativesPanel eventId={event.id} />
          <div className="stack" style={{ gap: 16 }}>
            <div className="section-title">Round by round</div>
            {rounds.map((r, i) => {
              const theme = data.getThemeForRound(r.id);
              const prompt = data.getPromptForRound(r.id);
              return (
                <div key={r.id} className="stack" style={{ gap: 8 }}>
                  <div className="row" style={{ gap: 10 }}>
                    <span className="faint" style={{ fontSize: 12 }}>#{i + 1}</span>
                    <span className="badge" style={{ fontSize: 11 }}>{theme?.name}</span>
                    <strong>{prompt?.text}</strong>
                  </div>
                  <RoundStandings roundId={r.id} limit={data.getSubmissions(r.id).length} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* members strip */}
      <div className="row wrap" style={{ gap: 8 }}>
        {members.map((m) => (
          <Link key={m.id} href={`/profile/${m.id}`} className="row" style={{ gap: 6 }} title={m.name}>
            <Avatar user={m} size={26} />
          </Link>
        ))}
      </div>
    </div>
  );
}
