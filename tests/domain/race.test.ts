import { describe, it, expect } from "vitest";
import { computeRaceStandings } from "@/lib/domain/race";

const order = (rows: { userId: string }[]) => rows.map((r) => r.userId);

describe("computeRaceStandings", () => {
  it("puts everyone at rank 1 with 0/0 on an empty night", () => {
    expect(computeRaceStandings(["b", "a"], [], {})).toEqual([
      { userId: "a", crowns: 0, upvotes: 0, rank: 1 },
      { userId: "b", crowns: 0, upvotes: 0, rank: 1 },
    ]);
  });

  it("sorts by crowns before upvotes", () => {
    const rows = computeRaceStandings(["a", "b"], [["b"], ["b"], ["a"]], { a: 50, b: 1 });
    expect(order(rows)).toEqual(["b", "a"]);
    expect(rows.map((r) => r.rank)).toEqual([1, 2]);
  });

  it("breaks tied crowns on upvotes", () => {
    const rows = computeRaceStandings(["a", "b"], [["a"], ["b"]], { a: 3, b: 7 });
    expect(rows).toEqual([
      { userId: "b", crowns: 1, upvotes: 7, rank: 1 },
      { userId: "a", crowns: 1, upvotes: 3, rank: 2 },
    ]);
  });

  it("shares a rank on a full tie (1, 1, 3)", () => {
    const rows = computeRaceStandings(["c", "a", "b"], [["a"], ["c"]], { a: 2, c: 2, b: 9 });
    expect(order(rows)).toEqual(["a", "c", "b"]);
    expect(rows.map((r) => r.rank)).toEqual([1, 1, 3]);
  });

  it("credits both co-winners of a round", () => {
    const rows = computeRaceStandings(["a", "b", "c"], [["a", "b"]], { a: 4, b: 4, c: 1 });
    expect(rows.slice(0, 2)).toEqual([
      { userId: "a", crowns: 1, upvotes: 4, rank: 1 },
      { userId: "b", crowns: 1, upvotes: 4, rank: 1 },
    ]);
  });

  it("lists members with no submissions and ignores non-members", () => {
    const rows = computeRaceStandings(["a", "z"], [["a"], ["x"]], { a: 1, x: 10 });
    expect(rows).toEqual([
      { userId: "a", crowns: 1, upvotes: 1, rank: 1 },
      { userId: "z", crowns: 0, upvotes: 0, rank: 2 },
    ]);
  });
});
