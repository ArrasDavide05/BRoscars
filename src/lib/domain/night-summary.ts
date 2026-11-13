// Plain-text results of a finished night, for pasting into the group chat.
// Pure: no React/data imports. Reused verbatim in the real build.

import { NO_ENTRIES_TEXT, plural } from "./format";

export interface NightSummaryRound {
  promptText: string;
  /** Empty when the round had no entries; a round with entries always has a winner. */
  winnerNames: readonly string[];
}

export interface NightSummaryInput {
  title: string;
  groupName: string;
  championNames: readonly string[];
  rounds: readonly NightSummaryRound[];
  /** Special awards, one line each after the rounds. `detail` empty -> no parentheses. */
  awards?: readonly NightSummaryAward[];
}

export interface NightSummaryAward {
  icon: string;
  title: string;
  names: readonly string[];
  detail: string;
}

const joinNames = (names: readonly string[]): string => names.join(" & ");

function championLine(names: readonly string[]): string {
  if (names.length === 0) return "No BRoscar this night";
  return `${names.length > 1 ? "Co-BRoscars" : "BRoscar"}: ${joinNames(names)}`;
}

/**
 * Title, group + round count, champion, one numbered line per round, then one line per
 * special award. No trailing newline.
 */
export function nightSummaryText({ title, groupName, championNames, rounds, awards = [] }: NightSummaryInput): string {
  const roundLines = rounds.map((round, i) => {
    const result = round.winnerNames.length > 0 ? `👑 ${joinNames(round.winnerNames)}` : NO_ENTRIES_TEXT;
    return `${i + 1}. ${round.promptText}: ${result}`;
  });
  const awardLines = awards.map((a) => {
    const line = `${a.icon} ${a.title}: ${joinNames(a.names)}`;
    return a.detail ? `${line} (${a.detail})` : line;
  });
  return [
    `🏆 ${title}`,
    `${groupName} · ${plural(rounds.length, "round")}`,
    championLine(championNames),
    ...roundLines,
    ...awardLines,
  ].join("\n");
}
