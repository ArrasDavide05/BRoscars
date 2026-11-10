import { describe, it, expect, beforeEach, vi } from "vitest";
import { whoCalledIt } from "@/lib/domain/predictions";

// The store is a module-level singleton seeded at import. Reset modules and
// re-import before each test so every case starts from a fresh seed.
let store: typeof import("@/lib/data/store");

beforeEach(async () => {
  vi.resetModules();
  vi.useRealTimers();
  store = await import("@/lib/data/store");
});

const db = () => store.getSnapshot().db;
const picksFor = (eventId: string) => db().predictions.filter((p) => p.eventId === eventId);

// Alex's solo group with an upcoming night: Bella is not a member there.
async function soloNight() {
  const groupId = await store.actions.createGroup("u_alex", "Solo");
  const promptIds = db().prompts.slice(0, 1).map((p) => p.id);
  return store.actions.createEvent(groupId, "u_alex", "Solo Night", promptIds, Date.now());
}

describe("predictBroscar", () => {
  it("a member can pick anyone in the group, including themselves", async () => {
    await store.actions.predictBroscar("e_pre", "u_alex", "u_alex");
    await store.actions.predictBroscar("e_pre", "u_dana", "u_fiona");
    expect(picksFor("e_pre")).toEqual(
      expect.arrayContaining([
        { eventId: "e_pre", userId: "u_alex", pickedUserId: "u_alex" },
        { eventId: "e_pre", userId: "u_dana", pickedUserId: "u_fiona" },
      ])
    );
  });

  it("a pick can be changed; it replaces, not adds", async () => {
    await store.actions.predictBroscar("e_pre", "u_alex", "u_chris");
    await store.actions.predictBroscar("e_pre", "u_alex", "u_dana");
    expect(picksFor("e_pre").filter((p) => p.userId === "u_alex")).toEqual([
      { eventId: "e_pre", userId: "u_alex", pickedUserId: "u_dana" },
    ]);
  });

  it("rejects a non-member picker and a non-member pick", async () => {
    const eventId = await soloNight();
    const before = store.getSnapshot();
    await store.actions.predictBroscar(eventId, "u_bella", "u_alex");
    await store.actions.predictBroscar(eventId, "u_alex", "u_bella");
    await store.actions.predictBroscar("e_pre", "u_alex", "u_nobody");
    await store.actions.predictBroscar("e_nope", "u_alex", "u_alex");
    expect(store.getSnapshot()).toBe(before);
  });

  it("locks once the night is live or complete", async () => {
    await store.actions.startLiveEvent("e_live");
    const before = store.getSnapshot();
    await store.actions.predictBroscar("e_live", "u_alex", "u_bella");
    await store.actions.predictBroscar("e_past", "u_alex", "u_bella");
    expect(store.getSnapshot()).toBe(before);
  });

  it("the seed has one hidden pick on e_pre, not by the default viewer", () => {
    expect(picksFor("e_pre")).toHaveLength(1);
    expect(picksFor("e_pre")[0].userId).not.toBe("u_alex");
  });

  it("the seed's past night has a right and a wrong pick", () => {
    const champs = store.broscarUserIds(db(), "e_past");
    const picks = picksFor("e_past");
    const called = whoCalledIt(picks, champs);
    expect(called).toEqual(["u_dana"]);
    expect(picks.length).toBeGreaterThan(called.length);
  });
});
