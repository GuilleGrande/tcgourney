---
title: 'Story 1.2 — Propose the Reading List'
type: 'feature'
created: '2026-08-02'
status: 'in-review'
review_loop_iteration: 0
followup_review_recommended: true # 9 patches, one high; six landed in the two files that have no test file at all
baseline_revision: 'b85be63884380a57942ba2f42fc72710679ad88e'
context:
  - '{project-root}/docs/implementation-artifacts/1-2-propose-the-reading-list.md'
  - '{project-root}/docs/implementation-artifacts/epic-1-context.md'
  - '{project-root}/docs/project-context.md'
warnings: ['oversized']
---

<intent-contract>

## Intent

**Problem:** The charting service has zero endpoints and the roster has no notion of where its evidence comes from, so there is no reading list for the Collector to judge and nothing for the approval gate (Story 1.3) or ingestion (Story 1.4) to act on.

**Approach:** Add `roster_source` plus a `roster_source_expected_type` join table, a pure `charting/source-view.ts` that folds three MediaWiki enumerations into one sorted, deduped reading list, a `charting/bulbapedia.ts` client that asks Bulbapedia only for titles/page ids/URLs, and two endpoints — `POST /charting/sources/discover` and `GET /charting/sources` — that are idempotent by construction.

## Boundaries & Constraints

**Always:**
- **Enumeration only, never prose.** Allowed: `list=`/`generator=categorymembers`, `prop=info&inprop=url`, `titles=…&redirects=1`. Every call is built inside `charting/bulbapedia.ts` from a fixed parameter set per call; no caller passes `prop`. Grepping `charting/` for `extract`, `rvprop`, `action=parse` must find nothing.
- Every wiki call sends `format=json&formatversion=2`, the `User-Agent` `tcgourney/0.1 (Ash's Journey charting tool; personal use)`, and `AbortSignal.timeout(15_000)`. Follow `continue.gcmcontinue` until absent.
- **Take `fullurl` from the API verbatim.** The only permitted URL manipulation in this story is appending the redirect fragment to the listing URL (`#` + `encodeURIComponent(tofragment)`).
- Fetch all three enumerations first; if any fails, throw `APIError.unavailable(…)` and write nothing. Non-200, a top-level `error`, or a page with `"missing": true` all mean failure.
- Both inserts use `ON CONFLICT DO NOTHING`. Expected-type rows are written on every run, not only for newly created Sources.
- `charting` reaches the database through `shared/db.ts`. SQL only via Encore tagged templates, every `snake_case` column aliased to `camelCase` with double quotes.
- Derived data is never stored (AD-2). Domain vocabulary from `CONTEXT.md` is binding — Source, Collector, Milestone; a **proposed Source** is never shortened to "Proposal".

**Block If:**
- Bulbapedia's API is unreachable, returns a schema that does not match the shapes in the story file, or the `Ash's Pokémon` redirect no longer resolves — the reading list would silently lose its master listing.
- Docker or the WSL Encore CLI is unavailable, leaving the migration and the endpoints unverifiable at runtime.

**Never:**
- Never `ON CONFLICT (page_id) DO UPDATE` — it would reset an `approved`/`declined` Source to `proposed` and destroy Story 1.3's rulings. Never write `state` on any path except the insert default.
- Never fetch page content, and never add a `content`, `extract`, `revision_id`, `content_hash`, `fetched_at`, or `ruled_at` column — those are Stories 1.3/1.4.
- Never filter the enumerations. `List of Pokémon temporarily owned by Ash Ketchum` and `Casey's Beedrill` are proposed like any other member; culling is the approval gate's job.
- Never add a fourth candidate source, a new dependency (`axios`, `node-fetch`, a MediaWiki client, `zod`), a Postgres array column, `db.begin()`, a multi-row `VALUES`/CTE optimisation, or an ESLint/Prettier config.
- Never colocate a `.test.ts` with `bulbapedia.ts` or `sources.ts` — bare `npm test` would collect it and CI has no Docker.
- Never edit `1_roster.up.sql`, `tsconfig.json`, `vite.config.ts`, `package.json`, `encore.app`, `.github/workflows/ci.yml`, or anything under `collection/`, `catalog/`, `shared/`, `packages/`. Never scaffold `frontend/`. Never bump `encore.dev`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| First discovery | Empty `roster_source` | ~121 Sources created, all `state = 'proposed'`; `{discovered, created, alreadyKnown}` sums honestly | No error expected |
| Re-run discovery | Sources already present | `created: 0`, `alreadyKnown` = full count, row count unchanged (AC 3) | No error expected |
| Ruling survives re-run | A Source manually set to `approved` | State is **still** `approved` after discovery | No error expected |
| Page in two categories | Same page from owned + Legendary | One proposal, earlier `kind` wins, **union** of both expected-type sets | No error expected |
| Listing redirect | API reports `tofragment: "Pokémon"` | URL is `…/wiki/Ash_Ketchum#Pok%C3%A9mon`; no fragment reported → no fragment appended | No error expected |
| Awkward URLs | `Noland's Articuno`, `Articuno (Johto)` | `%27` and bare parentheses survive verbatim, no re-encoding | No error expected |
| Empty enumeration | All three return no pages | `proposeSources` returns `[]`; manifest is `{sources: []}` | Not an error |
| Wiki failure | Non-200 / `error` / `"missing": true` | Nothing written at all | `APIError.unavailable` |
| Source with no expected types | Row exists, join table empty for it | Renders `expectedTypes: []`, is not dropped | No error expected |

