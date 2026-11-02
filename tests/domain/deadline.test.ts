import { describe, it, expect } from "vitest";
import { deadlineStatus } from "@/lib/domain/deadline";
import { deadlineFromDateInput } from "@/lib/domain/event-draft";

// Local-time "now": 2026-11-02 15:00. Deadlines use end of local day, like deadlineFromDateInput.
const NOW = new Date(2026, 10, 2, 15, 0).getTime();
const endOfDay = (d: number) => new Date(2026, 10, d, 23, 59, 59, 999).getTime();

describe("deadlineStatus", () => {
  it("counts several days left", () => {
    expect(deadlineStatus(endOfDay(7), NOW)).toEqual({ kind: "open", daysLeft: 5, label: "5 days left" });
  });

  it("uses 'days' for 2 days left", () => {
    expect(deadlineStatus(endOfDay(4), NOW).label).toBe("2 days left");
  });

  it("is due tomorrow exactly one calendar day out", () => {
    expect(deadlineStatus(endOfDay(3), NOW)).toEqual({ kind: "tomorrow", daysLeft: 1, label: "Due tomorrow" });
  });

  it("is due today in the morning", () => {
    const morning = new Date(2026, 10, 2, 8, 30).getTime();
    expect(deadlineStatus(endOfDay(2), morning)).toEqual({ kind: "today", daysLeft: 0, label: "Due today" });
  });

  it("is still due today one minute before the deadline", () => {
    const deadline = new Date(2026, 10, 2, 23, 59).getTime();
    const oneMinBefore = new Date(2026, 10, 2, 23, 58).getTime();
    expect(deadlineStatus(deadline, oneMinBefore).kind).toBe("today");
  });

  it("works with deadlines from the date input", () => {
    expect(deadlineStatus(deadlineFromDateInput("2026-11-02"), NOW).label).toBe("Due today");
  });

  it("has passed right after the deadline", () => {
    const deadline = new Date(2026, 10, 2, 14, 59).getTime();
    expect(deadlineStatus(deadline, NOW)).toEqual({ kind: "passed", daysLeft: 0, label: "Deadline passed" });
  });

  it("has passed long ago", () => {
    const s = deadlineStatus(new Date(2026, 9, 1, 23, 59).getTime(), NOW);
    expect(s.kind).toBe("passed");
    expect(s.label).toBe("Deadline passed");
    expect(s.daysLeft).toBeLessThan(0);
  });

  it("flips at local midnight", () => {
    const deadline = endOfDay(3);
    const beforeMidnight = new Date(2026, 10, 2, 23, 59, 59, 999).getTime();
    const atMidnight = new Date(2026, 10, 3, 0, 0).getTime();
    expect(deadlineStatus(deadline, beforeMidnight).kind).toBe("tomorrow");
    expect(deadlineStatus(deadline, atMidnight).kind).toBe("today");
  });

  it("passes the moment the end-of-day deadline is crossed at midnight", () => {
    const deadline = endOfDay(2);
    const midnight = new Date(2026, 10, 3, 0, 0).getTime();
    expect(deadlineStatus(deadline, midnight)).toEqual({ kind: "passed", daysLeft: -1, label: "Deadline passed" });
  });
});
