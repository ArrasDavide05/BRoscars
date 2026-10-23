import { describe, expect, it } from "vitest";
import { groupRevealSteps } from "@/lib/domain/reveal-steps";

const row = (id: string, rank: number) => ({ id, rank });

describe("groupRevealSteps", () => {
  it("reveals 3rd, then 2nd, then 1st", () => {
    const steps = groupRevealSteps([row("a", 1), row("b", 2), row("c", 3)]);
    expect(steps.map((g) => g.map((r) => r.id))).toEqual([["c"], ["b"], ["a"]]);
  });

  it("puts ties on one step (competition ranking)", () => {
    const steps = groupRevealSteps([row("a", 1), row("b", 1), row("c", 3)]);
    expect(steps.map((g) => g.map((r) => r.id))).toEqual([["c"], ["a", "b"]]);
  });

  it("has fewer steps with fewer entries, none when empty", () => {
    expect(groupRevealSteps([row("a", 1), row("b", 2)])).toHaveLength(2);
    expect(groupRevealSteps([])).toEqual([]);
  });

  it("reveals everyone in a single step when all tie for 1st", () => {
    const steps = groupRevealSteps([row("a", 1), row("b", 1), row("c", 1)]);
    expect(steps.map((g) => g.map((r) => r.id))).toEqual([["a", "b", "c"]]);
  });

  it("orders steps by rank even when input is unsorted", () => {
    const steps = groupRevealSteps([row("c", 3), row("a", 1), row("b", 2), row("d", 2)]);
    expect(steps.map((g) => g.map((r) => r.id))).toEqual([["c"], ["b", "d"], ["a"]]);
  });
});
