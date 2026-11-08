import { describe, it, expect, beforeEach, vi } from "vitest";

// The store is a module-level singleton seeded at import. Reset modules and
// re-import before each test so every case starts from a fresh seed.
let store: typeof import("@/lib/data/store");

beforeEach(async () => {
  vi.resetModules();
  vi.useRealTimers();
  store = await import("@/lib/data/store");
});

const db = () => store.getSnapshot().db;
const live = () => store.getSnapshot().live;
const speechesFor = (eventId: string) => db().speeches.filter((s) => s.eventId === eventId);

async function finishNight() {
  let guard = 0;
  while (live().phase !== "idle" && guard++ < 500) await store.actions.advance();
}

// Alex + Bella, two rounds: each wins one with one upvote, so they are co-BRoscars.
async function coWinnerNight() {
  const groupId = await store.actions.createGroup("u_alex", "Duo");
  const code = db().groups.find((g) => g.id === groupId)!.inviteCode;
  await store.actions.joinGroupByCode("u_bella", code);
  const promptIds = db().prompts.slice(0, 2).map((p) => p.id);
  const eventId = await store.actions.createEvent(groupId, "u_alex", "Duo Night", promptIds, Date.now());
  const [r1, r2] = db().events.find((e) => e.id === eventId)!.roundIds;
  for (const roundId of [r1, r2]) {
    await store.actions.submitVideo(roundId, "u_alex", "a");
    await store.actions.submitVideo(roundId, "u_bella", "b");
  }
  const clip = (roundId: string, userId: string) =>
    db().submissions.find((s) => s.roundId === roundId && s.userId === userId)!.id;
  await store.actions.castRating(r1, clip(r1, "u_alex"), "u_bella", 1);
  await store.actions.castRating(r2, clip(r2, "u_bella"), "u_alex", 1);
  return { eventId, start: () => store.actions.startLiveEvent(eventId) };
}

describe("saveSpeech", () => {
  it("the seed's past champion already has a speech", () => {
    const past = db().events.find((e) => e.id === "e_past")!;
    expect(speechesFor("e_past")).toEqual([
      expect.objectContaining({ userId: past.broscarUserIds[0], text: expect.any(String) }),
    ]);
  });

  it("a BRoscar winner of a complete night can save one, normalised", async () => {
    const { eventId, start } = await coWinnerNight();
    await start();
    await finishNight();
    await store.actions.saveSpeech(eventId, "u_alex", "  Thank   you,\nDuo!  ");
    expect(speechesFor(eventId)).toEqual([
      { eventId, userId: "u_alex", text: "Thank you, Duo!", createdAt: expect.any(Number) },
    ]);
  });

  it("is a no-op for a non-winner", async () => {
    const champ = db().events.find((e) => e.id === "e_past")!.broscarUserIds;
    const loser = db().groups[0].memberIds.find((id) => !champ.includes(id))!;
    const before = store.getSnapshot();
    await store.actions.saveSpeech("e_past", loser, "I'd like to thank the academy");
    expect(store.getSnapshot()).toBe(before);
  });

  it("is a no-op on an upcoming or live night, or an unknown one", async () => {
    const { eventId, start } = await coWinnerNight();
    const before = store.getSnapshot();
    await store.actions.saveSpeech(eventId, "u_alex", "too early");
    await store.actions.saveSpeech("e_nope", "u_alex", "who?");
    expect(store.getSnapshot()).toBe(before);

    await start();
    const liveBefore = store.getSnapshot();
    await store.actions.saveSpeech(eventId, "u_alex", "still too early");
    expect(store.getSnapshot()).toBe(liveBefore);
  });

  it("rejects blank and too-long text", async () => {
    const champ = db().events.find((e) => e.id === "e_past")!.broscarUserIds[0];
    const before = store.getSnapshot();
    await store.actions.saveSpeech("e_past", champ, "   ");
    await store.actions.saveSpeech("e_past", champ, "a".repeat(141));
    expect(store.getSnapshot()).toBe(before);
  });

  it("a re-save replaces the winner's speech", async () => {
    const champ = db().events.find((e) => e.id === "e_past")!.broscarUserIds[0];
    await store.actions.saveSpeech("e_past", champ, "First take");
    await store.actions.saveSpeech("e_past", champ, "Second take");
    expect(speechesFor("e_past").map((s) => [s.userId, s.text])).toEqual([[champ, "Second take"]]);
  });

  it("co-winners each get their own", async () => {
    const { eventId, start } = await coWinnerNight();
    await start();
    await finishNight();
    expect(db().events.find((e) => e.id === eventId)!.broscarUserIds.sort()).toEqual(["u_alex", "u_bella"]);

    await store.actions.saveSpeech(eventId, "u_bella", "Bella's speech");
    await store.actions.saveSpeech(eventId, "u_alex", "Alex's speech");
    await store.actions.saveSpeech(eventId, "u_bella", "Bella's better speech");
    expect(speechesFor(eventId).map((s) => [s.userId, s.text]).sort()).toEqual([
      ["u_alex", "Alex's speech"],
      ["u_bella", "Bella's better speech"],
    ]);
  });

  it("a night with no BRoscar takes no speech", async () => {
    const promptIds = db().prompts.slice(0, 1).map((p) => p.id);
    const eventId = await store.actions.createEvent("g_crew", "u_alex", "Empty", promptIds, Date.now());
    await store.actions.startLiveEvent(eventId);
    await finishNight();
    expect(store.broscarUserIds(db(), eventId)).toEqual([]);
    const before = store.getSnapshot();
    await store.actions.saveSpeech(eventId, "u_alex", "Nobody won");
    expect(store.getSnapshot()).toBe(before);
  });
});
