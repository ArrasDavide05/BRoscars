import { describe, it, expect, beforeEach, vi } from "vitest";
import { formatInviteCode } from "@/lib/domain/invite-code";

// The store is a module-level singleton seeded at import. Reset modules and
// re-import before each test so every case starts from a fresh seed.
let store: typeof import("@/lib/data/store");

beforeEach(async () => {
  vi.resetModules();
  store = await import("@/lib/data/store");
});

const db = () => store.getSnapshot().db;
const group = (id: string) => db().groups.find((g) => g.id === id)!;

describe("createGroup", () => {
  it("creates a group with the creator as the only member", async () => {
    const before = db().groups.length;
    const id = await store.actions.createGroup("u_bella", "  Taco   Tuesday ");
    expect(db().groups).toHaveLength(before + 1);
    expect(group(id)).toMatchObject({ name: "Taco Tuesday", createdBy: "u_bella", memberIds: ["u_bella"] });
  });

  it("mints an 8-char invite code that is unique across groups", async () => {
    const ids = [];
    for (let i = 0; i < 5; i++) ids.push(await store.actions.createGroup("u_bella", `Group ${i}`));
    const codes = db().groups.map((g) => g.inviteCode);
    for (const id of ids) expect(group(id).inviteCode).toHaveLength(8);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("retries when the generated code collides with an existing one", async () => {
    const seq = [0, 0, 0.5];
    let call = 0;
    // First 8 draws reproduce an existing all-zeros code; later draws differ.
    const spy = vi.spyOn(Math, "random").mockImplementation(() => seq[Math.min(Math.floor(call++ / 8), 2)]);
    try {
      const a = await store.actions.createGroup("u_bella", "First");
      call = 0;
      const b = await store.actions.createGroup("u_bella", "Second");
      expect(group(a).inviteCode).toBe("00000000");
      expect(group(b).inviteCode).not.toBe("00000000");
    } finally {
      spy.mockRestore();
    }
  });

  it("rejects an invalid name without adding a group", async () => {
    const before = db().groups;
    await expect(store.actions.createGroup("u_bella", "   ")).rejects.toThrow();
    await expect(store.actions.createGroup("u_bella", "x".repeat(41))).rejects.toThrow();
    expect(db().groups).toEqual(before);
  });
});

describe("joinGroupByCode", () => {
  it("joins with a lower-case dashed code", async () => {
    const id = await store.actions.createGroup("u_bella", "Taco Tuesday");
    const typed = formatInviteCode(group(id).inviteCode).toLowerCase();
    expect(await store.actions.joinGroupByCode("u_chris", typed)).toEqual({ ok: true, groupId: id });
    expect(group(id).memberIds).toEqual(["u_bella", "u_chris"]);
  });

  it("a second join reports already-member and doesn't duplicate", async () => {
    const id = await store.actions.createGroup("u_bella", "Taco Tuesday");
    const code = group(id).inviteCode;
    await store.actions.joinGroupByCode("u_chris", code);
    expect(await store.actions.joinGroupByCode("u_chris", code)).toEqual({ ok: false, reason: "already-member" });
    expect(group(id).memberIds).toEqual(["u_bella", "u_chris"]);
  });

  it("the creator joining their own group is already-member", async () => {
    const id = await store.actions.createGroup("u_bella", "Taco Tuesday");
    expect(await store.actions.joinGroupByCode("u_bella", group(id).inviteCode)).toEqual({
      ok: false,
      reason: "already-member",
    });
  });

  it("garbage and blank codes are not-found", async () => {
    const before = db().groups;
    expect(await store.actions.joinGroupByCode("u_chris", "nope-nope")).toEqual({ ok: false, reason: "not-found" });
    expect(await store.actions.joinGroupByCode("u_chris", "   ")).toEqual({ ok: false, reason: "not-found" });
    expect(db().groups).toEqual(before);
  });

  it("the seed code typed as oscr-2026 matches g_crew", async () => {
    const memberId = group("g_crew").memberIds[0];
    expect(await store.actions.joinGroupByCode(memberId, "oscr-2026")).toEqual({
      ok: false,
      reason: "already-member",
    });
    expect(await store.actions.joinGroupByCode("u_newbie", "0SCR2026")).toEqual({ ok: true, groupId: "g_crew" });
    expect(group("g_crew").memberIds).toContain("u_newbie");
  });

  it("membership of a user-created group doesn't leak into g_crew", async () => {
    const crewBefore = group("g_crew").memberIds;
    const id = await store.actions.createGroup("u_outsider", "Outsiders");
    await store.actions.joinGroupByCode("u_stranger", group(id).inviteCode);
    expect(group("g_crew").memberIds).toEqual(crewBefore);
    expect(group(id).memberIds).toEqual(["u_outsider", "u_stranger"]);
  });
});