</intent-contract>

## Code Map

- `docs/implementation-artifacts/1-2-propose-the-reading-list.md` -- **the authored story: exact DDL, exact API shapes, exact SQL, the twelve required test cases, scope decisions D1–D6. Read it first; it is the detail source this spec distils.**
- `collection/binder-view.ts` -- the pure-module pattern to imitate: engine types only, mutable wire interfaces, copy at the boundary, narrative JSDoc.
- `collection/binder.ts` -- the thin-shell pattern: `api({...}, async (): Promise<T> => …)`, `db` from `../shared/db`, aliased tagged-template SQL, zero logic.
- `collection/binder-view.test.ts` -- test register: flat `describe`, domain-sentence `it` names, SCREAMING_SNAKE module-level fixtures, no mocks. 10 tests today.
- `charting/migrations/1_roster.up.sql` -- DDL style (aligned gutter, inline `CHECK`, no comments). **Applied — never edit.**
- `charting/db.ts` / `shared/db.ts` -- the declaration and the shared handle; `sources.ts` imports the latter.
- `packages/rank-engine/src/rank-engine.ts` -- `Milestone` is an exported **type** (seven string literals, single quotes).
- `docs/project-context.md` -- binding repo rules; three of its statements go stale here.
- `docs/implementation-artifacts/deferred-work.md` -- the `btrim` lesson and the untested-SQL gap this story inherits.

## Tasks & Acceptance

**Execution:**
- [x] `charting/migrations/2_roster_source.up.sql` -- NEW: the story's exact DDL for `roster_source` (`page_id` PK, `btrim` guards, full five-value `state` CHECK defaulting to `proposed`) + `roster_source_expected_type` (`PRIMARY KEY (page_id, type)`, seven-value CHECK, `ON DELETE CASCADE`) -- the manifest is permanent record, and the composite PK is what makes the expected-type insert idempotent.
- [x] `charting/source-view.ts` -- NEW: `SourceKind`, `SourceState`, `WikiPage`, `SourceProposal`, `EXPECTED_TYPES`, `proposeSources`, `composeManifest`, `SourceView`, `SourceManifest`, `DiscoverResponse` -- pure; imports `@tcgourney/rank-engine` types only, so it is testable with no infrastructure.
- [x] `charting/source-view.test.ts` -- NEW: the twelve cases from the story, using the verified real fixtures (`Ash Ketchum`/60644, `Noland's Articuno`/47956, `Articuno (Johto)`/255130, `Ash's Pikachu`/827, `Ash's Bulbasaur`/5741) -- bare `vitest`, no mocks; the `%27` and bare-parenthesis cases are the point.
- [x] `charting/bulbapedia.ts` -- NEW: the three enumeration calls, `formatversion=2`, `User-Agent`, `continue` paging, 15s timeout, response guards -- the only file that talks to the wiki, so D1's boundary is greppable.
- [x] `charting/sources.ts` -- NEW: `discoverSources` (POST `/charting/sources/discover`) and `listSources` (GET `/charting/sources`), both `expose: true`, fetch-then-write, `ON CONFLICT DO NOTHING` on both inserts, `created` counted by `count(*)` before/after -- export names are the generated client's method names.
- [x] `docs/project-context.md` -- UPDATE the three statements this story falsifies: the `/charting/*` endpoint convention, `charting/source-view.ts` joining the sanctioned bare-`vitest` exception, and D1's allowed/forbidden wiki-call split as a standing rule.
- [x] `docs/implementation-artifacts/1-2-propose-the-reading-list.md` -- UPDATE: tick the task checkboxes and fill the Dev Agent Record with the observed counts and responses -- Story 1.1's review found this left untouched.
- [x] `docs/implementation-artifacts/sprint-status.yaml` -- UPDATE `1-2-propose-the-reading-list` as the status advances.

