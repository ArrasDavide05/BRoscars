# BRoscars — v1.0 → Supabase Readiness Report

## 1. Executive summary

The data layer is well-isolated: a single public module (`src/lib/data/index.tsx`) fronts a private in-memory store (`store.ts`) and seed data (`seed.ts`), while the domain functions under `src/lib/domain/*.ts` are pure and reusable. Because every screen reads and writes through that one seam, swapping the in-memory store for Supabase is a **low-risk change — provided a handful of app-level seams are tightened first**. This review found one real bug in the current prototype: the TV "Start the night" button has no host check. **No schema or migration has been written** — that is the separately approved next step. Nothing in the codebase has been changed; this report is the plan awaiting your approval.

---

## 2. Architecture: integration analysis (from architect)

The app's TypeScript types and the intended Supabase schema line up cleanly in most places, but several shapes must be mapped by the adapter. The domain functions (`src/lib/domain/*.ts`) are **reused verbatim, with zero changes**.

### Field / shape mismatch map

| App type (file:line) | App shape | Schema target | Flag |
|---|---|---|---|
| `User.careerBaseline` (`types.ts:9-13`) | nested object | flat `baseline_*` columns | **MISMATCH** — flatten in adapter |
| `Theme.promptIds` (`types.ts:27`) | `string[]` | `prompts` child rows (FK `theme_id`) | **MISMATCH** — array → child table |
| `Group.memberIds` (`types.ts:41`) | `string[]` | `group_members` junction | **MISMATCH** — array → junction |
| `Event.roundIds` (`types.ts:54`) | `string[]` | `rounds` child rows (FK `event_id`) | **MISMATCH** — array → child table |
| `Round.winnerUserIds` (`types.ts:62`) | `string[]` | `round_winners` junction | **MISMATCH** — array → junction |
| `Event.broscarUserIds` (`types.ts:55`) | `string[]` | `event_champions` junction | **MISMATCH** — array → junction |
| `Event.date` / `Event.deadline` (`types.ts:50-51`) | epoch-ms `number` | `timestamptz` | **MISMATCH** — adapter maps `timestamptz → ms` |
| `Round` (`types.ts:58`) | no `themeId`, no `roundOrder` | columns required | **MISMATCH** — add fields |
| Round ids (`store.ts:179-181`) | `` `${eventId}_r${i+1}` `` string | `uuid` | **MISMATCH** — encodes order in id |
| Frozen sets inline on `Event`/`Round` | inline arrays | separate `round_winners` / `event_champions` | **MISMATCH** — move to append-only tables |

### Integration issues A–F

- **A. Synchronous read surface** — *HIGH, deferred.* Every screen reads the store synchronously. Converting reads to async **is** the Supabase swap itself; not a "fix now" item.
- **B. `EventCard.tsx:93` reads `r.winnerUserIds` directly off a raw row** — *MEDIUM, fix now.* Only place a relation-array is read straight off a row; route it through an accessor.
- **C. `relDays` epoch arithmetic contract** — the date fields are epoch-ms numbers; the adapter must convert `timestamptz → ms` so `relDays` math stays correct.
- **D. `finalizeEvent` freeze write path** (`store.ts:123-155`) — currently writes frozen sets inline; post-swap becomes `INSERT` into `round_winners` / `event_champions`.
- **E. `BroadcastChannel` live model** (`store.ts:48-73`) — *deferred.* Replaced by Supabase realtime later.
- **F. Mutation return contract & ordering guarantees** — mutations return synchronously and iteration order is implicit; both must become explicit (Promises + `ORDER BY`) for the swap.

---

## 3. App-level fixes to do NOW (gated on approval) — the coder's task list

Each item lists the file, size (S/M/L), and why it de-risks the swap.

