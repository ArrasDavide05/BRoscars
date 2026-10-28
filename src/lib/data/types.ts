// v2 data types. Hierarchy: Theme -> Group -> Event -> Round -> Submission.
// These mirror the eventual DB shape so swapping the data-layer internals for
// Supabase later won't require UI changes.

import type { RatingValue } from "@/lib/domain/scoring";

export type { RatingValue };

export interface CareerBaseline {
  crowns: number; // round wins
  broscars: number; // event championships
  upvotes: number; // lifetime upvotes received
}

export interface User {
  id: string;
  name: string;
  initials: string;
  avatarColor: string;
  /** pre-app history; live career stats add derived contributions on top */
  careerBaseline: CareerBaseline;
}

export interface Theme {
  id: string;
  name: string;
  promptIds: string[];
}

export interface Prompt {
  id: string;
  themeId: string;
  text: string;
}

export interface Group {
  id: string;
  name: string;
  inviteCode: string;
  createdBy: string;
  memberIds: string[];
}

export type EventStatus = "upcoming" | "live" | "complete";

export interface Event {
  id: string;
  groupId: string;
  title: string;
  // DATE CONTRACT: date/deadline are epoch-ms numbers at the DataApi boundary.
  // The future Supabase adapter maps timestamptz -> epoch ms so this stays a
  // number and relDays()-style arithmetic keeps working unchanged.
  date: number; // the night, epoch ms
  deadline: number; // submission deadline, epoch ms
  status: EventStatus;
  hostId: string;
  roundIds: string[]; // ordered, ~6
  broscarUserIds: string[]; // frozen when complete
}

export interface Round {
  id: string;
  eventId: string;
  promptId: string;
  themeId: string; // denormalized from the prompt; matches schema rounds.theme_id
  roundOrder: number; // 0-based position within the event; matches rounds.round_order
  winnerUserIds: string[]; // frozen when the event completes
}

export interface Submission {
  id: string;
  roundId: string;
  userId: string;
  // placeholder "video": a gradient pair + caption; no real playback
  tileFrom: string;
  tileTo: string;
  caption: string;
  durationSec: number;
  createdAt: number;
}

export interface Rating {
  id: string;
  roundId: string;
  submissionId: string;
  raterId: string;
  value: RatingValue; // -1 | 0 | 1
}

export interface Database {
  users: User[];
  themes: Theme[];
  prompts: Prompt[];
  groups: Group[];
  events: Event[];
  rounds: Round[];
  submissions: Submission[];
  ratings: Rating[];
}

export type LivePhase =
  | "idle"
  | "round-intro"
  | "playing"
  | "round-results"
  | "broscar";

export interface LiveState {
  eventId: string | null;
  phase: LivePhase;
  roundIndex: number; // index into event.roundIds
  submissionIndex: number; // index into the round's shuffled play order
  videoStartedAt: number | null; // shared clock for the 30s timer
  revealedRoundIndex: number | null; // round whose TV reveal finished; null until then (reset on every move)
}

export interface StoreState {
  db: Database;
  live: LiveState;
}
