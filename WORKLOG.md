# BRoscars — Session Worklog (2026-07-02)

A record of what was done this session: the swarm, each agent's job, and the
concrete code changes. Companion to `REPORT.md` (the full readiness plan) and
`IDEAS.md` (backlog).

## 1. Goal of the session

Take the v1.0 prototype (`version_1.0v`, Next.js 14 + React, in-memory) toward a
Supabase backend. Two prior steps had produced a review-hardened 11-table schema
(design only, no migration). This session: (1) run a coordinated agent swarm to
analyze the codebase against that schema and produce a plan, then (2) on approval,
implement the app-level fixes + a test suite. The Supabase migration itself stays
deferred.

## 2. The swarm — who did what

All agents ran on Claude Opus 4.8 as background subagents, coordinating back to the
lead (this session) via messages. Flow: architect first → security + tester built on
its findings → researcher independent → reporter last.

| Agent | Role | Output |
|-------|------|--------|
| **architect** | Reviewed `version_1.0v` structure against the 11-table schema | Field/shape mismatch map (arrays-as-relations, epoch-ms vs timestamptz, inline frozen sets, string ids vs uuid), integration issues A–F, and a bounded "fix now" list with file:line + sizes. Found the data layer well-isolated → low-risk swap. |
| **researcher** | Competitive analysis (Jackbox/Kahoot/BeReal/Houseparty), independent | 3 differentiation ideas: (1) live TV reactions + hype meter, (2) "The Envelope" reveal + auto-superlatives, (3) persistent group rivalries. Recommended #1 first. |
| **security** | Read-only security review + post-swap RLS intent | 8 findings F1–F8 (all INFO/LOW in the offline prototype, escalating post-swap). **Found one live bug:** the TV "Start the night" button had no host check. Per-table RLS intent for all 11 tables; auth-handling changes for magic-link. |
| **tester** | Test-coverage plan (no code) | Recommended Vitest; identified the store-singleton reset constraint; ~51 concrete given/when/then cases across 8 suites, prioritizing the freeze/immutability suite. |
| **reporter** | Consolidated everything into `REPORT.md` | Its file Write was blocked by harness policy (subagent-authored .md), so it returned the content and the lead saved `REPORT.md` (correcting a domain path the reporter got wrong: `src/lib/domain/*`, not `src/lib/data/domain/*`). |

## 3. What the lead (main session) did

- Explored the codebase directly first (`types.ts`, `index.tsx`, `store.ts`, `seed.ts`,
  `scoring.ts`, `standings.ts`, components) to ground the briefs and sanity-check agents.
- Orchestrated the swarm in waves; relayed each agent's output; held all code changes
  until the user approved the plan.
- Wrote `REPORT.md` (after the reporter's write was blocked) and later implemented
  everything below.

## 4. Code changes implemented (after user approval)

### (a) Six app-level fixes — de-risk the future Supabase swap
1. `src/components/EventCard.tsx:93` — winners via `data.getRoundWinnerUserIds(r.id)`
   instead of the raw `r.winnerUserIds` (removed the only relation-array read off a raw row).
2. `src/lib/data/store.ts` — round ids via `nextId("r")` instead of `` `${eventId}_r${i+1}` ``.
3. `src/lib/data/types.ts` + `store.ts` + `seed.ts` + `index.tsx` — added `themeId` +
   `roundOrder` to `Round`; populated in `createEvent` and the seed builder; simplified
   `getThemeForRound`.
4. `src/lib/data/store.ts` (7 mutations) + `index.tsx` (DataApi) + `events/new/page.tsx` —
   mutations are now `Promise`-returning; `createEvent` awaited at its caller. Behavior
   unchanged (bodies still synchronous).
5. `src/lib/data/types.ts` + `index.tsx` — documented the date contract (epoch-ms number;
   adapter maps timestamptz → ms) protecting `relDays` arithmetic.
6. `src/app/events/[eventId]/tv/page.tsx` — Start button gated by `isHost` (security bug fix).

### (b) Vitest + tests
- Added `vitest.config.ts` (node env; manual `@`→`src` alias — dropped the ESM-only
  `vite-tsconfig-paths` plugin that broke config loading).
- `package.json` — `test` / `test:watch` / `coverage` scripts; devDeps `vitest`,
  `@vitest/coverage-v8`.
- 8 suites, 50 tests: `tests/domain/{scoring,standings,shuffle,invite-code}.test.ts`,
  `tests/data/{submission,rating,advance,freeze}.test.ts`. Store tests reset the module
  singleton via `vi.resetModules()` + dynamic import.

### (d) Backlog
- `IDEAS.md` — idea #1 (live reactions) parked; depends on Phase B realtime. Not built.

## 5. Verification

- `npm test` → **8 files, 50 tests passed**.
- `npx tsc --noEmit` → exit 0.
- `next build` NOT run this session (heavier; tsc covered the type surface).

## 6. Explicitly NOT done (deferred by design / phase rules)

Supabase migration file / SQL, auth (magic link, `auth.users`), RLS policies, realtime
transport (BroadcastChannel → Supabase Realtime), real video upload/storage. All are
Phase B, to start only when explicitly authorized.

## 7. Deviations / honest notes

- Landed **50** tests vs the tester's ~51 estimate — the `getVideoRatingState` accessor
  lives inside the React provider, so those cases were folded into `eligibleRaterIds` + a
  functional "all eligible rated" proxy (the approved no-jsdom approach).
- `npm install` reported pre-existing dependency audit warnings; not addressed (out of scope).
- The "swarm" was a coordinated wave pipeline of Agent subagents, not the ruflo
  `swarm_init` topology; models were all Opus 4.8 (no Haiku/Sonnet tier routing).
