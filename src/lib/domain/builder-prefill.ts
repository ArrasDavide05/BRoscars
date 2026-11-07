// Pure, framework-agnostic. No React/data imports.
// "Host the next night" opens the event builder with `?surprise=1`, which
// prefills it with a Surprise me roll that prefers prompts the group hasn't used.

import { surprisePicks, type SurpriseTheme } from "./surprise-picks";

export const PREFILL_COUNT = 6;

/**
 * True only for the exact value "1" (or an array whose first value is "1").
 * Anything else, including "true", leaves the builder empty as before.
 */
export function wantsSurprisePrefill(value: string | string[] | undefined): boolean {
  const first = Array.isArray(value) ? value[0] : value;
  return first === "1";
}

/**
 * A seed that is the same on the server render and on hydration (Date.now()
 * isn't), yet moves on once the group plans another night.
 */
export function prefillSeed(groupId: string, used: Readonly<Record<string, unknown>>): string {
  return `next:${groupId}:${Object.keys(used).length}`;
}

/** The builder's initial picks: themeId -> promptId, or none when not asked for. */
export function prefillPicks(
  wanted: boolean,
  themes: readonly SurpriseTheme[],
  seed: string,
  usedPromptIds: ReadonlySet<string>
): Record<string, string> {
  return wanted ? surprisePicks(themes, seed, PREFILL_COUNT, usedPromptIds) : {};
}
