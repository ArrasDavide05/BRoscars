// Framework-agnostic in-memory store + cross-tab sync.
// Internal to src/lib/data — nothing outside this folder imports it directly.
//
// Cross-tab (TV <-> phone) is faked with a same-origin BroadcastChannel: every
// mutation broadcasts a full snapshot; peers adopt it (last-write-wins). No
// network, no websocket, no persistence. A freshly opened tab requests the
// current snapshot so it catches up to an in-progress night.

import { seededShuffle, roundPlaySeed } from "@/lib/domain/shuffle";
import {
  computeBroscar,
  computeRoundWinnerUserIds,
  upvotesByUserFrom,
} from "@/lib/domain/standings";
import { createSeedDatabase } from "./seed";
import type {
  Database,
  Event,
  RatingValue,
  Round,
  StoreState,
  Submission,
} from "./types";

const CHANNEL_NAME = "oscar-night";
const SOURCE = Math.random().toString(36).slice(2);
const ROUND_SECONDS = 30;

function initialState(): StoreState {
  return {
    db: createSeedDatabase(Date.now()),
    live: {
      eventId: null,
      phase: "idle",
      roundIndex: 0,
      submissionIndex: 0,
      videoStartedAt: null,
    },
  };
}

let state: StoreState = initialState();
const listeners = new Set<() => void>();
let idSeq = 100000;
// Namespaced by SOURCE so IDs minted in different tabs never collide after sync.
const nextId = (prefix: string) => `${prefix}_${SOURCE}_${++idSeq}`;

// ---- cross-tab channel ----------------------------------------------------
let channel: BroadcastChannel | null = null;

function ensureChannel() {
  if (channel || typeof window === "undefined" || typeof BroadcastChannel === "undefined") {
    return;
  }
  channel = new BroadcastChannel(CHANNEL_NAME);
  channel.onmessage = (e: MessageEvent) => {
    const msg = e.data;
    if (!msg || msg.source === SOURCE) return;
    if (msg.type === "sync") {
      state = msg.state as StoreState;
      emit();
    } else if (msg.type === "request") {
      // A newly opened tab wants the current state; share ours.
      channel?.postMessage({ type: "sync", source: SOURCE, state });
    }
  };
  // Ask any existing tab for the live state so we catch up.
  channel.postMessage({ type: "request", source: SOURCE });
}

function broadcast() {
  channel?.postMessage({ type: "sync", source: SOURCE, state });
}

function emit() {
  listeners.forEach((l) => l());
}

/** Commit a new state locally, notify React, and broadcast to other tabs. */
function commit(next: StoreState) {
  state = next;
  emit();
  broadcast();
}

