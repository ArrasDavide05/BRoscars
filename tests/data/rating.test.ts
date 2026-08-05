import { describe, it, expect, beforeEach, vi } from "vitest";

let store: typeof import("@/lib/data/store");

beforeEach(async () => {
  vi.resetModules();
  store = await import("@/lib/data/store");
});

const ratings = () => store.getSnapshot().db.ratings;
const ratingsFor = (submissionId: string) => ratings().filter((r) => r.submissionId === submissionId);

// r_e_live_1 has all 6 seed submissions and no ratings yet.
const BELLA_SUB = "s_r_e_live_1_u_bella";
const ALEX_SUB = "s_r_e_live_1_u_alex";

describe("castRating", () => {
  it("records a valid rating", async () => {
    await store.actions.castRating("r_e_live_1", BELLA_SUB, "u_alex", 1);
    const rows = ratingsFor(BELLA_SUB);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ submissionId: BELLA_SUB, raterId: "u_alex", value: 1 });
  });

  it("accepts values -1, 0 and 1 exactly", async () => {
    await store.actions.castRating("r_e_live_1", BELLA_SUB, "u_alex", 1);
    await store.actions.castRating("r_e_live_1", BELLA_SUB, "u_chris", 0);
    await store.actions.castRating("r_e_live_1", BELLA_SUB, "u_dana", -1);
    const byRater = Object.fromEntries(ratingsFor(BELLA_SUB).map((r) => [r.raterId, r.value]));
    expect(byRater).toEqual({ u_alex: 1, u_chris: 0, u_dana: -1 });
  });

  it("rejects a self-rating", async () => {
    await store.actions.castRating("r_e_live_1", ALEX_SUB, "u_alex", 1);
    expect(ratingsFor(ALEX_SUB)).toHaveLength(0);
  });

  it("is a no-op on a duplicate rater and keeps the original value", async () => {
    await store.actions.castRating("r_e_live_1", BELLA_SUB, "u_alex", 1);
    await store.actions.castRating("r_e_live_1", BELLA_SUB, "u_alex", -1);
    const rows = ratingsFor(BELLA_SUB);
    expect(rows).toHaveLength(1);
    expect(rows[0].value).toBe(1);
  });

  it("is a no-op for an unknown submission", async () => {
    const before = ratings().length;
    await store.actions.castRating("r_e_live_1", "s_missing", "u_alex", 1);
    expect(ratings().length).toBe(before);
  });
});

describe("eligibleRaterIds + all-rated", () => {
  it("excludes the submission owner from the eligible raters", () => {
    const db = store.getSnapshot().db;
    const eligible = store.eligibleRaterIds(db, "g_crew", "u_alex");
    expect(eligible).toHaveLength(5);
    expect(eligible).not.toContain("u_alex");
  });

  it("is fully rated once every eligible rater has rated", async () => {
    const eligible = store.eligibleRaterIds(store.getSnapshot().db, "g_crew", "u_bella");
    for (const rater of eligible) {
      await store.actions.castRating("r_e_live_1", BELLA_SUB, rater, 1);
    }
    const ratedBy = ratingsFor(BELLA_SUB).map((r) => r.raterId);
    expect(eligible.every((id) => ratedBy.includes(id))).toBe(true);
    expect(ratedBy).toHaveLength(eligible.length);
  });
});
