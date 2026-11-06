import { describe, it, expect, beforeEach, vi } from "vitest";

let store: typeof import("@/lib/data/store");

beforeEach(async () => {
  vi.resetModules();
  store = await import("@/lib/data/store");
});

const db = () => store.getSnapshot().db;
const live = () => store.getSnapshot().live;
const clipsOf = (roundId: string) => db().submissions.filter((s) => s.roundId === roundId);

// Alex's own group and night, so every seeded user but Alex is a non-member.
async function alexOnlyEvent() {
  const groupId = await store.actions.createGroup("u_alex", "Just Alex");
  const promptIds = db().prompts.slice(0, 1).map((p) => p.id);
  const eventId = await store.actions.createEvent(groupId, "u_alex", "Solo Night", promptIds, Date.now());
  const roundId = db().events.find((e) => e.id === eventId)!.roundIds[0];
  return { groupId, eventId, roundId };
}

async function finishNight() {
  let guard = 0;
  while (live().phase !== "idle" && guard++ < 500) await store.actions.advance();
}

describe("submitVideo guards", () => {
  it("is a no-op for a non-member", async () => {
    const { roundId } = await alexOnlyEvent();
    await store.actions.submitVideo(roundId, "u_bella", "not my group");
    expect(clipsOf(roundId)).toEqual([]);
  });

  it("still accepts a member before the night", async () => {
    const { roundId } = await alexOnlyEvent();
    await store.actions.submitVideo(roundId, "u_alex", "mine");
    expect(clipsOf(roundId).map((s) => s.userId)).toEqual(["u_alex"]);
  });

  it("is a no-op on a live event, leaving the play order alone", async () => {
    await store.actions.startLiveEvent("e_pre");
    const before = store.playOrder(db(), "r_e_pre_1");
    await store.actions.submitVideo("r_e_pre_1", "u_dana", "too late");
    expect(store.playOrder(db(), "r_e_pre_1")).toEqual(before);
  });

  it("is a no-op on a complete event for a member with no clip", async () => {
    await store.actions.startLiveEvent("e_pre");
    await finishNight();
    expect(db().events.find((e) => e.id === "e_pre")!.status).toBe("complete");
    const before = clipsOf("r_e_pre_1");
    await store.actions.submitVideo("r_e_pre_1", "u_dana", "way too late");
    expect(clipsOf("r_e_pre_1")).toEqual(before);
  });
});

describe("castRating guards", () => {
  const SUB = "s_r_e_live_1_u_bella";

  it("is a no-op for a non-member", async () => {
    const { roundId } = await alexOnlyEvent();
    await store.actions.submitVideo(roundId, "u_alex", "mine");
    const sub = clipsOf(roundId)[0];
    const before = db().ratings;
    await store.actions.castRating(roundId, sub.id, "u_bella", 1);
    expect(db().ratings).toBe(before);
  });

  it("is a no-op on a complete event for a member who hasn't rated the clip", async () => {
    await store.actions.startLiveEvent("e_live");
    await finishNight();
    expect(db().events.find((e) => e.id === "e_live")!.status).toBe("complete");
    expect(db().ratings.some((r) => r.submissionId === SUB)).toBe(false);
    const before = db().ratings;
    await store.actions.castRating("r_e_live_1", SUB, "u_alex", 1);
    expect(db().ratings).toBe(before);
  });

  it("checks the clip's own event, not the round id passed in", async () => {
    await store.actions.startLiveEvent("e_live");
    await finishNight();
    const before = db().ratings;
    await store.actions.castRating("r_e_pre_1", SUB, "u_alex", 1);
    expect(db().ratings).toBe(before);
  });

  it("still accepts a member during a live night", async () => {
    await store.actions.startLiveEvent("e_live");
    await store.actions.castRating("r_e_live_1", SUB, "u_alex", 1);
    expect(db().ratings.filter((r) => r.submissionId === SUB)).toHaveLength(1);
  });
});

describe("advance with an expected slot", () => {
  async function playing() {
    await store.actions.startLiveEvent("e_live");
    await store.actions.advance(); // -> playing idx 0
    expect(live()).toMatchObject({ phase: "playing", roundIndex: 0, submissionIndex: 0 });
  }

  it("does nothing when the submission index is stale", async () => {
    await playing();
    await store.actions.advance(); // another tab got there first
    const before = store.getSnapshot();
    await store.actions.advance({ roundIndex: 0, submissionIndex: 0 });
    expect(store.getSnapshot()).toBe(before);
  });

  it("does nothing when the round index is stale", async () => {
    await playing();
    const before = store.getSnapshot();
    await store.actions.advance({ roundIndex: 1, submissionIndex: 0 });
    expect(store.getSnapshot()).toBe(before);
  });

  it("does nothing when the last video already moved on to the round results", async () => {
    await playing();
    const last = store.playOrder(db(), "r_e_live_1").length - 1;
    while (live().submissionIndex < last) await store.actions.advance();
    await store.actions.advance(); // -> round-results, same indices
    expect(live()).toMatchObject({ phase: "round-results", roundIndex: 0, submissionIndex: last });
    const before = store.getSnapshot();
    await store.actions.advance({ roundIndex: 0, submissionIndex: last });
    expect(store.getSnapshot()).toBe(before);
  });

  it("advances when the slot matches", async () => {
    await playing();
    await store.actions.advance({ roundIndex: 0, submissionIndex: 0 });
    expect(live()).toMatchObject({ phase: "playing", submissionIndex: 1 });
  });

  it("advances with no argument, from the intro and while playing", async () => {
    await store.actions.startLiveEvent("e_live");
    await store.actions.advance();
    expect(live().phase).toBe("playing");
    await store.actions.advance();
    expect(live().submissionIndex).toBe(1);
  });
});
