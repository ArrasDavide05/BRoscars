import { describe, it, expect } from "vitest";
import { getSnapshot, findSubmission } from "@/lib/data/store";

describe("findSubmission", () => {
  it("finds a seeded submission by id", () => {
    const { db } = getSnapshot();
    const seeded = db.submissions[0];
    expect(seeded).toBeDefined();
    expect(findSubmission(db, seeded.id)).toBe(seeded);
  });

  it("returns undefined for an unknown id", () => {
    const { db } = getSnapshot();
    expect(findSubmission(db, "s_does_not_exist")).toBeUndefined();
  });
});
