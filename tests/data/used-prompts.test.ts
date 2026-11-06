import { describe, it, expect, beforeEach, vi } from "vitest";
import { usedPrompts } from "@/lib/data/used-prompts";
import { surprisePicks } from "@/lib/domain/surprise-picks";
import type { Database, Event, Round } from "@/lib/data/types";

let store: typeof import("@/lib/data/store");

beforeEach(async () => {
  vi.resetModules();
  store = await import("@/lib/data/store");
});

const seededPrompts = (db: Database, eventId: string) => {
  const ev = db.events.find((e) => e.id === eventId)!;
  return ev.roundIds.map((rid) => db.rounds.find((r) => r.id === rid)!.promptId);
};

// Adds one night with the given prompts straight to the DB shape.
const withNight = (
  db: Database,
  id: string,
  groupId: string,
  date: number,
  status: Event["status"],
  promptIds: string[]
): Database => {
  const rounds: Round[] = promptIds.map((promptId, i) => ({
    id: `r_${id}_${i}`,
    eventId: id,
    promptId,
    themeId: db.prompts.find((p) => p.id === promptId)!.themeId,
    roundOrder: i,
    winnerUserIds: [],
  }));
  const event: Event = {
    id,
    groupId,
    title: id,
    date,
    deadline: date,
    status,
    hostId: "u_alex",
    roundIds: rounds.map((r) => r.id),
    broscarUserIds: [],
  };
  return { ...db, events: [...db.events, event], rounds: [...db.rounds, ...rounds] };
};

describe("usedPrompts", () => {
  it("marks a complete night as played and an upcoming one as not", () => {
    const { db } = store.getSnapshot();
    const used = usedPrompts(db, "g_crew");
    const past = db.events.find((e) => e.id === "e_past")!;
    const pre = db.events.find((e) => e.id === "e_pre")!;
    for (const pid of seededPrompts(db, "e_past")) expect(used[pid]).toEqual({ date: past.date, played: true });
    for (const pid of seededPrompts(db, "e_pre")) expect(used[pid]).toEqual({ date: pre.date, played: false });
  });

  it("covers every status: exactly the prompts on the group's nights", () => {
    const { db } = store.getSnapshot();
    const expected = db.events.flatMap((e) => seededPrompts(db, e.id));
    expect(Object.keys(usedPrompts(db, "g_crew")).sort()).toEqual([...new Set(expected)].sort());

    const liveNow = { ...db, events: db.events.map((e) => (e.id === "e_live" ? { ...e, status: "live" as const } : e)) };
    const [pid] = seededPrompts(db, "e_live");
    expect(usedPrompts(liveNow, "g_crew")[pid].played).toBe(false);
  });

  it("only counts this group's nights", async () => {
    const groupId = await store.actions.createGroup("u_alex", "Second Crew");
    const { db } = store.getSnapshot();
    const fresh = db.prompts.find((p) => !usedPrompts(db, "g_crew")[p.id])!;
    const next = withNight(db, "e_other", groupId, 1000, "complete", [fresh.id]);

    expect(usedPrompts(next, "g_crew")[fresh.id]).toBeUndefined();
    expect(usedPrompts(next, groupId)).toEqual({ [fresh.id]: { date: 1000, played: true } });
  });

  it("the latest night wins, whichever order the events are in", () => {
    const { db } = store.getSnapshot();
    const pid = db.prompts.find((p) => !usedPrompts(db, "g_crew")[p.id])!.id;
    const both = withNight(withNight(db, "e_old", "g_crew", 1000, "complete", [pid]), "e_new", "g_crew", 2000, "upcoming", [pid]);

    expect(usedPrompts(both, "g_crew")[pid]).toEqual({ date: 2000, played: false });
    const reversed = { ...both, events: [...both.events].reverse() };
    expect(usedPrompts(reversed, "g_crew")[pid]).toEqual({ date: 2000, played: false });
  });

  it("a new group has no used prompts", async () => {
    const groupId = await store.actions.createGroup("u_alex", "Second Crew");
    expect(usedPrompts(store.getSnapshot().db, groupId)).toEqual({});
  });

  it("Surprise me avoids every prompt on the seeded nights", () => {
    const { db } = store.getSnapshot();
    const used = new Set(Object.keys(usedPrompts(db, "g_crew")));
    expect(used.size).toBeGreaterThan(0);
    for (const seed of ["a", "b", "c", "d", "e"]) {
      const picks = Object.values(surprisePicks(db.themes, seed, 6, used));
      expect(picks).toHaveLength(6);
      expect(picks.filter((p) => used.has(p))).toEqual([]);
    }
  });
});
