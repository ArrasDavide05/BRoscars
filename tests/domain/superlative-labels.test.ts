import { describe, it, expect } from "vitest";
import { superlativeSummaryDetail, SUPERLATIVE_ICON, SUPERLATIVE_TITLE } from "@/lib/domain/superlative-labels";

describe("superlative labels", () => {
  it("has an icon and a title for every kind", () => {
    expect(Object.keys(SUPERLATIVE_ICON).sort()).toEqual(Object.keys(SUPERLATIVE_TITLE).sort());
    expect(Object.values(SUPERLATIVE_TITLE).every(Boolean)).toBe(true);
  });

  it("formats the summary detail per kind", () => {
    const sub = { userIds: ["u"], submissionId: "s", roundId: "r" };
    expect(superlativeSummaryDetail({ kind: "peoples-champion", userIds: ["u"], detail: { up: 1 } })).toBe("1 upvote");
    expect(superlativeSummaryDetail({ kind: "peoples-champion", userIds: ["u"], detail: { up: 7 } })).toBe("7 upvotes");
    expect(
      superlativeSummaryDetail({ kind: "most-divisive", ...sub, detail: { up: 3, down: 2, net: 1 } })
    ).toBe("3▲ 2▼");
    expect(
      superlativeSummaryDetail({ kind: "robbed", ...sub, detail: { up: 2, down: 0, net: 2, gap: 1 } })
    ).toBe("lost by 1");
    expect(superlativeSummaryDetail({ kind: "on-a-roll", userIds: ["u"], detail: { streak: 3 } })).toBe("3 in a row");
  });
});
