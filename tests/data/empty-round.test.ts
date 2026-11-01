import { describe, it, expect, beforeEach, vi } from "vitest";

let store: typeof import("@/lib/data/store");

beforeEach(async () => {
  vi.resetModules();
  store = await import("@/lib/data/store");
});

const live = () => store.getSnapshot().live;
const db = () => store.getSnapshot().db;

// A fresh event in the seed group with `n` rounds and no submissions yet.
async function emptyEvent(n: number) {
  const group = db().groups[0];
  const promptIds = db().prompts.slice(0, n).map((p) => p.id);
  const eventId = await store.actions.createEvent(group.id, group.memberIds[0], "Empty Night", promptIds, Date.now());
  const roundIds = db().events.find((e) => e.id === eventId)!.roundIds;
  return { group, eventId, roundIds };
}

describe("advance with a round that has no submissions", () => {
  it("an empty first round goes intro -> results -> next round intro", async () => {
    const { eventId } = await emptyEvent(2);
    await store.actions.startLiveEvent(eventId);
    expect(live().phase).toBe("round-intro");

    await store.actions.advance();
    expect(live().phase).toBe("round-results");
    expect(live().roundIndex).toBe(0);
    expect(live().videoStartedAt).toBeNull();
    expect(live().revealedRoundIndex).toBeNull();

    await store.actions.markRoundRevealed(eventId);
    expect(live().revealedRoundIndex).toBe(0);

    await store.actions.advance();
    expect(live().phase).toBe("round-intro");
    expect(live().roundIndex).toBe(1);
  });

  it("an empty last round goes results -> broscar -> finalized, with no winners", async () => {
    const { group, eventId, roundIds } = await emptyEvent(2);
    // Round 1 gets an entry; round 2 stays empty.
    await store.actions.submitVideo(roundIds[0], group.memberIds[1], "Only entry");
    await store.actions.startLiveEvent(eventId);

    let guard = 0;
    while (live().roundIndex < 1 && guard++ < 50) {
      if (live().phase === "playing") await store.actions.castBotRatings();
      await store.actions.advance();
    }
    expect(live().phase).toBe("round-intro");
    expect(live().roundIndex).toBe(1);

    await store.actions.advance();
    expect(live().phase).toBe("round-results");
    await store.actions.advance();
    expect(live().phase).toBe("broscar");
    await store.actions.advance();
    expect(live().phase).toBe("idle");

    const ev = db().events.find((e) => e.id === eventId)!;
    expect(ev.status).toBe("complete");
    const emptyRound = db().rounds.find((r) => r.id === roundIds[1])!;
    expect(emptyRound.winnerUserIds).toEqual([]);
    const firstRound = db().rounds.find((r) => r.id === roundIds[0])!;
    expect(firstRound.winnerUserIds).toEqual([group.memberIds[1]]);
  });

  it("a round with submissions still goes intro -> playing", async () => {
    const { group, eventId, roundIds } = await emptyEvent(1);
    await store.actions.submitVideo(roundIds[0], group.memberIds[1], "Entry");
    await store.actions.startLiveEvent(eventId);
    await store.actions.advance();
    expect(live().phase).toBe("playing");
    expect(live().submissionIndex).toBe(0);
    expect(live().videoStartedAt).not.toBeNull();
  });
});
