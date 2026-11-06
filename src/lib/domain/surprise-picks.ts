// Pure, framework-agnostic. No React/data imports.
// "Surprise me" for the event builder: picks `count` random themes and one
// random prompt from each, deterministically from a seed. Prompts already used
// are avoided while fresh ones exist.

import { seededShuffle } from "./shuffle";

export interface SurpriseTheme {
  id: string;
  promptIds: readonly string[];
}

/**
 * Returns themeId -> promptId for up to `count` distinct themes.
 * Themes without prompts are skipped; same seed → same picks.
 * Themes with an unused prompt come first, and within a theme an unused prompt
 * wins; used ones are only a fallback.
 */
export function surprisePicks(
  themes: readonly SurpriseTheme[],
  seed: string,
  count = 6,
  usedPromptIds: ReadonlySet<string> = new Set()
): Record<string, string> {
  const eligible = themes.filter((t) => t.promptIds.length > 0);
  const isFresh = (t: SurpriseTheme) => t.promptIds.some((p) => !usedPromptIds.has(p));
  const shuffled = seededShuffle(eligible, seed);
  const ordered = [...shuffled.filter(isFresh), ...shuffled.filter((t) => !isFresh(t))];
  const chosen = ordered.slice(0, Math.max(0, count));
  const picks: Record<string, string> = {};
  for (const t of chosen) {
    const prompts = seededShuffle(t.promptIds, `${seed}:${t.id}`);
    picks[t.id] = prompts.find((p) => !usedPromptIds.has(p)) ?? prompts[0];
  }
  return picks;
}
