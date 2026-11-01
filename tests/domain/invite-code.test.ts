import { describe, it, expect } from "vitest";
import {
  generateInviteCode,
  formatInviteCode,
  normalizeInviteCode,
  inviteCodesMatch,
  validateGroupName,
  GROUP_NAME_MAX,
  findByInviteCode,
  inviteLinkPath,
} from "@/lib/domain/invite-code";

const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

// Deterministic RNG that cycles through the given values.
function seqRand(values: number[]): () => number {
  let i = 0;
  return () => values[i++ % values.length];
}

describe("generateInviteCode", () => {
  it("returns 8 chars, all from the Crockford alphabet", () => {
    const code = generateInviteCode(seqRand([0, 0.2, 0.4, 0.6, 0.8, 0.99, 0.1, 0.5]));
    expect(code).toHaveLength(8);
    for (const ch of code) expect(ALPHABET).toContain(ch);
  });

  it("is deterministic given the same RNG sequence", () => {
    const values = [0.05, 0.15, 0.25, 0.35, 0.45, 0.55, 0.65, 0.75];
    expect(generateInviteCode(seqRand(values))).toBe(generateInviteCode(seqRand(values)));
  });
});

describe("formatInviteCode", () => {
  it("formats an 8-char code as XXXX-XXXX", () => {
    expect(formatInviteCode("ABCD1234")).toBe("ABCD-1234");
  });

  it("uppercases and leaves non-8-length codes undashed", () => {
    expect(formatInviteCode("abc")).toBe("ABC");
  });
});

describe("normalizeInviteCode", () => {
  it("trims, drops spaces and dashes, uppercases", () => {
    expect(normalizeInviteCode("  ab cd-12 34 ")).toBe("ABCD1234");
  });

  it("maps Crockford look-alikes O->0, I->1, L->1", () => {
    expect(normalizeInviteCode("oIlL")).toBe("0111");
  });

  it("returns an empty string for blank input", () => {
    expect(normalizeInviteCode(" - ")).toBe("");
  });
});

describe("inviteCodesMatch", () => {
  it("matches the seed code OSCR2026 in any typed form", () => {
    for (const typed of ["OSCR2026", "oscr-2026", "0SCR2026", " oscr 2026 "]) {
      expect(inviteCodesMatch(typed, "OSCR2026")).toBe(true);
    }
  });

  it("matches a generated code typed lower-case with a dash", () => {
    const code = generateInviteCode(seqRand([0.1, 0.3, 0.5, 0.7, 0.9]));
    expect(inviteCodesMatch(formatInviteCode(code).toLowerCase(), code)).toBe(true);
  });

  it("rejects different codes and blank input", () => {
    expect(inviteCodesMatch("OSCR2027", "OSCR2026")).toBe(false);
    expect(inviteCodesMatch("", "")).toBe(false);
    expect(inviteCodesMatch("  ", "OSCR2026")).toBe(false);
  });
});

describe("validateGroupName", () => {
  it("trims and collapses inner whitespace", () => {
    expect(validateGroupName("  Taco   Tuesday  ")).toEqual({ name: "Taco Tuesday", error: null });
  });

  it("rejects a blank name", () => {
    expect(validateGroupName("   ").error).toMatch(/blank/);
  });

  it("accepts exactly the max length and rejects one more", () => {
    expect(validateGroupName("a".repeat(GROUP_NAME_MAX)).error).toBeNull();
    expect(validateGroupName("a".repeat(GROUP_NAME_MAX + 1)).error).toMatch(/at most 40/);
  });

  it("measures length after normalizing", () => {
    expect(validateGroupName(`  ${"a".repeat(GROUP_NAME_MAX)}   `).error).toBeNull();
  });
});

describe("findByInviteCode", () => {
  const groups = [
    { id: "a", inviteCode: "OSCR2026" },
    { id: "b", inviteCode: "7K3M9QXZ" },
  ];

  it("matches linked/typed variants after normalizing", () => {
    for (const code of ["OSCR-2026", "oscr2026", "OSCR2026", "0SCR-2026", " oscr 2026 "]) {
      expect(findByInviteCode(groups, code)?.id).toBe("a");
    }
    expect(findByInviteCode(groups, "7k3m-9qxz")?.id).toBe("b");
  });

  it("returns undefined for unknown or blank codes", () => {
    expect(findByInviteCode(groups, "NOPE-NOPE")).toBeUndefined();
    expect(findByInviteCode(groups, "  ")).toBeUndefined();
    expect(findByInviteCode([], "OSCR2026")).toBeUndefined();
  });
});

describe("inviteLinkPath", () => {
  it("builds /join/XXXX-XXXX from the formatted code", () => {
    expect(inviteLinkPath("OSCR2026")).toBe("/join/OSCR-2026");
    expect(inviteLinkPath("7k3m9qxz")).toBe("/join/7K3M-9QXZ");
  });

  it("round-trips: the path's code finds the same group", () => {
    const groups = [{ id: "a", inviteCode: "OSCR2026" }];
    const code = decodeURIComponent(inviteLinkPath("OSCR2026").slice("/join/".length));
    expect(findByInviteCode(groups, code)?.id).toBe("a");
  });
});
