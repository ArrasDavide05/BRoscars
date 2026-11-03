import { describe, it, expect, beforeEach, vi } from "vitest";
import { nextUpInputs } from "@/lib/data/next-up-inputs";
import { computeNextUp } from "@/lib/domain/next-up";
import type { Database } from "@/lib/data/types";

let store: typeof import("@/lib/data/store");

beforeEach(async () => {
  vi.resetModules();
  store = await import("@/lib/data/store");
});

const owedByEvent = (db: Database, userId: string) =>
  Object.fromEntries(nextUpInputs(db, userId).map((i) => [i.eventId, i.clipsOwed]));

describe("nextUpInputs", () => {
  it("one input per seeded event, with its group's name", () => {
    const { db } = store.getSnapshot();
    const inputs = nextUpInputs(db, "u_alex");
    expect(inputs.map((i) => i.eventId)).toEqual(db.events.map((e) => e.id));
    expect(new Set(inputs.map((i) => i.groupName))).toEqual(new Set(["Friday Night Crew"]));
  });

  it("clipsOwed matches a hand count over the seed", () => {
    const { db } = store.getSnapshot();
    const pre = db.events.find((e) => e.id === "e_pre")!;
    expect(owedByEvent(db, "u_alex").e_pre).toBe(0);
    expect(owedByEvent(db, "u_alex").e_live).toBe(0);
    // Everyone outside the seeded submitters has nothing in for the pre-event yet.
    const nonSubmitter = db.groups[0].memberIds.find(
      (id) => !db.submissions.some((s) => s.userId === id && pre.roundIds.includes(s.roundId))
    )!;
    expect(owedByEvent(db, nonSubmitter).e_pre).toBe(pre.roundIds.length);
  });

  it("clipsOwed drops as the user submits, and only for that user", async () => {
    const { db } = store.getSnapshot();
    const pre = db.events.find((e) => e.id === "e_pre")!;
    const owing = db.groups[0].memberIds.filter(
      (id) => !db.submissions.some((s) => s.userId === id && pre.roundIds.includes(s.roundId))
    );
    const [me, other] = owing;
    await store.actions.submitVideo(pre.roundIds[0], me, "clip");
    const after = store.getSnapshot().db;
    expect(owedByEvent(after, me).e_pre).toBe(pre.roundIds.length - 1);
    expect(owedByEvent(after, other).e_pre).toBe(pre.roundIds.length);
  });

  it("leaves out groups the user isn't in", () => {
    const { db: seed } = store.getSnapshot();
    const db: Database = {
      ...seed,
      groups: [...seed.groups, { id: "g_other", name: "Other", inviteCode: "OTHR2026", createdBy: "u_zed", memberIds: ["u_zed"] }],
      events: [
        ...seed.events,
        { ...seed.events[0], id: "e_other", groupId: "g_other", status: "upcoming", roundIds: [], broscarUserIds: [] },
      ],
    };
    expect(nextUpInputs(db, "u_alex").map((i) => i.eventId)).not.toContain("e_other");
    expect(nextUpInputs(db, "u_zed").map((i) => i.eventId)).toEqual(["e_other"]);
    expect(nextUpInputs(db, "u_nobody")).toEqual([]);
  });

  it("feeds computeNextUp: a started night moves to the top as live", async () => {
    const before = computeNextUp(nextUpInputs(store.getSnapshot().db, "u_alex"));
    expect(before.map((i) => [i.eventId, i.status])).toEqual([
      ["e_live", "upcoming"],
      ["e_pre", "upcoming"],
    ]);
    await store.actions.startLiveEvent("e_pre");
    const after = computeNextUp(nextUpInputs(store.getSnapshot().db, "u_alex"));
    expect(after.map((i) => [i.eventId, i.status])).toEqual([
      ["e_pre", "live"],
      ["e_live", "upcoming"],
    ]);
  });
});
