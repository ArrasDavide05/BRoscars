"use client";

import Link from "next/link";
import { useData, type NextUpItem } from "@/lib/data";
import { DeadlineLabel } from "./DeadlineLabel";
import { plural } from "@/lib/domain/format";
import { deadlineStatus } from "@/lib/domain/deadline";
import { nudgeLine } from "@/lib/domain/nudge";

/** Home: the current user's live and upcoming nights across all their groups. Own count only. */
export function NextUpPanel() {
  const { currentUserId, getNextUp } = useData();
  const items = getNextUp(currentUserId);
  if (items.length === 0) return null;

  return (
    <section className="stack">
      <div className="section-title">Up next</div>
      <div className="stack" style={{ gap: 10 }}>
        {items.map((item) =>
          item.status === "live" ? (
            <LiveRow key={item.eventId} item={item} />
          ) : (
            <UpcomingRow key={item.eventId} item={item} />
          )
        )}
      </div>
    </section>
  );
}

function LiveRow({ item }: { item: NextUpItem }) {
  return (
    <div className="panel pad row between wrap" style={{ gap: 12, borderColor: "var(--gold-deep)" }}>
      <div className="stack" style={{ gap: 6 }}>
        <span className="badge revealed">● LIVE</span>
        <h3 style={{ fontSize: 20 }}>{item.title}</h3>
        <span className="faint" style={{ fontSize: 13 }}>{item.groupName}</span>
      </div>
      <div className="row" style={{ gap: 8 }}>
        <Link href={`/events/${item.eventId}/play`} className="btn btn-sm btn-gold">
          📱 Play
        </Link>
        <Link href={`/events/${item.eventId}/tv`} className="btn btn-sm">
          📺 TV
        </Link>
      </div>
    </div>
  );
}

function UpcomingRow({ item }: { item: NextUpItem }) {
  const { currentUserId, getNudgeFor, getUser } = useData();
  const deadline = deadlineStatus(item.deadline, Date.now());
  const owed = item.clipsOwed;
  const nudge = getNudgeFor(item.eventId, currentUserId);
  const nudger = nudge ? getUser(nudge.fromUserId) : undefined;

  return (
    <Link href={`/events/${item.eventId}`} className="panel pad cardlink stack" style={{ gap: 6 }}>
      <h3 style={{ fontSize: 20 }}>{item.title}</h3>
      <span className="faint" style={{ fontSize: 13 }}>
        {item.groupName}
        {" · "}
        <DeadlineLabel status={deadline} />
      </span>
      {owed === 0 ? (
        <span className="muted" style={{ fontSize: 13 }}>All your clips are in ✓</span>
      ) : (
        deadline.kind !== "passed" && (
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--gold)" }}>
            You still owe {plural(owed, "clip")}
          </span>
        )
      )}
      {nudge && nudger && (
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--gold)" }}>
          {nudgeLine(nudger.name, nudge.clipsOwed)}
        </span>
      )}
    </Link>
  );
}
