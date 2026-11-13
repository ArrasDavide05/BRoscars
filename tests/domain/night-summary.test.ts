import { describe, it, expect } from "vitest";
import { nightSummaryText, type NightSummaryInput } from "@/lib/domain/night-summary";
import { NO_ENTRIES_TEXT } from "@/lib/domain/format";

const night = (overrides: Partial<NightSummaryInput> = {}): NightSummaryInput => ({
  title: "October Wrap",
  groupName: "Friday Night Crew",
  championNames: ["Bella Chen"],
  rounds: [
    { promptText: "Best drunk video", winnerNames: ["Alex Rivera"] },
    { promptText: "Work incident", winnerNames: ["Bella Chen"] },
  ],
  ...overrides,
});

const lines = (input: NightSummaryInput) => nightSummaryText(input).split("\n");

describe("nightSummaryText", () => {
  it("builds the whole text for a single champion", () => {
    expect(nightSummaryText(night())).toBe(
      [
        "🏆 October Wrap",
        "Friday Night Crew · 2 rounds",
        "BRoscar: Bella Chen",
        "1. Best drunk video: 👑 Alex Rivera",
        "2. Work incident: 👑 Bella Chen",
      ].join("\n")
    );
  });

  it("uses the Co-BRoscars label for shared champions", () => {
    expect(lines(night({ championNames: ["Bella Chen", "Dana Kim"] }))[2]).toBe("Co-BRoscars: Bella Chen & Dana Kim");
    expect(lines(night({ championNames: ["A", "B", "C"] }))[2]).toBe("Co-BRoscars: A & B & C");
  });

  it("says so when nobody won the night", () => {
    expect(lines(night({ championNames: [] }))[2]).toBe("No BRoscar this night");
  });

  it("joins the winners of a tied round", () => {
    const rounds = [{ promptText: "Work incident", winnerNames: ["Bella Chen", "Dana Kim"] }];
    expect(lines(night({ rounds }))[3]).toBe("1. Work incident: 👑 Bella Chen & Dana Kim");
  });

  it("uses the shared text for a round with no entries, keeping the numbering", () => {
    const rounds = [
      { promptText: "Worst blackout", winnerNames: [] },
      { promptText: "Work incident", winnerNames: ["Dana Kim"] },
    ];
    expect(lines(night({ rounds })).slice(3)).toEqual([
      `1. Worst blackout: ${NO_ENTRIES_TEXT}`,
      "2. Work incident: 👑 Dana Kim",
    ]);
  });

  it("pluralises the round count", () => {
    const round = { promptText: "Work incident", winnerNames: ["Dana Kim"] };
    expect(lines(night({ rounds: [round] }))[1]).toBe("Friday Night Crew · 1 round");
    expect(lines(night({ rounds: [round, round, round] }))[1]).toBe("Friday Night Crew · 3 rounds");
  });

  it("leaves the text unchanged with no awards or an empty list", () => {
    expect(nightSummaryText(night({ awards: [] }))).toBe(nightSummaryText(night()));
  });

  it("adds one line per award after all the round lines", () => {
    const awards = [
      { icon: "🗳️", title: "People's Champion", names: ["Dana Kim"], detail: "7 upvotes" },
      { icon: "😤", title: "Robbed", names: ["Alex Rivera"], detail: "lost by 1" },
    ];
    expect(lines(night({ awards }))).toEqual([
      "🏆 October Wrap",
      "Friday Night Crew · 2 rounds",
      "BRoscar: Bella Chen",
      "1. Best drunk video: 👑 Alex Rivera",
      "2. Work incident: 👑 Bella Chen",
      "🗳️ People's Champion: Dana Kim (7 upvotes)",
      "😤 Robbed: Alex Rivera (lost by 1)",
    ]);
  });

  it("joins the names of a tied award", () => {
    const awards = [{ icon: "🔥", title: "On a roll", names: ["Dana", "Sam"], detail: "2 in a row" }];
    expect(lines(night({ awards })).at(-1)).toBe("🔥 On a roll: Dana & Sam (2 in a row)");
  });

  it("drops the parentheses when an award has no detail", () => {
    const awards = [{ icon: "⚖️", title: "Most Divisive", names: ["Dana"], detail: "" }];
    expect(lines(night({ awards })).at(-1)).toBe("⚖️ Most Divisive: Dana");
  });

  it("has no blank lines, even with no rounds", () => {
    expect(lines(night()).every(Boolean)).toBe(true);
    expect(nightSummaryText(night({ rounds: [] }))).toBe(
      "🏆 October Wrap\nFriday Night Crew · 0 rounds\nBRoscar: Bella Chen"
    );
  });
});
