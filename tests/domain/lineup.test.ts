import { describe, it, expect } from "vitest";
import { buildLineup, UNKNOWN_PROMPT, UNKNOWN_THEME } from "@/lib/domain/lineup";

const themes: Record<string, { name: string }> = {
  r1: { name: "Alcohol" },
  r2: { name: "Work" },
  r3: { name: "Travel" },
};
const prompts: Record<string, { text: string }> = {
  r1: { text: "Best night out video" },
  r2: { text: "Work incident" },
  r3: { text: "Worst airport moment" },
};
const themeFor = (id: string) => themes[id];
const promptFor = (id: string) => prompts[id];

describe("buildLineup", () => {
  it("orders rounds by roundOrder, not array order", () => {
    const rounds = [
      { id: "r3", roundOrder: 2 },
      { id: "r1", roundOrder: 0 },
      { id: "r2", roundOrder: 1 },
    ];
    expect(buildLineup(rounds, themeFor, promptFor)).toEqual([
      { roundId: "r1", roundNo: 1, themeName: "Alcohol", promptText: "Best night out video" },
      { roundId: "r2", roundNo: 2, themeName: "Work", promptText: "Work incident" },
      { roundId: "r3", roundNo: 3, themeName: "Travel", promptText: "Worst airport moment" },
    ]);
  });

  it("does not mutate the input", () => {
    const rounds = [
      { id: "r2", roundOrder: 1 },
      { id: "r1", roundOrder: 0 },
    ];
    buildLineup(rounds, themeFor, promptFor);
    expect(rounds.map((r) => r.id)).toEqual(["r2", "r1"]);
  });

  it("is empty for an event with no rounds", () => {
    expect(buildLineup([], themeFor, promptFor)).toEqual([]);
  });

  it("falls back to placeholders for a missing theme or prompt", () => {
    const rounds = [
      { id: "r1", roundOrder: 0 },
      { id: "ghost", roundOrder: 1 },
    ];
    const lineup = buildLineup(rounds, themeFor, promptFor);
    expect(lineup[1]).toEqual({ roundId: "ghost", roundNo: 2, themeName: UNKNOWN_THEME, promptText: UNKNOWN_PROMPT });
  });

  it("numbers rounds 1..n even when roundOrder has gaps", () => {
    const rounds = [
      { id: "r2", roundOrder: 5 },
      { id: "r1", roundOrder: 2 },
    ];
    expect(buildLineup(rounds, themeFor, promptFor).map((e) => e.roundNo)).toEqual([1, 2]);
  });
});
