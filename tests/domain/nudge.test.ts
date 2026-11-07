import { describe, it, expect } from "vitest";
import { nudgeIsActive, nudgeLine } from "@/lib/domain/nudge";

describe("nudgeIsActive", () => {
  it("only on an upcoming night while clips are owed", () => {
    expect(nudgeIsActive("upcoming", 2)).toBe(true);
    expect(nudgeIsActive("upcoming", 0)).toBe(false);
    expect(nudgeIsActive("live", 2)).toBe(false);
    expect(nudgeIsActive("complete", 2)).toBe(false);
  });
});

describe("nudgeLine", () => {
  it("counts only, with the right plural", () => {
    expect(nudgeLine("Alex", 2)).toBe("Alex nudged you: 2 clips to go");
    expect(nudgeLine("Alex", 1)).toBe("Alex nudged you: 1 clip to go");
  });
});
