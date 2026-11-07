import { describe, it, expect, beforeEach, vi } from "vitest";

// The store is a module-level singleton seeded at import. Reset modules and
// re-import before each test so every case starts from a fresh seed.
let store: typeof import("@/lib/data/store");

beforeEach(async () => {
  vi.resetModules();
  vi.useRealTimers();
  store = await import("@/lib/data/store");
});

const nudges = () => store.getSnapshot().db.nudges;
const nudgeFor = (eventId: string, userId: string) =>
  store.activeNudge(store.getSnapshot().db, eventId, userId);

// Seed: u_alex hosts e_pre; alex/bella/chris have all 6 clips in, dana/eli/fiona owe 6.
describe("nudgeMember", () => {
  it("lets the host nudge a member who still owes clips", async () => {
    await store.actions.nudgeMember("e_pre", "u_alex", "u_dana");
    expect(nudges()).toEqual([
      { eventId: "e_pre", fromUserId: "u_alex", toUserId: "u_dana", at: expect.any(Number) },
    ]);
    expect(nudgeFor("e_pre", "u_dana")).toEqual({ fromUserId: "u_alex", at: expect.any(Number), clipsOwed: 6 });
  });

  it("is a no-op for a non-host", async () => {
    const before = store.getSnapshot();
    await store.actions.nudgeMember("e_pre", "u_bella", "u_dana");
    expect(store.getSnapshot()).toBe(before);
    expect(nudgeFor("e_pre", "u_dana")).toBeNull();
  });

  it("the host can't nudge themselves or a non-member", async () => {
    const before = store.getSnapshot();
    await store.actions.nudgeMember("e_pre", "u_alex", "u_alex");
    await store.actions.nudgeMember("e_pre", "u_alex", "u_ghost");
    expect(store.getSnapshot()).toBe(before);
  });

  it("skips a member who owes no clips", async () => {
    const before = store.getSnapshot();
    await store.actions.nudgeMember("e_pre", "u_alex", "u_bella");
    expect(store.getSnapshot()).toBe(before);
  });

  it("is a no-op for an unknown event", async () => {
    const before = store.getSnapshot();
    await expect(store.actions.nudgeMember("e_nope", "u_alex", "u_dana")).resolves.toBeUndefined();
    expect(store.getSnapshot()).toBe(before);
  });

  it("there is no nudge on a live night, old or new", async () => {
    await store.actions.nudgeMember("e_pre", "u_alex", "u_dana");
    await store.actions.startLiveEvent("e_pre");
    expect(nudgeFor("e_pre", "u_dana")).toBeNull();

    const before = store.getSnapshot();
    await store.actions.nudgeMember("e_pre", "u_alex", "u_eli");
    expect(store.getSnapshot()).toBe(before);
  });

  it("there is no nudge on a complete night", async () => {
    const { db } = store.getSnapshot();
    const past = db.events.find((e) => e.status === "complete")!;
    const member = db.groups.find((g) => g.id === past.groupId)!.memberIds.find((id) => id !== past.hostId)!;
    const before = store.getSnapshot();
    await store.actions.nudgeMember(past.id, past.hostId, member);
    expect(store.getSnapshot()).toBe(before);
    expect(nudgeFor(past.id, member)).toBeNull();
  });

  it("a re-nudge replaces the old one", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000);
    await store.actions.nudgeMember("e_pre", "u_alex", "u_dana");
    vi.setSystemTime(2_000);
    await store.actions.nudgeMember("e_pre", "u_alex", "u_dana");
    await store.actions.nudgeMember("e_pre", "u_alex", "u_eli");
    vi.useRealTimers();

    expect(nudges().filter((n) => n.toUserId === "u_dana")).toEqual([
      { eventId: "e_pre", fromUserId: "u_alex", toUserId: "u_dana", at: 2_000 },
    ]);
    expect(nudges()).toHaveLength(2);
  });

  it("the count follows submissions and the nudge goes away after the last clip", async () => {
    await store.actions.nudgeMember("e_pre", "u_alex", "u_dana");
    const roundIds = store.getSnapshot().db.events.find((e) => e.id === "e_pre")!.roundIds;

    for (const [i, roundId] of roundIds.slice(0, -1).entries()) {
      await store.actions.submitVideo(roundId, "u_dana", `clip ${i}`);
    }
    expect(nudgeFor("e_pre", "u_dana")?.clipsOwed).toBe(1);

    await store.actions.submitVideo(roundIds[roundIds.length - 1], "u_dana", "last");
    expect(nudgeFor("e_pre", "u_dana")).toBeNull();
  });

  it("a nudge is per member: others stay un-nudged", async () => {
    await store.actions.nudgeMember("e_pre", "u_alex", "u_dana");
    expect(nudgeFor("e_pre", "u_eli")).toBeNull();
  });
});
