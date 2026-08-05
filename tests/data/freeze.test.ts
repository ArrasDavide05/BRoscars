import { describe, it, expect, beforeEach, vi } from "vitest";
import { computeRoundWinnerUserIds } from "@/lib/domain/standings";

// The app-side analog of the schema's append-only / write-only-when-complete
// triggers: once an event is finalized its winners/champions are frozen on the
// rows and must not change when later ratings are attempted.
let store: typeof import("@/lib/data/store");

beforeEach(async () => {
  vi.resetModules();
  store = await import("@/lib/data/store");
});

const snap = () => store.getSnapshot();
const live = () => snap().live;
const event = (id: string) => snap().db.events.find((e) => e.id === id)!;
const roundsOf = (eventId: string) => snap().db.rounds.filter((r) => r.eventId === eventId);

async function finalizeLive() {
  await store.actions.startLiveEvent("e_live");
  let guard = 0;
  while (live().phase !== "idle" && guard++ < 500) {
    if (live().phase === "playing") await store.actions.castBotRatings();
    await store.actions.advance();
  }
}

describe("finalize freeze", () => {
  it("freezes round winners and the Broscar when the event completes", async () => {
    await finalizeLive();
    const ev = event("e_live");
    expect(ev.status).toBe("complete");
    expect(ev.broscarUserIds.length).toBeGreaterThan(0);
    for (const r of roundsOf("e_live")) expect(r.winnerUserIds.length).toBeGreaterThan(0);
  });
});

describe("post-completion immutability (seeded complete event e_past)", () => {
  it("keeps frozen Broscar and round winners stable when a rating is re-attempted", async () => {
    const broscarBefore = [...event("e_past").broscarUserIds];
    const round = roundsOf("e_past")[0];
    const winnersBefore = [...round.winnerUserIds];
    expect(broscarBefore.length).toBeGreaterThan(0);
    expect(winnersBefore.length).toBeGreaterThan(0);

    // Every non-owner already rated every past submission in the seed, so this
    // is a dedupe no-op — you cannot inject a new rating into a closed event.
    await store.actions.castRating("r_e_past_1", "s_r_e_past_1_u_dana", "u_alex", -1);
    // An unrelated mutation elsewhere must not disturb the frozen results either.
    await store.actions.submitVideo("r_e_pre_1", "u_fiona", "late entry");

    expect(event("e_past").broscarUserIds).toEqual(broscarBefore);
    expect(roundsOf("e_past")[0].winnerUserIds).toEqual(winnersBefore);
  });
});

describe("non-frozen rounds recompute live", () => {
  it("an un-finalized round reflects current ratings", async () => {
    // r_e_live_1 has empty winnerUserIds in the seed (event not finalized).
    const round = snap().db.rounds.find((r) => r.id === "r_e_live_1")!;
    expect(round.winnerUserIds).toEqual([]);

    // Give u_bella's entry a clear lead.
    await store.actions.castRating("r_e_live_1", "s_r_e_live_1_u_bella", "u_alex", 1);
    await store.actions.castRating("r_e_live_1", "s_r_e_live_1_u_bella", "u_chris", 1);

    const db = snap().db;
    const winners = computeRoundWinnerUserIds(
      store.roundSubmissions(db, "r_e_live_1"),
      db.ratings.filter((rt) => rt.roundId === "r_e_live_1")
    );
    expect(winners).toEqual(["u_bella"]);
  });
});
