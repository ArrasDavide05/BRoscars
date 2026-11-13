import { describe, it, expect } from "vitest";
import { getSnapshot, roundSubmissions } from "@/lib/data/store";
import { computeSuperlatives } from "@/lib/domain/superlatives";
import { nightSummaryText } from "@/lib/domain/night-summary";
import { SUPERLATIVE_ICON, SUPERLATIVE_TITLE, superlativeSummaryDetail } from "@/lib/domain/superlative-labels";

// Mirrors how CopyResultsButton maps the seeded e_past awards into the copied text.
describe("seeded past event copied results", () => {
  it("e_past ends with one line per special award", () => {
    const { db } = getSnapshot();
    const ev = db.events.find((e) => e.id === "e_past")!;
    const rounds = ev.roundIds.map((rid) => ({ roundId: rid, submissions: roundSubmissions(db, rid) }));
    const ratings = db.ratings.filter((r) => ev.roundIds.includes(r.roundId));
    const awards = computeSuperlatives(rounds, ratings).map((s) => ({
      icon: SUPERLATIVE_ICON[s.kind],
      title: SUPERLATIVE_TITLE[s.kind],
      names: s.userIds.map((id) => db.users.find((u) => u.id === id)!.name),
      detail: superlativeSummaryDetail(s),
    }));
    const text = nightSummaryText({
      title: ev.title,
      groupName: "",
      championNames: [],
      rounds: ev.roundIds.map(() => ({ promptText: "p", winnerNames: [] })),
      awards,
    });
    const awardLines = text.split("\n").slice(-3);
    expect(awardLines.map((l) => l.split(":")[0])).toEqual([
      "🗳️ People's Champion",
      "⚖️ Most Divisive",
      "😤 Robbed",
    ]);
    expect(awardLines.every((l) => /: \S.* \(.+\)$/.test(l))).toBe(true);
  });
});
