"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { useData, type Event } from "@/lib/data";
import { Avatar } from "./Avatar";
import { OscarBadge } from "./OscarBadge";
import { plural, relativeDays } from "@/lib/domain/format";

const STATUS_META = {
  upcoming: { cls: "open", label: "Upcoming" },
  live: { cls: "revealed", label: "● LIVE" },
  complete: { cls: "closed", label: "Complete" },
} as const;

export function EventCard({ event }: { event: Event }) {
  const data = useData();
  const [open, setOpen] = useState(event.status === "live");
  const roundsId = useId();
  const rounds = data.getEventRounds(event.id);
  const meta = STATUS_META[event.status];
  const broscar = event.status === "complete" ? data.getBroscarUserIds(event.id) : [];

  return (
    <div className="panel pad stack" style={{ gap: 14 }}>
      <div className="row between wrap" style={{ gap: 10 }}>
        <div className="stack" style={{ gap: 6 }}>
          <span className={`badge ${meta.cls}`}>{meta.label}</span>
          <h3 style={{ fontSize: 22 }}>{event.title}</h3>
          <span className="faint" style={{ fontSize: 13 }}>
            {new Date(event.date).toLocaleDateString()} · {relativeDays(event.date, Date.now())} · {plural(rounds.length, "round")}
          </span>
        </div>

        <div className="stack" style={{ gap: 8, alignItems: "flex-end" }}>
          {event.status === "complete" && broscar.length > 0 && (
            <div className="row" style={{ gap: 8 }}>
              <OscarBadge label="BRoscar" />
              {broscar.map((id) => {
                const u = data.getUser(id)!;
                return (
                  <span key={id} className="row" style={{ gap: 6 }}>
                    <Avatar user={u} size={24} />
                    <strong style={{ fontSize: 13 }}>{u.name}</strong>
                  </span>
                );
              })}
            </div>
          )}
          <div className="row" style={{ gap: 8 }}>
            {event.status === "live" && (
              <>
                <Link href={`/events/${event.id}/tv`} className="btn btn-sm btn-gold">
                  📺 TV
                </Link>
                <Link href={`/events/${event.id}/play`} className="btn btn-sm">
                  📱 Play
                </Link>
              </>
            )}
            {event.status === "upcoming" && (
              <Link href={`/events/${event.id}`} className="btn btn-sm btn-gold">
                Open event →
              </Link>
            )}
            {event.status === "complete" && (
              <Link href={`/events/${event.id}`} className="btn btn-sm">
                Results
              </Link>
            )}
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              aria-expanded={open}
              aria-controls={roundsId}
              onClick={() => setOpen((o) => !o)}
            >
              {open ? "Hide rounds" : "Show rounds"}
            </button>
          </div>
        </div>
      </div>

      {open && (
        <div id={roundsId} className="stack" style={{ gap: 8 }}>
          <hr className="divider" />
          {rounds.map((r, i) => {
            const theme = data.getThemeForRound(r.id);
            const prompt = data.getPromptForRound(r.id);
            const winners = event.status === "complete" ? data.getRoundWinnerUserIds(r.id) : [];
            return (
              <div key={r.id} className="row between wrap" style={{ gap: 10 }}>
                <div className="row" style={{ gap: 10 }}>
                  <span className="faint" style={{ width: 22, fontSize: 12 }}>#{i + 1}</span>
                  <span className="badge" style={{ fontSize: 11 }}>{theme?.name}</span>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{prompt?.text}</span>
                </div>
                {winners.length > 0 ? (
                  <span className="row" style={{ gap: 6 }}>
                    <span aria-hidden>👑</span>
                    {winners.map((id) => {
                      const u = data.getUser(id)!;
                      return <Avatar key={id} user={u} size={22} />;
                    })}
                  </span>
                ) : (
                  <span className="faint" style={{ fontSize: 12 }}>
                    {data.getSubmissions(r.id).length} entries
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