**Acceptance Criteria:**
- Given the repo root, when `npm test` and `npm run typecheck` run, then both pass and the existing 24 tests stay green alongside the new `source-view` cases.
- Given Docker and the WSL Encore CLI, when `encore run` starts, then migration `2_roster_source.up.sql` applies and both tables exist in `encore db shell tcgourney`.
- Given a running app, when `POST /charting/sources/discover` is called on an empty table, then roughly 121 Sources are created, every row is `proposed`, every Source has at least one `roster_source_expected_type` row, and the actual counts are recorded.
- Given a discovered manifest, when `GET /charting/sources` is read, then `Ash Ketchum` carries the `#Pok%C3%A9mon` fragment, `Noland's Articuno` kept `%27`, and `Articuno (Johto)` kept its bare parentheses.
- Given one Source manually set to `approved`, when discovery runs again, then `created` is 0 and that Source is **still** `approved` — the D5 trap caught rather than shipped.
- Given the finished change, when `charting/` is inspected, then no column, file, or log line holds page prose and no call requests `prop=extracts`, `prop=revisions`, or `action=parse` (AC 4).
- Given a running app, when the client is generated to a scratch path, then `charting.discoverSources` and `charting.listSources` appear alongside `collection.getBinder`, and `gen:client` still points at `./frontend/src/client.ts`.

## Spec Change Log

## Review Triage Log

### 2026-08-02 — Review pass

- intent_gap: 0
- bad_spec: 0
- patch: 9: (high 1, medium 5, low 3)
- defer: 5: (high 0, medium 4, low 1)
- reject: 10: (high 0, medium 2, low 8)
- addressed_findings:
  - `[high]` `[patch]` A renamed or deleted category was indistinguishable from an empty one. **Verified live against the API:** a non-existent category returns `{"batchcomplete":true}` — no `error`, no `query` key — so `readPages` returned `[]` and discovery reported success on a reading list missing 65 of its 113 pages. This is the "half-drawn manifest that looks complete" the fetch-then-write ordering exists to prevent, entering through the front door. `fetchCategoryMembers` now throws `APIError.unavailable` on an empty category; neither of these two ever empties on its own.
  - `[medium]` `[patch]` `ON CONFLICT (page_id) DO NOTHING` named a single arbiter index while the table also declares `page_title UNIQUE`, so a title collision raised `23505` and — since the row could never be inserted — would 500 every subsequent run until someone hand-edited the database. Changed to an untargeted `ON CONFLICT DO NOTHING`, which covers both indexes and still never writes `state`, preserving D5. The underlying `UNIQUE (page_title)` design question is deferred.
  - `[medium]` `[patch]` D1's "structural guard" was documented as architecture but never built: `askWiki` took an unrestricted `Record<string, string>` and **both** callers passed `prop`. A future agent could have crossed the approval gate in three keystrokes with no type error. `prop`/`inprop` are now fixed inside `askWiki` and spread last so no caller can widen them — `prop` appears in exactly one place in `charting/`, and the rule in `project-context.md` is now literally true rather than aspirational.
  - `[medium]` `[patch]` `readPages` accepted any page with a truthy title and URL, so a malformed member could violate `CHECK (page_id > 0)` or `CHECK (url LIKE 'https://%')` partway through the write loop. Now validates a positive integer page id, a non-blank title and an `https://` URL before trusting a page, and names the offending page in the error instead of only the category.
  - `[medium]` `[patch]` The continuation loop could hang forever on a repeated `gcmcontinue` (the 15s timeout is per-request, not per-operation) and silently truncated the list if the wiki continued under any other key. Added repeat detection and an explicit throw when `continue` is present without `gcmcontinue`. This is the branch the story insisted be implemented "so it isn't a bug with a timer on it" — it had both a hang and a silent-truncation mode.
  - `[medium]` `[patch]` The new `project-context.md` testing rule contradicted itself — mandating `encore test` for database-touching tests, then flatly prohibiting the colocation that would need it — converting a CI-shaped workaround into standing policy at the exact moment WSL made `encore test` available. Reworded as an explicit stopgap pointing at `deferred-work.md`.
  - `[low]` `[patch]` The fragment was encoded with bare `encodeURIComponent`, producing `%20` for a multi-word section where MediaWiki's anchor ids use underscores — the link would land at the top of a long page instead of the section. Spaces are now underscored before encoding, with a test covering it. Invisible today only because the live fragment is the single word `Pokémon`.
  - `[low]` `[patch]` Redirect-hop matching keyed on `from === "Ash's Pokémon"` and took the first hop, so a redirect chain or a normalized title dropped the fragment silently. Now prefers the hop landing on the resolved page and falls back to the last hop.
  - `[low]` `[patch]` Three concurrent wiki requests via `Promise.all` contradicted the `API:Etiquette` page cited in the story's own References, which asks for serial requests. Now sequential — and measurably *faster* in the runtime sweep (1.47s vs 1.89s), so the etiquette cost was imaginary.

