import { describe, it, expect } from "vitest";
import { ordinal, plural, signed } from "@/lib/domain/format";

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
});
