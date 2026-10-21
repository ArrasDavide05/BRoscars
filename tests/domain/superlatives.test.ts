import { describe, it, expect } from "vitest";
import { computeSuperlatives } from "@/lib/domain/superlatives";
import type { RatingValue } from "@/lib/domain/scoring";

// r(submissionId, ...values) -> one rating per value
const r = (submissionId: string, ...values: RatingValue[]) =>
  values.map((value) => ({ submissionId, value }));

const sub = (id: string, userId: string) => ({ id, userId });

describe("computeSuperlatives", () => {
  it("returns [] for an empty event", () => {
    expect(computeSuperlatives([], [])).toEqual([]);
    expect(computeSuperlatives([{ roundId: "r1", submissions: [] }], [])).toEqual([]);
  });

  it("emits all three awards in a fixed order", () => {
    const rounds = [
      { roundId: "r1", submissions: [sub("a1", "ann"), sub("b1", "ben"), sub("c1", "cat")] },
      { roundId: "r2", submissions: [sub("a2", "ann"), sub("b2", "ben")] },
    ];
    const ratings = [
      ...r("a1", 1, 1, 1),
      ...r("b1", 1, 1, -1),
      ...r("c1", -1, -1),
      ...r("a2", 1, -1, -1),
      ...r("b2", 1, 1),
    ];
    const out = computeSuperlatives(rounds, ratings);
    expect(out.map((s) => s.kind)).toEqual(["peoples-champion", "most-divisive", "robbed"]);
  });

  it("People's Champion = most total upvotes across the event", () => {
    const rounds = [
      { roundId: "r1", submissions: [sub("a1", "ann"), sub("b1", "ben")] },
      { roundId: "r2", submissions: [sub("a2", "ann"), sub("b2", "ben")] },
    ];
    const ratings = [...r("a1", 1, 1), ...r("b1", 1, 1, 1), ...r("a2", 1, 1), ...r("b2", 0)];
    const pc = computeSuperlatives(rounds, ratings).find((s) => s.kind === "peoples-champion")!;
    expect(pc.userIds).toEqual(["ann"]);
    expect(pc.detail.up).toBe(4);
  });

  it("People's Champion includes every tied user and is omitted with no upvotes", () => {
    const rounds = [{ roundId: "r1", submissions: [sub("a1", "ann"), sub("b1", "ben"), sub("c1", "cat")] }];
    const tied = computeSuperlatives(rounds, [...r("a1", 1, 1), ...r("b1", 1, 1), ...r("c1", 1)]);
    expect(tied.find((s) => s.kind === "peoples-champion")!.userIds).toEqual(["ann", "ben"]);

    const none = computeSuperlatives(rounds, [...r("a1", 0, -1), ...r("b1", -1)]);
    expect(none.some((s) => s.kind === "peoples-champion")).toBe(false);
  });

  it("Most Divisive = highest min(up, down), tiebreak most total votes", () => {
    const rounds = [
      { roundId: "r1", submissions: [sub("a1", "ann"), sub("b1", "ben"), sub("c1", "cat")] },
    ];
    const ratings = [
      ...r("a1", 1, 1, -1, -1), // min 2, total 4
      ...r("b1", 1, 1, 1, -1, -1), // min 2, total 5 -> wins tiebreak
      ...r("c1", 1, 1, 1, 1, -1), // min 1
    ];
    const md = computeSuperlatives(rounds, ratings).find((s) => s.kind === "most-divisive")!;
    expect(md.userIds).toEqual(["ben"]);
    expect(md.submissionId).toBe("b1");
    expect(md.roundId).toBe("r1");
    expect(md.detail).toMatchObject({ up: 3, down: 2, net: 1 });
  });

  it("Most Divisive is omitted when nobody got a downvote", () => {
    const rounds = [{ roundId: "r1", submissions: [sub("a1", "ann"), sub("b1", "ben")] }];
    const out = computeSuperlatives(rounds, [...r("a1", 1, 1, 0), ...r("b1", 1)]);
    expect(out.some((s) => s.kind === "most-divisive")).toBe(false);
  });

  it("Robbed = non-winner with the smallest gap to its round's top net", () => {
    const rounds = [
      { roundId: "r1", submissions: [sub("a1", "ann"), sub("b1", "ben")] }, // gap 3
      { roundId: "r2", submissions: [sub("a2", "ann"), sub("c2", "cat")] }, // gap 1
    ];
    const ratings = [...r("a1", 1, 1, 1), ...r("b1", 0), ...r("a2", 1, 1), ...r("c2", 1)];
    const robbed = computeSuperlatives(rounds, ratings).find((s) => s.kind === "robbed")!;
    expect(robbed.userIds).toEqual(["cat"]);
    expect(robbed.roundId).toBe("r2");
    expect(robbed.detail).toMatchObject({ gap: 1, net: 1 });
  });

  it("Robbed ties on gap break by higher net, then higher up", () => {
    const rounds = [
      { roundId: "r1", submissions: [sub("a1", "ann"), sub("b1", "ben")] }, // top 1, ben 0 -> gap 1
      { roundId: "r2", submissions: [sub("a2", "ann"), sub("c2", "cat")] }, // top 3, cat 2 -> gap 1, higher net
    ];
    const ratings = [...r("a1", 1), ...r("b1", 0), ...r("a2", 1, 1, 1), ...r("c2", 1, 1)];
    expect(computeSuperlatives(rounds, ratings).find((s) => s.kind === "robbed")!.userIds).toEqual(["cat"]);

    const rounds2 = [
      { roundId: "r1", submissions: [sub("a1", "ann"), sub("b1", "ben")] },
      { roundId: "r2", submissions: [sub("a2", "ann"), sub("c2", "cat")] },
    ];
    // both losers net 0 with gap 1; cat has more upvotes (1 up, 1 down)
    const ratings2 = [...r("a1", 1), ...r("b1", 0), ...r("a2", 1), ...r("c2", 1, -1)];
    expect(computeSuperlatives(rounds2, ratings2).find((s) => s.kind === "robbed")!.userIds).toEqual(["cat"]);
  });

  it("Robbed ignores co-winners and is omitted when every round is a tie", () => {
    const rounds = [
      { roundId: "r1", submissions: [sub("a1", "ann"), sub("b1", "ben"), sub("c1", "cat")] },
    ];
    // ann and ben co-win at +2; cat is the only non-winner
    const withLoser = computeSuperlatives(rounds, [...r("a1", 1, 1), ...r("b1", 1, 1), ...r("c1", -1)]);
    const robbed = withLoser.find((s) => s.kind === "robbed")!;
    expect(robbed.userIds).toEqual(["cat"]);
    expect(robbed.detail.gap).toBe(3);

    const allTied = computeSuperlatives(
      [{ roundId: "r1", submissions: [sub("a1", "ann"), sub("b1", "ben")] }],
      [...r("a1", 1), ...r("b1", 1)]
    );
    expect(allTied.some((s) => s.kind === "robbed")).toBe(false);
  });
});
