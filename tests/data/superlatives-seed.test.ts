import { describe, it, expect } from "vitest";
import { getSnapshot, roundSubmissions } from "@/lib/data/store";
import { computeSuperlatives } from "@/lib/domain/superlatives";

describe("seeded past event superlatives", () => {
  it("e_past yields all three special awards", () => {
    const { db } = getSnapshot();
    const ev = db.events.find((e) => e.id === "e_past")!;
    const rounds = ev.roundIds.map((rid) => ({ roundId: rid, submissions: roundSubmissions(db, rid) }));
    const ratings = db.ratings.filter((r) => ev.roundIds.includes(r.roundId));
    const kinds = computeSuperlatives(rounds, ratings).map((s) => s.kind);
    expect(kinds).toEqual(["peoples-champion", "most-divisive", "robbed"]);
  });
});
