"use client";

import Link from "next/link";
import { useData, ROUND_SECONDS } from "@/lib/data";
import type { User } from "@/lib/data";
import { Avatar } from "@/components/Avatar";
import { TimerRing } from "@/components/TimerRing";
import { RatingButtons } from "@/components/RatingButtons";
import { useTick } from "@/components/useTick";

export default function PlayPage({ params }: { params: { eventId: string } }) {
  const data = useData();
  const mounted = useTick(250);
  const event = data.getEvent(params.eventId);
  const me = data.currentUser;
  const live = data.live;

  if (!event) {
    return <div className="pad"><p className="muted">Event not found.</p></div>;
  }

  const isThisLive = event.status === "live" && live.eventId === event.id;
  const group = data.getGroup(event.groupId);
  const frame = { groupName: group?.name, eventTitle: event.title, me };

  if (event.status === "complete") {
    return (
      <PhoneFrame {...frame}>
        <WaitCard icon="🏆" title="This night is over" sub="Check the results on the event page." />
        <Link href={`/events/${event.id}`} className="btn btn-sm">See results</Link>
      </PhoneFrame>
    );
  }

  if (!isThisLive) {
    return (
      <PhoneFrame {...frame}>
        <WaitCard icon="⏳" title="Waiting for the host" sub="The night hasn't started yet. Hang tight." />
      </PhoneFrame>
    );
  }

  if (live.phase === "round-intro") {
    return <PhoneFrame {...frame}><WaitCard icon="🎬" title="Get ready" sub={`Round ${live.roundIndex + 1} is about to start.`} /></PhoneFrame>;
  }
  if (live.phase === "round-results") {
    return <PhoneFrame {...frame}><WaitCard icon="📊" title="Round over" sub="Standings are on the TV. Next round soon." /></PhoneFrame>;
  }
  if (live.phase === "broscar") {
    return <PhoneFrame {...frame}><WaitCard icon="🏆" title="And the BRoscar goes to…" sub="Watch the TV for the champion!" /></PhoneFrame>;
  }

  // phase === 'playing'
  const round = data.getCurrentRound();
  const sub = data.getCurrentSubmission();
  if (!round || !sub) return <PhoneFrame {...frame}><WaitCard icon="⏳" title="Loading…" sub="" /></PhoneFrame>;

  const uploader = data.getUser(sub.userId)!;
  const isMine = sub.userId === me.id;
  const myRating = data.getMyRating(sub.id, me.id);
  const remaining = mounted
    ? ROUND_SECONDS - (Date.now() - (live.videoStartedAt ?? Date.now())) / 1000
    : ROUND_SECONDS;

  return (
    <PhoneFrame {...frame}>
      <div className="stack" style={{ gap: 14, alignItems: "center", textAlign: "center" }}>
        <span className="faint" style={{ fontSize: 12 }}>Now playing</span>
        <div className="row" style={{ gap: 10 }}>
          <Avatar user={uploader} size={30} />
          <strong>{uploader.name}{isMine && <span className="faint"> (you)</span>}</strong>
        </div>
        <div className="subcard-caption">&ldquo;{sub.caption}&rdquo;</div>
        <TimerRing remaining={remaining} total={ROUND_SECONDS} size={80} />
      </div>

      {isMine ? (
        <div className="note" style={{ textAlign: "center", padding: 16 }}>
          🎥 This one&apos;s yours — you can&apos;t rate your own entry.
        </div>
      ) : (
        <>
          <RatingButtons
            myRating={myRating}
            onRate={(v) => data.castRating(round.id, sub.id, me.id, v)}
          />
          {myRating !== undefined && (
            <div className="note" style={{ textAlign: "center" }}>
              ✓ Rated. Waiting for the next video…
            </div>
          )}
        </>
      )}
    </PhoneFrame>
  );
}

/** Phone chrome (group, event, viewer). Module-level so ticks don't remount the subtree. */
function PhoneFrame({
  groupName,
  eventTitle,
  me,
  children,
}: {
  groupName: string | undefined;
  eventTitle: string;
  me: User;
  children: React.ReactNode;
}) {
  return (
    <div className="phone-frame stack" style={{ gap: 18, paddingTop: 24 }}>
      <div className="tv-bar">
        <div className="stack" style={{ gap: 2 }}>
          <strong>{groupName}</strong>
          <span className="faint" style={{ fontSize: 12 }}>{eventTitle}</span>
        </div>
        <span className="row" style={{ gap: 6 }}>
          <Avatar user={me} size={24} />
          <span style={{ fontSize: 13, fontWeight: 700 }}>{me.name}</span>
        </span>
      </div>
      {children}
    </div>
  );
}

function WaitCard({ icon, title, sub }: { icon: string; title: string; sub: string }) {
  return (
    <div className="tv-stage" style={{ minHeight: "40vh" }}>
      <div className="spotlight">{icon}</div>
      <h2 style={{ fontSize: 24 }}>{title}</h2>
      {sub && <p className="muted">{sub}</p>}
    </div>
  );
}
