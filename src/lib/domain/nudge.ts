// Host nudges for members who still owe clips. Counts only: never which rounds,
// never anything about sealed clips. Pure: no React/data imports.

import { plural } from "./format";

/** A nudge only matters on an upcoming night while the member still owes at least one clip. */
export function nudgeIsActive(status: "upcoming" | "live" | "complete", clipsOwed: number): boolean {
  return status === "upcoming" && clipsOwed > 0;
}

/** "Alex nudged you: 2 clips to go", "Alex nudged you: 1 clip to go". */
export function nudgeLine(fromName: string, clipsOwed: number): string {
  return `${fromName} nudged you: ${plural(clipsOwed, "clip")} to go`;
}
