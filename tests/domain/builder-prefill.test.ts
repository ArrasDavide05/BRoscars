import { describe, it, expect } from "vitest";
import { PREFILL_COUNT, prefillPicks, prefillSeed, wantsSurprisePrefill } from "@/lib/domain/builder-prefill";
import { surprisePicks } from "@/lib/domain/surprise-picks";

const twenty = Array.from({ length: 20 }, (_, i) => ({
  id: `t${i}`,
  promptIds: [`t${i}_p0`, `t${i}_p1`, `t${i}_p2`],
}));

describe("wantsSurprisePrefill", () => {
  it("is false without the param", () => {
    expect(wantsSurprisePrefill(undefined)).toBe(false);
  });

  it('is true only for "1"', () => {
    expect(wantsSurprisePrefill("1")).toBe(true);
    expect(wantsSurprisePrefill("0")).toBe(false);
    expect(wantsSurprisePrefill("true")).toBe(false);
    expect(wantsSurprisePrefill("")).toBe(false);
  });

  it("uses the first value of a repeated param", () => {
    expect(wantsSurprisePrefill(["1", "0"])).toBe(true);
    expect(wantsSurprisePrefill(["0", "1"])).toBe(false);
    expect(wantsSurprisePrefill([])).toBe(false);
  });
});

describe("prefillSeed", () => {
  it("is stable for the same group state and moves on as prompts get used", () => {
    expect(prefillSeed("g1", { a: 1 })).toBe(prefillSeed("g1", { a: 1 }));
    expect(prefillSeed("g1", { a: 1 })).not.toBe(prefillSeed("g1", { a: 1, b: 2 }));
    expect(prefillSeed("g1", {})).not.toBe(prefillSeed("g2", {}));
  });
});

describe("prefillPicks", () => {
  it("is empty when not asked for", () => {
    expect(prefillPicks(false, twenty, "seed", new Set())).toEqual({});
  });

  it("picks six themes, matching Surprise me for the same seed", () => {
    const used = new Set(["t0_p0", "t1_p1"]);
    const picks = prefillPicks(true, twenty, "seed", used);
    expect(Object.keys(picks)).toHaveLength(PREFILL_COUNT);
    expect(picks).toEqual(surprisePicks(twenty, "seed", 6, used));
  });

  it("avoids used prompts while fresh ones exist", () => {
    const used = new Set(twenty.flatMap((t) => t.promptIds.slice(0, 2)));
    const picks = prefillPicks(true, twenty, "abc", used);
    for (const pid of Object.values(picks)) expect(used.has(pid)).toBe(false);
  });
});
