// Pure, framework-agnostic. No React/data imports.
// "Surprise me" for the event builder: picks `count` random themes and one
// random prompt from each, deterministically from a seed.

import { seededShuffle } from "./shuffle";

export interface SurpriseTheme {
  id: string;
  promptIds: readonly string[];
}

/**
 * Returns themeId -> promptId for up to `count` distinct themes.
 * Themes without prompts are skipped; same seed → same picks.
 */
export function surprisePicks(
  themes: readonly SurpriseTheme[],
  seed: string,
  count = 6
): Record<string, string> {
  const eligible = themes.filter((t) => t.promptIds.length > 0);
  const chosen = seededShuffle(eligible, seed).slice(0, Math.max(0, count));
  const picks: Record<string, string> = {};
  for (const t of chosen) {
    picks[t.id] = seededShuffle(t.promptIds, `${seed}:${t.id}`)[0];
  }
  return picks;
}
