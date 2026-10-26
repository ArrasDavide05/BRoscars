import { describe, it, expect } from "vitest";
import { surprisePicks } from "@/lib/domain/surprise-picks";

const small = [
  { id: "alcohol", promptIds: ["a1", "a2", "a3"] },
  { id: "work", promptIds: ["w1", "w2", "w3"] },
  { id: "pets", promptIds: ["p1", "p2"] },
];

const twenty = Array.from({ length: 20 }, (_, i) => ({
  id: `t${i}`,
  promptIds: [`t${i}_p0`, `t${i}_p1`, `t${i}_p2`],
}));

describe("surprisePicks", () => {
  it("is deterministic for the same seed", () => {
    expect(surprisePicks(twenty, "seed-1")).toEqual(surprisePicks(twenty, "seed-1"));
  });

  it("gives a fixed result for a fixed seed", () => {
    expect(surprisePicks(small, "fixed", 2)).toMatchInlineSnapshot(`
      {
        "alcohol": "a2",
        "pets": "p2",
      }
    `);
  });

  it("picks exactly 6 themes out of 20 by default", () => {
    expect(Object.keys(surprisePicks(twenty, "abc"))).toHaveLength(6);
  });

  it("never repeats a theme and only picks prompts from their own theme", () => {
    for (const seed of ["a", "b", "c", "d", "e"]) {
      const picks = surprisePicks(twenty, seed);
      const ids = Object.keys(picks);
      expect(new Set(ids).size).toBe(ids.length);
      for (const [themeId, promptId] of Object.entries(picks)) {
        const theme = twenty.find((t) => t.id === themeId);
        expect(theme?.promptIds).toContain(promptId);
      }
    }
  });

  it("returns one pick per theme when asking for more themes than exist", () => {
    const picks = surprisePicks(small, "x", 10);
    expect(Object.keys(picks).sort()).toEqual(["alcohol", "pets", "work"]);
  });

  it("skips themes with no prompts", () => {
    const themes = [...small, { id: "empty", promptIds: [] }];
    for (const seed of ["a", "b", "c", "d"]) {
      const picks = surprisePicks(themes, seed, 10);
      expect(picks).not.toHaveProperty("empty");
      expect(Object.keys(picks)).toHaveLength(3);
    }
  });

  it("gives a different result for a different seed", () => {
    expect(surprisePicks(twenty, "seed-1")).not.toEqual(surprisePicks(twenty, "seed-2"));
  });

  it("returns no picks for an empty library", () => {
    expect(surprisePicks([], "x")).toEqual({});
  });
});
