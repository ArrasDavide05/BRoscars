import { describe, it, expect } from "vitest";
import { waitingOnNames } from "@/lib/domain/rater-progress";

const names = { a: "Sam", b: "Jo", c: "Al", d: "Mia", e: "Kit" };

describe("waitingOnNames", () => {
  it("is empty when everyone eligible has rated", () => {
    expect(waitingOnNames(["a", "b"], ["b", "a"], names)).toBe("");
  });

  it("is empty when nobody is eligible", () => {
    expect(waitingOnNames([], [], names)).toBe("");
  });

  it("names a single waiting rater", () => {
    expect(waitingOnNames(["a", "b"], ["b"], names)).toBe("Sam");
  });

  it("joins two with 'and'", () => {
    expect(waitingOnNames(["a", "b", "c"], ["c"], names)).toBe("Sam and Jo");
  });

  it("lists three with commas and 'and'", () => {
    expect(waitingOnNames(["a", "b", "c"], [], names)).toBe("Sam, Jo and Al");
  });

  it("collapses the tail into 'N others' past the limit", () => {
    expect(waitingOnNames(["a", "b", "c", "d"], [], names)).toBe("Sam, Jo and 2 others");
    expect(waitingOnNames(["a", "b", "c", "d", "e"], ["e"], names)).toBe("Sam, Jo and 2 others");
  });

  it("uses singular 'other' when the limit is lowered", () => {
    expect(waitingOnNames(["a", "b", "c"], [], names, 2)).toBe("Sam, Jo and 1 other");
  });

  it("ignores ratings from non-eligible users and unknown ids", () => {
    expect(waitingOnNames(["a", "zz"], ["x"], names)).toBe("Sam");
  });
});
