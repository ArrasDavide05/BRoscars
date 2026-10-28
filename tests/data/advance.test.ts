import { describe, it, expect, beforeEach, vi } from "vitest";

let store: typeof import("@/lib/data/store");

beforeEach(async () => {
  vi.resetModules();
  store = await import("@/lib/data/store");
});

const live = () => store.getSnapshot().live;
const event = (id: string) => store.getSnapshot().db.events.find((e) => e.id === id)!;

// Drive the machine with bot ratings until it reaches `phase` (or gives up).
async function driveUntil(phase: string) {
  let guard = 0;
  while (live().phase !== phase && guard++ < 500) {
    if (live().phase === "playing") await store.actions.castBotRatings();
    await store.actions.advance();
  }
}

describe("advance state machine", () => {
  it("round-intro -> playing sets submissionIndex 0 and a start clock", async () => {
    await store.actions.startLiveEvent("e_live");
    await store.actions.advance();
    expect(live().phase).toBe("playing");
    expect(live().submissionIndex).toBe(0);
    expect(live().videoStartedAt).not.toBeNull();
  });

  it("playing advances the submission index", async () => {
    await store.actions.startLiveEvent("e_live");
    await store.actions.advance(); // -> playing idx 0
    await store.actions.advance(); // -> idx 1
    expect(live().phase).toBe("playing");
    expect(live().submissionIndex).toBe(1);
  });

  it("playing past the last submission -> round-results", async () => {
    await store.actions.startLiveEvent("e_live");
    let guard = 0;
    while (live().phase === "round-intro" || (live().phase === "playing")) {
      await store.actions.advance();
      if (guard++ > 50) break;
    }
    expect(live().phase).toBe("round-results");
  });

  it("round-results -> next round-intro increments the round index", async () => {
    await store.actions.startLiveEvent("e_live");
    await driveUntil("round-results");
    expect(live().roundIndex).toBe(0);
    await store.actions.advance();
    expect(live().phase).toBe("round-intro");
    expect(live().roundIndex).toBe(1);
  });

  it("last round-results -> broscar", async () => {
    await store.actions.startLiveEvent("e_live");
    await driveUntil("broscar");
    expect(live().phase).toBe("broscar");
  });

  it("broscar -> finalize + idle", async () => {
    await store.actions.startLiveEvent("e_live");
    await driveUntil("broscar");
    await store.actions.advance();
    expect(live()).toEqual({
      eventId: null,
      phase: "idle",
      roundIndex: 0,
      submissionIndex: 0,
      videoStartedAt: null,
      revealedRoundIndex: null,
    });
    expect(event("e_live").status).toBe("complete");
  });

  it("is a no-op with no live event", async () => {
    const before = store.getSnapshot();
    await store.actions.advance();
    expect(store.getSnapshot()).toEqual(before);
  });

  it("full walk finalizes the event with frozen winners and a Broscar", async () => {
    await store.actions.startLiveEvent("e_live");
    let guard = 0;
    while (live().phase !== "idle" && guard++ < 500) {
      if (live().phase === "playing") await store.actions.castBotRatings();
      await store.actions.advance();
    }
    const ev = event("e_live");
    expect(ev.status).toBe("complete");
    expect(ev.broscarUserIds.length).toBeGreaterThan(0);
    const liveRounds = store.getSnapshot().db.rounds.filter((r) => r.eventId === "e_live");
    expect(liveRounds).toHaveLength(6);
    for (const r of liveRounds) expect(r.winnerUserIds.length).toBeGreaterThan(0);
  });
});
