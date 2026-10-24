import { describe, it, expect, beforeEach, vi } from "vitest";
import { buildTrophies, type TrophyEventInput } from "@/lib/domain/trophies";

// The store is a module-level singleton seeded at import. Reset modules and
// re-import before each test so every case starts from a fresh seed.
let store: typeof import("@/lib/data/store");

beforeEach(async () => {
  vi.resetModules();
  store = await import("@/lib/data/store");
});

const db = () => store.getSnapshot().db;
const live = () => store.getSnapshot().live;
const event = (id: string) => db().events.find((e) => e.id === id)!;
const user = (id: string) => db().users.find((u) => u.id === id)!;
const roundsOf = (eventId: string) =>
  event(eventId).roundIds.map((rid) => db().rounds.find((r) => r.id === rid)!);

const DAY = 24 * 60 * 60 * 1000;
const DEADLINE = Date.UTC(2026, 10, 1);
// One prompt from each of three different themes, deliberately out of theme order.
const PROMPTS = ["p_3_2", "p_1_1", "p_7_3"];

const create = (title = "Test Night", promptIds = PROMPTS) =>
  store.actions.createEvent("g_crew", "u_bella", title, promptIds, DEADLINE);

describe("createEvent", () => {
  it("returns the id of a new upcoming event in the group", async () => {
    const before = db().events.length;
    const id = await create();
    expect(db().events).toHaveLength(before + 1);
    const ev = event(id);
    expect(ev).toMatchObject({ groupId: "g_crew", hostId: "u_bella", status: "upcoming", broscarUserIds: [] });
    expect(db().events.filter((e) => e.groupId === "g_crew").map((e) => e.id)).toContain(id);
  });

  it("mints a distinct id per call", async () => {
    const a = await create();
    const b = await create();
    expect(a).not.toBe(b);
  });

  it("creates rounds in promptIds order with roundOrder 0..n-1 and the prompt's theme", async () => {
    const id = await create();
    const rounds = roundsOf(id);
    expect(rounds.map((r) => r.promptId)).toEqual(PROMPTS);
    expect(rounds.map((r) => r.roundOrder)).toEqual([0, 1, 2]);
    expect(rounds.map((r) => r.themeId)).toEqual(["t_3", "t_1", "t_7"]);
    for (const r of rounds) {
      expect(r.eventId).toBe(id);
      expect(r.winnerUserIds).toEqual([]);
      const prompt = db().prompts.find((p) => p.id === r.promptId)!;
      expect(r.themeId).toBe(prompt.themeId);
    }
  });

  it("trims the title", async () => {
    const id = await create("  Halloween Bash  ");
    expect(event(id).title).toBe("Halloween Bash");
  });

  it("falls back to 'Untitled Night' for a blank title", async () => {
    const id = await create("   ");
    expect(event(id).title).toBe("Untitled Night");
  });

  it("stores the deadline and schedules the night after it", async () => {
    const id = await create();
    expect(event(id).deadline).toBe(DEADLINE);
    expect(event(id).date).toBeGreaterThan(DEADLINE);
    expect(event(id).date).toBe(DEADLINE + DAY);
  });

  it("allows an event with zero rounds", async () => {
    const id = await create("Empty", []);
    expect(event(id).roundIds).toEqual([]);
  });

  // Current behavior (debatable): an unknown prompt still creates a round, with an empty themeId.
  it("keeps a round for an unknown promptId with themeId ''", async () => {
    const id = await create("Odd", ["p_nope"]);
    const [r] = roundsOf(id);
    expect(r.promptId).toBe("p_nope");
    expect(r.themeId).toBe("");
  });

  it("leaves existing events and rounds untouched", async () => {
    const eventsBefore = db().events;
    const roundsBefore = db().rounds;
    await create();
    expect(db().events.slice(0, eventsBefore.length)).toEqual(eventsBefore);
    expect(db().rounds.slice(0, roundsBefore.length)).toEqual(roundsBefore);
  });

  it("accepts submissions to the new rounds (duplicates ignored, blank caption -> 'My entry')", async () => {
    const id = await create();
    const [r] = roundsOf(id);
    await store.actions.submitVideo(r.id, "u_dana", "  ");
    await store.actions.submitVideo(r.id, "u_dana", "second try");
    const rows = db().submissions.filter((s) => s.roundId === r.id);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ userId: "u_dana", caption: "My entry" });
  });
});

