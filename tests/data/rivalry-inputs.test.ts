import { describe, it, expect, beforeEach, vi } from "vitest";
import { completedRivalryInputs } from "@/lib/data/rivalry-inputs";
import { computeRoundStandings } from "@/lib/domain/standings";
import { computeRivalries } from "@/lib/domain/rivalries";
import type { Database } from "@/lib/data/types";

let store: typeof import("@/lib/data/store");

beforeEach(async () => {
  vi.resetModules();
  store = await import("@/lib/data/store");
});

describe("completedRivalryInputs", () => {
  it("one input per round of the seeded past event only", () => {
    const { db } = store.getSnapshot();
    const past = db.events.find((e) => e.id === "e_past")!;
    const inputs = completedRivalryInputs(db, "u_alex");
    expect(inputs).toHaveLength(past.roundIds.length);
    past.roundIds.forEach((rid, i) => {
      const expected = computeRoundStandings(
        db.submissions.filter((s) => s.roundId === rid),
        db.ratings.filter((r) => r.roundId === rid)
      );
      expect(inputs[i].standings).toEqual(expected);
    });
  });

  it("u_alex's records match a hand count over the past event's round standings", () => {
    const { db } = store.getSnapshot();
    const past = db.events.find((e) => e.id === "e_past")!;
    const tally: Record<string, { wins: number; draws: number; losses: number }> = {};
    for (const rid of past.roundIds) {
      const st = computeRoundStandings(
        db.submissions.filter((s) => s.roundId === rid),
        db.ratings.filter((r) => r.roundId === rid)
      );
      const mine = st.find((s) => s.userId === "u_alex")!.rank;
      for (const s of st) {
        if (s.userId === "u_alex") continue;
        const t = (tally[s.userId] ??= { wins: 0, draws: 0, losses: 0 });
        if (mine < s.rank) t.wins++;
        else if (mine > s.rank) t.losses++;
        else t.draws++;
      }
    }
    const { rows } = computeRivalries("u_alex", completedRivalryInputs(db, "u_alex"));
    expect(rows).toHaveLength(5);
    for (const r of rows) {
      expect({ wins: r.wins, draws: r.draws, losses: r.losses }).toEqual(tally[r.rivalId]);
      expect(r.meetings).toBe(past.roundIds.length);
    }
  });

  it("a user in no group with finished events gets no inputs", () => {
    const { db: seed } = store.getSnapshot();
    const db: Database = {
      ...seed,
      groups: [...seed.groups, { id: "g_new", name: "New", inviteCode: "NEWW2026", createdBy: "u_zed", memberIds: ["u_zed"] }],
    };
    expect(completedRivalryInputs(db, "u_zed")).toEqual([]);
    expect(completedRivalryInputs(db, "u_nobody")).toEqual([]);
  });
});
