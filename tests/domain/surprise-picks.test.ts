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

  describe("with used prompts", () => {
    const seeds = ["a", "b", "c", "d", "e", "f", "g", "h"];

    it("an empty used set changes nothing", () => {
      for (const seed of seeds) {
        expect(surprisePicks(twenty, seed, 6, new Set())).toEqual(surprisePicks(twenty, seed));
      }
    });

    it("takes the unused prompt within a theme", () => {
      const used = new Set(["a1", "a2", "w2", "w3", "p1"]);
      for (const seed of seeds) {
        expect(surprisePicks(small, seed, 3, used)).toEqual({ alcohol: "a3", work: "w1", pets: "p2" });
      }
    });

    it("chooses a fully used theme only when there aren't enough fresh ones", () => {
      const used = new Set(["a1", "a2", "a3"]);
      for (const seed of seeds) {
        expect(Object.keys(surprisePicks(small, seed, 2, used)).sort()).toEqual(["pets", "work"]);
        const all = surprisePicks(small, seed, 3, used);
        expect(Object.keys(all).sort()).toEqual(["alcohol", "pets", "work"]);
        expect(used.has(all.work)).toBe(false);
        expect(used.has(all.pets)).toBe(false);
      }
    });

    it("falls back to the theme's normal pick when everything is used", () => {
      const used = new Set(twenty.flatMap((t) => t.promptIds));
      for (const seed of seeds) {
        expect(surprisePicks(twenty, seed, 6, used)).toEqual(surprisePicks(twenty, seed));
      }
    });

    it("is deterministic for a seed with a used set", () => {
      const used = new Set(twenty.slice(0, 10).map((t) => t.promptIds[0]));
      for (const seed of seeds) {
        expect(surprisePicks(twenty, seed, 6, used)).toEqual(surprisePicks(twenty, seed, 6, used));
      }
    });

    it("never picks a prompt from another theme, even when its own are all used", () => {
      const used = new Set(twenty.slice(0, 15).flatMap((t) => t.promptIds));
      for (const seed of seeds) {
        for (const [themeId, promptId] of Object.entries(surprisePicks(twenty, seed, 20, used))) {
          expect(twenty.find((t) => t.id === themeId)?.promptIds).toContain(promptId);
        }
      }
    });
  });
});
