import { describe, it, expect } from "vitest";
import { createSeedDatabase } from "@/lib/data/seed";

// Every foreign key in the seed resolves, so a future seed edit can't leave a
// dangling id that only shows up as a blank tile on some screen.
const fixedNow = Date.UTC(2026, 10, 11, 20, 0, 0);
const db = createSeedDatabase(fixedNow);

const ids = <T extends { id: string }>(rows: T[]) => new Set(rows.map((r) => r.id));
const userIds = ids(db.users);
const groupById = new Map(db.groups.map((g) => [g.id, g]));
const eventById = new Map(db.events.map((e) => [e.id, e]));
const roundById = new Map(db.rounds.map((r) => [r.id, r]));
const submissionById = new Map(db.submissions.map((s) => [s.id, s]));
const themeIds = ids(db.themes);
const promptById = new Map(db.prompts.map((p) => [p.id, p]));

const membersOfEvent = (eventId: string) => {
  const event = eventById.get(eventId);
  return groupById.get(event?.groupId ?? "")?.memberIds ?? [];
};

describe("seed integrity", () => {
  it("ids are unique per table", () => {
    for (const table of ["users", "themes", "prompts", "groups", "events", "rounds", "submissions", "ratings"] as const) {
      const rows = db[table] as { id: string }[];
      expect(new Set(rows.map((r) => r.id)).size, table).toBe(rows.length);
    }
  });

  it("themes and prompts point at each other", () => {
    for (const theme of db.themes) {
      for (const promptId of theme.promptIds) expect(promptById.get(promptId)?.themeId).toBe(theme.id);
    }
    for (const prompt of db.prompts) expect(themeIds.has(prompt.themeId), prompt.id).toBe(true);
  });

  it("group creators and members are users", () => {
    for (const group of db.groups) {
      expect(userIds.has(group.createdBy), group.id).toBe(true);
      for (const memberId of group.memberIds) expect(userIds.has(memberId), `${group.id}/${memberId}`).toBe(true);
    }
  });

  it("events point at real groups, hosts who are members, rounds and BRoscar members", () => {
    for (const event of db.events) {
      const group = groupById.get(event.groupId);
      expect(group, event.id).toBeDefined();
      expect(group!.memberIds).toContain(event.hostId);
      for (const roundId of event.roundIds) expect(roundById.get(roundId)?.eventId).toBe(event.id);
      for (const userId of event.broscarUserIds) expect(group!.memberIds).toContain(userId);
    }
  });

  it("rounds point at real events, themes and prompts of that theme", () => {
    for (const round of db.rounds) {
      expect(eventById.get(round.eventId)?.roundIds, round.id).toContain(round.id);
      expect(themeIds.has(round.themeId), round.id).toBe(true);
      expect(promptById.get(round.promptId)?.themeId, round.id).toBe(round.themeId);
      for (const userId of round.winnerUserIds) expect(membersOfEvent(round.eventId)).toContain(userId);
    }
  });

  it("submissions point at real rounds and members of the event's group, one per member per round", () => {
    const seen = new Set<string>();
    for (const sub of db.submissions) {
      const round = roundById.get(sub.roundId);
      expect(round, sub.id).toBeDefined();
      expect(membersOfEvent(round!.eventId), sub.id).toContain(sub.userId);
      const key = `${sub.roundId}:${sub.userId}`;
      expect(seen.has(key), key).toBe(false);
      seen.add(key);
    }
  });

  it("ratings point at real submissions in the same round, by other members", () => {
    const seen = new Set<string>();
    for (const rating of db.ratings) {
      const sub = submissionById.get(rating.submissionId);
      expect(sub, rating.id).toBeDefined();
      expect(sub!.roundId, rating.id).toBe(rating.roundId);
      expect(membersOfEvent(roundById.get(rating.roundId)!.eventId), rating.id).toContain(rating.raterId);
      expect(rating.raterId, rating.id).not.toBe(sub!.userId);
      const key = `${rating.submissionId}:${rating.raterId}`;
      expect(seen.has(key), key).toBe(false);
      seen.add(key);
    }
  });

  it("nudges point at real events and members", () => {
    for (const nudge of db.nudges) {
      expect(eventById.has(nudge.eventId)).toBe(true);
      expect(membersOfEvent(nudge.eventId)).toContain(nudge.fromUserId);
      expect(membersOfEvent(nudge.eventId)).toContain(nudge.toUserId);
    }
  });

  it("each speech belongs to a BRoscar winner of a complete night", () => {
    expect(db.speeches.length).toBeGreaterThan(0);
    for (const speech of db.speeches) {
      const event = eventById.get(speech.eventId);
      expect(event?.status, speech.eventId).toBe("complete");
      expect(event!.broscarUserIds).toContain(speech.userId);
    }
  });

  it("predictions point at real events, by and for members of that event's group", () => {
    expect(db.predictions.length).toBeGreaterThan(0);
    const seen = new Set<string>();
    for (const p of db.predictions) {
      expect(eventById.has(p.eventId), p.eventId).toBe(true);
      expect(membersOfEvent(p.eventId)).toContain(p.userId);
      expect(membersOfEvent(p.eventId)).toContain(p.pickedUserId);
      const key = `${p.eventId}:${p.userId}`;
      expect(seen.has(key), key).toBe(false);
      seen.add(key);
    }
  });
});
