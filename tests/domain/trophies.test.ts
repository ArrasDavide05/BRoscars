import { describe, it, expect } from "vitest";
import { buildTrophies, type TrophyEventInput } from "@/lib/domain/trophies";

const round = (roundId: string, winnerUserIds: string[]) => ({
  roundId,
  themeName: `Theme ${roundId}`,
  promptText: `Prompt ${roundId}`,
  winnerUserIds,
});

const event = (over: Partial<TrophyEventInput> & { eventId: string }): TrophyEventInput => ({
  eventTitle: `Night ${over.eventId}`,
  date: 0,
  status: "complete",
  broscarUserIds: [],
  rounds: [],
  ...over,
});

describe("buildTrophies", () => {
  it("returns empty lists for no events", () => {
    expect(buildTrophies("u1", [])).toEqual({ crowns: [], broscars: [] });
  });

  it("lists a single round win and BRoscar", () => {
    const t = buildTrophies("u1", [
      event({ eventId: "e1", broscarUserIds: ["u1"], rounds: [round("r1", ["u1"]), round("r2", ["u2"])] }),
    ]);
    expect(t.crowns).toHaveLength(1);
    expect(t.crowns[0]).toMatchObject({ eventId: "e1", roundId: "r1", themeName: "Theme r1", promptText: "Prompt r1", shared: false });
    expect(t.broscars).toEqual([
      { eventId: "e1", eventTitle: "Night e1", date: 0, roundsWon: 1, roundCount: 2, shared: false },
    ]);
  });

  it("counts a tied round for each tied winner", () => {
    const events = [event({ eventId: "e1", rounds: [round("r1", ["u1", "u2"])] })];
    expect(buildTrophies("u1", events).crowns[0].shared).toBe(true);
    expect(buildTrophies("u2", events).crowns[0].shared).toBe(true);
    expect(buildTrophies("u3", events).crowns).toEqual([]);
  });

  it("ignores events that are not complete", () => {
    const t = buildTrophies("u1", [
      event({ eventId: "live", status: "live", broscarUserIds: ["u1"], rounds: [round("r1", ["u1"])] }),
      event({ eventId: "up", status: "upcoming", rounds: [round("r2", ["u1"])] }),
    ]);
    expect(t).toEqual({ crowns: [], broscars: [] });
  });

  it("orders newest event first, rounds in event order", () => {
    const t = buildTrophies("u1", [
      event({ eventId: "old", date: 100, broscarUserIds: ["u1"], rounds: [round("a1", ["u1"])] }),
      event({ eventId: "new", date: 200, broscarUserIds: ["u1"], rounds: [round("b1", ["u1"]), round("b2", ["u1"])] }),
    ]);
    expect(t.crowns.map((c) => c.roundId)).toEqual(["b1", "b2", "a1"]);
    expect(t.broscars.map((b) => b.eventId)).toEqual(["new", "old"]);
  });

  it("marks a shared BRoscar for each co-winner", () => {
    const events = [event({ eventId: "e1", broscarUserIds: ["u1", "u2"], rounds: [round("r1", ["u1"]), round("r2", ["u2"])] })];
    const a = buildTrophies("u1", events).broscars;
    const b = buildTrophies("u2", events).broscars;
    expect(a).toHaveLength(1);
    expect(b).toHaveLength(1);
    expect(a[0].shared && b[0].shared).toBe(true);
    expect(a[0].roundsWon).toBe(1);
  });
});
