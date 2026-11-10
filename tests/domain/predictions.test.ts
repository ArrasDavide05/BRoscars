import { describe, it, expect } from "vitest";
import { calledItLine, pickOf, whoCalledIt } from "@/lib/domain/predictions";

const picks = [
  { userId: "u_dana", pickedUserId: "u_chris" },
  { userId: "u_alex", pickedUserId: "u_bella" },
  { userId: "u_eli", pickedUserId: "u_chris" },
];

describe("whoCalledIt", () => {
  it("lists members who picked the single winner, in pick order", () => {
    expect(whoCalledIt(picks, ["u_chris"])).toEqual(["u_dana", "u_eli"]);
  });

  it("counts a pick for any co-winner", () => {
    expect(whoCalledIt(picks, ["u_bella", "u_chris"])).toEqual(["u_dana", "u_alex", "u_eli"]);
  });

  it("is empty when nobody was right", () => {
    expect(whoCalledIt(picks, ["u_fiona"])).toEqual([]);
  });

  it("is empty with no picks or no winners", () => {
    expect(whoCalledIt([], ["u_chris"])).toEqual([]);
    expect(whoCalledIt(picks, [])).toEqual([]);
  });

  it("a pick for yourself counts when you win", () => {
    expect(whoCalledIt([{ userId: "u_chris", pickedUserId: "u_chris" }], ["u_chris"])).toEqual(["u_chris"]);
  });
});

describe("pickOf", () => {
  it("returns the member's own pick or undefined", () => {
    expect(pickOf(picks, "u_alex")).toBe("u_bella");
    expect(pickOf(picks, "u_fiona")).toBeUndefined();
  });
});

describe("calledItLine", () => {
  it("names who called it, or says nobody did", () => {
    expect(calledItLine(["Sam", "Jo"])).toBe("Called it: Sam, Jo 🔮");
    expect(calledItLine([])).toBe("Nobody called it.");
  });
});
