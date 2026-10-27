"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { useData } from "@/lib/data";
import { Avatar, AvatarStack } from "@/components/Avatar";
import { EventCard } from "@/components/EventCard";
import { HallOfFame } from "@/components/HallOfFame";
import { formatInviteCode } from "@/lib/domain/invite-code";

export default function GroupHomePage({ params }: { params: { groupId: string } }) {
  const data = useData();
  const group = data.getGroup(params.groupId);
  const [showMembers, setShowMembers] = useState(false);
  const membersId = useId();

  if (!group) {
    return (
      <div className="pad">
        <p className="muted">Group not found.</p>
        <Link href="/" className="btn btn-ghost btn-sm">← Back</Link>
      </div>
    );
  }

  const members = data.getMembers(group.id);
  const events = data.getEvents(group.id);
  const current = events.filter((e) => e.status !== "complete");
  const history = events.filter((e) => e.status === "complete");

  return (
    <div className="stack" style={{ gap: 28, paddingTop: 24 }}>
      <Link href="/" className="faint" style={{ fontSize: 13 }}>← All groups</Link>

      {/* NON-boxed group header — rendered on the page background, no card */}
      <div className="stack" style={{ gap: 12 }}>
        <span className="eyebrow">Group</span>
        <div className="row between wrap" style={{ gap: 16 }}>
          <h1 style={{ fontSize: 40, fontWeight: 900, letterSpacing: "-0.5px" }}>{group.name}</h1>
          <div className="row" style={{ gap: 12 }}>
            <span className="faint" style={{ fontSize: 13 }}>
              Invite <span className="pill-code">{formatInviteCode(group.inviteCode)}</span>
            </span>
            <button
              type="button"
              className="btn btn-sm"
              aria-expanded={showMembers}
              aria-controls={membersId}
              onClick={() => setShowMembers((s) => !s)}
            >
              {showMembers ? "Hide members" : "View group"}
            </button>
          </div>
        </div>

        <div className="row" style={{ gap: 12 }}>
          <AvatarStack users={members} />
          <span className="muted" style={{ fontSize: 13 }}>{members.length} members</span>
        </div>

        {showMembers && (
          <div id={membersId} className="grid grid-2" style={{ marginTop: 6 }}>
            {members.map((m) => {
              const stats = data.getCareerStats(m.id);
              return (
                <Link
                  key={m.id}
                  href={`/profile/${m.id}`}
                  className="row between cardlink"
                  style={{ padding: "10px 4px", borderBottom: "1px solid var(--line)" }}
                >
                  <span className="row" style={{ gap: 10 }}>
                    <Avatar user={m} size={32} />
                    <span style={{ fontWeight: 600 }}>
                      {m.name}
                      {m.id === group.createdBy && <span className="faint" style={{ fontSize: 12 }}> · host</span>}
                    </span>
                  </span>
                  <span className="faint" style={{ fontSize: 12 }}>
                    👑 {stats.crowns} · 🏆 {stats.broscars}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* current events */}
      <section className="stack">
        <div className="row between">
          <div className="section-title">Nights</div>
          <Link href={`/groups/${group.id}/events/new`} className="btn btn-sm btn-gold">
            + New event
          </Link>
        </div>
        {current.length === 0 ? (
          <div className="note">No upcoming or live events.</div>
        ) : (
          <div className="stack">
            {current.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>
        )}
      </section>

      <HallOfFame groupId={group.id} />

      {/* history */}
      <section className="stack">
        <div className="section-title">Group history</div>
        {history.length === 0 ? (
          <div className="note">No finished nights yet.</div>
        ) : (
          <div className="stack">
            {history.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
