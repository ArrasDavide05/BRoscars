// In-memory seed data. Imported ONLY by src/lib/data/store.ts.
// Rich enough that every screen is populated offline on first load.

import {
  computeBroscar,
  computeRoundWinnerUserIds,
  upvotesByUserFrom,
} from "@/lib/domain/standings";
import type {
  Database,
  Prompt,
  Rating,
  RatingValue,
  Round,
  Submission,
  Theme,
  User,
} from "./types";

const DAY = 24 * 60 * 60 * 1000;

/** 20-theme preset library, each with ~3 prompts. */
const THEME_LIBRARY: [string, string[]][] = [
  ["Alcohol", ["Best night out video", "Best drunk video", "Worst blackout"]],
  ["Work", ["Funniest work video", "Best work edit", "Work incident"]],
  ["Gym", ["Biggest lift", "Worst gym fail", "Best transformation"]],
  ["Food", ["Best home cook", "Worst cooking attempt", "Weirdest thing eaten"]],
  ["Pets", ["Best pet cameo", "Funniest animal fail", "Cutest moment"]],
  ["Sports", ["Best trick shot", "Worst injury", "Clutch moment"]],
  ["Travel", ["Best view", "Travel disaster", "Sketchiest place stayed"]],
  ["Gaming", ["Best clutch play", "Rage quit", "Funniest glitch"]],
  ["Fashion", ["Best fit", "Worst outfit", "Best thrift find"]],
  ["Dance", ["Best moves", "Worst dance", "Group routine"]],
  ["Pranks", ["Best prank", "Prank gone wrong", "Revenge prank"]],
  ["Cars", ["Best drive", "Car fail", "Worst parking"]],
  ["Music", ["Best cover", "Worst singing", "Surprise talent"]],
  ["Nature", ["Best sunset", "Wildlife encounter", "Extreme weather"]],
  ["DIY", ["Best build", "DIY disaster", "Best life hack"]],
  ["Nightlife", ["Best dance floor", "Worst club moment", "Queue chaos"]],
  ["Romance", ["Best date", "Dating disaster", "Worst pickup line"]],
  ["Family", ["Funniest kid moment", "Family chaos", "Grandparent gold"]],
  ["Fails", ["Best faceplant", "Slapstick moment", "Instant karma"]],
  ["Talent", ["Hidden talent", "Weird skill", "Best party trick"]],
];

interface MemberSeed {
  id: string;
  name: string;
  initials: string;
  avatarColor: string;
  dark: string; // tile base color
  careerBaseline: User["careerBaseline"];
}

const MEMBERS: MemberSeed[] = [
  { id: "u_alex", name: "Alex Rivera", initials: "AR", avatarColor: "#E4B04A", dark: "#3a2f5b", careerBaseline: { crowns: 7, broscars: 1, upvotes: 120 } },
  { id: "u_bella", name: "Bella Chen", initials: "BC", avatarColor: "#6C8AE4", dark: "#1f3a5b", careerBaseline: { crowns: 9, broscars: 2, upvotes: 150 } },
  { id: "u_chris", name: "Chris Okafor", initials: "CO", avatarColor: "#5FB98E", dark: "#153b2e", careerBaseline: { crowns: 12, broscars: 3, upvotes: 190 } },
  { id: "u_dana", name: "Dana Kim", initials: "DK", avatarColor: "#D06BA3", dark: "#4a2140", careerBaseline: { crowns: 5, broscars: 0, upvotes: 90 } },
  { id: "u_eli", name: "Eli Torres", initials: "ET", avatarColor: "#C96F5A", dark: "#3f221b", careerBaseline: { crowns: 6, broscars: 1, upvotes: 110 } },
  { id: "u_fiona", name: "Fiona Walsh", initials: "FW", avatarColor: "#8E7CC3", dark: "#2e2450", careerBaseline: { crowns: 4, broscars: 0, upvotes: 70 } },
];

const CAPTIONS = [
  "You had to be there", "No regrets", "Peak chaos", "Send help",
  "Absolute cinema", "Not my finest", "Worth it", "Caught in 4K",
  "The legend grows", "Certified disaster", "10/10 would repeat", "Why did I film this",
];

/** Small deterministic PRNG so seeded results are stable across reloads. */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function captionFor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return CAPTIONS[h % CAPTIONS.length];
}

