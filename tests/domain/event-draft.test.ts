import { describe, it, expect } from "vitest";
import {
  validateEventDraft,
  deadlineFromDateInput,
  toDateInputValue,
  EVENT_TITLE_MAX_LENGTH,
  RECOMMENDED_MIN_ROUNDS,
  RECOMMENDED_MAX_ROUNDS,
} from "@/lib/domain/event-draft";

// Local-time "now": 2026-10-22 15:00.
const NOW = new Date(2026, 9, 22, 15, 0).getTime();
const IN_5_DAYS = new Date(2026, 9, 27, 23, 59).getTime();

const base = { title: "Friday Night", promptCount: 6, deadline: IN_5_DAYS, now: NOW };

describe("validateEventDraft", () => {
  it("accepts the happy path with 6 rounds", () => {
    expect(validateEventDraft(base)).toEqual({ ok: true, errors: [], warnings: [] });
  });

  it("rejects a blank or whitespace-only title", () => {
    expect(validateEventDraft({ ...base, title: "" }).ok).toBe(false);
    const r = validateEventDraft({ ...base, title: "   " });
    expect(r.ok).toBe(false);
    expect(r.errors).toHaveLength(1);
  });

  it("trims whitespace before checking the title", () => {
    expect(validateEventDraft({ ...base, title: "  Friday Night  " }).ok).toBe(true);
    const padded = "  " + "x".repeat(EVENT_TITLE_MAX_LENGTH) + "  ";
    expect(validateEventDraft({ ...base, title: padded }).ok).toBe(true);
  });

  it("rejects a title longer than the limit", () => {
    const r = validateEventDraft({ ...base, title: "x".repeat(EVENT_TITLE_MAX_LENGTH + 1) });
    expect(r.ok).toBe(false);
    expect(r.errors[0]).toMatch(String(EVENT_TITLE_MAX_LENGTH));
  });

  it("rejects 0 rounds", () => {
    const r = validateEventDraft({ ...base, promptCount: 0 });
    expect(r.ok).toBe(false);
    expect(r.warnings).toEqual([]);
  });

  it("warns (but allows) too few or too many rounds", () => {
    for (const n of [1, RECOMMENDED_MIN_ROUNDS - 1, RECOMMENDED_MAX_ROUNDS + 1, 12]) {
      const r = validateEventDraft({ ...base, promptCount: n });
      expect(r.ok).toBe(true);
      expect(r.warnings).toEqual(["Aim for ~6 rounds"]);
    }
    for (const n of [RECOMMENDED_MIN_ROUNDS, RECOMMENDED_MAX_ROUNDS]) {
      expect(validateEventDraft({ ...base, promptCount: n }).warnings).toEqual([]);
    }
  });

  it("rejects a missing/NaN deadline", () => {
    expect(validateEventDraft({ ...base, deadline: NaN }).ok).toBe(false);
  });

  it("rejects a deadline before the start of today", () => {
    const yesterday = new Date(2026, 9, 21, 23, 59).getTime();
    expect(validateEventDraft({ ...base, deadline: yesterday }).ok).toBe(false);
  });

  it("allows a deadline that is today, even earlier than now", () => {
    expect(validateEventDraft({ ...base, deadline: deadlineFromDateInput("2026-10-22") }).ok).toBe(true);
    expect(validateEventDraft({ ...base, deadline: new Date(2026, 9, 22, 0, 0).getTime() }).ok).toBe(true);
  });

  it("collects multiple errors in order", () => {
    const r = validateEventDraft({ title: " ", promptCount: 0, deadline: NaN, now: NOW });
    expect(r.errors).toHaveLength(3);
  });
});

describe("deadlineFromDateInput", () => {
  it("maps YYYY-MM-DD to the end of that day in local time", () => {
    const ms = deadlineFromDateInput("2026-10-27");
    const d = new Date(ms);
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 9, 27]);
    expect([d.getHours(), d.getMinutes(), d.getSeconds()]).toEqual([23, 59, 59]);
  });

  it("returns NaN for empty or invalid input", () => {
    expect(deadlineFromDateInput("")).toBeNaN();
    expect(deadlineFromDateInput("not-a-date")).toBeNaN();
    expect(deadlineFromDateInput("2026-02-30")).toBeNaN();
  });

  it("round-trips with toDateInputValue", () => {
    expect(toDateInputValue(deadlineFromDateInput("2026-01-05"))).toBe("2026-01-05");
  });

  it("round-trips across a month end (Jan 31 -> Feb 1)", () => {
    const jan31 = deadlineFromDateInput("2027-01-31");
    expect(toDateInputValue(jan31)).toBe("2027-01-31");
    expect(toDateInputValue(jan31 + 1)).toBe("2027-02-01");
    expect(toDateInputValue(deadlineFromDateInput("2027-02-01"))).toBe("2027-02-01");
  });

  it("round-trips a leap day and rejects Feb 29 in a non-leap year", () => {
    const leap = deadlineFromDateInput("2028-02-29");
    expect(toDateInputValue(leap)).toBe("2028-02-29");
    expect(toDateInputValue(leap + 1)).toBe("2028-03-01");
    expect(deadlineFromDateInput("2027-02-29")).toBeNaN();
  });

  it("round-trips across a year end (Dec 31 -> Jan 1)", () => {
    const dec31 = deadlineFromDateInput("2026-12-31");
    expect(toDateInputValue(dec31)).toBe("2026-12-31");
    expect(toDateInputValue(dec31 + 1)).toBe("2027-01-01");
    expect(toDateInputValue(deadlineFromDateInput("2027-01-01"))).toBe("2027-01-01");
  });
});
