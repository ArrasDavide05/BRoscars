import { describe, it, expect } from "vitest";
import { generateInviteCode, formatInviteCode } from "@/lib/domain/invite-code";

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
