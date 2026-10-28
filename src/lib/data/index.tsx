"use client";

// THE single data-access module. Components/screens import data ONLY from here.
// Internals (store.ts, seed.ts) are private; swap them for Supabase later without
// touching the UI. React binds to the store via useSyncExternalStore; cross-tab
// live sync happens inside store.ts (BroadcastChannel).
//
// DATE CONTRACT: Event.date / Event.deadline cross this boundary as epoch-ms
// numbers. The future Supabase adapter must map timestamptz -> epoch ms here so
// callers (e.g. relDays arithmetic in EventCard) keep working without changes.

import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import {
  computeRoundStandings,
  computeRoundWinnerUserIds,
  computeBroscar,
  upvotesByUserFrom,
  type RoundStanding,
} from "@/lib/domain/standings";
import { computeSuperlatives, type Superlative } from "@/lib/domain/superlatives";
import { submissionProgress, type MemberSubmissionProgress } from "@/lib/domain/submission-progress";
import { computeHallOfFame, type HallOfFameRow } from "@/lib/domain/hall-of-fame";
import { computeCareerStats } from "@/lib/domain/career-stats";
import { computeRaceStandings, type RaceRow } from "@/lib/domain/race";
import {
  subscribe,
  getSnapshot,
  getServerSnapshot,
  actions,
  playOrder,
  eligibleRaterIds,
  findSubmission,
  ROUND_SECONDS,
} from "./store";
import type {
  CareerBaseline,
  Event,
  Group,
  LiveState,
  Prompt,
  RatingValue,
  Round,
  Submission,
  Theme,
  User,
} from "./types";

export type { Event, Group, Prompt, Round, Submission, Theme, User, LiveState, RatingValue, Superlative, MemberSubmissionProgress, HallOfFameRow, RaceRow };
export { ROUND_SECONDS };

export interface VideoRatingState {
  eligible: string[];
  ratedBy: string[];
  allRated: boolean;
}

export interface DataApi {
  // identity (per-tab dev switcher)
  currentUser: User;
  currentUserId: string;
  users: User[];
  setCurrentUserId: (id: string) => void;

  // library
  getThemes: () => Theme[];
  getPrompt: (promptId: string) => Prompt | undefined;
  getThemeOfPrompt: (promptId: string) => Theme | undefined;

  // groups / people
  getGroups: () => Group[];
  getGroup: (id: string) => Group | undefined;
  getUser: (id: string) => User | undefined;
  getMembers: (groupId: string) => User[];
  getCareerStats: (userId: string) => CareerBaseline;
  getGroupHallOfFame: (groupId: string) => HallOfFameRow[];

  // events / rounds
  getEvents: (groupId: string) => Event[];
  getEvent: (id: string) => Event | undefined;
  getEventRounds: (eventId: string) => Round[];
  getRound: (roundId: string) => Round | undefined;
  getPromptForRound: (roundId: string) => Prompt | undefined;
  getThemeForRound: (roundId: string) => Theme | undefined;

  // submissions / ratings
  getSubmissions: (roundId: string) => Submission[];
  getSubmission: (submissionId: string) => Submission | undefined;
  getSubmissionByUser: (roundId: string, userId: string) => Submission | undefined;
  getSubmissionProgress: (eventId: string) => MemberSubmissionProgress[];
  getRoundStandings: (roundId: string) => RoundStanding[];
  getRoundWinnerUserIds: (roundId: string) => string[];
  getMyRating: (submissionId: string, userId: string) => RatingValue | undefined;
  getBroscarUserIds: (eventId: string) => string[];
  /** Running crowns/upvotes over the event's first `roundsCompleted` rounds. */
  getRaceStandings: (eventId: string, roundsCompleted: number) => RaceRow[];
  getEventSuperlatives: (eventId: string) => Superlative[];

  // live
  live: LiveState;
  getLiveEvent: () => Event | undefined;
  getCurrentRound: () => Round | undefined;
  getPlayOrder: (roundId: string) => Submission[];
  getCurrentSubmission: () => Submission | undefined;
  getVideoRatingState: (submissionId: string) => VideoRatingState;

  // mutations (Promise-returning so the surface matches the future Supabase adapter)
  submitVideo: (roundId: string, userId: string, caption: string) => Promise<void>;
  createEvent: (groupId: string, hostId: string, title: string, promptIds: string[], deadline: number) => Promise<string>;
  updateProfile: (userId: string, patch: { name?: string; avatarColor?: string }) => Promise<void>;
  startLiveEvent: (eventId: string) => Promise<void>;
  castRating: (roundId: string, submissionId: string, raterId: string, value: RatingValue) => Promise<void>;
  castBotRatings: () => Promise<void>;
  advance: () => Promise<void>;
  markRoundRevealed: (eventId: string) => Promise<void>;
}

