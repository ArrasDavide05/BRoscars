// BRoscar predictions: who called the night's champion. Pure: no React/data imports.
// Bragging rights only; nothing here touches scoring or how the BRoscar is decided.

export interface PredictionPick {
  userId: string;
  pickedUserId: string;
}

/**
 * Members whose pick is one of the BRoscar winners (co-winners all count),
 * in pick order. No picks or no winners gives [].
 */
export function whoCalledIt(picks: PredictionPick[], broscarUserIds: string[]): string[] {
  const winners = new Set(broscarUserIds);
  const out: string[] = [];
  for (const p of picks) {
    if (winners.has(p.pickedUserId) && !out.includes(p.userId)) out.push(p.userId);
  }
  return out;
}

/** The member's own pick, or undefined if they haven't picked. */
export function pickOf(picks: PredictionPick[], userId: string): string | undefined {
  return picks.find((p) => p.userId === userId)?.pickedUserId;
}

/** "Called it: Sam, Jo 🔮" or "Nobody called it." */
export function calledItLine(names: string[]): string {
  return names.length ? `Called it: ${names.join(", ")} 🔮` : "Nobody called it.";
}
