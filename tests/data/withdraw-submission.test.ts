import { describe, it, expect, beforeEach, vi } from "vitest";

// The store is a module-level singleton seeded at import. Reset modules and
// re-import before each test so every case starts from a fresh seed.
let store: typeof import("@/lib/data/store");

beforeEach(async () => {
  vi.resetModules();
  store = await import("@/lib/data/store");
});

const subs = () => store.getSnapshot().db.submissions;
const clipOf = (roundId: string, userId: string) =>
  subs().find((s) => s.roundId === roundId && s.userId === userId);

// In the seed, only alex/bella/chris submit to the e_pre rounds, so dana/eli/fiona are open.
describe("withdrawSubmission", () => {
  it("removes the member's own clip on an upcoming event, and they can submit again", async () => {
    await store.actions.withdrawSubmission("r_e_pre_1", "u_alex");
    expect(clipOf("r_e_pre_1", "u_alex")).toBeUndefined();

    await store.actions.submitVideo("r_e_pre_1", "u_alex", "take two");
    expect(subs().filter((s) => s.roundId === "r_e_pre_1" && s.userId === "u_alex")).toHaveLength(1);
    expect(clipOf("r_e_pre_1", "u_alex")?.caption).toBe("take two");
  });

  it("leaves every other clip alone: other members, and the member's other rounds", async () => {
    const before = subs().length;
    await store.actions.withdrawSubmission("r_e_pre_1", "u_alex");
    expect(subs()).toHaveLength(before - 1);
    expect(clipOf("r_e_pre_1", "u_bella")).toBeDefined();
    expect(clipOf("r_e_pre_1", "u_chris")).toBeDefined();
    expect(clipOf("r_e_pre_2", "u_alex")).toBeDefined();
  });

  it("does nothing once the event is live", async () => {
    await store.actions.startLiveEvent("e_live");
    const before = store.getSnapshot();
    await store.actions.withdrawSubmission("r_e_live_1", "u_alex");
    expect(store.getSnapshot()).toBe(before);
    expect(clipOf("r_e_live_1", "u_alex")).toBeDefined();
  });

  it("does nothing on a complete event", async () => {
    const { db } = store.getSnapshot();
    const roundId = db.events.find((e) => e.status === "complete")!.roundIds[0];
    const userId = db.submissions.find((s) => s.roundId === roundId)!.userId;
    const before = store.getSnapshot();
    await store.actions.withdrawSubmission(roundId, userId);
    expect(store.getSnapshot()).toBe(before);
  });

  it("does not commit when the member has no clip in the round", async () => {
    const before = store.getSnapshot();
    await store.actions.withdrawSubmission("r_e_pre_1", "u_dana");
    expect(store.getSnapshot()).toBe(before);
  });

  it("is a no-op for an unknown round", async () => {
    const before = store.getSnapshot();
    await expect(store.actions.withdrawSubmission("r_does_not_exist", "u_alex")).resolves.toBeUndefined();
    expect(store.getSnapshot()).toBe(before);
  });
});
