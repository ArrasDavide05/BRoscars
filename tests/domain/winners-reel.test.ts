import { describe, it, expect } from "vitest";
import { buildWinnersReel } from "@/lib/domain/winners-reel";

const s = (submissionId: string, userId: string, net: number, rank: number) => ({ submissionId, userId, net, rank });

describe("buildWinnersReel", () => {
  it("plays each round's winner in round order", () => {
    const reel = buildWinnersReel([
      { roundId: "r1", standings: [s("s1", "ana", 4, 1), s("s2", "ben", 2, 2), s("s3", "cy", -1, 3)] },
      { roundId: "r2", standings: [s("s4", "ben", 3, 1), s("s5", "ana", 0, 2)] },
    ]);
    expect(reel).toEqual([
      { roundId: "r1", roundNumber: 1, submissionId: "s1", userId: "ana", net: 4 },
      { roundId: "r2", roundNumber: 2, submissionId: "s4", userId: "ben", net: 3 },
    ]);
  });

  it("plays every tied winner, in standings order", () => {
    const reel = buildWinnersReel([
      { roundId: "r1", standings: [s("s2", "ben", 3, 1), s("s1", "ana", 3, 1), s("s3", "cy", 1, 3)] },
    ]);
    expect(reel.map((c) => c.submissionId)).toEqual(["s2", "s1"]);
    expect(reel.every((c) => c.roundNumber === 1 && c.net === 3)).toBe(true);
  });

  it("skips a round with no entries but keeps the original round numbers", () => {
    const reel = buildWinnersReel([
      { roundId: "r1", standings: [s("s1", "ana", 2, 1)] },
      { roundId: "r2", standings: [] },
      { roundId: "r3", standings: [s("s3", "cy", 1, 1)] },
    ]);
    expect(reel.map((c) => [c.roundId, c.roundNumber])).toEqual([
      ["r1", 1],
      ["r3", 3],
    ]);
  });

  it("returns [] when every round is empty", () => {
    expect(buildWinnersReel([])).toEqual([]);
    expect(buildWinnersReel([{ roundId: "r1", standings: [] }, { roundId: "r2", standings: [] }])).toEqual([]);
  });
});
