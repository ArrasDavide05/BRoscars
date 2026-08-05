import { describe, it, expect, beforeEach, vi } from "vitest";

// The store is a module-level singleton seeded at import. Reset modules and
// re-import before each test so every case starts from a fresh seed.
let store: typeof import("@/lib/data/store");

beforeEach(async () => {
  vi.resetModules();
  store = await import("@/lib/data/store");
});

const subs = () => store.getSnapshot().db.submissions;
const countIn = (roundId: string) => subs().filter((s) => s.roundId === roundId).length;

// In the seed, only alex/bella/chris submit to the e_pre rounds, so dana/eli/fiona are open.
describe("submitVideo", () => {
  it("adds one submission for a member who has not submitted", async () => {
    const before = countIn("r_e_pre_1");
    await store.actions.submitVideo("r_e_pre_1", "u_dana", "hello");
    const rows = subs().filter((s) => s.roundId === "r_e_pre_1" && s.userId === "u_dana");
    expect(countIn("r_e_pre_1")).toBe(before + 1);
    expect(rows).toHaveLength(1);
    expect(rows[0].caption).toBe("hello");
  });

  it("is a no-op when the member already submitted to that round", async () => {
    const before = countIn("r_e_live_1"); // all 6 already submitted in seed
    await store.actions.submitVideo("r_e_live_1", "u_alex", "again");
    expect(countIn("r_e_live_1")).toBe(before);
  });

  it("falls back to 'My entry' for an empty/whitespace caption", async () => {
    await store.actions.submitVideo("r_e_pre_1", "u_eli", "   ");
    const row = subs().find((s) => s.roundId === "r_e_pre_1" && s.userId === "u_eli");
    expect(row?.caption).toBe("My entry");
  });

  it("trims the caption", async () => {
    await store.actions.submitVideo("r_e_pre_1", "u_fiona", "  neat  ");
    const row = subs().find((s) => s.roundId === "r_e_pre_1" && s.userId === "u_fiona");
    expect(row?.caption).toBe("neat");
  });

  it("is a no-op for an unknown round", async () => {
    const before = subs().length;
    await store.actions.submitVideo("r_does_not_exist", "u_alex", "x");
    expect(subs().length).toBe(before);
  });
});
