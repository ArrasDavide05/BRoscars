import { describe, it, expect } from "vitest";
import { ordinal, plural, relativeDays, signed } from "@/lib/domain/format";

describe("ordinal", () => {
  it.each([
    [1, "1st"], [2, "2nd"], [3, "3rd"], [4, "4th"],
    [11, "11th"], [12, "12th"], [13, "13th"],
    [21, "21st"], [22, "22nd"], [23, "23rd"],
    [101, "101st"], [111, "111th"], [112, "112th"],
  ])("%i -> %s", (n, expected) => {
    expect(ordinal(n)).toBe(expected);
  });
});

describe("signed", () => {
  it("adds a plus only to positive numbers", () => {
    expect(signed(3)).toBe("+3");
    expect(signed(0)).toBe("0");
    expect(signed(-2)).toBe("-2");
  });
});

describe("plural", () => {
  it("pluralises everything but 1", () => {
    expect(plural(0, "crown")).toBe("0 crowns");
    expect(plural(1, "crown")).toBe("1 crown");
    expect(plural(2, "crown")).toBe("2 crowns");
  });

  it("only pluralises the last word of a phrase", () => {
    expect(plural(1, "earlier crown")).toBe("1 earlier crown");
    expect(plural(3, "earlier crown")).toBe("3 earlier crowns");
  });
});

describe("relativeDays", () => {
  const now = Date.UTC(2026, 9, 31, 20);
  const day = 24 * 60 * 60 * 1000;

  it.each([
    [0, "today"],
    [0.4 * day, "today"],
    [day, "in 1 day"],
    [3 * day, "in 3 days"],
    [-day, "1 day ago"],
    [-29 * day, "29 days ago"],
    [-30 * day, "1 month ago"],
    [-75 * day, "3 months ago"],
  ])("offset %d -> %s", (offset, expected) => {
    expect(relativeDays(now + offset, now)).toBe(expected);
  });
});
