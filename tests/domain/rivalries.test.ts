import { describe, it, expect } from "vitest";
import { computeRivalries, type RivalryRoundInput } from "@/lib/domain/rivalries";

const round = (...entries: [string, number][]): RivalryRoundInput => ({
  standings: entries.map(([userId, rank]) => ({ userId, rank })),
});

describe("computeRivalries", () => {
  it("empty history: no rows, no nemesis, no victim", () => {
    expect(computeRivalries("a", [])).toEqual({ rows: [], nemesisId: null, victimId: null });
  });

  it("counts a win, a loss and a draw", () => {
    const res = computeRivalries("a", [
      round(["a", 1], ["b", 2]), // win
      round(["b", 1], ["a", 2]), // loss
      round(["a", 1], ["b", 1]), // draw
    ]);
    expect(res.rows).toEqual([{ rivalId: "b", wins: 1, draws: 1, losses: 1, meetings: 3 }]);
    expect(res.nemesisId).toBe("b");
    expect(res.victimId).toBe("b");
  });

  it("a 3-way tie at the top is a draw for each pair, a win over the one below", () => {
    const res = computeRivalries("a", [round(["a", 1], ["b", 1], ["c", 1], ["d", 4])]);
    expect(res.rows).toEqual([
      { rivalId: "b", wins: 0, draws: 1, losses: 0, meetings: 1 },
      { rivalId: "c", wins: 0, draws: 1, losses: 0, meetings: 1 },
      { rivalId: "d", wins: 1, draws: 0, losses: 0, meetings: 1 },
    ]);
    expect(res.nemesisId).toBeNull();
    expect(res.victimId).toBe("d");
  });

  it("rounds the user skipped are not meetings", () => {
    const res = computeRivalries("a", [round(["b", 1], ["c", 2]), round(["a", 2], ["b", 1])]);
    expect(res.rows).toEqual([{ rivalId: "b", wins: 0, draws: 0, losses: 1, meetings: 1 }]);
  });

  it("a user who never played has an empty record even if others did", () => {
    expect(computeRivalries("z", [round(["a", 1], ["b", 2])])).toEqual({ rows: [], nemesisId: null, victimId: null });
  });

  it("rows sort by meetings desc, then losses desc, then rivalId", () => {
    const res = computeRivalries("a", [
      round(["a", 1], ["b", 2], ["c", 3], ["d", 4]),
      round(["d", 1], ["a", 2], ["c", 3]),
      round(["a", 1], ["e", 2]),
    ]);
    expect(res.rows.map((r) => r.rivalId)).toEqual(["d", "c", "b", "e"]);
  });

  it("nemesis tiebreak: equal losses → worse net, then rivalId", () => {
    const worseNet = computeRivalries("a", [
      round(["b", 1], ["c", 2], ["a", 3]),
      round(["a", 1], ["b", 2]), // a beats b once, so c has the worse net
    ]);
    expect(worseNet.nemesisId).toBe("c");

    const byId = computeRivalries("a", [round(["c", 1], ["b", 1], ["a", 3])]);
    expect(byId.nemesisId).toBe("b");
  });

  it("victim tiebreak: equal wins → better net, then rivalId", () => {
    const betterNet = computeRivalries("a", [
      round(["a", 1], ["b", 2], ["c", 3]),
      round(["b", 1], ["a", 2]), // b beat a once, so c has the better net for a
    ]);
    expect(betterNet.victimId).toBe("c");

    const byId = computeRivalries("a", [round(["a", 1], ["c", 2], ["b", 2])]);
    expect(byId.victimId).toBe("b");
  });

  it("two submissions by one user in a round: their best rank counts", () => {
    const res = computeRivalries("a", [round(["a", 3], ["b", 2], ["a", 1])]);
    expect(res.rows).toEqual([{ rivalId: "b", wins: 1, draws: 0, losses: 0, meetings: 1 }]);
  });
});
