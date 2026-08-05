import { describe, it, expect } from "vitest";
import {
  computeRoundStandings,
  computeRoundWinnerUserIds,
  upvotesByUserFrom,
  computeBroscar,
  computeEventCareerContribution,
} from "@/lib/domain/standings";

// Helpers: build submissions + ratings for a round.
const sub = (id: string, userId: string) => ({ id, userId });
const rate = (submissionId: string, value: -1 | 0 | 1) => ({ submissionId, value });

describe("computeRoundWinnerUserIds", () => {
  it("winner is the max net score", () => {
    const subs = [sub("sA", "A"), sub("sB", "B")];
    const ratings = [rate("sA", 1), rate("sA", 1), rate("sA", 1), rate("sB", 1)];
    expect(computeRoundWinnerUserIds(subs, ratings)).toEqual(["A"]);
  });

  it("returns all co-winners on a net tie", () => {
    const subs = [sub("sA", "A"), sub("sB", "B")];
    const ratings = [rate("sA", 1), rate("sA", 1), rate("sB", 1), rate("sB", 1)];
    expect(computeRoundWinnerUserIds(subs, ratings).sort()).toEqual(["A", "B"]);
  });

  it("returns [] for an empty round", () => {
    expect(computeRoundWinnerUserIds([], [])).toEqual([]);
  });
});

describe("computeRoundStandings", () => {
  it("tiebreaks equal net by upvotes then userId", () => {
    // A: up3 down1 net2 ; B: up2 down0 net2  -> equal net, A more upvotes -> A first
    const subs = [sub("sA", "A"), sub("sB", "B")];
    const ratings = [
      rate("sA", 1), rate("sA", 1), rate("sA", 1), rate("sA", -1),
      rate("sB", 1), rate("sB", 1),
    ];
    const st = computeRoundStandings(subs, ratings);
    expect(st.map((s) => s.userId)).toEqual(["A", "B"]);
  });

  it("orders equal net AND equal upvotes by userId", () => {
    const subs = [sub("sZ", "Z"), sub("sA", "A")];
    const ratings = [rate("sZ", 1), rate("sZ", 1), rate("sA", 1), rate("sA", 1)];
    const st = computeRoundStandings(subs, ratings);
    expect(st.map((s) => s.userId)).toEqual(["A", "Z"]);
  });

  it("assigns competition ranks so ties share a rank (5,5,3 -> 1,1,3)", () => {
    const subs = [sub("sA", "A"), sub("sB", "B"), sub("sC", "C")];
    const ratings = [
      rate("sA", 1), rate("sA", 1), rate("sA", 1), rate("sA", 1), rate("sA", 1),
      rate("sB", 1), rate("sB", 1), rate("sB", 1), rate("sB", 1), rate("sB", 1),
      rate("sC", 1), rate("sC", 1), rate("sC", 1),
    ];
    expect(computeRoundStandings(subs, ratings).map((s) => s.rank)).toEqual([1, 1, 3]);
  });
});

describe("upvotesByUserFrom", () => {
  it("sums only upvotes (value === 1), keyed by submission owner", () => {
    const subs = [sub("sA", "A"), sub("sB", "B")];
    const ratings = [rate("sA", 1), rate("sA", 1), rate("sA", -1), rate("sB", 0)];
    const out = upvotesByUserFrom(subs, ratings);
    expect(out.A).toBe(2);
    expect(out.B).toBeUndefined();
  });
});

describe("computeBroscar", () => {
  it("champion is the most rounds won", () => {
    const res = computeBroscar([["A"], ["A"], ["B"]], {});
    expect(res.championUserIds).toEqual(["A"]);
    expect(res.roundsWonByUser).toEqual({ A: 2, B: 1 });
  });

  it("co-winners each count as a win", () => {
    const res = computeBroscar([["A", "B"], ["A"]], {});
    expect(res.roundsWonByUser).toEqual({ A: 2, B: 1 });
    expect(res.championUserIds).toEqual(["A"]);
  });

  it("breaks a rounds-won tie by total upvotes", () => {
    const res = computeBroscar([["A"], ["B"]], { A: 10, B: 3 });
    expect(res.championUserIds).toEqual(["A"]);
  });

  it("declares co-champions when wins AND upvotes tie", () => {
    const res = computeBroscar([["A"], ["B"]], { A: 5, B: 5 });
    expect(res.championUserIds.sort()).toEqual(["A", "B"]);
  });

  it("treats a missing upvote entry as 0", () => {
    const res = computeBroscar([["A"], ["B"]], { A: 2 });
    expect(res.championUserIds).toEqual(["A"]);
  });

  it("has no champion when no rounds were won", () => {
    expect(computeBroscar([], {}).championUserIds).toEqual([]);
  });
});

describe("computeEventCareerContribution", () => {
  it("aggregates crowns, broscars and upvotes per user", () => {
    const broscar = {
      championUserIds: ["A"],
      roundsWonByUser: { A: 2, B: 1 },
      upvotesByUser: { A: 4, B: 2 },
    };
    const out = computeEventCareerContribution([["A"], ["A", "B"]], broscar);
    expect(out.A).toEqual({ crowns: 2, broscars: 1, upvotes: 4 });
    expect(out.B).toEqual({ crowns: 1, broscars: 0, upvotes: 2 });
  });
});
