import { describe, it, expect } from "vitest";
import {
  REACTION_EMOJIS,
  isReactionEmoji,
  reactionCounts,
  toggleReaction,
  type ReactionEntry,
} from "@/lib/domain/reactions";

const r = (submissionId: string, userId: string, emoji: string): ReactionEntry => ({ submissionId, userId, emoji });

describe("REACTION_EMOJIS", () => {
  it("is a fixed set of 5 distinct emojis, each with a label", () => {
    expect(REACTION_EMOJIS).toHaveLength(5);
    expect(new Set(REACTION_EMOJIS.map((e) => e.emoji)).size).toBe(5);
    for (const e of REACTION_EMOJIS) expect(e.label).toMatch(/\w+/);
  });

  it("isReactionEmoji accepts only the set", () => {
    expect(isReactionEmoji("😂")).toBe(true);
    expect(isReactionEmoji("👍")).toBe(false);
    expect(isReactionEmoji("")).toBe(false);
  });
});

describe("toggleReaction", () => {
  it("sets a reaction when the member has none on that clip", () => {
    expect(toggleReaction([], "s1", "u1", "🔥")).toEqual([r("s1", "u1", "🔥")]);
  });

  it("replaces the member's other emoji on the same clip", () => {
    const list = [r("s1", "u1", "😂"), r("s1", "u2", "😂")];
    const next = toggleReaction(list, "s1", "u1", "💀");
    expect(next).toHaveLength(2);
    expect(next).toContainEqual(r("s1", "u1", "💀"));
    expect(next).toContainEqual(r("s1", "u2", "😂"));
  });

  it("clears it when the member taps the same emoji again", () => {
    const list = [r("s1", "u1", "😂"), r("s2", "u1", "😂")];
    expect(toggleReaction(list, "s1", "u1", "😂")).toEqual([r("s2", "u1", "😂")]);
  });

  it("leaves other members and other clips alone", () => {
    const list = [r("s1", "u2", "🔥"), r("s2", "u1", "👏")];
    const next = toggleReaction(list, "s1", "u1", "🔥");
    expect(next).toEqual([...list, r("s1", "u1", "🔥")]);
  });

  it("does not mutate the input list or its entries", () => {
    const list = [r("s1", "u1", "😂")];
    const snapshot = JSON.parse(JSON.stringify(list));
    const replaced = toggleReaction(list, "s1", "u1", "🔥");
    const cleared = toggleReaction(list, "s1", "u1", "😂");
    expect(list).toEqual(snapshot);
    expect(replaced).not.toBe(list);
    expect(cleared).not.toBe(list);
  });
});

describe("reactionCounts", () => {
  it("counts one clip's reactions in REACTION_EMOJIS order, zeros included", () => {
    const list = [r("s1", "u1", "🔥"), r("s1", "u2", "🔥"), r("s1", "u3", "💀"), r("s2", "u1", "😂")];
    const counts = reactionCounts(list, "s1");
    expect(counts.map((c) => c.emoji)).toEqual(REACTION_EMOJIS.map((e) => e.emoji));
    expect(Object.fromEntries(counts.map((c) => [c.emoji, c.count]))).toEqual({
      "😂": 0,
      "🔥": 2,
      "😱": 0,
      "👏": 0,
      "💀": 1,
    });
  });

  it("is all zeros for a clip nobody reacted to", () => {
    expect(reactionCounts([], "s1").every((c) => c.count === 0)).toBe(true);
  });
});
