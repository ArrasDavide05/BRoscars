import { describe, it, expect, beforeEach, vi } from "vitest";
import { completedEventInputs } from "@/lib/data/event-inputs";
import type { Database } from "@/lib/data/types";

let store: typeof import("@/lib/data/store");

beforeEach(async () => {
  vi.resetModules();
  store = await import("@/lib/data/store");
});

describe("completedEventInputs", () => {
  it("includes only complete events (seeded e_live / e_pre are excluded)", () => {
    const { db } = store.getSnapshot();
    const ids = db.events.map((e) => e.id);
    expect(ids).toEqual(expect.arrayContaining(["e_past", "e_live", "e_pre"]));

    const inputs = completedEventInputs(db);
    expect(inputs).toHaveLength(db.events.filter((e) => e.status === "complete").length);
    expect(inputs).toHaveLength(1);
    const past = db.events.find((e) => e.id === "e_past")!;
    expect(inputs[0].broscarUserIds).toEqual(past.broscarUserIds);
  });

  it("filters by group; an unknown group gives []", () => {
    const { db } = store.getSnapshot();
    expect(completedEventInputs(db, "g_crew")).toEqual(completedEventInputs(db));
    expect(completedEventInputs(db, "g_nope")).toEqual([]);
  });

  it("round winners follow event.roundIds order, not db.rounds order", () => {
    const { db } = store.getSnapshot();
    const past = db.events.find((e) => e.id === "e_past")!;
    const expected = past.roundIds.map((rid) => db.rounds.find((r) => r.id === rid)!.winnerUserIds);
    expect(completedEventInputs(db)[0].roundWinnerUserIds).toEqual(expected);

    // reverse the rounds table: output order must not change
    const shuffled: Database = { ...db, rounds: [...db.rounds].reverse() };
    expect(completedEventInputs(shuffled)[0].roundWinnerUserIds).toEqual(expected);
  });

  it("only counts upvotes on this event's rounds", () => {
    const { db } = store.getSnapshot();
    const past = db.events.find((e) => e.id === "e_past")!;
    const subs = db.submissions.filter((s) => past.roundIds.includes(s.roundId));
    const ups = db.ratings.filter((r) => past.roundIds.includes(r.roundId) && r.value === 1);
    const total = Object.values(completedEventInputs(db)[0].upvotesByUser).reduce((n, v) => n + v, 0);
    expect(total).toBe(ups.filter((r) => subs.some((s) => s.id === r.submissionId)).length);
  });
});
