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
const mine = (submissionId: string, userId: string) =>
  db().reactions.filter((r) => r.submissionId === submissionId && r.userId === userId);

// A winning clip on the complete night, plus a member who didn't post it.
function pastWinner() {
  const round = db().rounds.find((r) => r.id === "r_e_past_3")!;
  const uploader = round.winnerUserIds[0];
  const sub = db().submissions.find((s) => s.roundId === round.id && s.userId === uploader)!;
  const reactor = db().groups[0].memberIds.find((id) => id !== uploader)!;
  return { sub, uploader, reactor };
}

describe("reactToSubmission", () => {
  it("sets, replaces and clears a member's reaction on a complete night's clip", async () => {
    const { sub, reactor } = pastWinner();
    await store.actions.reactToSubmission(reactor, sub.id, "😂");
    expect(mine(sub.id, reactor)).toEqual([{ submissionId: sub.id, userId: reactor, emoji: "😂" }]);
    await store.actions.reactToSubmission(reactor, sub.id, "💀");
    expect(mine(sub.id, reactor)).toEqual([{ submissionId: sub.id, userId: reactor, emoji: "💀" }]);
    await store.actions.reactToSubmission(reactor, sub.id, "💀");
    expect(mine(sub.id, reactor)).toEqual([]);
  });

  it("is a no-op on a night that isn't complete", async () => {
    const sub = db().submissions.find((s) => s.roundId.startsWith("r_e_pre_"))!;
    const reactor = db().groups[0].memberIds.find((id) => id !== sub.userId)!;
    const before = store.getSnapshot();
    await store.actions.reactToSubmission(reactor, sub.id, "🔥");
    expect(store.getSnapshot()).toBe(before);
  });

  it("is a no-op for a non-member", async () => {
    const { sub } = pastWinner();
    const before = store.getSnapshot();
    await store.actions.reactToSubmission("u_stranger", sub.id, "🔥");
    expect(store.getSnapshot()).toBe(before);
  });

  it("is a no-op on your own clip", async () => {
    const { sub, uploader } = pastWinner();
    const before = store.getSnapshot();
    await store.actions.reactToSubmission(uploader, sub.id, "🔥");
    expect(store.getSnapshot()).toBe(before);
  });

  it("is a no-op for an emoji outside the set or an unknown clip", async () => {
    const { sub, reactor } = pastWinner();
    const before = store.getSnapshot();
    await store.actions.reactToSubmission(reactor, sub.id, "👍");
    await store.actions.reactToSubmission(reactor, "s_nope", "🔥");
    expect(store.getSnapshot()).toBe(before);
  });

  it("does not touch ratings or the frozen results", async () => {
    const { sub, reactor } = pastWinner();
    const { ratings, rounds, events } = db();
    await store.actions.reactToSubmission(reactor, sub.id, "👏");
    expect(db().ratings).toBe(ratings);
    expect(db().rounds).toBe(rounds);
    expect(db().events).toBe(events);
  });
});