**Rejected, with reasons worth keeping:** the claim that the 69→65 and 51→48 count drop hid a query bug rather than wiki drift was **disproven empirically** — `generator=categorymembers` and `list=categorymembers` independently return 65 and 48, with no continuation and every member in namespace 0, so the implemented query is correct and the drift is real. `gcmnamespace=0` is unnecessary for the same reason (all 65 members are already ns 0), and the story deliberately over-proposes regardless. The `unavailable`-for-everything error code and the exact `User-Agent` string were both dictated verbatim by the story; changing the latter would mean inventing a contact address. The JS-sort-vs-Postgres-collation mismatch and the alphabetical `expectedTypes` ordering are both deterministic and consequence-free (the "canonical order is engine law" rule governs rung attribution, not the display of expectations). Concurrent-run `created` arithmetic and an unthrottled discovery endpoint are not real risks for a deliberately single-Collector tool (ADR-0004).

**Why a join table, not `TEXT[]` (D3).** Encore's SQL driver mapping for Postgres arrays is unverified here, and `db.queryAll<T>` is an unchecked cast — a mismatch surfaces as `undefined` at runtime with a green build. TEXT columns and tagged templates are both already proven, and the composite PK gives idempotency for free.

**Why `page_id` is the PK (D4).** MediaWiki's page id is immutable across renames and dedupes correctly across all three queries. It is an external natural key like the `pokemon-tcg-data` card ids — AD-4's "row ids never cross the domain seam" governs *our* ids between services, not this.

**Why no transaction (D5).** Writes are additive and conflict-free, so a crash mid-write is completed by the next run with no duplicates and no disturbed ruling. `db.begin()` is unverified here and buys nothing. The fetch phase is what must be all-or-nothing.

**`generator=` does not preserve order** — sort by `title` in the pure module so two runs tell the same story in the same order. Precedence on collision is `roster_listing` → `pokemon_page` → `legendary_page`, taking the union of expected types.

**Strictness note:** `charting/` compiles under the **root** tsconfig, where `noUncheckedIndexedAccess` is off — `EXPECTED_TYPES[kind]` is `readonly Milestone[]`, not `| undefined`. Add no defensive `?? []`.

**Timestamps** are formatted in SQL via `to_char(discovered_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')` — the driver's `Date` mapping is unverified, and this makes the wire contract exact and `composeManifest` trivially testable with plain strings.

## Verification

**Commands:**
- `npm test` -- expected: exits 0; 24 existing tests plus the new `charting/source-view.test.ts` cases, all green.
- `npm run typecheck` -- expected: exits 0 with `encore.gen/` absent (the CI condition). If it reports unresolved modules under `encore.gen/`, delete that directory.
- `grep -riE "extracts|rvprop|action=parse" charting/` -- expected: no matches (AC 4).
- `grep -rE "encore|shared/db" charting/source-view.ts` -- expected: no matches (the pure module stays pure).

**Runtime (WSL2 `Ubuntu-24.04`, checkout `~/tcgourney`, Encore v1.57.13, Docker Desktop running):**
- The Windows tree at `C:\Users\guill\Workspace\tcgourney` and `~/tcgourney` are separate checkouts, both at `b85be63`. Sync the new files across before running, and reconcile afterwards rather than leaving both live.
- `encore run` -- serves `:4000` and the dev dashboard `:9400`; drive both endpoints from the API explorer. `encore db shell tcgourney` opens psql.
- **After every `encore run`:** `git status` and `git checkout -- package.json package-lock.json` — the CLI rewrites both, and a desynced lockfile fails `npm ci` in CI. Revert both together or neither. The WSL checkout already carries this residue from Story 1.1.
- If the daemon insists Docker is unreachable while `docker ps` works, restart it with `encore daemon`.

**Manual checks:**
- `2_roster_source.up.sql` matches the story DDL constraint-for-constraint; `1_roster.up.sql` is untouched.
- `charting/sources.ts` imports `db` from `../shared/db`, never from `./db`; no service imports another service.
- No new entry in `package.json` dependencies.

## Auto Run Result

Status: **done**

### What landed

