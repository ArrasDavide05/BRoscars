"use client";

import Link from "next/link";
import { useData } from "@/lib/data";
import { AvatarStack } from "@/components/Avatar";

export default function LandingPage() {
  const { getGroups, getMembers, getEvents } = useData();
  const groups = getGroups();

  return (
    <div className="stack" style={{ gap: 34, paddingTop: 40 }}>
      <section className="stack" style={{ gap: 18, maxWidth: 700 }}>
        <span className="eyebrow">The group video challenge</span>
        <h1 className="h-hero">
          Everyone films it.
          <br />
          One of you takes the <span style={{ color: "var(--gold)" }}>BRoscar</span>.
        </h1>
        <p className="muted" style={{ fontSize: 18, lineHeight: 1.5 }}>
          Your crew holds a <strong>night</strong>: ~6 themed rounds, everyone submits a clip,
          then a live Kahoot-style ceremony plays them on the TV while everyone rates from
          their phone. Win the most rounds and you&apos;re the champion.
        </p>
        <div className="row wrap" style={{ gap: 12 }}>
          <Link href={`/groups/${groups[0].id}`} className="btn btn-gold btn-lg">
            Enter your group →
          </Link>
          <span className="note">Prototype · in-memory · offline · no login</span>
        </div>
      </section>

      <section className="stack">
        <div className="section-title">Your groups</div>
        <div className="grid grid-2">
          {groups.map((g) => {
            const members = getMembers(g.id);
            const events = getEvents(g.id);
            const live = events.filter((e) => e.status === "live").length;
            const upcoming = events.filter((e) => e.status === "upcoming").length;
            return (
              <Link
                key={g.id}
                href={`/groups/${g.id}`}
                className="panel pad cardlink"
                style={{ display: "block" }}
              >
                <div className="row between">
                  <h3 style={{ fontSize: 20 }}>{g.name}</h3>
                  <AvatarStack users={members.slice(0, 6)} />
                </div>
                <div className="row wrap" style={{ gap: 8, marginTop: 14 }}>
                  <span className="badge">{members.length} members</span>
                  <span className="badge">{events.length} events</span>
                  {live > 0 && <span className="badge revealed">● {live} live</span>}
                  {upcoming > 0 && <span className="badge open">{upcoming} upcoming</span>}
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
