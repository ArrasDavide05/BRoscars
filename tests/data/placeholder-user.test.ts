import { describe, it, expect } from "vitest";
import { placeholderUser, UNKNOWN_MEMBER_NAME } from "@/lib/data/placeholder-user";
import type { User } from "@/lib/data/types";

describe("placeholderUser", () => {
  it("fills every User field with a safe default", () => {
    const u: User = placeholderUser("u_gone");
    expect(Object.keys(u).sort()).toEqual(["avatarColor", "careerBaseline", "id", "initials", "name"]);
    expect(u.initials).toBe("?");
    expect(u.avatarColor).toMatch(/^#[0-9a-f]{6}$/i);
    expect(u.careerBaseline).toEqual({ crowns: 0, broscars: 0, upvotes: 0 });
  });

  it("keeps the given id", () => {
    expect(placeholderUser("u_gone").id).toBe("u_gone");
    expect(placeholderUser("").id).toBe("");
  });

  it("uses the shared unknown-member name", () => {
    expect(UNKNOWN_MEMBER_NAME).toBe("Unknown member");
    expect(placeholderUser("u_gone").name).toBe(UNKNOWN_MEMBER_NAME);
  });

  it("returns a fresh object each call", () => {
    const a = placeholderUser("x");
    const b = placeholderUser("x");
    expect(a).not.toBe(b);
    expect(a.careerBaseline).not.toBe(b.careerBaseline);
  });
});