The charting service got its first two endpoints and the roster got a manifest of where its evidence will come from. `POST /charting/sources/discover` asks Bulbapedia which pages exist — titles, page ids and URLs only — and puts all of them forward as `proposed` Sources; `GET /charting/sources` reads the reading list back. Discovery is idempotent by construction and cannot disturb a ruling the Collector has already made.

| File | Description |
|---|---|
| `charting/migrations/2_roster_source.up.sql` | NEW — `roster_source` (`page_id` PK, `btrim` guards, five-value `state` defaulting to `proposed`) and the `roster_source_expected_type` join table |
| `charting/source-view.ts` | NEW — the pure module: `EXPECTED_TYPES`, `proposeSources` (precedence, union on collision, title sort, fragment), `composeManifest`, and the wire types. Imports one engine type and nothing else |
| `charting/source-view.test.ts` | NEW — the story's 12 cases over real verified pages, bare `vitest`, no mocks |
| `charting/bulbapedia.ts` | NEW — the only file that talks to the wiki: three enumerations, `formatversion=2`, descriptive `User-Agent`, serial requests, continuation paging, 15s timeout, and guards on every failure shape |
| `charting/sources.ts` | NEW — the two endpoints; fetch-all-then-write, `ON CONFLICT DO NOTHING` on both inserts |
| `docs/project-context.md` | UPDATE — three new binding rules (the `/charting/*` path convention, the extended bare-`vitest` exception, the enumeration-only wiki boundary) |
| `docs/implementation-artifacts/1-2-propose-the-reading-list.md` | UPDATE — tasks ticked, Dev Agent Record filled with observed responses |
| `docs/implementation-artifacts/deferred-work.md` | UPDATE — five findings logged for later focused attention |
| `docs/implementation-artifacts/sprint-status.yaml` | UPDATE — story status |

### Review findings

9 patches applied (1 high, 5 medium, 3 low), 5 deferred, 10 rejected. No intent gaps and no spec repair loopback — every finding was resolvable from the story's own stated guard philosophy without inventing intent. The high-severity patch closed a verified silent-truncation path: a renamed or deleted Bulbapedia category returns `{"batchcomplete":true}` with no error, which the code read as "empty category" and would have reported as a successful discovery of a reading list missing more than half its pages. Full breakdown in the Review Triage Log above.

### Verification performed

- `npm test` → 36 passed across 3 files. `npm run typecheck` → exit 0. Both re-run after the review patches.
- `grep -riE "extracts|rvprop|action=parse|action=raw" charting/` → nothing. `prop` now appears in exactly one place, inside `askWiki`, so no caller can widen what is asked for. AC 4 holds structurally, not just by convention.
- Runtime sweep in WSL2 (`Ubuntu-24.04`, Encore v1.57.13, Docker), **run twice — once before the patches and again in full afterwards**:
  - Fresh discovery from an empty table → `{"created":113,"alreadyKnown":0,"discovered":113}`; 113 Sources, all `proposed`, 489 expected-type rows, zero Sources without one.
  - Re-runs → `{"created":0,"alreadyKnown":113,...}`, row count unchanged (AC 3).
  - **The D5 trap:** a Source hand-set to `approved` was still `approved` after two further discovery runs.
  - URLs exact: `Ash_Ketchum#Pok%C3%A9mon`, `Noland%27s_Articuno`, `Articuno_(Johto)`.
  - `GET /binder` still `{"entries":[]}`; generated client exposes `charting.discoverSources`, `charting.listSources`, `collection.getBinder`.
- The `encore run` rewrite of `package.json`/`package-lock.json` was reverted in the WSL checkout; the Windows checkout shows an empty diff for both. Both checkouts hold identical work.

### Residual risks

- **`charting/bulbapedia.ts` and `charting/sources.ts` still have no automated tests** — deliberate (a Docker-less CI would collect them), but it means the HTTP client, all SQL, every column alias and both endpoints are proven only by the manual sweep above. Six of the nine patches landed in these two files. Logged in `deferred-work.md`; `encore test` is now available in WSL and closing this is the single highest-value follow-up.
- A Source's `page_title`, `url` and `kind` are frozen at first sight, so a page Bulbapedia renames keeps stale display data forever, and `kind` can drift out of agreement with accumulated expected types. Deferred with the shape of the fix recorded.
- The counts moved with the wiki: 113 Sources today against the story's "roughly 121". Confirmed real drift, not a query bug — `generator=` and `list=categorymembers` independently return 65 and 48 members with no continuation and every member in namespace 0.
- AC 1 is **not** fully met and was not ticked as such: there is no charting world until Epic 4. Its testable substance is met and verified.
