import { describe, it, expect, beforeEach, vi } from "vitest";
import { computeHallOfFame } from "@/lib/domain/hall-of-fame";
import { completedEventInputs } from "@/lib/data/event-inputs";

// getGroupHallOfFame lives inside the React provider; feed it the same inputs via
// the real completedEventInputs helper and check the numbers by hand against e_past.
let store: typeof import("@/lib/data/store");

beforeEach(async () => {
  vi.resetModules();
  store = await import("@/lib/data/store");
});

describe("seeded group Hall of Fame", () => {
  it("g_crew totals = hand counts from e_past, no careerBaseline, sorted by the domain rule", () => {
    const { db } = store.getSnapshot();
    const memberIds = db.groups.find((g) => g.id === "g_crew")!.memberIds;
    const completed = db.events.filter((e) => e.groupId === "g_crew" && e.status === "complete");
    expect(completed.map((e) => e.id)).toEqual(["e_past"]);

    const events = completedEventInputs(db, "g_crew");
    expect(events).toHaveLength(completed.length);
    const rows = computeHallOfFame(memberIds, events);

    // one row per member
    expect(rows).toHaveLength(memberIds.length);
    expect([...rows.map((r) => r.userId)].sort()).toEqual([...memberIds].sort());

    // hand counts from e_past, independent of upvotesByUserFrom
    const past = completed[0];
    const pastRounds = db.rounds.filter((r) => past.roundIds.includes(r.id));
    const pastSubs = db.submissions.filter((s) => past.roundIds.includes(s.roundId));
    const pastUpvotes = db.ratings.filter((r) => past.roundIds.includes(r.roundId) && r.value === 1);
    for (const row of rows) {
      const ownSubIds = new Set(pastSubs.filter((s) => s.userId === row.userId).map((s) => s.id));
      expect(row).toMatchObject({
        crowns: pastRounds.filter((r) => r.winnerUserIds.includes(row.userId)).length,
        broscars: past.broscarUserIds.includes(row.userId) ? 1 : 0,
        upvotes: pastUpvotes.filter((r) => ownSubIds.has(r.submissionId)).length,
      });
    }
    // the seed is non-trivial: someone won crowns, a BRoscar was awarded, upvotes were cast
    expect(rows.reduce((n, r) => n + r.crowns, 0)).toBeGreaterThanOrEqual(pastRounds.length);
    expect(rows.reduce((n, r) => n + r.broscars, 0)).toBeGreaterThan(0);
    expect(rows.reduce((n, r) => n + r.upvotes, 0)).toBe(pastUpvotes.length);

    // no careerBaseline added (alex has a non-zero baseline in the seed)
    const alex = db.users.find((u) => u.id === "u_alex")!;
    const alexRow = rows.find((r) => r.userId === "u_alex")!;
    expect(alex.careerBaseline.crowns + alex.careerBaseline.upvotes).toBeGreaterThan(0);
    expect(alexRow.upvotes).toBe(pastUpvotes.filter((r) => pastSubs.some((s) => s.id === r.submissionId && s.userId === "u_alex")).length);

    // order: crowns desc, then BRoscars desc, then upvotes desc, then memberIds order
    for (let i = 1; i < rows.length; i++) {
      const a = rows[i - 1];
      const b = rows[i];
      const cmp =
        b.crowns - a.crowns ||
        b.broscars - a.broscars ||
        b.upvotes - a.upvotes ||
        memberIds.indexOf(a.userId) - memberIds.indexOf(b.userId);
      expect(cmp).toBeLessThan(0);
    }
    expect(rows[0].rank).toBe(1);
  });
});
