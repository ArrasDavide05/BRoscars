import { describe, it, expect } from "vitest";
import { validateProfileDraft } from "@/lib/domain/profile-draft";

const current = { name: "Alex", avatarColor: "#E4B04A" };

describe("validateProfileDraft", () => {
  it("rejects a blank name", () => {
    const r = validateProfileDraft({ name: "", color: current.avatarColor, current });
    expect(r.ok).toBe(false);
    expect(r.error).toBeTruthy();
    expect(r.name).toBe("");
  });

  it("rejects a whitespace-only name", () => {
    const r = validateProfileDraft({ name: "   \t ", color: current.avatarColor, current });
    expect(r.ok).toBe(false);
    expect(r.error).toBeTruthy();
    expect(r.name).toBe("");
  });

  it("accepts 40 chars and rejects 41", () => {
    expect(validateProfileDraft({ name: "a".repeat(40), color: current.avatarColor, current }).ok).toBe(true);
    const r = validateProfileDraft({ name: "a".repeat(41), color: current.avatarColor, current });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/40/);
  });

  it("trims and collapses inner whitespace", () => {
    const r = validateProfileDraft({ name: "  Alex   the \t Great ", color: current.avatarColor, current });
    expect(r).toEqual({ ok: true, name: "Alex the Great", dirty: true });
  });

  it("is not dirty when the normalised name and colour are unchanged", () => {
    expect(validateProfileDraft({ name: "Alex", color: "#E4B04A", current })).toEqual({
      ok: true,
      name: "Alex",
      dirty: false,
    });
    expect(validateProfileDraft({ name: "  Alex ", color: "#E4B04A", current }).dirty).toBe(false);
  });

  it("is dirty when only the colour changes", () => {
    const r = validateProfileDraft({ name: "Alex", color: "#6C8AE4", current });
    expect(r).toEqual({ ok: true, name: "Alex", dirty: true });
  });
});
