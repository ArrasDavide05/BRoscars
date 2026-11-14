"use client";

import { useData } from "@/lib/data";
import { signed } from "@/lib/domain/format";
import { computePersonalBests } from "@/lib/domain/personal-bests";
import { Avatar } from "./Avatar";

/** Each entrant's top clip of the night, so members without a crown get a line too. */
export function PersonalBests({ eventId }: { eventId: string }) {
  const data = useData();
  const bests = computePersonalBests(
    data.getEventRounds(eventId).map((r) =>
      data.getRoundStandings(r.id).map((s) => ({
        submissionId: s.submissionId,
        userId: s.userId,
        roundId: r.id,
        roundOrder: r.roundOrder,
        net: s.net,
      }))
    )
  );
  if (bests.length === 0) return null;

  return (
    <div className="stack" style={{ gap: 8 }}>
      <div className="section-title">Everyone&apos;s best clip</div>
      {bests.map((b) => {
        const u = data.getUser(b.userId);
        if (!u) return null;
        const prompt = data.getPromptForRound(b.roundId)?.text;
        const caption = data.getSubmission(b.submissionId)?.caption;
        return (
          <div key={b.userId} className="standing-row">
            <Avatar user={u} size={34} />
            <div className="stack" style={{ gap: 2, flex: 1, minWidth: 0 }}>
              <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                <strong>{u.name}</strong>
                {prompt && <span className="faint" style={{ fontSize: 12 }}>{prompt}</span>}
              </div>
              {caption && <span className="muted" style={{ fontSize: 13 }}>“{caption}”</span>}
            </div>
            <span className="net-score">{signed(b.net)}</span>
          </div>
        );
      })}
    </div>
  );
}
