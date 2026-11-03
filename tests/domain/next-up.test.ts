import { describe, it, expect } from "vitest";
import { computeNextUp, type NextUpItem } from "@/lib/domain/next-up";

const item = (eventId: string, status: NextUpItem["status"], date: number): NextUpItem => ({
  eventId,
  title: eventId,
  groupName: "Crew",
  status,
  date,
  deadline: date - 1,
  clipsOwed: 0,
});

const ids = (items: NextUpItem[]) => items.map((i) => i.eventId);

describe("computeNextUp", () => {
  it("drops complete nights", () => {
    expect(ids(computeNextUp([item("a", "complete", 1), item("b", "upcoming", 2)]))).toEqual(["b"]);
  });

  it("puts live nights before upcoming ones, even when a later date", () => {
    expect(ids(computeNextUp([item("soon", "upcoming", 1), item("now", "live", 5)]))).toEqual(["now", "soon"]);
  });

  it("orders upcoming nights soonest first", () => {
    expect(ids(computeNextUp([item("c", "upcoming", 30), item("a", "upcoming", 10), item("b", "upcoming", 20)]))).toEqual([
      "a",
      "b",
      "c",
    ]);
  });

  it("breaks date ties on eventId, whatever the input order", () => {
    const a = item("a", "upcoming", 10);
    const b = item("b", "upcoming", 10);
    expect(ids(computeNextUp([b, a]))).toEqual(["a", "b"]);
    expect(ids(computeNextUp([a, b]))).toEqual(["a", "b"]);
  });

  it("returns nothing for empty input or only complete nights", () => {
    expect(computeNextUp([])).toEqual([]);
    expect(computeNextUp([item("a", "complete", 1)])).toEqual([]);
  });

  it("does not mutate the input", () => {
    const input = [item("b", "upcoming", 20), item("a", "live", 10), item("c", "complete", 5)];
    const before = input.map((i) => ({ ...i }));
    computeNextUp(input);
    expect(input).toEqual(before);
  });

  it("keeps the fields the panel renders", () => {
    const owing = { ...item("a", "upcoming", 10), clipsOwed: 4 };
    expect(computeNextUp([owing])).toEqual([owing]);
  });
});
