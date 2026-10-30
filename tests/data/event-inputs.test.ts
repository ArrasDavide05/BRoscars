import { describe, it, expect, beforeEach, vi } from "vitest";
import { completedEventInputs } from "@/lib/data/event-inputs";
import type { Database, Rating, Submission } from "@/lib/data/types";

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

  it("keeps two groups' completed events apart", () => {
    const { db: seed } = store.getSnapshot();
    const crewOnly = completedEventInputs(seed, "g_crew");

    // Synthetic second group, built here (the store is not touched).
    // u_alex plays in both groups; u_zed only in g_other.
    const sub = (id: string, roundId: string, userId: string): Submission =>
      ({ id, roundId, userId, tileFrom: "#000", tileTo: "#111", caption: id, durationSec: 10, createdAt: 0 });
    const up = (id: string, roundId: string, submissionId: string, raterId: string): Rating =>
      ({ id, roundId, submissionId, raterId, value: 1 });
    const [p0, p1] = seed.prompts;
    const db: Database = {
      ...seed,
      groups: [...seed.groups, { id: "g_other", name: "Other Crew", inviteCode: "OTHR2026", createdBy: "u_zed", memberIds: ["u_zed", "u_alex"] }],
      events: [
        ...seed.events,
        { id: "e_other", groupId: "g_other", title: "Other night", date: 0, deadline: 0, status: "complete",
          hostId: "u_zed", roundIds: ["r_o1", "r_o2"], broscarUserIds: ["u_zed"] },
      ],
      rounds: [
        ...seed.rounds,
        { id: "r_o1", eventId: "e_other", promptId: p0.id, themeId: p0.themeId, roundOrder: 0, winnerUserIds: ["u_zed"] },
        { id: "r_o2", eventId: "e_other", promptId: p1.id, themeId: p1.themeId, roundOrder: 1, winnerUserIds: ["u_alex"] },
      ],
      submissions: [...seed.submissions, sub("s_o1z", "r_o1", "u_zed"), sub("s_o1a", "r_o1", "u_alex"), sub("s_o2a", "r_o2", "u_alex")],
      ratings: [
        ...seed.ratings,
        up("rt_o1", "r_o1", "s_o1z", "u_alex"),
        up("rt_o2", "r_o1", "s_o1a", "u_zed"),
        up("rt_o3", "r_o2", "s_o2a", "u_zed"),
      ],
    };

    const crew = completedEventInputs(db, "g_crew");
    const other = completedEventInputs(db, "g_other");
    expect(crew).toHaveLength(1);
    expect(crew).toEqual(crewOnly);
    expect(other).toEqual([
      { roundWinnerUserIds: [["u_zed"], ["u_alex"]], broscarUserIds: ["u_zed"], upvotesByUser: { u_zed: 1, u_alex: 2 } },
    ]);
    expect(completedEventInputs(db)).toEqual([...crew, ...other]);

    // g_other's upvotes (incl. u_alex's 2) never leak into g_crew's input
    expect(crew.some((ev) => "u_zed" in ev.upvotesByUser)).toBe(false);
    expect(crew[0].upvotesByUser.u_alex).toBe(crewOnly[0].upvotesByUser.u_alex);
    expect(store.getSnapshot().db.events.some((e) => e.id === "e_other")).toBe(false);
  });
});
