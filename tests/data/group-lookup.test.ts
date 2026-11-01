import { describe, it, expect, beforeEach, vi } from "vitest";
import { findByInviteCode, inviteLinkPath } from "@/lib/domain/invite-code";

// getGroupByInviteCode lives inside the React provider and is exactly
// findByInviteCode(db.groups, code); check it against the real seed.
let store: typeof import("@/lib/data/store");

beforeEach(async () => {
  vi.resetModules();
  store = await import("@/lib/data/store");
});

const groups = () => store.getSnapshot().db.groups;

describe("group lookup by invite code (seed)", () => {
  it("/join/oscr2026, /join/OSCR-2026 and /join/OSCR2026 all find Friday Night Crew", () => {
    for (const code of ["oscr2026", "OSCR-2026", "OSCR2026"]) {
      expect(findByInviteCode(groups(), code)?.name).toBe("Friday Night Crew");
    }
  });

  it("an unknown code finds nothing", () => {
    expect(findByInviteCode(groups(), "ZZZZ-ZZZZ")).toBeUndefined();
  });

  it("a freshly created group is found via its own link path", async () => {
    const id = await store.actions.createGroup("u_bella", "Taco Tuesday");
    const code = groups().find((g) => g.id === id)!.inviteCode;
    const fromLink = decodeURIComponent(inviteLinkPath(code).slice("/join/".length));
    expect(findByInviteCode(groups(), fromLink)?.id).toBe(id);
  });

  it("lookup is read-only and agrees with what joinGroupByCode joins", async () => {
    const before = groups();
    const found = findByInviteCode(groups(), "oscr-2026");
    expect(groups()).toBe(before);
    expect(await store.actions.joinGroupByCode("u_newbie", "oscr-2026")).toEqual({ ok: true, groupId: found!.id });
  });
});
