# Story 1.2: Propose the Reading List

Status: done

Epic: 1 — The Journey Charted — Sources, Proposals, and Drafted Explainers
Story key: `1-2-propose-the-reading-list`

## Story

As the Collector,
I want the tool to propose the set of Bulbapedia pages it intends to read — each with its title, URL, and the Milestone types it is expected to yield,
So that I can see exactly what evidence the charting pass will draw on before anything is ingested. *(FR-001)*

## Acceptance Criteria

1. **Given** the charting world is open, **When** I run source discovery, **Then** candidate pages are proposed — the master "Ash's Pokémon" listing, per-Pokémon pages, and `Category:Legendary Pokémon (anime)` members per ADR-0001 — each presenting title, URL, and expected Milestone types.
   > **Partially deferred, same shape as Story 1.1's AC 5.** There is no charting *world* until Epic 4 — no `frontend/` exists. "The charting world is open" cannot be met here. The testable substance — discovery runs, proposes all three candidate kinds, and every proposal carries title, URL, and expected Milestone types — is met through the endpoints and verified in Task 6. Do not tick this AC as fully met, and do not scaffold a frontend to make it tickable.
2. **Given** proposed pages are stored as `roster_source` rows in a `proposed` state, **When** I leave and return, **Then** the proposed list persists unchanged.
3. **Given** a page was already proposed, **When** discovery runs again, **Then** no duplicate Source rows are created.
4. **Given** this story is complete, **When** any Source is inspected, **Then** no page content has been fetched — the approval gate (FR-002) has not been crossed.