export function createSeedDatabase(now: number): Database {
  const users: User[] = MEMBERS.map((m) => ({
    id: m.id,
    name: m.name,
    initials: m.initials,
    avatarColor: m.avatarColor,
    careerBaseline: m.careerBaseline,
  }));
  const darkOf = (userId: string) => MEMBERS.find((m) => m.id === userId)!.dark;
  const colorOf = (userId: string) => MEMBERS.find((m) => m.id === userId)!.avatarColor;

  // Theme library
  const themes: Theme[] = [];
  const prompts: Prompt[] = [];
  THEME_LIBRARY.forEach(([name, texts], ti) => {
    const themeId = `t_${ti + 1}`;
    const promptIds: string[] = [];
    texts.forEach((text, pi) => {
      const promptId = `p_${ti + 1}_${pi + 1}`;
      promptIds.push(promptId);
      prompts.push({ id: promptId, themeId, text });
    });
    themes.push({ id: themeId, name, promptIds });
  });

  const memberIds = MEMBERS.map((m) => m.id);
  const groups = [
    {
      id: "g_crew",
      name: "Friday Night Crew",
      inviteCode: "OSCR2026",
      createdBy: "u_alex",
      memberIds,
    },
  ];

  const rounds: Round[] = [];
  const submissions: Submission[] = [];
  const ratings: Rating[] = [];
  let ratingSeq = 0;

  const makeSubmission = (roundId: string, userId: string, when: number): Submission => {
    const s: Submission = {
      id: `s_${roundId}_${userId}`,
      roundId,
      userId,
      tileFrom: darkOf(userId),
      tileTo: colorOf(userId),
      caption: captionFor(`${roundId}:${userId}`),
      durationSec: 8 + (Math.abs(hash(`${roundId}${userId}`)) % 22),
      createdAt: when,
    };
    submissions.push(s);
    return s;
  };

  // Builds an event's rounds; picks one prompt from each of `themeIndices`.
  const buildRounds = (eventId: string, themeIndices: number[]): Round[] => {
    return themeIndices.map((ti, i) => {
      const theme = themes[ti];
      const promptId = theme.promptIds[i % theme.promptIds.length];
      const r: Round = { id: `r_${eventId}_${i + 1}`, eventId, promptId, themeId: theme.id, roundOrder: i, winnerUserIds: [] };
      rounds.push(r);
      return r;
    });
  };

  // ---- PAST / COMPLETE event (~1 month ago): full submissions + ratings + frozen winners.
  const pastId = "e_past";
  const pastRounds = buildRounds(pastId, [0, 1, 2, 4, 18, 19]); // Alcohol, Work, Gym, Pets, Fails, Talent
  const rng = mulberry32(20260601); // fixed seed -> deterministic frozen results
  const favoredPerRound = ["u_chris", "u_bella", "u_chris", "u_dana", "u_eli", "u_chris"];

  pastRounds.forEach((round, ri) => {
    const subs = memberIds.map((uid) => makeSubmission(round.id, uid, now - 32 * DAY));
    const favored = favoredPerRound[ri];
    for (const sub of subs) {
      for (const rater of memberIds) {
        if (rater === sub.userId) continue; // no self-rating
        const roll = rng();
        const boost = sub.userId === favored;
        let value: RatingValue;
        if (boost) value = roll < 0.82 ? 1 : roll < 0.94 ? 0 : -1;
        else value = roll < 0.42 ? 1 : roll < 0.78 ? 0 : -1;
        ratings.push({
          id: `rt_${++ratingSeq}`,
          roundId: round.id,
          submissionId: sub.id,
          raterId: rater,
          value,
        });
      }
    }
    // Freeze this round's winner(s) from the generated ratings.
    round.winnerUserIds = computeRoundWinnerUserIds(
      subs,
      ratings.filter((rt) => rt.roundId === round.id)
    );
  });

  const pastSubs = submissions.filter((s) => s.roundId.startsWith(`r_${pastId}_`));
  const pastRatings = ratings.filter((rt) => rt.roundId.startsWith(`r_${pastId}_`));
  const pastBroscar = computeBroscar(
    pastRounds.map((r) => r.winnerUserIds),
    upvotesByUserFrom(pastSubs, pastRatings)
  );

  // ---- LIVE-READY event: all submitted, no ratings yet, host can Start now.
  const liveId = "e_live";
  const liveRounds = buildRounds(liveId, [3, 5, 6, 7, 10, 9]); // Food, Sports, Travel, Gaming, Pranks, Dance
  liveRounds.forEach((round) => {
    memberIds.forEach((uid) => makeSubmission(round.id, uid, now - 2 * DAY));
  });

  // ---- PRE-EVENT (upcoming): future deadline, partial submissions.
  const preId = "e_pre";
  const preRounds = buildRounds(preId, [11, 12, 13, 14, 16, 15]); // Cars, Music, Nature, DIY, Romance, Nightlife
  const preSubmitters = ["u_alex", "u_bella", "u_chris"]; // others haven't submitted yet
  preRounds.forEach((round) => {
    preSubmitters.forEach((uid) => makeSubmission(round.id, uid, now - 6 * 60 * 60 * 1000));
  });

  const events = [
    {
      id: pastId,
      groupId: "g_crew",
      title: "March Madness Night",
      date: now - 30 * DAY,
      deadline: now - 31 * DAY,
      status: "complete" as const,
      hostId: "u_alex",
      roundIds: pastRounds.map((r) => r.id),
      broscarUserIds: pastBroscar.championUserIds,
    },
    {
      id: liveId,
      groupId: "g_crew",
      title: "Friday Night Live",
      date: now,
      deadline: now - 1 * DAY,
      status: "upcoming" as const,
      hostId: "u_alex",
      roundIds: liveRounds.map((r) => r.id),
      broscarUserIds: [],
    },
    {
      id: preId,
      groupId: "g_crew",
      title: "Next Weekend Bash",
      date: now + 7 * DAY,
      deadline: now + 5 * DAY,
      status: "upcoming" as const,
      hostId: "u_alex",
      roundIds: preRounds.map((r) => r.id),
      broscarUserIds: [],
    },
  ];

  return { users, themes, prompts, groups, events, rounds, submissions, ratings };
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0;
  return h;
}
