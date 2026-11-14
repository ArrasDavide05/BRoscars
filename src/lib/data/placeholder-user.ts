// Readable stand-in when a user id doesn't resolve (e.g. a member who left),
// so screens render "Unknown member" instead of crashing on undefined.

import type { User } from "./types";

export const UNKNOWN_MEMBER_NAME = "Unknown member";

/** Neutral grey-violet, the theme's `--faint` colour. */
const UNKNOWN_MEMBER_COLOR = "#7a7195";

export function placeholderUser(id: string): User {
  return {
    id,
    name: UNKNOWN_MEMBER_NAME,
    initials: "?",
    avatarColor: UNKNOWN_MEMBER_COLOR,
    careerBaseline: { crowns: 0, broscars: 0, upvotes: 0 },
  };
}
