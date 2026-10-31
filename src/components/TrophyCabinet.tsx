"use client";

import Link from "next/link";
import { useData } from "@/lib/data";
import { buildTrophies, type TrophyEventInput } from "@/lib/domain/trophies";
import { plural } from "@/lib/domain/format";
import { OscarBadge } from "./OscarBadge";

/** Rounds and nights a member won, from in-app history. */
export function TrophyCabinet({ userId }: { userId: string }) {
  const data = useData();

  const input: TrophyEventInput[] = data.getGroups().flatMap((g) =>
    data.getEvents(g.id).map((e) => ({
      eventId: e.id,
      eventTitle: e.title,
      date: e.date,
      status: e.status,
      broscarUserIds: data.getBroscarUserIds(e.id),
      rounds: data.getEventRounds(e.id).map((r) => ({
        roundId: r.id,
        themeName: data.getThemeForRound(r.id)?.name ?? "",
        promptText: data.getPromptForRound(r.id)?.text ?? "",
        winnerUserIds: data.getRoundWinnerUserIds(r.id),
      })),
    })),
  );
  const { crowns, broscars } = buildTrophies(userId, input);
  const stats = data.getCareerStats(userId);
  const earlierCrowns = Math.max(0, stats.crowns - crowns.length);
  const earlierBroscars = Math.max(0, stats.broscars - broscars.length);
  const empty = crowns.length + broscars.length + earlierCrowns + earlierBroscars === 0;

  return (
    <div className="panel pad stack" style={{ gap: 14 }}>
      <div className="section-title">Trophy cabinet</div>

      {empty ? (
        <p className="faint">No trophies yet. Next Friday?</p>
      ) : (
        <>
          <div className="stack" style={{ gap: 8 }}>
            <strong>🏆 BRoscars</strong>
            {broscars.map((b) => (
              <Link key={b.eventId} href={`/events/${b.eventId}`} className="panel pad cardlink row between wrap" style={{ gap: 10 }}>
                <span className="row" style={{ gap: 10 }}>
                  <OscarBadge label={b.shared ? "Co-BRoscar" : "BRoscar"} />
                  <strong>{b.eventTitle}</strong>
                </span>
                <span className="faint" style={{ fontSize: 12 }}>
                  {b.roundsWon} of {b.roundCount} rounds · {new Date(b.date).toLocaleDateString()}
                </span>
              </Link>
            ))}
            {broscars.length === 0 && earlierBroscars === 0 && (
              <span className="faint" style={{ fontSize: 13 }}>None yet.</span>
            )}
            {earlierBroscars > 0 && (
              <span className="faint" style={{ fontSize: 13 }}>
                + {plural(earlierBroscars, "earlier BRoscar")}
              </span>
            )}
          </div>

          <div className="stack" style={{ gap: 8 }}>
            <strong>👑 Crowns</strong>
            {crowns.map((c) => (
              <Link key={c.roundId} href={`/events/${c.eventId}`} className="panel pad cardlink row between wrap" style={{ gap: 10 }}>
                <span className="row wrap" style={{ gap: 10 }}>
                  <span className="badge" style={{ fontSize: 11 }}>{c.themeName}</span>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{c.promptText}</span>
                  {c.shared && <span className="faint" style={{ fontSize: 12 }}>(tied)</span>}
                </span>
                <span className="faint" style={{ fontSize: 12 }}>
                  {c.eventTitle} · {new Date(c.date).toLocaleDateString()}
                </span>
              </Link>
            ))}
            {crowns.length === 0 && earlierCrowns === 0 && (
              <span className="faint" style={{ fontSize: 13 }}>None yet.</span>
            )}
            {earlierCrowns > 0 && (
              <span className="faint" style={{ fontSize: 13 }}>
                + {plural(earlierCrowns, "earlier crown")}
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
