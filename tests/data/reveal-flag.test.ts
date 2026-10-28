import { describe, it, expect, beforeEach, vi } from "vitest";

let store: typeof import("@/lib/data/store");

beforeEach(async () => {
  vi.resetModules();
  store = await import("@/lib/data/store");
});

const live = () => store.getSnapshot().live;

async function driveUntil(phase: string) {
  let guard = 0;
  while (live().phase !== phase && guard++ < 500) {
    if (live().phase === "playing") await store.actions.castBotRatings();
    await store.actions.advance();
  }
}

describe("revealedRoundIndex / markRoundRevealed", () => {
  it("is null in the initial state and after start", async () => {
    expect(live().revealedRoundIndex).toBeNull();
    await store.actions.startLiveEvent("e_live");
    expect(live().revealedRoundIndex).toBeNull();
  });

  it("is a no-op outside round-results", async () => {
    await store.actions.startLiveEvent("e_live");
    const before = store.getSnapshot();
    await store.actions.markRoundRevealed("e_live"); // round-intro
    expect(store.getSnapshot()).toBe(before);
    await store.actions.advance(); // -> playing
    await store.actions.markRoundRevealed("e_live");
    expect(live().phase).toBe("playing");
    expect(live().revealedRoundIndex).toBeNull();
  });

  it("is a no-op for another event", async () => {
    await store.actions.startLiveEvent("e_live");
    await driveUntil("round-results");
    await store.actions.markRoundRevealed("e_past");
    expect(live().revealedRoundIndex).toBeNull();
  });

  it("is a no-op when nothing is live", async () => {
    const before = store.getSnapshot();
    await store.actions.markRoundRevealed("e_live");
    expect(store.getSnapshot()).toBe(before);
  });

  it("is set to the current round in round-results", async () => {
    await store.actions.startLiveEvent("e_live");
    await driveUntil("round-results");
    await store.actions.markRoundRevealed("e_live");
    expect(live().phase).toBe("round-results");
    expect(live().revealedRoundIndex).toBe(live().roundIndex);
  });

  it("resets to null after advance() to the next round-intro", async () => {
    await store.actions.startLiveEvent("e_live");
    await driveUntil("round-results");
    await store.actions.markRoundRevealed("e_live");
    await store.actions.advance();
    expect(live().phase).toBe("round-intro");
    expect(live().roundIndex).toBe(1);
    expect(live().revealedRoundIndex).toBeNull();
  });

  it("resets to null when the last round moves on to the broscar", async () => {
    await store.actions.startLiveEvent("e_live");
    let guard = 0;
    while (guard++ < 500) {
      await driveUntil("round-results");
      await store.actions.markRoundRevealed("e_live");
      await store.actions.advance();
      if (live().phase === "broscar") break;
    }
    expect(live().phase).toBe("broscar");
    expect(live().revealedRoundIndex).toBeNull();
  });
});
