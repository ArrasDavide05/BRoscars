import { describe, it, expect } from "vitest";
import { computeSubmissionScore, scoreBySubmission } from "@/lib/domain/scoring";

const r = (submissionId: string, value: -1 | 0 | 1) => ({ submissionId, value });

describe("computeSubmissionScore", () => {
  it("counts up/down/neutral and net = up - down", () => {
    const score = computeSubmissionScore([r("s1", 1), r("s1", 1), r("s1", -1), r("s1", 0)]);
    expect(score).toEqual({ up: 2, down: 1, neutral: 1, net: 1 });
  });

  it("is all-zero for no ratings", () => {
    expect(computeSubmissionScore([])).toEqual({ up: 0, down: 0, neutral: 0, net: 0 });
  });
});

describe("scoreBySubmission", () => {
  it("returns a zero score for a requested id with no ratings and ignores unknown ids", () => {
    const out = scoreBySubmission(["a"], [r("b", 1)]);
    expect(out.a).toEqual({ up: 0, down: 0, neutral: 0, net: 0 });
    expect(out.b).toBeUndefined();
  });

  it("buckets ratings to their submission", () => {
    const out = scoreBySubmission(["a", "b"], [r("a", 1), r("a", 1), r("b", -1)]);
    expect(out.a.net).toBe(2);
    expect(out.b.net).toBe(-1);
  });
});
