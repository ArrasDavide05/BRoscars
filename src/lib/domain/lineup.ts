export const UNKNOWN_THEME = "Mystery theme";
export const UNKNOWN_PROMPT = "Prompt to be announced";

export interface LineupEntry {
  roundId: string;
  roundNo: number; // 1-based, for display
  themeName: string;
  promptText: string;
}

/**
 * Tonight's categories: one entry per round, sorted by `roundOrder` (array order is not
 * trusted). A missing theme or prompt gets a readable placeholder instead of crashing.
 */
export function buildLineup(
  rounds: { id: string; roundOrder: number }[],
  themeFor: (roundId: string) => { name: string } | undefined,
  promptFor: (roundId: string) => { text: string } | undefined,
): LineupEntry[] {
  return [...rounds]
    .sort((a, b) => a.roundOrder - b.roundOrder)
    .map((r, i) => ({
      roundId: r.id,
      roundNo: i + 1,
      themeName: themeFor(r.id)?.name || UNKNOWN_THEME,
      promptText: promptFor(r.id)?.text || UNKNOWN_PROMPT,
    }));
}
