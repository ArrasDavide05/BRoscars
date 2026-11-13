// Display labels for the special awards, shared by the event page panel and the
// "Copy results" text. Pure: no React/data imports.

import { plural } from "./format";
import type { Superlative, SuperlativeKind } from "./superlatives";

export const SUPERLATIVE_ICON: Record<SuperlativeKind, string> = {
  "peoples-champion": "🗳️",
  "most-divisive": "⚖️",
  robbed: "😤",
  "on-a-roll": "🔥",
};

export const SUPERLATIVE_TITLE: Record<SuperlativeKind, string> = {
  "peoples-champion": "People's Champion",
  "most-divisive": "Most Divisive",
  robbed: "Robbed",
  "on-a-roll": "On a roll",
};

/** Short score for the pasted summary, e.g. "7 upvotes", "3▲ 2▼", "lost by 1", "3 in a row". */
export function superlativeSummaryDetail(s: Superlative): string {
  switch (s.kind) {
    case "peoples-champion":
      return plural(s.detail.up, "upvote");
    case "most-divisive":
      return `${s.detail.up}▲ ${s.detail.down}▼`;
    case "robbed":
      return `lost by ${s.detail.gap}`;
    case "on-a-roll":
      return `${s.detail.streak} in a row`;
  }
}
