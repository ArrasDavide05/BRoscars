import { describe, it, expect } from "vitest";
import { computeCareerStats } from "@/lib/domain/career-stats";
import type { HallOfFameEventInput } from "@/lib/domain/hall-of-fame";

const night1: HallOfFameEventInput = {
  roundWinnerUserIds: [["a"], ["b"], ["a", "b"]],
  broscarUserIds: ["a"],
  upvotesByUser: { a: 5, b: 4, c: 1 },
};
const night2: HallOfFameEventInput = {
  roundWinnerUserIds: [["c"], ["a"]],
  broscarUserIds: ["a", "c"],
  upvotesByUser: { a: 2, c: 3 },
};

describe("computeCareerStats", () => {
  it("treats a missing baseline as zeros", () => {
    expect(computeCareerStats("a", undefined, [])).toEqual({ crowns: 0, broscars: 0, upvotes: 0 });
    expect(computeCareerStats("a", undefined, [night1])).toEqual({ crowns: 2, broscars: 1, upvotes: 5 });
  });

  it("adds the baseline to the event totals", () => {
    const base = { crowns: 7, broscars: 1, upvotes: 120 };
    expect(computeCareerStats("a", base, [night1, night2])).toEqual({ crowns: 10, broscars: 3, upvotes: 127 });
  });

  it("counts a tied round for each tied winner", () => {
    const tied: HallOfFameEventInput = { roundWinnerUserIds: [["a", "b"]], broscarUserIds: [], upvotesByUser: {} };
    expect(computeCareerStats("a", undefined, [tied]).crowns).toBe(1);
    expect(computeCareerStats("b", undefined, [tied]).crowns).toBe(1);
  });

  it("counts a tied BRoscar for each co-champion", () => {
    expect(computeCareerStats("a", undefined, [night2]).broscars).toBe(1);
    expect(computeCareerStats("c", undefined, [night2]).broscars).toBe(1);
  });

  it("sums the user's upvotes across events", () => {
    expect(computeCareerStats("c", undefined, [night1, night2]).upvotes).toBe(4);
  });

  it("gives a non-participant only their baseline", () => {
    const base = { crowns: 4, broscars: 0, upvotes: 70 };
    expect(computeCareerStats("z", base, [night1, night2])).toEqual(base);
  });

  it("does not mutate the baseline", () => {
    const base = { crowns: 1, broscars: 1, upvotes: 1 };
    computeCareerStats("a", base, [night1]);
    expect(base).toEqual({ crowns: 1, broscars: 1, upvotes: 1 });
  });
});
