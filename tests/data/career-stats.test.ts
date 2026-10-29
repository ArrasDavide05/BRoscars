import { describe, it, expect, beforeEach, vi } from "vitest";
import { computeCareerStats } from "@/lib/domain/career-stats";
import { upvotesByUserFrom } from "@/lib/domain/standings";
import { completedEventInputs } from "@/lib/data/event-inputs";

// getCareerStats lives inside the React provider; feed it the same inputs via the
// real completedEventInputs helper and check the numbers by hand: baseline + e_past.
let store: typeof import("@/lib/data/store");

beforeEach(async () => {
  vi.resetModules();
  store = await import("@/lib/data/store");
});

describe("seeded career stats", () => {
  it("u_alex = careerBaseline + the e_past contribution", () => {
    const { db } = store.getSnapshot();
    const completed = db.events.filter((e) => e.status === "complete");
    expect(completed.map((e) => e.id)).toEqual(["e_past"]);

    const past = completed[0];
    const rounds = db.rounds.filter((r) => past.roundIds.includes(r.id));
    const subs = db.submissions.filter((s) => past.roundIds.includes(s.roundId));
    const ratings = db.ratings.filter((r) => past.roundIds.includes(r.roundId));
    const upvotesByUser = upvotesByUserFrom(subs, ratings);
    const alex = db.users.find((u) => u.id === "u_alex")!;

    const inputs = completedEventInputs(db);
    expect(inputs).toHaveLength(1);
    const stats = computeCareerStats("u_alex", alex.careerBaseline, inputs);

    expect(stats).toEqual({
      crowns: alex.careerBaseline.crowns + rounds.filter((r) => r.winnerUserIds.includes("u_alex")).length,
      broscars: alex.careerBaseline.broscars + (past.broscarUserIds.includes("u_alex") ? 1 : 0),
      upvotes: alex.careerBaseline.upvotes + (upvotesByUser["u_alex"] ?? 0),
    });
    expect(stats.upvotes).toBeGreaterThan(alex.careerBaseline.upvotes);
  });
});