const DataContext = createContext<DataApi | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const { db, live } = snapshot;
  const [currentUserId, setCurrentUserId] = useState("u_alex");

  const api = useMemo<DataApi>(() => {
    const ratingsForRound = (roundId: string) => db.ratings.filter((r) => r.roundId === roundId);
    const subsForRound = (roundId: string) => db.submissions.filter((s) => s.roundId === roundId);

    return {
      currentUserId,
      currentUser: db.users.find((u) => u.id === currentUserId) ?? db.users[0],
      users: db.users,
      setCurrentUserId,

      getThemes: () => db.themes,
      getPrompt: (id) => db.prompts.find((p) => p.id === id),
      getThemeOfPrompt: (promptId) => {
        const p = db.prompts.find((x) => x.id === promptId);
        return p ? db.themes.find((t) => t.id === p.themeId) : undefined;
      },

      getGroups: () => db.groups,
      getGroup: (id) => db.groups.find((g) => g.id === id),
      getUser: (id) => db.users.find((u) => u.id === id),
      getMembers: (groupId) => {
        const g = db.groups.find((x) => x.id === groupId);
        return (g?.memberIds ?? [])
          .map((id) => db.users.find((u) => u.id === id))
          .filter((u): u is User => Boolean(u));
      },
      getCareerStats: (userId) => {
        const base = db.users.find((u) => u.id === userId)?.careerBaseline;
        const events = db.events
          .filter((e) => e.status === "complete")
          .map((ev) => {
            const rounds = ev.roundIds.map((rid) => db.rounds.find((r) => r.id === rid)).filter((r): r is Round => Boolean(r));
            const eventSubs = db.submissions.filter((s) => rounds.some((r) => r.id === s.roundId));
            const eventRatings = db.ratings.filter((rt) => rounds.some((r) => r.id === rt.roundId));
            return {
              roundWinnerUserIds: rounds.map((r) => r.winnerUserIds),
              broscarUserIds: ev.broscarUserIds,
              upvotesByUser: upvotesByUserFrom(eventSubs, eventRatings),
            };
          });
        return computeCareerStats(userId, base, events);
      },
      // Group-scoped: only this group's finished events, no cross-group careerBaseline.
      getGroupHallOfFame: (groupId) => {
        const memberIds = db.groups.find((g) => g.id === groupId)?.memberIds ?? [];
        const events = db.events
          .filter((e) => e.groupId === groupId && e.status === "complete")
          .map((ev) => {
            const rounds = ev.roundIds.map((rid) => db.rounds.find((r) => r.id === rid)).filter((r): r is Round => Boolean(r));
            const eventSubs = db.submissions.filter((s) => rounds.some((r) => r.id === s.roundId));
            const eventRatings = db.ratings.filter((rt) => rounds.some((r) => r.id === rt.roundId));
            return {
              roundWinnerUserIds: rounds.map((r) => r.winnerUserIds),
              broscarUserIds: ev.broscarUserIds,
              upvotesByUser: upvotesByUserFrom(eventSubs, eventRatings),
            };
          });
        return computeHallOfFame(memberIds, events);
      },

      getEvents: (groupId) =>
        db.events.filter((e) => e.groupId === groupId).sort((a, b) => b.date - a.date),
      getEvent: (id) => db.events.find((e) => e.id === id),
      getEventRounds: (eventId) => {
        const ev = db.events.find((e) => e.id === eventId);
        return (ev?.roundIds ?? [])
          .map((rid) => db.rounds.find((r) => r.id === rid))
          .filter((r): r is Round => Boolean(r));
      },
      getRound: (roundId) => db.rounds.find((r) => r.id === roundId),
      getPromptForRound: (roundId) => {
        const r = db.rounds.find((x) => x.id === roundId);
        return r ? db.prompts.find((p) => p.id === r.promptId) : undefined;
      },
      getThemeForRound: (roundId) => {
        const r = db.rounds.find((x) => x.id === roundId);
        return r ? db.themes.find((t) => t.id === r.themeId) : undefined;
      },

      getSubmissions: (roundId) => subsForRound(roundId).sort((a, b) => a.createdAt - b.createdAt),
      getSubmission: (submissionId) => findSubmission(db, submissionId),
      getSubmissionByUser: (roundId, userId) =>
        db.submissions.find((s) => s.roundId === roundId && s.userId === userId),
      // Real build: a count-only view/RPC, so RLS still hides other members' Submission rows.
      getSubmissionProgress: (eventId) => {
        const ev = db.events.find((e) => e.id === eventId);
        if (!ev) return [];
        const memberIds = db.groups.find((g) => g.id === ev.groupId)?.memberIds ?? [];
        return submissionProgress(memberIds, ev.roundIds, db.submissions);
      },
      getRoundStandings: (roundId) => computeRoundStandings(subsForRound(roundId), ratingsForRound(roundId)),
      getRoundWinnerUserIds: (roundId) => {
        const r = db.rounds.find((x) => x.id === roundId);
        if (r && r.winnerUserIds.length) return r.winnerUserIds; // frozen
        return computeRoundWinnerUserIds(subsForRound(roundId), ratingsForRound(roundId));
      },
      getMyRating: (submissionId, userId) =>
        db.ratings.find((r) => r.submissionId === submissionId && r.raterId === userId)?.value,
      getBroscarUserIds: (eventId) => {
        const ev = db.events.find((e) => e.id === eventId);
        if (!ev) return [];
        if (ev.status === "complete" && ev.broscarUserIds.length) return ev.broscarUserIds;
        const rounds = ev.roundIds.map((rid) => db.rounds.find((r) => r.id === rid)).filter((r): r is Round => Boolean(r));
        const roundWinners = rounds.map((r) => computeRoundWinnerUserIds(subsForRound(r.id), ratingsForRound(r.id)));
        const eventSubs = db.submissions.filter((s) => rounds.some((r) => r.id === s.roundId));
        const eventRatings = db.ratings.filter((rt) => rounds.some((r) => r.id === rt.roundId));
        return computeBroscar(roundWinners, upvotesByUserFrom(eventSubs, eventRatings)).championUserIds;
      },
      getRaceStandings: (eventId, roundsCompleted) => {
        const ev = db.events.find((e) => e.id === eventId);
        if (!ev) return [];
        const memberIds = db.groups.find((g) => g.id === ev.groupId)?.memberIds ?? [];
        const doneIds = ev.roundIds.slice(0, Math.max(0, roundsCompleted));
        const roundWinners = doneIds.map((rid) => computeRoundWinnerUserIds(subsForRound(rid), ratingsForRound(rid)));
        const doneSubs = db.submissions.filter((s) => doneIds.includes(s.roundId));
        const doneRatings = db.ratings.filter((rt) => doneIds.includes(rt.roundId));
        return computeRaceStandings(memberIds, roundWinners, upvotesByUserFrom(doneSubs, doneRatings));
      },
      getEventSuperlatives: (eventId) => {
        const ev = db.events.find((e) => e.id === eventId);
        if (!ev) return [];
        const rounds = ev.roundIds.map((rid) => ({ roundId: rid, submissions: subsForRound(rid) }));
        const eventRatings = db.ratings.filter((rt) => ev.roundIds.includes(rt.roundId));
        return computeSuperlatives(rounds, eventRatings);
      },

      live,
      getLiveEvent: () => db.events.find((e) => e.id === live.eventId),
      getCurrentRound: () => {
        const ev = db.events.find((e) => e.id === live.eventId);
        return ev ? db.rounds.find((r) => r.id === ev.roundIds[live.roundIndex]) : undefined;
      },
      getPlayOrder: (roundId) => playOrder(db, roundId),
      getCurrentSubmission: () => {
        const ev = db.events.find((e) => e.id === live.eventId);
        if (!ev) return undefined;
        const round = db.rounds.find((r) => r.id === ev.roundIds[live.roundIndex]);
        if (!round) return undefined;
        return playOrder(db, round.id)[live.submissionIndex];
      },
      getVideoRatingState: (submissionId) => {
        const sub = db.submissions.find((s) => s.id === submissionId);
        if (!sub) return { eligible: [], ratedBy: [], allRated: false };
        const round = db.rounds.find((r) => r.id === sub.roundId);
        const ev = round ? db.events.find((e) => e.id === round.eventId) : undefined;
        const eligible = ev ? eligibleRaterIds(db, ev.groupId, sub.userId) : [];
        const ratedBy = db.ratings.filter((r) => r.submissionId === submissionId).map((r) => r.raterId);
        const allRated = eligible.length > 0 && eligible.every((id) => ratedBy.includes(id));
        return { eligible, ratedBy, allRated };
      },

      submitVideo: actions.submitVideo,
      createEvent: actions.createEvent,
      updateProfile: actions.updateProfile,
      startLiveEvent: actions.startLiveEvent,
      castRating: actions.castRating,
      castBotRatings: actions.castBotRatings,
      advance: actions.advance,
      markRoundRevealed: actions.markRoundRevealed,
    };
  }, [db, live, currentUserId]);

  return <DataContext.Provider value={api}>{children}</DataContext.Provider>;
}

export function useData(): DataApi {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within <DataProvider>");
  return ctx;
}
