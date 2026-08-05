import { describe, it, expect } from "vitest";
import { seededShuffle, revealSeed, roundPlaySeed } from "@/lib/domain/shuffle";

describe("seededShuffle", () => {
  const items = ["a", "b", "c", "d", "e"];

  it("is deterministic for the same seed", () => {
    expect(seededShuffle(items, "x")).toEqual(seededShuffle(items, "x"));
  });

  it("permutes without mutating the input", () => {
    const input = items.slice();
    const out = seededShuffle(input, "seed");
    expect(out).toHaveLength(items.length);
    expect(out.slice().sort()).toEqual(items.slice().sort());
    expect(input).toEqual(items); // input untouched
  });

  it("produces different orders across seeds", () => {
    const big = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"];
    const orders = new Set(["a", "b", "c"].map((s) => seededShuffle(big, s).join(",")));
    expect(orders.size).toBeGreaterThan(1);
  });
});

describe("seed helpers", () => {
  it("revealSeed joins user and round", () => {
    expect(revealSeed("u1", "r1")).toBe("u1:r1");
  });

  it("roundPlaySeed namespaces the round", () => {
    expect(roundPlaySeed("r1")).toBe("round:r1");
  });
});
