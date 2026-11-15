import { describe, it, expect } from "vitest";
import { computePersonalBests, type PersonalBestEntry } from "@/lib/domain/personal-bests";

const e = (submissionId: string, userId: string, roundOrder: number, net: number): PersonalBestEntry => ({
  submissionId,
  userId,
  roundId: `r${roundOrder}`,
  roundOrder,
  net,
});

describe("computePersonalBests", () => {
  it("returns an empty list for no rounds or empty rounds", () => {
    expect(computePersonalBests([])).toEqual([]);
    expect(computePersonalBests([[], []])).toEqual([]);
  });

  it("keeps exactly one row per user, with their best net", () => {
    const out = computePersonalBests([
      [e("s1", "ana", 0, 1), e("s2", "ben", 0, 3)],
      [e("s3", "ana", 1, 4), e("s4", "ben", 1, -1)],
    ]);
    expect(out).toEqual([
      { userId: "ana", submissionId: "s3", roundId: "r1", net: 4 },
      { userId: "ben", submissionId: "s2", roundId: "r0", net: 3 },
    ]);
  });

  it("leaves out users with no entries", () => {
    const out = computePersonalBests([[e("s1", "ana", 0, 2)], [e("s2", "ana", 1, 0)]]);
    expect(out.map((r) => r.userId)).toEqual(["ana"]);

    // ben entered round 0 only, cat entered nothing: ben keeps his single entry, cat gets no row.
    const mixed = computePersonalBests([[e("s1", "ana", 0, 2), e("s3", "ben", 0, -1)], [e("s2", "ana", 1, 0)]]);
    expect(mixed).toEqual([
      { userId: "ana", submissionId: "s1", roundId: "r0", net: 2 },
      { userId: "ben", submissionId: "s3", roundId: "r0", net: -1 },
    ]);
    expect(mixed.some((r) => r.userId === "cat")).toBe(false);
  });

  it("breaks a tie inside one user's entries by earlier round, then lower submission id", () => {
    const byRound = computePersonalBests([[e("s9", "ana", 1, 2)], [e("s5", "ana", 0, 2)]]);
    expect(byRound[0].submissionId).toBe("s5");

    const byId = computePersonalBests([[e("s7", "ana", 2, 2), e("s3", "ana", 2, 2)]]);
    expect(byId[0].submissionId).toBe("s3");
  });

  it("sorts by net desc, then earlier round, then submission id, then userId", () => {
    const out = computePersonalBests([
      [e("s1", "dan", 0, -2), e("s2", "cat", 0, 1)],
      [e("s3", "ben", 1, 3), e("s4", "ana", 1, 1)],
      [e("s5", "eve", 2, 3)],
    ]);
    expect(out.map((r) => r.userId)).toEqual(["ben", "eve", "cat", "ana", "dan"]);
  });
});
