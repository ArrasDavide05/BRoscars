# BRoscars — Session Status

Written 2026-08-05. Catch-up report for the state left by the 2026-07-02 session.
Sources: `WORKLOG.md`, `REPORT.md`, `IDEAS.md`, `CLAUDE.md`, plus live verification runs.

---

## 0. Reconstruction caveat

**This project is not under version control.** There is no `.git` anywhere in
`E:\Claude_agent` or `E:\Claude_agent\Version_1.0v`, so `git log` / `git status` /
`gh issue|pr list` produced nothing. Everything below was reconstructed from the
markdown artifacts the last session left behind and from re-running the toolchain.

---

## 1. What happened last session

**Goal:** move the v1.0 Next.js prototype (in-memory, offline) toward a future Supabase
backend — without starting the migration. A prior step had produced an 11-table schema
design (design only, never written as SQL).

### The swarm — what each agent did

| Agent | Did | Flagged |
|---|---|---|
| **architect** | Mapped the app's TypeScript types against the 11-table schema | 10 shape mismatches (arrays-as-relations, epoch-ms vs `timestamptz`, inline frozen sets, string ids vs uuid); integration issues A–F. Verdict: data layer is well-isolated → low-risk swap |
| **security** | Read-only review + post-swap RLS intent | 8 findings F1–F8, all INFO/LOW while offline but escalating post-swap. **One live bug:** TV "Start the night" button had no host check |
| **tester** | Test-coverage plan (no code) | Recommended Vitest; flagged the store module-singleton reset constraint; ~51 cases across 8 suites |
| **researcher** | Competitive analysis (Jackbox/Kahoot/BeReal) | 3 differentiation ideas; recommended live TV reactions + hype meter first |
| **reporter** | Consolidate into `REPORT.md` | Its file write was blocked by harness policy; the lead saved the file instead and corrected a wrong domain path |

### What actually got built (after user approval)

Six app-level fixes, all aimed at de-risking the future Supabase swap:

