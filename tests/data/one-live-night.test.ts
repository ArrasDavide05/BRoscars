import { describe, it, expect, beforeEach, vi } from "vitest";

// The store is a module-level singleton seeded at import. Reset modules and
// re-import before each test so every case starts from a fresh seed.
let store: typeof import("@/lib/data/store");

beforeEach(async () => {
  vi.resetModules();
  store = await import("@/lib/data/store");
});

const db = () => store.getSnapshot().db;
const live = () => store.getSnapshot().live;
const status = (id: string) => db().events.find((e) => e.id === id)?.status;

async function playToEnd(eventId: string) {
  let guard = 0;
  while (live().eventId === eventId && guard++ < 500) {
    if (live().phase === "playing") await store.actions.castBotRatings();
    await store.actions.advance();
  }
}

describe("only one night can be live", () => {
  it("starting a second night changes nothing", async () => {
    await store.actions.startLiveEvent("e_live");
    await store.actions.advance();
    const before = store.getSnapshot();

    await store.actions.startLiveEvent("e_pre");

    expect(store.getSnapshot()).toBe(before);
    expect(live().eventId).toBe("e_live");
    expect(status("e_live")).toBe("live");
    expect(status("e_pre")).toBe("upcoming");
  });

  it("starting the night already live doesn't restart it", async () => {
    await store.actions.startLiveEvent("e_live");
    await store.actions.advance();
    await store.actions.advance();
    const before = live();
    expect(before.phase).not.toBe("round-intro");

    await store.actions.startLiveEvent("e_live");

    expect(live()).toEqual(before);
  });

  it("a complete night can't be started again", async () => {
    const past = db().events.find((e) => e.status === "complete")!;
    const before = store.getSnapshot();

    await store.actions.startLiveEvent(past.id);

    expect(store.getSnapshot()).toBe(before);
    expect(status(past.id)).toBe("complete");
    expect(live().eventId).toBeNull();
  });

  it("an unknown event is a no-op", async () => {
    const before = store.getSnapshot();

    await store.actions.startLiveEvent("e_nope");

    expect(store.getSnapshot()).toBe(before);
  });

  it("the next night can start once the first has finished", async () => {
    await store.actions.startLiveEvent("e_live");
    await playToEnd("e_live");
    expect(status("e_live")).toBe("complete");
    expect(live().eventId).toBeNull();

    await store.actions.startLiveEvent("e_pre");

    expect(status("e_pre")).toBe("live");
    expect(live()).toMatchObject({ eventId: "e_pre", phase: "round-intro", roundIndex: 0 });
  });

  it("a finished night can't be restarted by a late press", async () => {
    await store.actions.startLiveEvent("e_live");
    await playToEnd("e_live");
    const before = store.getSnapshot();

    await store.actions.startLiveEvent("e_live");

    expect(store.getSnapshot()).toBe(before);
  });
});