1. **[S]** `components/EventCard.tsx:93` — replace the direct `r.winnerUserIds` read with `data.getRoundWinnerUserIds(r.id)`. This is the only relation-array read taken off a raw row, so accessor-routing it now means the swap only touches the data module.
2. **[S]** `store.ts:179-181` — mint round ids via `nextId("r")` instead of `` `${eventId}_r${i+1}` ``. Stops encoding round order inside the id (which won't survive uuid keys).
3. **[M]** `types.ts:58` — add `themeId` + `roundOrder` to `Round`; populate them in `store.ts` `createEvent` and in the `seed.ts` round builders; then simplify `getThemeForRound` (`index.tsx:167-171`) to use the new field.
4. **[M]** `store.ts:158-303` + `index.tsx:97-103,220-226` — make the 7 mutations Promise-returning; `await createEvent` at `groups/[groupId]/events/new/page.tsx:42-51`. Aligns the mutation contract with async Supabase calls.
5. **[S]** `index.tsx` / `types.ts:50-51` — document the date contract (epoch-ms `number`; the adapter maps `timestamptz → ms`) to protect the `relDays` arithmetic.

**Plus a security-found bug fix:**

6. **[S]** `app/events/[eventId]/tv/page.tsx:62` — the TV "Start the night" button has **no host check** (unlike the event page at `:27` and `:76`), and `startLiveEvent` (`store.ts:221`) does zero authorization. Gate the button by `isHost` in the UI now. (Full authorization becomes RLS post-swap.)

**Explicitly NOT now:** async read conversion (that *is* the swap), moving frozen sets to app-side tables, touching `BroadcastChannel`, the migration file, auth, RLS, realtime, or real video storage.

---

## 4. Security review (from security)

### Prototype findings

| ID | Finding | Severity (now) |
|---|---|---|
| — | **XSS** — none. All output is JSX-escaped; no `dangerouslySetInnerHTML`. | INFO |
| **F1** | **Identity spoofable** — actor ids are caller parameters, never verified (`store.ts:159,177,231`; `index.tsx:111`). Root cause of all post-swap holes. | LOW (INFO in-proto) |
| **F2** | **Host-gating is UI-only** + the unguarded TV "Start the night" button (`tv/page.tsx:62`; see fix 6). | **LOW — live bug** |
| **F3** | **Pre-event privacy is presentation-only** — `getSubmissions` / `getSubmissionByUser` return all rows (`index.tsx:173-174`). | LOW |
| **F4** | **Ratings present client-side mid-round** (`index.tsx:176,182`), visible before completion. | LOW |
| **F5** | **`BroadcastChannel` unauthenticated same-origin** (`store.ts:49-73`) — can dump or overwrite the whole store. Must not ship. | LOW (escalates) |
| **F6** | **Latent CSS-injection** via unvalidated color/tile fields → `url()` exfiltration (`Avatar.tsx:12`, `VideoTile.tsx:15`). | LOW |
| **F7** | **No-self-rating / uniqueness / frozen-sets are client-only** guarantees (`store.ts:162,233,234`; `finalizeEvent`). | LOW |
| **F8** | **Invite codes use `Math.random`** (not a CSPRNG) — `invite-code.ts:7`. | LOW |

Severities are INFO/LOW in the prototype and **escalate sharply post-swap** once real users and a shared backend exist. **F2 is the one live LOW bug today.**

### Post-swap RLS intent (all 11 tables)

Every policy is keyed on `auth.uid()` and membership via `group_members`.

| Table | RLS intent |
|---|---|
| `users` | SELECT self + co-members; UPDATE self only; INSERT via signup trigger; no client DELETE. |
| `themes` | SELECT all authenticated (global presets); INSERT/UPDATE/DELETE admin/seed only. |
| `prompts` | SELECT all authenticated; INSERT/UPDATE/DELETE admin/seed only. |
| `groups` | SELECT members; UPDATE owner/host; INSERT any authed (forced `created_by = auth.uid()`); DELETE owner only. |
| `group_members` | SELECT members; INSERT via invite RPC (self-join only); DELETE self or creator. |
| `events` | SELECT members; **INSERT/UPDATE host-only** (forced `host_id = auth.uid()`); DELETE host while upcoming. |
| `rounds` | SELECT members; **INSERT/UPDATE host-only while upcoming**; DELETE host while upcoming. |
| `submissions` | **SELECT own-only until event live**, then members; INSERT own only while upcoming; unique per (round,user). |
| `ratings` | **hidden until round complete** (own row always visible); **no-self trigger**; **unique** per (submission,rater); INSERT own only, live round. |
| `round_winners` | **append-only**; **write-only at completion** (trigger); SELECT members after complete; no direct client write. |
| `event_champions` | **append-only**; **write-only at completion** (trigger); SELECT members after complete; no direct client write. |

Tricky ones to watch: `submissions` (own-only-until-live), `ratings` (hidden-until-complete + no-self trigger + unique), the two frozen tables (append-only, write-only-at-completion triggers), and `events`/`rounds` (host-only writes).

### Auth handling when magic-link lands

- Drop the `currentUserId` dev-switcher (`index.tsx:111`, `Header.tsx`).
- `users.id = auth.users.id` via a signup trigger.
- All mutations derive the actor from `auth.uid()` (kills F1) — the DataApi surface stays identical so the UI doesn't change.
- Invite join becomes a `SECURITY DEFINER` RPC using a **CSPRNG** code + rate-limit (fixes F8).
- Remove `BroadcastChannel` in favor of Supabase realtime (fixes F5).

### Must-cover-before-launch (prioritized)

1. `submissions` SELECT own-only until live.
2. Actor ids sourced from `auth.uid()`, never client params.
3. `ratings` no-self + unique + hidden-until-complete.
4. Host-only writes on `events`/`rounds`.
5. Frozen tables append-only.
6. `submissions` uniqueness enforced.
7. CSPRNG invite codes + join rate-limit.
8. Hex color validation (fixes F6).
9. Confirm `BroadcastChannel` is deleted once realtime lands.

---

## 5. Test plan (from tester)

**Current state:** no test runner installed, zero tests today (`package.json` deps are only next/react/react-dom/typescript).

**Recommendation:** Vitest (+ `@vitest/coverage-v8`, `vite-tsconfig-paths`), `"test": "vitest run"`, node environment. The store is a **module-singleton with no reset** (`store.ts:42`), so store tests must use `vi.resetModules()` + dynamic `import()` in `beforeEach`. The `@/*` alias must resolve (`tsconfig.json:17-19`). **Do not** test `BroadcastChannel`, React components, e2e flows, or the (not-yet-existing) Supabase adapter now. Tests live under `tests/`, **not** the repo root.

### Write-first shortlist (~51 cases)

| # | Suite | ~Cases |
|---|---|---|
| 1 | `tests/domain/standings.test.ts` — winner, ties, ranks, upvotes, Broscar, career | 13 |
| 2 | `tests/domain/scoring.test.ts` — net score, scoreBySubmission | 4 |
| 3 | `tests/data/freeze.test.ts` — finalize + post-completion immutability | 5 |
| 4 | `tests/data/advance.test.ts` — state machine + full walk | 8 |
| 5 | `tests/data/rating.test.ts` — dedupe / self / value + eligibility | 9 |
| 6 | `tests/data/submission.test.ts` — dedupe, caption fallback, unknown round | 5 |
| 7 | `tests/domain/shuffle.test.ts` — determinism, permutation, seeds | 4 |
| 8 | `tests/domain/invite-code.test.ts` — length/alphabet/format | 3 |

The **freeze / immutability suite (#3)** is the app-side analog of the schema's append-only triggers — prioritize it.

### Two approval questions

1. Confirm adding the Vitest devDeps + `test` script.
2. OK to cover `index.tsx` accessors via the delegated domain functions and exported store internals (no React), rather than standing up jsdom/RTL?

---

## 6. Product / differentiation ideas (from researcher)

| # | Idea | What / Why | Complexity |
|---|---|---|---|
| 1 | **Live reactions + hype meter** | Emoji reactions stream from phones onto the TV during playback, plus a live hype meter. Fixes the ~30s of silent dead air during clips — the weakest point in the loop; built on Supabase realtime broadcast (fire-and-forget). | Medium |
| 2 | **"The Envelope" + auto superlatives** | Oscars-style reveal animation plus auto-generated superlatives (Most Divisive, Dark Horse, People's Champion, Robbed) computed from data already collected. Best effort-to-payoff; gives non-winners a moment, protecting churn. | Low–Medium |
| 3 | **Persistent group rivalries / career narrative** | Head-to-head records, win streaks, reigning-champ title defense, group hall-of-fame. Cheapest long-game retention lever; turns a one-off party app into a recurring ritual. | Low |

**Priority:** build **#1 first** — it most directly delivers the "in-the-room together" feeling.

---

## 7. Recommended sequencing & what stays deferred

**Phase A — now, on approval:**
Land fixes 1–6 above, add Vitest, and write the write-first test suites. Regression-check every screen plus the two-tab live TV/phone lock-step flow (open `/tv` and `/play` in two tabs).

**Phase B — later, only when explicitly authorized:**
Build the Supabase adapter inside `store.ts` / `index.tsx` (async reads + `ORDER BY`; `finalizeEvent` → `INSERT round_winners` / `event_champions`; career/broscar as aggregate queries over the frozen tables + baselines). Then auth, RLS, realtime, video storage, and the migration file.

---

## 8. Approval checklist

Before any code changes, please approve:

- **(a)** Proceed with coder fixes 1–6 (including the TV host-check bug fix).
- **(b)** Add Vitest + the write-first test suites.
- **(c)** The accessor-testing approach: Vitest over delegated domain + exported store internals (no jsdom/RTL).
- **(d)** Which researcher idea(s) to backlog (recommended: #1 first).

**Nothing in the codebase will be changed until you approve.**