// ---- subscription API (for useSyncExternalStore) --------------------------
export function subscribe(listener: () => void): () => void {
  ensureChannel();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSnapshot(): StoreState {
  return state;
}

// Stable snapshot for SSR (children are gated on mount, so this is not rendered).
let serverState: StoreState | null = null;
export function getServerSnapshot(): StoreState {
  if (!serverState) serverState = initialState();
  return serverState;
}

// ---- live-engine helpers --------------------------------------------------
function findEvent(db: Database, id: string | null): Event | undefined {
  return id ? db.events.find((e) => e.id === id) : undefined;
}

function roundSubmissions(db: Database, roundId: string): Submission[] {
  return db.submissions.filter((s) => s.roundId === roundId);
}

/** Shared TV play order for a round (same on every tab). */
export function playOrder(db: Database, roundId: string): Submission[] {
  return seededShuffle(roundSubmissions(db, roundId), roundPlaySeed(roundId));
}

function eligibleRaterIds(db: Database, groupId: string, ownerId: string): string[] {
  const group = db.groups.find((g) => g.id === groupId);
  return (group?.memberIds ?? []).filter((id) => id !== ownerId);
}

function finalizeEvent(db: Database, event: Event): Database {
  const rounds = event.roundIds
    .map((rid) => db.rounds.find((r) => r.id === rid))
    .filter((r): r is Round => Boolean(r));

  const roundWinners: string[][] = [];
  const updatedRounds = db.rounds.map((r) => {
    if (r.eventId !== event.id) return r;
    const subs = roundSubmissions(db, r.id);
    const winners = computeRoundWinnerUserIds(
      subs,
      db.ratings.filter((rt) => rt.roundId === r.id)
    );
    roundWinners.push(winners);
    return { ...r, winnerUserIds: winners };
  });

  const eventSubs = db.submissions.filter((s) =>
    rounds.some((r) => r.id === s.roundId)
  );
  const eventRatings = db.ratings.filter((rt) =>
    rounds.some((r) => r.id === rt.roundId)
  );
  const broscar = computeBroscar(roundWinners, upvotesByUserFrom(eventSubs, eventRatings));

  const updatedEvents = db.events.map((e) =>
    e.id === event.id
      ? { ...e, status: "complete" as const, broscarUserIds: broscar.championUserIds }
      : e
  );

  return { ...db, rounds: updatedRounds, events: updatedEvents };
}

// ---- mutations ------------------------------------------------------------
// Mutations are async/Promise-returning so the DataApi contract matches the
// eventual Supabase adapter (real inserts are async); the in-memory bodies run
// synchronously and resolve immediately.
export const actions = {
  async submitVideo(roundId: string, userId: string, caption: string) {
    const round = state.db.rounds.find((r) => r.id === roundId);
    if (!round) return;
    if (state.db.submissions.some((s) => s.roundId === roundId && s.userId === userId)) return;
    const user = state.db.users.find((u) => u.id === userId);
    const sub: Submission = {
      id: nextId("s"),
      roundId,
      userId,
      tileFrom: "#241a33",
      tileTo: user?.avatarColor ?? "#e4b04a",
      caption: caption.trim() || "My entry",
      durationSec: 10 + Math.floor(Math.random() * 20),
      createdAt: Date.now(),
    };
    commit({ ...state, db: { ...state.db, submissions: [...state.db.submissions, sub] } });
  },

  async createEvent(groupId: string, hostId: string, title: string, promptIds: string[], deadline: number) {
    const eventId = nextId("e");
    const rounds: Round[] = promptIds.map((promptId, i) => ({
      id: nextId("r"),
      eventId,
      promptId,
      themeId: state.db.prompts.find((p) => p.id === promptId)?.themeId ?? "",
      roundOrder: i,
      winnerUserIds: [],
    }));
    const event: Event = {
      id: eventId,
      groupId,
      title: title.trim() || "Untitled Night",
      date: deadline + 1 * 24 * 60 * 60 * 1000,
      deadline,
      status: "upcoming",
      hostId,
      roundIds: rounds.map((r) => r.id),
      broscarUserIds: [],
    };
    commit({
      ...state,
      db: {
        ...state.db,
        events: [...state.db.events, event],
        rounds: [...state.db.rounds, ...rounds],
      },
    });
    return eventId;
  },

  async updateProfile(userId: string, patch: { name?: string; avatarColor?: string }) {
    const users = state.db.users.map((u) => {
      if (u.id !== userId) return u;
      const name = patch.name?.trim() || u.name;
      const initials = name
        .split(/\s+/)
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase() ?? "")
        .join("");
      return { ...u, name, initials: initials || u.initials, avatarColor: patch.avatarColor ?? u.avatarColor };
    });
    commit({ ...state, db: { ...state.db, users } });
  },

  async startLiveEvent(eventId: string) {
    const events = state.db.events.map((e) =>
      e.id === eventId ? { ...e, status: "live" as const } : e
    );
    commit({
      db: { ...state.db, events },
      live: { eventId, phase: "round-intro", roundIndex: 0, submissionIndex: 0, videoStartedAt: null },
    });
  },

  async castRating(roundId: string, submissionId: string, raterId: string, value: RatingValue) {
    const sub = state.db.submissions.find((s) => s.id === submissionId);
    if (!sub || sub.userId === raterId) return; // no self-rating
    if (state.db.ratings.some((r) => r.submissionId === submissionId && r.raterId === raterId)) return;
    const rating = { id: nextId("rt"), roundId, submissionId, raterId, value };
    commit({ ...state, db: { ...state.db, ratings: [...state.db.ratings, rating] } });
  },

  /** Dev control: fill remaining eligible ratings for the current video (bots). */
  async castBotRatings() {
    const { db, live } = state;
    const event = findEvent(db, live.eventId);
    if (!event || live.phase !== "playing") return;
    const round = db.rounds.find((r) => r.id === event.roundIds[live.roundIndex]);
    if (!round) return;
    const order = playOrder(db, round.id);
    const sub = order[live.submissionIndex];
    if (!sub) return;
    const eligible = eligibleRaterIds(db, event.groupId, sub.userId);
    const already = new Set(
      db.ratings.filter((r) => r.submissionId === sub.id).map((r) => r.raterId)
    );
    const newRatings = eligible
      .filter((id) => !already.has(id))
      .map((id) => {
        const roll = Math.random();
        const value: RatingValue = roll < 0.55 ? 1 : roll < 0.85 ? 0 : -1;
        return { id: nextId("rt"), roundId: round.id, submissionId: sub.id, raterId: id, value };
      });
    if (newRatings.length === 0) return;
    commit({ ...state, db: { ...db, ratings: [...db.ratings, ...newRatings] } });
  },

  /** Advance the live night one logical step. Driven by the TV. */
  async advance() {
    const { db, live } = state;
    const event = findEvent(db, live.eventId);
    if (!event) return;

    if (live.phase === "round-intro") {
      commit({ ...state, live: { ...live, phase: "playing", submissionIndex: 0, videoStartedAt: Date.now() } });
      return;
    }

    if (live.phase === "playing") {
      const round = db.rounds.find((r) => r.id === event.roundIds[live.roundIndex]);
      const order = round ? playOrder(db, round.id) : [];
      if (live.submissionIndex + 1 < order.length) {
        commit({ ...state, live: { ...live, submissionIndex: live.submissionIndex + 1, videoStartedAt: Date.now() } });
      } else {
        commit({ ...state, live: { ...live, phase: "round-results", videoStartedAt: null } });
      }
      return;
    }

    if (live.phase === "round-results") {
      if (live.roundIndex + 1 < event.roundIds.length) {
        commit({ ...state, live: { ...live, roundIndex: live.roundIndex + 1, phase: "round-intro", submissionIndex: 0, videoStartedAt: null } });
      } else {
        commit({ ...state, live: { ...live, phase: "broscar", videoStartedAt: null } });
      }
      return;
    }

    if (live.phase === "broscar") {
      const finalizedDb = finalizeEvent(db, event);
      commit({
        db: finalizedDb,
        live: { eventId: null, phase: "idle", roundIndex: 0, submissionIndex: 0, videoStartedAt: null },
      });
    }
  },
};

export { ROUND_SECONDS, eligibleRaterIds, roundSubmissions };