[Source: docs/planning-artifacts/epics.md#Story-1.2]

---

## Scope Decisions — Read This First

Six things the planning artifacts do **not** settle. Each is decided here so you do not have to invent an answer mid-implementation.

### D1. Enumeration is not ingestion — the bright line AC 4 draws

**The problem:** AC 1 requires proposing `Category:Legendary Pokémon (anime)` **members**. You cannot know who the members are without asking Bulbapedia. AC 4 says no page content has been fetched. Read naively, the two ACs contradict each other.

**Decision:** discovery talks to the MediaWiki API, but only for **titles, page ids, and URLs**. That is metadata about which pages exist, not the evidence inside them. FR-002's gate is on reading a page's *prose*, which is Story 1.4's job.

| Allowed in this story | Forbidden until Story 1.4 |
|---|---|
| `list=categorymembers` / `generator=categorymembers` | `prop=extracts` (the plaintext extract) |
| `prop=info&inprop=url` | `prop=revisions` with `rvprop=content` |
| `action=query&titles=…&redirects=1` | `action=parse`, `action=raw`, `?action=raw` |

**Structural guard, not a promise:** put every API call in `charting/bulbapedia.ts` and let it build query strings from a single fixed parameter set per call. No caller passes `prop`. A reviewer must be able to grep `charting/` for `extract`, `rvprop`, and `action=parse` and find nothing.

**Nothing derived from prose is stored.** `roster_source` gets no `content`, no `extract`, no `revision_id`, no `content_hash` column in this story — those are Story 1.4's, and adding them early invites someone to fill them.

### D2. Three candidate kinds, and what each is expected to yield

Verified live against the Bulbapedia API on 2026-08-02. Counts are today's; treat them as sanity checks, not assertions to hardcode.

| `kind` | Discovered by | Count today | Expected Milestone types |
|---|---|---|---|
| `roster_listing` | `titles=Ash's Pokémon` + `redirects=1` → resolves to **`Ash Ketchum`**, pageid **60644**, fragment `Pokémon` | 1 | `catch`, `teammate`, `glory`, `loyal` |
| `pokemon_page` | members of `Category:Ash's Pokémon` | 69 | `catch`, `opponent`, `teammate`, `bond`, `glory`, `loyal` |
| `legendary_page` | members of `Category:Legendary Pokémon (anime)` | 51 | `encounter`, `bond` |

≈121 candidates. `Ash's Pokémon` is a **redirect**, not an article — the master listing is a section of the `Ash Ketchum` page. Do not hardcode pageid 60644; resolve the redirect every run.

**Expected types are an authored expectation, not a derivation.** They exist so the Collector can judge a page worth reading (FR-001), and later so drafting can scope a batch. Keep the mapping in **one exported constant** in the pure module. It is not engine work — nothing here derives Stars, Rank, or Slots, so AD-1 is not in play.

**`legendary_page` gets no `catch`** — a Legendary Ash never owned cannot have been caught, which is the whole reason ADR-0001 routes Encounter through this category. **`pokemon_page` gets no `encounter`** — a Pokémon in `Category:Ash's Pokémon` was owned, so its path did not merely cross his.

**Discovery deliberately over-proposes.** `Category:Ash's Pokémon` includes `List of Pokémon temporarily owned by Ash Ketchum`, `Dawn's Ambipom`, and `Casey's Beedrill`. Do not filter them out — culling is exactly what the approval gate is for (FR-002, Story 1.3). Proposing a page the Collector declines is the system working; silently dropping one is the system lying.

**Do not invent a fourth candidate source.** Three is the scope AC 1 fixes. Opponent coverage is genuinely thin — opponents are other trainers' Pokémon and no category enumerates them — and that is a charting-strategy problem the Collector solves later through manual Milestones (FR-016), not a gap for you to close by adding queries.

### D3. Expected types are a join table, not a Postgres array

`TEXT[]` looks tidier and is the wrong call here. Encore.ts's SQL driver mapping for Postgres array columns is **unverified in this repo**, and `db.queryAll<T>` is an unchecked cast — a mismatch surfaces as `undefined` at runtime with a green build (`deferred-work.md`, the `binder.ts` finding). A join table uses only TEXT columns and tagged templates, both already proven, and reuses the same seven-value `CHECK` as `roster_milestone.type`.

Reading it back is a second query plus grouping in a pure function — the exact shape `collection/binder-view.ts` already established.

### D4. `page_id` is the primary key

MediaWiki's page id, verbatim. It is immutable across page renames, and it dedupes correctly across all three queries — if `Ash Ketchum` ever also appeared as a category member, the redirect target and the member are the same row.

This does **not** violate AD-4's "row ids never cross the domain seam." That rule governs *our* ids crossing between `charting`, `catalog`, and `collection`. A MediaWiki page id is an external natural key, exactly like the `pokemon-tcg-data` card ids the conventions say to keep verbatim.

It also makes `roster_source_expected_type` reference `page_id` directly, so writing expected types needs no `RETURNING id` round trip.

### D5. Idempotency is `ON CONFLICT DO NOTHING` — never `DO UPDATE`

AC 3 in one clause. The trap behind it:

> **`ON CONFLICT (page_id) DO UPDATE` would reset an `approved` or `declined` Source to `proposed`** and destroy the Collector's rulings — the entire output of Story 1.3. Nothing in this story writes those states, so the bug is invisible today and catastrophic the moment 1.3 lands.

Never write `state` on the conflict path. Never write it on any path except the insert default.

**Write the expected-type rows on every run, not only for newly inserted Sources**, also with `ON CONFLICT DO NOTHING`. A crash between the two inserts otherwise leaves a Source with no expected types that a re-run would skip forever.

**Fetch everything, then write.** If any of the three API queries fails, throw and write nothing — a half-discovered manifest that looks complete would corrupt the approval decision AC 1 exists to inform. Because writes are additive and conflict-free, a crash *during* the write phase needs no transaction: the next run completes it, creates no duplicates, and disturbs no ruling. **Do not reach for `db.begin()`** — its API is unverified here and it buys nothing.

### D6. Pure module + thin shells — tests stay database-free and network-free

Same split that worked in Story 1.1, same reason (D4 of that story, ratified in `project-context.md`): root `vitest run` has no `test.include`, so any test touching Encore or the database is collected by bare `npm test` and fails on a runner with no Docker.

| File | Imports | Tested |
|---|---|---|
| `charting/source-view.ts` | `@tcgourney/rank-engine` (types only) | Exhaustively, bare `vitest` |
| `charting/bulbapedia.ts` | `encore.dev/api` + global `fetch` | **No test file.** Manual run only |
| `charting/sources.ts` | Encore, `shared/db.ts`, both modules above | **No test file.** Manual run only |

**Do not colocate a `.test.ts` with `bulbapedia.ts` or `sources.ts`.** It would be collected by bare `npm test` and break CI.

**The cost, stated plainly:** the HTTP client, the SQL, the column aliases, and the endpoint wiring get no automated coverage. Task 6 is the only proof they work — do not skip or hand-wave it. Wiring an `encore test` harness would fix this class of gap for good, but it needs a `test.exclude` or naming convention first; that is already logged in `deferred-work.md` and is not this story's job.

---

## Dev Notes

### Data Model — exact DDL

New migration `charting/migrations/2_roster_source.up.sql`. **Never edit `1_roster.up.sql`** — it is applied.

```sql
CREATE TABLE roster_source (
  page_id       INTEGER PRIMARY KEY CHECK (page_id > 0),
  page_title    TEXT NOT NULL UNIQUE CHECK (btrim(page_title) <> ''),
  url           TEXT NOT NULL CHECK (url LIKE 'https://%'),
  kind          TEXT NOT NULL CHECK (kind IN
                  ('roster_listing','pokemon_page','legendary_page')),
  state         TEXT NOT NULL DEFAULT 'proposed' CHECK (state IN
                  ('proposed','approved','declined','ingested','failed')),
  discovered_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE roster_source_expected_type (
  page_id INTEGER NOT NULL REFERENCES roster_source (page_id) ON DELETE CASCADE,
  type    TEXT NOT NULL CHECK (type IN
            ('catch','opponent','teammate','encounter','bond','glory','loyal')),
  PRIMARY KEY (page_id, type)
);
```

Load-bearing choices, and the traps behind them:

- **The full `state` lexicon ships now**, though this story only ever writes `proposed`. The manifest is a permanent record of what was read and what was declined (FR-003), and Stories 1.3/1.4 need `approved`/`declined`/`ingested`/`failed`. Same precedent as `roster_milestone.type` in Story 1.1: the closed vocabulary goes in the `CHECK` on day one. `TEXT` + `CHECK`, never a Postgres enum — altering an enum in a later migration is painful.
- **`btrim(…) <> ''` on the display columns.** Story 1.1's review found `display_name`, `region`, and `episode` guarded by `NOT NULL` alone, where `''` passes (`deferred-work.md`). That lesson is applied here rather than logged again.
- **No revision id, no content hash, no `fetched_at`, no `ruled_at`.** Story 1.4 adds provenance columns (AD-8); Story 1.3 adds the ruling timestamp. Only the columns this story needs, no more.
- **No derived columns, ever** (AD-2 / ADR-0003). No `expected_type_count`, no cached join.
- **`PRIMARY KEY (page_id, type)`** on the join table is what makes the expected-type insert idempotent.

### The MediaWiki calls — exact shapes, verified 2026-08-02

Endpoint: `https://bulbapedia.bulbagarden.net/w/api.php` (MediaWiki 1.43.8, live and unauthenticated).

**Always send `format=json&formatversion=2`.** Without `formatversion=2`, `query.pages` is an object keyed by stringified page id and missing pages arrive as negative-id keys. With it, `query.pages` is a plain array and missing pages carry `"missing": true`. Every shape below assumes it.

**Always send a descriptive `User-Agent`.** Generic agents are rate-limited or blocked outright under standard MediaWiki bot etiquette:

```ts
const USER_AGENT = "tcgourney/0.1 (Ash's Journey charting tool; personal use)";
```

**1 — the master listing** (resolves the redirect):

```
action=query&titles=Ash%27s%20Pok%C3%A9mon&redirects=1&prop=info&inprop=url
```

```jsonc
{ "batchcomplete": true,
  "query": {
    "redirects": [{ "from": "Ash's Pokémon", "to": "Ash Ketchum", "tofragment": "Pokémon" }],
    "pages": [{ "pageid": 60644, "ns": 0, "title": "Ash Ketchum",
                "fullurl": "https://bulbapedia.bulbagarden.net/wiki/Ash_Ketchum",
                "canonicalurl": "https://bulbapedia.bulbagarden.net/wiki/Ash_Ketchum" }] } }
```

**2 and 3 — the two categories** (`gcmtitle` is `Category:Ash's Pokémon`, then `Category:Legendary Pokémon (anime)`):

```
action=query&generator=categorymembers&gcmtitle=<category>&gcmtype=page&gcmlimit=500
  &prop=info&inprop=url
```

```jsonc
{ "batchcomplete": true,
  "continue": { "gcmcontinue": "page|4b59…|255508", "continue": "gcmcontinue||" },  // may be absent
  "query": { "pages": [{ "pageid": 47956, "ns": 0, "title": "Noland's Articuno",
                         "fullurl": "https://bulbapedia.bulbagarden.net/wiki/Noland%27s_Articuno" }] } }
```

Four things to get right:

- **Take `fullurl` from the API. Never build a URL by string-joining a title.** MediaWiki's own encoding is authoritative and non-obvious — `Noland's Articuno` becomes `Noland%27s_Articuno` while `Articuno (Johto)` keeps its bare parentheses. Hand-rolled `encodeURIComponent` gets this wrong in both directions. This is what makes FR-009's "working link" work later.
- **Follow `continue`.** Both categories fit in one page today (69 and 51, under the 500 anonymous ceiling), so the `continue` branch will not fire on your first run. Implement it anyway and loop on `continue.gcmcontinue` until it is absent — an untested branch that only wakes up when the wiki grows is a bug with a timer on it.
- **`generator=` does not preserve category order.** `query.pages` comes back in arbitrary order. Sort deterministically in the pure module, never rely on arrival order.
- **Guard every response.** Non-200, a top-level `"error"` object, or a page carrying `"missing": true` all mean discovery failed — throw `APIError.unavailable(…)`. A missing `Ash's Pokémon` redirect in particular means the wiki moved beneath us and the reading list would silently lose its master listing.

Use `AbortSignal.timeout(15_000)` on each `fetch`; Node 24 has global `fetch`, so add no HTTP dependency.

### The pure module

`charting/source-view.ts` — imports `@tcgourney/rank-engine` for types only, nothing else:

```ts
import type { Milestone } from "@tcgourney/rank-engine";

export type SourceKind = "roster_listing" | "pokemon_page" | "legendary_page";
export type SourceState = "proposed" | "approved" | "declined" | "ingested" | "failed";

/** A page as the wiki describes itself: what it is called, and where it lives. */
export interface WikiPage {
  pageId: number;
  title: string;
  url: string;
}

/** A page put forward for reading, and what the journey expects to find on it. */
export interface SourceProposal {
  pageId: number;
  title: string;
  url: string;
  kind: SourceKind;
  expectedTypes: Milestone[];
}

export const EXPECTED_TYPES: Readonly<Record<SourceKind, readonly Milestone[]>> = { /* D2 */ };

/** Fold the three readings of the wiki into one reading list. */
export function proposeSources(
  listing: readonly WikiPage[],
  ownedPages: readonly WikiPage[],
  legendaryPages: readonly WikiPage[],
): SourceProposal[];
```

Rules `proposeSources` must obey:

- **Precedence on collision is `roster_listing` → `pokemon_page` → `legendary_page`.** A page reachable two ways keeps the first `kind` and takes the **union** of both kinds' expected types. One page, one Source row, everything it might yield.
- **Sort the result by `title`** so two runs agree. Story 1.1's whole ordering lesson: without a stable sort, two identical calls tell the same story in a different order.
- **Append the redirect fragment to the listing URL** when the API reports one: `…/wiki/Ash_Ketchum` + `#` + `encodeURIComponent("Pokémon")` → `…/wiki/Ash_Ketchum#Pok%C3%A9mon`. It lands the Collector on the section actually being proposed. The fragment is the *only* URL manipulation permitted anywhere in this story.
- **`expectedTypes` is a mutable `Milestone[]` on the wire.** Copy at the boundary; the engine's `readonly` types never leak (existing pattern, ratified).
- **Never mutate the inputs.** They arrive `readonly`; build new objects.

The view side, also pure — a second exported function turning rows into the manifest response:

```ts
export interface RosterSourceRow {
  pageId: number; title: string; url: string;
  kind: SourceKind; state: SourceState; discoveredAt: string;
}
export interface RosterSourceExpectedTypeRow { pageId: number; type: Milestone; }

export function composeManifest(
  sources: readonly RosterSourceRow[],
  expectedTypes: readonly RosterSourceExpectedTypeRow[],
): SourceManifest;
```

Both response types live here too, not in `sources.ts` — they are plain mutable interfaces, which is what Encore validates and what client generation reads:

```ts
/** One page on the reading list, as the manifest shows it. */
export interface SourceView {
  pageId: number;
  title: string;
  url: string;
  kind: SourceKind;
  state: SourceState;
  expectedTypes: Milestone[];
  discoveredAt: string;   // ISO 8601 UTC
}

export interface SourceManifest { sources: SourceView[] }

/** What the wiki offered, what was new, what was already on the list. */
export interface DiscoverResponse {
  discovered: number;
  created: number;
  alreadyKnown: number;
}
```

One tsconfig note, since `project-context.md` documents two: `charting/` compiles under the **root** config, not `packages/rank-engine/`'s. `noUncheckedIndexedAccess` is **off** here, so `EXPECTED_TYPES[kind]` is `readonly Milestone[]`, not `… | undefined`. Do not add defensive `?? []` guards the compiler is not asking for.

### The endpoints

`charting/sources.ts`. Two endpoints, both `expose: true` — the charting frontend world will call them, and until it exists the dev dashboard on `:9400` is how you drive them.

```ts
export const discoverSources = api(
  { method: "POST", path: "/charting/sources/discover", expose: true },
  async (): Promise<DiscoverResponse> => { /* … */ },
);

export const listSources = api(
  { method: "GET", path: "/charting/sources", expose: true },
  async (): Promise<SourceManifest> => { /* … */ },
);
```

- **Export names are the generated client's method names** — `charting.discoverSources`, `charting.listSources`. Do not rename them casually.
- **`/binder` stays exactly where it is.** Renaming it to `/collection/binder` for symmetry is a client-breaking change nobody asked for.
- `DiscoverResponse` is `{ discovered: number; created: number; alreadyKnown: number }` — `discovered` is what the wiki offered, `created` what was new, and they sum honestly with `alreadyKnown`. This is what makes AC 3 observable: run it twice, `created` goes to 0.
- No auth, no accounts (ADR-0004 / AD-13).

### The exact queries

Postgres folds unquoted identifiers to lowercase and `db.queryAll<T>` is an **unchecked cast** that validates nothing at runtime. Alias every `snake_case` column to `camelCase` with **double quotes**, or every field arrives `undefined` and TypeScript reports nothing.

```ts
const sourceRows = await db.queryAll<RosterSourceRow>`
  SELECT page_id    AS "pageId",
         page_title AS "title",
         url,
         kind,
         state,
         to_char(discovered_at AT TIME ZONE 'UTC',
                 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "discoveredAt"
    FROM roster_source
   ORDER BY page_title`;

const expectedTypeRows = await db.queryAll<RosterSourceExpectedTypeRow>`
  SELECT page_id AS "pageId", type
    FROM roster_source_expected_type
   ORDER BY page_id, type`;
```

**Why `to_char` rather than letting the driver hand back a `Date`:** the convention is `timestamptz` in Postgres, ISO 8601 UTC on the wire, and the driver's timestamp mapping is unverified in this repo. Formatting in SQL makes the wire contract exact, keeps `composeManifest` trivially testable with plain strings, and removes the guess entirely. If you verify the driver returns a clean `Date`, simplifying is a fine follow-up — record it, don't assume it.

The write path, per proposed page:

```ts
await db.exec`
  INSERT INTO roster_source (page_id, page_title, url, kind)
  VALUES (${p.pageId}, ${p.title}, ${p.url}, ${p.kind})
  ON CONFLICT (page_id) DO NOTHING`;

for (const type of p.expectedTypes) {
  await db.exec`
    INSERT INTO roster_source_expected_type (page_id, type)
    VALUES (${p.pageId}, ${type})
    ON CONFLICT DO NOTHING`;
}
```

`created` is counted by reading `SELECT count(*) FROM roster_source` before and after the write loop — simpler and more honest than inferring it from `DO NOTHING`.

Roughly 120 pages × a handful of statements runs in well under a second against a local Postgres, on an operation the Collector triggers by hand a few times ever. **Do not optimize this into a multi-row `VALUES` list or a CTE.** Clarity is worth more than a runtime nobody will measure. SQL goes through Encore's tagged templates only — never string concatenation.

### Files to touch

| Path | Action | Notes |
|---|---|---|
| `charting/migrations/2_roster_source.up.sql` | NEW | DDL above. Never touch `1_roster.up.sql` |
| `charting/source-view.ts` | NEW | Pure. `@tcgourney/rank-engine` types only — no Encore, no DB |
| `charting/source-view.test.ts` | NEW | Bare `vitest` |
| `charting/bulbapedia.ts` | NEW | The only file that talks to the wiki. No test file |
| `charting/sources.ts` | NEW | The two endpoints. No test file |
| `docs/project-context.md` | UPDATE | See "Docs this story invalidates" |
| `docs/implementation-artifacts/deferred-work.md` | UPDATE | Only if review surfaces something out of scope |

**Do not touch:** `tsconfig.json`, `vite.config.ts`, `package.json`, `encore.app`, `.github/workflows/ci.yml`, anything under `collection/`, `catalog/`, `shared/`, or `packages/`. This story adds no dependency — Node 24's global `fetch` is the HTTP client.

`charting/db.ts` already declares the database and anchors `charting/migrations/`; `charting/encore.service.ts` already exists. `charting/sources.ts` takes its handle from `shared/db.ts` like every other consumer — **not** from `charting/db.ts`, which nothing imports by design (Story 1.1, D3).

> **The `encore.gen` trap.** The root `tsconfig.json` has no `exclude`, so `tsc --noEmit` typechecks `encore.gen/**`. Adding the first endpoints to `charting` changes the generated entrypoints. If typecheck reports unresolved modules under `encore.gen/`, delete the directory and let `encore run` regenerate it. Its absence is normal — CI never has it.

### Testing

`charting/source-view.test.ts` only. Match the register of `collection/binder-view.test.ts` and `packages/rank-engine/src/rank-engine.test.ts`: colocated, one `describe` per exported function, test names as domain sentences rather than implementation notes, real pages as fixtures instead of foo/bar data, no mocks.

Use the **real page titles and URLs verified above** — `Ash Ketchum` / 60644, `Noland's Articuno` / 47956 with its `%27`, `Articuno (Johto)` / 255130 with its bare parentheses, `Ash's Pikachu` / 827, `Ash's Bulbasaur` / 5741. The apostrophe and parenthesis cases are the whole point: they are what a hand-rolled URL builder gets wrong.

Cases `proposeSources` must cover:

1. **Each kind carries its expected types** — the listing yields `catch`/`teammate`/`glory`/`loyal`; an owned page yields six types and **no `encounter`**; a Legendary yields `encounter`/`bond` and **no `catch`**.
2. **Every proposal carries title, URL, and expected types** — AC 1 read literally; none is empty.
3. **URLs survive verbatim**, `%27` and bare parentheses intact, with no re-encoding.
4. **The listing URL carries the redirect fragment** (`…/Ash_Ketchum#Pok%C3%A9mon`) when the API reports one, and does not when it does not.
5. **A page in two categories becomes one proposal** with the earlier `kind` and the union of both expected-type sets.
6. **Output is sorted by title** regardless of input order — feed the fixtures reversed and get the same list.
7. **Nothing filtered** — `List of Pokémon temporarily owned by Ash Ketchum` and `Casey's Beedrill` are proposed like any other member.
8. **Empty enumerations** yield an empty list, not a throw.
9. **Inputs are not mutated.**

Cases `composeManifest` must cover:

10. **Expected types attach to the right Source** across several Sources, and a Source with none renders `expectedTypes: []` rather than being dropped.
11. **An empty manifest** is `{ sources: [] }`, not an error — nothing discovered yet is a reading list waiting to be drawn up.
12. **Ordering is stable** and follows the SQL's `ORDER BY page_title`.

Both `npm test` and `npm run typecheck` must pass from the repo root when you are done. That is the regression gate; the existing 24 tests stay green.

### Verified baseline — what passes today

Measured on `development` at `b85be63` before any change:

- `npm run typecheck` → passes. `npm test` → passes, 24 tests across `packages/rank-engine/src/rank-engine.test.ts` and `collection/binder-view.test.ts`.
- Three services boot: `charting`, `catalog`, `collection`. `charting` and `catalog` have **zero endpoints** — this story gives `charting` its first two.
- One migration applied: `charting/migrations/1_roster.up.sql` (`roster_entry`, `roster_milestone`).
- `GET /binder` returns `200 {"entries":[]}` — the roster ships empty.

### Docs this story invalidates

`project-context.md` binds agents to update it when new patterns emerge. This story makes three of its statements stale:

- The Encore.ts section says the services are `charting`, `catalog`, `collection` but describes no charting endpoints. Add the `/charting/*` path convention.
- The testing section's sanctioned bare-`vitest` exception names only `collection/binder-view.ts`. `charting/source-view.ts` joins it — same rationale, same rule ("every test that touches the database uses `encore test`").
- Nothing yet records that Bulbapedia's MediaWiki API is reached only for enumeration until Story 1.4. Add D1's allowed/forbidden split as a standing rule — it is the kind of boundary a later agent erases by accident.

**Out of scope, deliberately:** the brownfield snapshots under `docs/` (`api-contracts-backend.md`, `data-models-backend.md`, `architecture-backend.md`, `source-tree-analysis.md`, `index.md`, `project-overview.md`). They are point-in-time snapshots, not living specs.

### Guardrails — the mistakes this story invites

- **Do not cross the approval gate.** No extracts, no page content, no revision ids, no hashes (D1). This is AC 4 and the reason ADR-0001 exists.
- **Do not `ON CONFLICT DO UPDATE`** on `roster_source` (D5). It destroys Story 1.3's rulings and the damage is invisible today.
- **Never store derived data** (AD-2 / ADR-0003).
- **Never put derivation logic in a service** (AD-1). Nothing in this story derives Stars, Rank, or Slots — if you find yourself reaching for `computeLine`, you have wandered off.
- **Services never import each other.** `charting` reaches the database through `shared/db.ts`, and `charting` is **card-agnostic** — it never reads `catalog_*` or `collection_*`.
- **`charting` is the sole writer of `roster_*`.** These are its tables.
- **Never edit an applied migration.** `2_roster_source.up.sql` is new and sequential.
- **No new dependency.** No `axios`, no `node-fetch`, no MediaWiki client library, no `zod`.
- **Do not bump `encore.dev`.** Pinned `^1.57.10`; latest is v1.57.13 (2026-07-23), security patches only, with no API, database, migration, or client-generation changes. `encore run` will try to bump it for you — see the dev loop below.
- **No auth, no accounts, no hosting, no Dockerfile, no deploy step** (ADR-0004 / AD-13).
- **Don't add ESLint or Prettier.** Style is by example. Double quotes in service code.
- **Do not scaffold `frontend/`.** It lands in Epic 4. `npm run gen:client` failing against a missing `./frontend/src/` is expected — generate to a scratch path if you want to inspect the client.

### Vocabulary

`CONTEXT.md` is authoritative in code, schema, tests, and comments, and its *Avoid* lists are binding.

- **Source** — "an external work the roster is drawn from… A Source can propose; it can never decide." *Avoid:* reference, provider, feed. The table is `roster_source` and the domain word is Source, capitalized in prose and comments.
- **Proposal** is reserved. In this repo a Proposal is *a Milestone put forward for an Entry* (Story 1.5, `roster_proposal`). What this story produces is a **proposed Source** — a page put forward for reading. `proposeSources` returning `SourceProposal` is deliberate and correctly qualified; do not shorten it to `Proposal`.
- **Collector**, never user or player. **Milestone**, never achievement or gate.

Comments explain the story, not the code — the register is `// Never caught, yet woven into the tale all the same.` above Meowth, not `// filter unearned stages`. The existing files are the reference; match them.

### The dev loop

Work on `development`; `main` is the PR target. Commit messages are short imperative sentences with no conventional-commit prefixes, matching HEAD's style.

- **The Encore CLI does not run on the Windows host.** Smart App Control blocks unsigned `encore.exe` machine-wide. Encore work happens in the `Ubuntu-24.04` WSL2 distro (Encore v1.57.13, Node 24) against the checkout at `~/tcgourney`. Windows still runs `npm test` and `npm run typecheck` fine.
- **Docker Desktop must be running** — the `SQLDatabase` is declared, so `encore run` provisions Postgres.
- **`encore run` rewrites `package.json` and `package-lock.json`**, bumping `encore.dev` to match the CLI and stripping the trailing newline. Check `git status` after every run and `git checkout -- package.json package-lock.json` — revert **both together or neither**, since a desynced lockfile fails `npm ci` in CI.
- **A stale daemon caches its environment.** One started before Docker was reachable keeps insisting "The docker daemon is not running" while `docker ps` works. `encore daemon` restarts it.
- `encore run` serves the API on `:4000` and the dev dashboard on `:9400` — the API explorer there is the fastest way to POST discovery and read the manifest. `encore db shell tcgourney` opens psql.
- `npm install` at the repo root only — never inside a workspace package.

`docs/project-context.md` is the densest single source of binding rules for this repo and is required reading alongside this story.

---

## Tasks / Subtasks

- [x] **Task 1 — The schema** (AC: 2, 3)
  - [x] `charting/migrations/2_roster_source.up.sql` with the exact DDL above.
  - [x] `encore run` with Docker up; confirm the migration applies and both tables exist via `encore db shell tcgourney`.
- [x] **Task 2 — The pure module** (AC: 1)
  - [x] `charting/source-view.ts`: `EXPECTED_TYPES`, `proposeSources`, `composeManifest`, and the wire types.
  - [x] Verify it imports nothing but `@tcgourney/rank-engine` types — grep it for `encore` and `db` and expect nothing.
- [x] **Task 3 — Tests** (AC: 1)
  - [x] `charting/source-view.test.ts` covering all twelve cases, using the real verified fixtures.
  - [x] `npm test` and `npm run typecheck` from the repo root — both green, existing 24 tests included.
- [x] **Task 4 — The wiki client** (AC: 1, 4)
  - [x] `charting/bulbapedia.ts`: the three calls, `formatversion=2`, the `User-Agent`, `continue` paging, the 15s timeout, and response guards.
  - [x] Confirm by inspection that no call requests `prop=extracts`, `prop=revisions`, or `action=parse`.
- [x] **Task 5 — The endpoints** (AC: 1, 2, 3)
  - [x] `charting/sources.ts`: `discoverSources` and `listSources`, fetch-then-write, `ON CONFLICT DO NOTHING` on both inserts.
- [x] **Task 6 — Verify the seam end to end** (AC: 1, 2, 3, 4)
  - [x] With `encore run` up, `POST /charting/sources/discover`. Expect roughly 121 proposals — 1 listing + ~69 owned + ~51 Legendary. Record the actual numbers.
  - [x] `GET /charting/sources`; confirm every row is `proposed`, and spot-check that `Ash Ketchum` carries the `#Pok%C3%A9mon` fragment, `Noland's Articuno` kept its `%27`, and `Articuno (Johto)` kept its bare parentheses.
  - [x] **Run discovery a second time.** Confirm `created: 0`, `alreadyKnown` equals the full count, and `SELECT count(*) FROM roster_source` is unchanged — AC 3.
  - [x] **Prove AC 3 protects rulings:** `UPDATE roster_source SET state = 'approved' WHERE page_id = 60644;` then run discovery again and confirm the state is **still `approved`**. This is the D5 trap; catch it here or ship it.
  - [x] `SELECT count(*) FROM roster_source_expected_type;` — every Source has at least one row.
  - [x] Confirm AC 4 by inspection: no column, no file, and no log line holds page prose.
  - [x] Generate the client to a scratch path while `encore run` is up and confirm `charting.discoverSources` and `charting.listSources` appear alongside `collection.getBinder`. Do not commit it, and leave the `gen:client` script pointing at `./frontend/src/client.ts`.
  - [x] Record every observed response in the Dev Agent Record.
- [x] **Task 7 — Refresh `docs/project-context.md`** (AC: 4)
  - [x] Apply the three updates listed under "Docs this story invalidates."

---

## References

- [Source: docs/planning-artifacts/epics.md#Story-1.2] — acceptance criteria, verbatim
- [Source: docs/planning-artifacts/epics.md#Epic-1] — gate order propose → approve → ingest → draft
- [Source: docs/planning-artifacts/prds/prd-tcgourney-2026-07-26/prd.md#5.1] — FR-001/002/003; the near-free Catch discovery pass
- [Source: docs/implementation-artifacts/epic-1-context.md] — human approval gates ingestion; the manifest is permanent record; idempotency
- [Source: docs/implementation-artifacts/1-1-three-services-one-database-the-binder-preserved.md] — D3 shared handle, D4 database-free tests, the `encore.gen` trap, the unchecked-cast alias rule
- [Source: docs/implementation-artifacts/deferred-work.md] — the missing `btrim` checks; the untested SQL/alias layer; the `test.include` gap
- [Source: docs/adr/0001-bulbapedia-proposes-the-collector-decides.md] — Bulbapedia is a Source, never an oracle; Encounter candidates come from the Legendary category
- [Source: .../ARCHITECTURE-SPINE.md#AD-3] — write authority is the seam; `charting` is card-agnostic
- [Source: .../ARCHITECTURE-SPINE.md#AD-8] — the charting pipeline owns the wiki and the LLM; provenance is per Source
- [Source: .../ARCHITECTURE-SPINE.md#Core-entities] — `roster_source ||--o{ roster_proposal`
- [Source: .../SOLUTION-DESIGN.md#6] — source scoping as step 1 of the charting pipeline
- [Source: CONTEXT.md] — Source, Proposal, Collector, Milestone; the binding *Avoid* lists
- [Source: docs/project-context.md] — binding repo rules; the update obligation; the WSL/Docker/lockfile hazards
- [Source: https://bulbapedia.bulbagarden.net/w/api.php] — MediaWiki 1.43.8; siteinfo, `categorymembers`, `prop=info&inprop=url`, redirect resolution all verified live 2026-08-02
- [Source: https://www.mediawiki.org/wiki/API:Etiquette] — descriptive `User-Agent` required; generic agents rate-limited or blocked
- [Source: https://github.com/encoredev/encore/releases] — v1.57.13 (2026-07-23) latest; security-only since v1.57.10 (checked 2026-08-02)

---

## Dev Agent Record

### Agent Model Used

`claude-opus-5` via the `bmad-dev-auto` workflow. Spec: `spec-1-2-propose-the-reading-list.md`, baseline `b85be63`.

### Debug Log References

Runtime sweep run 2026-08-02 in WSL2 `Ubuntu-24.04` (`~/tcgourney`, Encore v1.57.13, Docker Desktop up). `encore run` applied `2_roster_source.up.sql` cleanly on boot ("Running database migrations done (250ms)"); all three services started.

### Completion Notes List

**Static gate (Windows host):**
- `npm test` → `Test Files 3 passed (3)`, `Tests 36 passed (36)`. The baseline 24 stayed green; the 12 new `source-view` cases are additive.
- `npm run typecheck` → exit 0, no output. `encore.gen/` never existed on the Windows host and was not created.
- `grep -riE "extracts|rvprop|action=parse|action=raw" charting/` → no matches. AC 4 holds by construction.
- `grep -nE "encore|shared/db" charting/source-view.ts` → no matches. The pure module stayed pure.
- `charting/` contains no `console.` or `log(` call at all — no log line can hold prose.

**Runtime sweep (observed responses, verbatim):**

| Step | Response |
|---|---|
| 1st `POST /charting/sources/discover` | `{"created":113,"alreadyKnown":0,"discovered":113}` (1.9s) |
| 2nd run | `{"created":0,"alreadyKnown":113,"discovered":113}` |
| 3rd run | `{"created":0,"alreadyKnown":113,"discovered":113}` |
| `GET /binder` (regression) | `{"entries":[]}` |

- `GET /charting/sources` → 113 Sources. Kinds: 1 `roster_listing`, 65 `pokemon_page`, 47 `legendary_page`. States before the ruling test: 113/113 `proposed`.
- `SELECT count(*) FROM roster_source_expected_type` → **489**. Sources with zero expected types → **0**.
- URL spot-checks, all exact:
  - `Ash Ketchum` → `…/wiki/Ash_Ketchum#Pok%C3%A9mon` (the redirect fragment landed)
  - `Noland's Articuno` → `…/wiki/Noland%27s_Articuno` (`%27` intact)
  - `Articuno (Johto)` → `…/wiki/Articuno_(Johto)` (bare parentheses intact, no `%28`)
- `discoveredAt` arrives as `2026-08-02T16:02:27.954Z` — ISO 8601 UTC, exactly as the `to_char` contract promises.
- **D5 trap caught, not shipped.** `UPDATE roster_source SET state='approved' WHERE page_id=60644` → `UPDATE 1`; after two further discovery runs the row is **still `approved`** (final tally: 1 `approved`, 112 `proposed`, 113 total). Rulings survive re-discovery.
- Client generated to a scratch path: `charting.discoverSources` and `charting.listSources` both present alongside `collection.getBinder`. Scratch file deleted; `gen:client` still points at `./frontend/src/client.ts`.
- `encore run` rewrote `package.json` / `package-lock.json` as expected; both reverted together in the WSL checkout. The Windows checkout shows an empty diff for both.

### File List

| Path | Action |
|---|---|
| `charting/migrations/2_roster_source.up.sql` | NEW |
| `charting/source-view.ts` | NEW |
| `charting/source-view.test.ts` | NEW |
| `charting/bulbapedia.ts` | NEW |
| `charting/sources.ts` | NEW |
| `docs/project-context.md` | UPDATE (3 rules) |
| `docs/implementation-artifacts/1-2-propose-the-reading-list.md` | UPDATE (this record) |
| `docs/implementation-artifacts/sprint-status.yaml` | UPDATE |

### Deviations

1. **`WikiPage` gained an optional `fragment?: string`.** The story fixes `proposeSources` at three parameters, makes "append the redirect fragment" a rule `proposeSources` must obey, and requires test case 4 to prove both halves of it. Those three only hold together if the fragment reaches the pure module. An optional field keeps the given signature exact and keeps the story's one permitted URL manipulation inside the tested module — appending it in `bulbapedia.ts` instead would have put the only URL manipulation in the one file with no test file.

2. **Three test fixtures beyond the five the story names**, all verified live the same day: `Casey's Beedrill`/8654 and `List of Pokémon temporarily owned by Ash Ketchum`/249837 (case 7 needs pages nobody would want read), and `Ash's Solgaleo`/277962 (case 5 needs a page in both categories). Solgaleo is not invented — it is the *only* real page both categories claim, a Legendary Ash actually owned, so the collision test exercises precedence and union on the exact page production hits. Confirmed live: it is stored once, as `pokemon_page`, carrying all seven expected types.

3. **The wiki has moved since the story was drafted, and the counts moved with it.** `Category:Ash's Pokémon` returns **65** members today (story said 69) and `Category:Legendary Pokémon (anime)` returns **48** (story said 51); neither paginates. So 1 + 65 + 48 = 114 offered, minus the Solgaleo collision = **113 distinct Sources**, against the story's "roughly 121". The story explicitly says to treat its counts as sanity checks rather than assertions, and nothing is hardcoded against them. `discovered` reports 113 — the deduped figure — so `discovered = created + alreadyKnown` stays honest.

4. **AC 1 is not ticked as fully met**, per the story's own note: there is no charting *world* until Epic 4, so "the charting world is open" cannot be satisfied here. Its testable substance — discovery runs, proposes all three candidate kinds, and every proposal carries title, URL, and expected Milestone types — is met and verified in Task 6. No frontend was scaffolded.
