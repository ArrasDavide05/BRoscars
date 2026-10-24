import { describe, it, expect } from "vitest";
import { submissionProgress, missingCount } from "@/lib/domain/submission-progress";

const members = ["a", "b", "c"];
const rounds = ["r1", "r2", "r3"];

describe("submissionProgress", () => {
  it("reports zero for everyone when nothing is submitted", () => {
    const p = submissionProgress(members, rounds, []);
    expect(p).toEqual([
      { userId: "a", submitted: 0, total: 3, complete: false },
      { userId: "b", submitted: 0, total: 3, complete: false },
      { userId: "c", submitted: 0, total: 3, complete: false },
    ]);
    expect(missingCount(p)).toBe(3);
  });

  it("counts partial and complete progress in memberIds order", () => {
    const subs = [
      { roundId: "r1", userId: "b" },
      { roundId: "r1", userId: "a" },
      { roundId: "r2", userId: "a" },
      { roundId: "r3", userId: "a" },
    ];
    const p = submissionProgress(members, rounds, subs);
    expect(p.map((x) => [x.userId, x.submitted, x.complete])).toEqual([
      ["a", 3, true],
      ["b", 1, false],
      ["c", 0, false],
    ]);
    expect(missingCount(p)).toBe(2);
  });

  it("ignores submissions to rounds of other events", () => {
    const p = submissionProgress(["a"], rounds, [
      { roundId: "r1", userId: "a" },
      { roundId: "other", userId: "a" },
    ]);
    expect(p[0]).toEqual({ userId: "a", submitted: 1, total: 3, complete: false });
  });

  it("does not double-count duplicate rows for the same user and round", () => {
    const p = submissionProgress(["a"], ["r1", "r2"], [
      { roundId: "r1", userId: "a" },
      { roundId: "r1", userId: "a" },
    ]);
    expect(p[0].submitted).toBe(1);
    expect(p[0].complete).toBe(false);
  });

  it("ignores submissions from non-members", () => {
    const p = submissionProgress(["a"], rounds, [{ roundId: "r1", userId: "zz" }]);
    expect(p).toEqual([{ userId: "a", submitted: 0, total: 3, complete: false }]);
  });

  it("treats a 0-round event as complete for everyone", () => {
    const p = submissionProgress(members, [], [{ roundId: "r1", userId: "a" }]);
    expect(p.every((x) => x.total === 0 && x.submitted === 0 && x.complete)).toBe(true);
    expect(missingCount(p)).toBe(0);
  });
});
