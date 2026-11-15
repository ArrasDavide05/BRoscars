// Emoji reactions on a finished night's winning clips. Pure: no React/data imports.
// One reaction per member per clip; bragging rights only, never part of scoring.

export const REACTION_EMOJIS = [
  { emoji: "😂", label: "laugh" },
  { emoji: "🔥", label: "fire" },
  { emoji: "😱", label: "shock" },
  { emoji: "👏", label: "applause" },
  { emoji: "💀", label: "dead" },
] as const;

export type ReactionEmoji = (typeof REACTION_EMOJIS)[number]["emoji"];

export interface ReactionEntry {
  submissionId: string;
  userId: string;
  emoji: string;
}

export interface ReactionCount {
  emoji: ReactionEmoji;
  label: string;
  count: number;
}

export function isReactionEmoji(emoji: string): emoji is ReactionEmoji {
  return REACTION_EMOJIS.some((r) => r.emoji === emoji);
}

/**
 * The member's reaction on a clip after tapping `emoji`: set if they had none,
 * replace if they had another, clear if they tap the same one. Returns a new list.
 */
export function toggleReaction(
  list: ReactionEntry[],
  submissionId: string,
  userId: string,
  emoji: string
): ReactionEntry[] {
  const mine = (r: ReactionEntry) => r.submissionId === submissionId && r.userId === userId;
  const existing = list.find(mine);
  const others = list.filter((r) => !mine(r));
  if (existing?.emoji === emoji) return others;
  return [...others, { submissionId, userId, emoji }];
}

/** Counts for one clip, one entry per emoji in REACTION_EMOJIS order (zeros included). */
export function reactionCounts(list: ReactionEntry[], submissionId: string): ReactionCount[] {
  return REACTION_EMOJIS.map(({ emoji, label }) => ({
    emoji,
    label,
    count: list.filter((r) => r.submissionId === submissionId && r.emoji === emoji).length,
  }));
}
