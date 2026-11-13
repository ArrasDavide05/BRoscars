"use client";

import { useData } from "@/lib/data";
import { nightSummaryText } from "@/lib/domain/night-summary";
import { SUPERLATIVE_ICON, SUPERLATIVE_TITLE, superlativeSummaryDetail } from "@/lib/domain/superlative-labels";
import { useCopyText } from "./useCopyText";

/** Copies a plain-text summary of a finished night, for the group chat. */
export function CopyResultsButton({ eventId }: { eventId: string }) {
  const data = useData();
  const { status, text, copy } = useCopyText();
  const event = data.getEvent(eventId);
  if (!event) return null;

  const names = (userIds: string[]) => userIds.map((id) => data.getUser(id)!.name);

  const copyResults = () =>
    copy(
      nightSummaryText({
        title: event.title,
        groupName: data.getGroup(event.groupId)?.name ?? "",
        championNames: names(data.getBroscarUserIds(eventId)),
        rounds: data.getEventRounds(eventId).map((r) => ({
          promptText: data.getPromptForRound(r.id)?.text ?? "",
          winnerNames: names(data.getRoundWinnerUserIds(r.id)),
        })),
        awards: data.getEventSuperlatives(eventId).flatMap((s) => {
          const awardNames = s.userIds.flatMap((id) => data.getUser(id)?.name ?? []);
          if (awardNames.length === 0) return [];
          return [
            {
              icon: SUPERLATIVE_ICON[s.kind],
              title: SUPERLATIVE_TITLE[s.kind],
              names: awardNames,
              detail: superlativeSummaryDetail(s),
            },
          ];
        }),
      })
    );

  return (
    <div className="stack" style={{ gap: 6, alignItems: "center" }}>
      <button type="button" className="btn btn-sm" onClick={copyResults}>
        Copy results
      </button>
      <span role="status" aria-live="polite" className="faint" style={{ fontSize: 12 }}>
        {status === "copied" && <span style={{ color: "var(--gold-soft)" }}>Copied!</span>}
        {status === "fallback" && "Couldn't reach the clipboard. Copy the text below:"}
      </span>
      {status === "fallback" && (
        <textarea
          readOnly
          className="input"
          aria-label="Night results text"
          rows={text.split("\n").length}
          value={text}
          onFocus={(e) => e.currentTarget.select()}
          style={{ resize: "none" }}
        />
      )}
    </div>
  );
}
