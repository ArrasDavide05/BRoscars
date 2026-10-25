import { describe, it, expect } from "vitest";
import { computeHallOfFame, type HallOfFameEventInput } from "@/lib/domain/hall-of-fame";

const ev = (over: Partial<HallOfFameEventInput>): HallOfFameEventInput => ({
  roundWinnerUserIds: [],
  broscarUserIds: [],
  upvotesByUser: {},
  ...over,
});

const order = (rows: { userId: string }[]) => rows.map((r) => r.userId);

describe("computeHallOfFame", () => {
  it("gives every member a zero row when there are no events", () => {
    expect(computeHallOfFame(["a", "b"], [])).toEqual([
      { userId: "a", crowns: 0, broscars: 0, upvotes: 0, rank: 1 },
      { userId: "b", crowns: 0, broscars: 0, upvotes: 0, rank: 1 },
    ]);
  });

  it("returns no rows for no members", () => {
    expect(computeHallOfFame([], [ev({ roundWinnerUserIds: [["a"]] })])).toEqual([]);
  });

  it("sorts by crowns first", () => {
    const rows = computeHallOfFame(
      ["a", "b"],
      [ev({ roundWinnerUserIds: [["b"], ["b"], ["a"]], broscarUserIds: ["a"], upvotesByUser: { a: 50, b: 1 } })],
    );
    expect(order(rows)).toEqual(["b", "a"]);
    expect(rows[0]).toMatchObject({ crowns: 2, broscars: 0, upvotes: 1, rank: 1 });
  });

  it("breaks crown ties on BRoscars", () => {
    const rows = computeHallOfFame(
      ["a", "b"],
      [ev({ roundWinnerUserIds: [["a"], ["b"]], broscarUserIds: ["b"], upvotesByUser: { a: 50, b: 1 } })],
    );
    expect(order(rows)).toEqual(["b", "a"]);
    expect(rows.map((r) => r.rank)).toEqual([1, 2]);
  });

  it("breaks crown + BRoscar ties on upvotes", () => {
    const rows = computeHallOfFame(["a", "b"], [ev({ roundWinnerUserIds: [["a"], ["b"]], upvotesByUser: { a: 3, b: 7 } })]);
    expect(order(rows)).toEqual(["b", "a"]);
  });

  it("shares ranks on identical stats and keeps memberIds order (1, 1, 3)", () => {
    const rows = computeHallOfFame(
      ["c", "a", "b"],
      [ev({ roundWinnerUserIds: [["a", "c"]], upvotesByUser: { a: 2, c: 2, b: 9 } })],
    );
    expect(order(rows)).toEqual(["c", "a", "b"]);
    expect(rows.map((r) => r.rank)).toEqual([1, 1, 3]);
  });

  it("includes a zero-win member", () => {
    const rows = computeHallOfFame(["a", "z"], [ev({ roundWinnerUserIds: [["a"]] })]);
    expect(rows[1]).toEqual({ userId: "z", crowns: 0, broscars: 0, upvotes: 0, rank: 2 });
  });

  it("ignores winners and upvotes of non-members", () => {
    const rows = computeHallOfFame(
      ["a"],
      [ev({ roundWinnerUserIds: [["x"], ["a", "x"]], broscarUserIds: ["x"], upvotesByUser: { x: 10, a: 1 } })],
    );
    expect(rows).toEqual([{ userId: "a", crowns: 1, broscars: 0, upvotes: 1, rank: 1 }]);
  });

  it("sums across events", () => {
    const rows = computeHallOfFame(
      ["a", "b"],
      [
        ev({ roundWinnerUserIds: [["a"]], broscarUserIds: ["a"], upvotesByUser: { a: 4, b: 1 } }),
        ev({ roundWinnerUserIds: [["a"], ["b"]], broscarUserIds: ["a"], upvotesByUser: { a: 2, b: 5 } }),
      ],
    );
    expect(rows[0]).toEqual({ userId: "a", crowns: 2, broscars: 2, upvotes: 6, rank: 1 });
    expect(rows[1]).toEqual({ userId: "b", crowns: 1, broscars: 0, upvotes: 6, rank: 2 });
  });
});