1. `src/components/EventCard.tsx:93` — winners now read via `data.getRoundWinnerUserIds(r.id)` instead of the raw `r.winnerUserIds` (removed the last relation-array read off a raw row)
2. `src/lib/data/store.ts` — round ids minted via `nextId("r")`, no longer `` `${eventId}_r${i+1}` `` (order was encoded in the id, which won't survive uuids)
3. `types.ts` + `store.ts` + `seed.ts` + `index.tsx` — added `themeId` + `roundOrder` to `Round`; `getThemeForRound` simplified
4. `store.ts` (7 mutations) + `index.tsx` + `events/new/page.tsx` — mutations now return Promises; `createEvent` awaited. Bodies still synchronous, behavior unchanged
5. `types.ts` + `index.tsx` — documented the date contract (epoch-ms number; adapter maps `timestamptz → ms`) to protect `relDays` math
6. `src/app/events/[eventId]/tv/page.tsx` — **security fix:** Start button gated by `isHost`

Plus: Vitest wired up (`vitest.config.ts`, `test`/`test:watch`/`coverage` scripts) and
**8 test suites / 50 tests** under `tests/`.

---

## 2. Found but NOT acted on

### Security findings still open (all deliberate — they're prototype-only)

| ID | Finding | Note |
|---|---|---|
| F1 | Actor ids are caller parameters, never verified | Root cause of every post-swap hole; dies when `auth.uid()` lands |
| F3 | Pre-event privacy is presentation-only — `getSubmissions` returns all rows | Needs RLS |
| F4 | Ratings present client-side mid-round | Needs RLS |
| F5 | `BroadcastChannel` unauthenticated same-origin — can dump/overwrite the store | **Must not ship**; deleted when realtime lands |
| F6 | Latent CSS injection via unvalidated color/tile fields → `url()` exfiltration | Needs hex validation |
| F7 | No-self-rating / uniqueness / frozen sets are client-only guarantees | Needs DB triggers |
| F8 | Invite codes use `Math.random`, not a CSPRNG | `invite-code.ts:7` |

Only **F2** (the TV host check) was fixed. The rest are correctly parked until Phase B.

### Parked product ideas

- **#1 live reactions + hype meter** — in `IDEAS.md`, blocked on Phase B realtime
- **#2 "The Envelope" reveal + auto-superlatives** — mentioned in `REPORT.md` §6 only, not backlogged
- **#3 persistent group rivalries** — same, not backlogged

### Deferred by design (Phase B, needs explicit authorization)

Supabase migration SQL, auth/magic-link, RLS policies, realtime transport, real video
upload/storage, and the async read conversion (issue A — that conversion *is* the swap).

---

## 3. Left half-finished / loose ends

- **`next build` was never run last session** — WORKLOG §5 admits this; only `tsc --noEmit`
  was used. It turns out the build **does not pass** (see §4)
- **7 zero-byte junk files in the project root** — `s.id`, `r.id`, `r.id)`, `r.submissionId`,
  `s.roundId`, `1`, `finalize`. These are accidental shell-redirect artifacts from last
  session, not code. Safe to delete
- **3 extraneous npm packages installed but not in `package.json`** — `vite-tsconfig-paths`,
  `tsconfck`, `globrex`. Leftovers from the abandoned Vitest plugin approach
- **50 tests landed vs the tester's ~51 plan** — `getVideoRatingState` lives inside the React
  provider, so those cases were folded into `eligibleRaterIds` (approved no-jsdom approach)

---

## 4. Localhost readiness

| Check | Result |
|---|---|
| **Dependencies** | ✅ In sync — `next@14.2.5`, `react@18.3.1`, `vitest@2.1.9`, `typescript@5.5.3` all installed at the declared versions. No install needed. 3 extraneous packages (harmless) |
| **Env vars** | ✅ N/A — no `.env`, no `.env.example`, and none needed. The prototype is fully offline by design (`CLAUDE.md`: no network calls, no external services) |
| **Database / migrations** | ✅ N/A — no `supabase/` directory, no `.sql` files anywhere. Phase B never started. Nothing unapplied |
| **Typecheck** (`npx tsc --noEmit`) | ✅ exit 0 |
| **Tests** (`npm test`) | ✅ **8 files, 50 tests, all passing** in 3.03s |
| **Dev server** (`npm run dev`) | ✅ **Comes up clean** — ready in 2.4s on `http://localhost:3000`. All 8 routes compile and return 200 |
| **Build** (`npm run build`) | ❌ **FAILS** — see below |

### Routes verified live (all 200)

`/` · `/groups/g_crew` · `/profile/u_alex` · `/events/e_live` · `/events/e_past` ·
`/events/e_pre` · `/groups/g_crew/events/new` · `/events/e_live/tv` · `/events/e_live/play`

### The build failure

```
Error: EISDIR: illegal operation on a directory, readlink
  'E:\Claude_agent\Version_1.0v\node_modules\next\dist\pages\_app.js'
> Build failed because of webpack errors
```

**This is not a code bug — it's the filesystem.** `E:` is formatted **exFAT**. Confirmed
directly:

```js
fs.readlinkSync('E:\\...\\_app.js')       // → EISDIR   (exFAT)
fs.readlinkSync('E:\\...\\package.json')  // → EISDIR   (exFAT, any plain file)
fs.readlinkSync('C:\\Windows\\notepad.exe') // → EINVAL (NTFS, expected)
```

exFAT has no symlink support, so Node returns `EISDIR` instead of the `EINVAL` that
webpack's resolver expects for "this is not a symlink." Webpack handles `EINVAL` and
treats `EISDIR` as fatal.

The same root cause shows up non-fatally in dev as:
`<w> [webpack.cache.PackFileCacheStrategy] Caching failed for pack: Error: Unable to snapshot resolve dependencies`
— which just disables the webpack filesystem cache (slower cold rebuilds, nothing broken).

---

## 5. Proposed fixes — awaiting your call, nothing applied

| # | Fix | Effort | Why |
|---|---|---|---|
| **A** | **Move the project to an NTFS drive** (e.g. `C:\dev\broscars`), reinstall `node_modules` there | Medium | Real fix. Restores `next build`, the webpack cache, and symlink semantics generally. Also makes `git init` behave normally |
| **B** | **Set `webpack: (c) => { c.resolve.symlinks = false; return c }` in `next.config.mjs`** | Tiny | Workaround that stops webpack calling `readlink` at all. Unblocks the build in place, on exFAT. Doesn't fix the pack-cache warning |
| **C** | **`git init` + initial commit** | Tiny | There is no version control at all right now. Six code fixes and a 50-test suite exist only as loose files. `.gitignore` is already correct |
| **D** | **Delete the 7 zero-byte junk files** in the project root | Trivial | Shell-redirect debris |
| **E** | **`npm prune`** to drop `vite-tsconfig-paths` / `tsconfck` / `globrex` | Trivial | Not in `package.json`; unused since the plugin approach was dropped |

**Recommended order:** C first (get history before touching anything), then B for an
immediate green build, then D and E. Treat A as the proper fix when you're ready to
relocate the repo — B is a patch over an environment problem, not a cure.

### Not proposed yet — say the word

- Fixing any of the open security findings F1/F3–F8 (they're intentionally Phase B)
- Anything Supabase (schema SQL, migration, RLS, auth, realtime)
- Building parked idea #1, or backlogging ideas #2/#3 into `IDEAS.md`