describe("updateProfile", () => {
  it("trims the name and recomputes initials", async () => {
    await store.actions.updateProfile("u_alex", { name: "  Sam Lee  " });
    expect(user("u_alex")).toMatchObject({ name: "Sam Lee", initials: "SL" });
  });

  it("uses at most the first two words for initials", async () => {
    await store.actions.updateProfile("u_alex", { name: "mary jane   watson" });
    expect(user("u_alex").initials).toBe("MJ");
  });

  it("uses a single initial for a one-word name", async () => {
    await store.actions.updateProfile("u_alex", { name: "zed" });
    expect(user("u_alex")).toMatchObject({ name: "zed", initials: "Z" });
  });

  it("keeps the old name and initials for a blank name", async () => {
    await store.actions.updateProfile("u_alex", { name: "   " });
    expect(user("u_alex")).toMatchObject({ name: "Alex Rivera", initials: "AR" });
  });

  it("an avatarColor-only patch leaves the name alone", async () => {
    await store.actions.updateProfile("u_alex", { avatarColor: "#123456" });
    expect(user("u_alex")).toMatchObject({ name: "Alex Rivera", initials: "AR", avatarColor: "#123456" });
  });

  it("a name-only patch keeps the avatar color and career baseline", async () => {
    const before = user("u_alex");
    await store.actions.updateProfile("u_alex", { name: "Sam Lee" });
    expect(user("u_alex").avatarColor).toBe(before.avatarColor);
    expect(user("u_alex").careerBaseline).toEqual(before.careerBaseline);
  });

  it("leaves other users unchanged", async () => {
    const others = db().users.filter((u) => u.id !== "u_alex");
    await store.actions.updateProfile("u_alex", { name: "Sam Lee", avatarColor: "#123456" });
    expect(db().users.filter((u) => u.id !== "u_alex")).toEqual(others);
  });

  it("is a no-op for an unknown user", async () => {
    const before = db().users;
    await store.actions.updateProfile("u_nobody", { name: "Ghost" });
    expect(db().users).toEqual(before);
  });
});

describe("startLiveEvent", () => {
  it("marks the event live and resets the live state to round-intro", async () => {
    await store.actions.startLiveEvent("e_live");
    expect(event("e_live").status).toBe("live");
    expect(live()).toEqual({
      eventId: "e_live",
      phase: "round-intro",
      roundIndex: 0,
      submissionIndex: 0,
      videoStartedAt: null,
    });
  });

  it("leaves other events untouched", async () => {
    const others = db().events.filter((e) => e.id !== "e_live");
    await store.actions.startLiveEvent("e_live");
    expect(db().events.filter((e) => e.id !== "e_live")).toEqual(others);
  });

  it("can start a freshly created event", async () => {
    const id = await create();
    await store.actions.startLiveEvent(id);
    expect(event(id).status).toBe("live");
    expect(live().eventId).toBe(id);
  });
});

// getCareerStats lives inside the React provider (src/lib/data/index.tsx), so it
// can't be called without a renderer. Instead check the shared contract: only
// complete events count, and finishing a night adds its crowns/BRoscar exactly
// as buildTrophies (which mirrors getCareerStats) sees them.
describe("career contract after a night completes", () => {
  const trophyInput = (): TrophyEventInput[] =>
    db().events.map((e) => ({
      eventId: e.id,
      eventTitle: e.title,
      date: e.date,
      status: e.status,
      broscarUserIds: e.broscarUserIds,
      rounds: roundsOf(e.id).map((r) => ({
        roundId: r.id,
        themeName: "",
        promptText: "",
        winnerUserIds: r.winnerUserIds,
      })),
    }));

  async function playToCompletion(eventId: string) {
    await store.actions.startLiveEvent(eventId);
    let guard = 0;
    while (live().eventId === eventId && guard++ < 500) {
      if (live().phase === "playing") await store.actions.castBotRatings();
      await store.actions.advance();
    }
  }

  it("a live (not yet complete) event adds nothing", async () => {
    await store.actions.startLiveEvent("e_live");
    for (const u of db().users) {
      const t = buildTrophies(u.id, trophyInput());
      expect([...t.crowns, ...t.broscars].some((x) => x.eventId === "e_live")).toBe(false);
    }
  });

  it("completing the night credits every round winner and the BRoscar", async () => {
    await playToCompletion("e_live");
    expect(event("e_live").status).toBe("complete");
    const rounds = roundsOf("e_live");
    for (const u of db().users) {
      const t = buildTrophies(u.id, trophyInput());
      const liveCrowns = t.crowns.filter((c) => c.eventId === "e_live").length;
      expect(liveCrowns).toBe(rounds.filter((r) => r.winnerUserIds.includes(u.id)).length);
      const liveBroscars = t.broscars.filter((b) => b.eventId === "e_live").length;
      expect(liveBroscars).toBe(event("e_live").broscarUserIds.includes(u.id) ? 1 : 0);
    }
    expect(event("e_live").broscarUserIds.length).toBeGreaterThan(0);
  });
});
