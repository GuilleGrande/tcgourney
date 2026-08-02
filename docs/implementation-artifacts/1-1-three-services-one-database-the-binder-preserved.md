# Story 1.1: Three Services, One Database, the Binder Preserved

Status: ready-for-dev

Epic: 1 — The Journey Charted — Sources, Proposals, and Drafted Explainers
Story key: `1-1-three-services-one-database-the-binder-preserved`

## Story

As the Collector,
I want the app restructured into its three domain services over one Postgres database with the existing binder endpoint still working,
So that every later story lands in its final home and the write-authority seam is structural from day one.

## Acceptance Criteria

1. **Given** Docker Desktop is running, **When** `encore run` starts, **Then** the app boots with three services — `charting`, `catalog`, `collection` — sharing one `SQLDatabase` declared in a single shared module imported by all three.
2. **Given** the restructure is complete, **When** `GET /binder` is called, **Then** the `collection` service serves it by computing Rank and Slots via `@tcgourney/rank-engine` over the `roster_entry` and `roster_milestone` tables, **And** `roster/binder.ts` and `SEED_LINES` no longer exist.
3. **Given** an empty roster (nothing charted yet), **When** `GET /binder` is called, **Then** it returns an empty binder, not an error.
4. **Given** the charting service's migrations, **When** they run, **Then** `roster_entry` exists keyed by the species slug (lowercase kebab) carrying the National Dex number, and `roster_milestone` carries type, Region, and episode — only the tables this story needs, no more.
5. **Given** the endpoint moved, **When** `npm run gen:client` runs, **Then** the frontend compiles against the regenerated client and CI (typecheck + all tests) passes.
   > **Partially deferred.** No `frontend/` exists until Epic 4, so "the frontend compiles" cannot be met in this story. The testable half — client generation succeeds and produces the moved endpoint — is covered by D5. Do not tick this AC as fully met.

[Source: docs/planning-artifacts/epics.md#Story-1.1]

---

## Scope Decisions — Read This First

Five things the planning artifacts do **not** settle. Each is decided here so you do not have to invent an answer mid-implementation.

### D1. Evolution Line persistence — `roster_entry` gets `line_slug` + `stage_order`

**The problem:** AC 2 requires computing Rank and Slots via `computeLine()`, whose entire contract is forward inheritance across an *ordered array of stages in one Evolution Line*. No artifact says how a Line is persisted, yet the preserved wire contract carries `line: string[]`. Without Line grouping the binder is simply wrong — Charizard would lose Charmander's Milestones.

**Decision:** `roster_entry` carries `line_slug TEXT NOT NULL` and `stage_order INTEGER NOT NULL`.

- `line_slug` is the slug of the **base stage** of the Line. All three Charmander-line rows carry `charmander`.
- `stage_order` is the 0-based position within the Line.
- A species that never evolves is its own Line: `line_slug = slug`, `stage_order = 0` (Pikachu, Meowth).

This adds no table (AC 4: "only the tables this story needs, no more") and keys the Line by a species slug rather than a surrogate id, honoring AD-4's "row ids never cross the domain seam." These are authored facts, not derived data, so ADR-0003 is not in play.

**`line_slug` gets no foreign key, deliberately.** The base stage may legitimately have no `roster_entry` row of its own (see the known limit below). A `REFERENCES roster_entry(slug)` would reject those inserts. Do not "fix" this later.

**Known limit, accepted:** `line[]` is built from `roster_entry` rows, so a stage with no row is invisible to it. Story 2.2 creates an Entry only on its first accepted Milestone, so a milestone-less intermediate stage — exactly the Charmeleon case — will be missing from `line[]` until Lines are authored explicitly. That is a consequence of deferring Line authoring, not a bug to solve here.

**Forward note for Story 2.2:** when auto-creating an Entry, insert `line_slug = <the entry's own slug>, stage_order = 0`. These columns must never be nullable.

*Flagged for spine ratification — the spine's ER diagram has no Line representation.*

### D2. `roster_entry` also carries `display_name`

The current wire contract sends `species: "Charmander"` and `line: ["Charmander", "Charmeleon", "Charizard"]` — display names, not slugs. Slugs cannot be reversed into display names (`farfetchd` → `Farfetch'd`), so storing only the slug would silently regress the endpoint. `display_name TEXT NOT NULL` is mandatory, not optional.

Do **not** add a `slug` field to the wire response in this story. Epic 5 addresses a Slot as `(species, rung)` and will want it, but that is Epic 5's change — keep this story's response shape identical to today's.

### D3. One `SQLDatabase`, declared in `charting`, imported by all three from `shared/db.ts`

```ts
// charting/db.ts — the declaration and the migration anchor
export const db = new SQLDatabase("tcgourney", { migrations: "./migrations" });

// shared/db.ts — the single shared handle (a plain module, NOT a service: no encore.service.ts)
export const db = SQLDatabase.named("tcgourney");
```

**All three services — `charting` included — import the handle from `shared/db.ts`.** That satisfies AC 1 literally ("declared in a single shared module imported by all three") while keeping the migrations in `charting/migrations/` as AC 4 requires. Because `shared/` is not a service, importing it breaks no rule; the binding constraint is only that **no service imports another service**.

Encore's database docs bless both the shared-module and `SQLDatabase.named()` patterns as equivalent, the latter being "more explicit." The mechanism has to be stated rather than invented — that is the whole point of adversarial-review finding A7.

**Verification is `encore run`.** If Encore rejects a database resource referenced from a non-service directory, drop `shared/db.ts` and put `export const db = SQLDatabase.named("tcgourney")` in each consumer's own service folder (`catalog/db.ts`, `collection/db.ts`), leaving the declaration in `charting/db.ts`. Still one declaration, still zero cross-service imports. Record the deviation in the Dev Agent Record. Do **not** "fall back" to declaring the database in `shared/db.ts` — if the failure is that non-service directories cannot host database resources, moving the declaration there makes it worse.

### D4. Tests in this story are database-free; CI needs no Docker

**The problem:** AC 5 requires CI to run "typecheck + all tests," but no CI exists and nothing says whether a runner gets Docker, the Encore CLI, and Encore auth so `encore test` can provision Postgres. Worse, the root `vitest run` has no `test.include` filter — it collects **every** `*.test.ts` in the repo, so a database-dependent test under `collection/` would be picked up by bare `npm test` and fail without an Encore runtime.

**Decision:** keep this story's automated tests pure.

- Put the row→response mapping in `collection/binder-view.ts` — a module that imports **neither** Encore **nor** `shared/db.ts`, directly or transitively. Test it exhaustively.
- The `api()` handler stays a thin shell: two queries, hand rows to `composeBinder`, return.
- Verify the live endpoint **manually** via `encore run` (Task 6). That covers AC 1 and AC 3 end-to-end.

**Deviation to ratify:** `project-context.md` says backend and service tests run with `encore test`, **never** bare `vitest`. This story puts a test file inside a service folder and runs it under bare `vitest`. The rule exists so tests that need provisioned infrastructure get it; a pure module needs none, and honoring the rule literally would drag Docker and Encore auth into CI on day one. The rule stands for every test that touches the database.

**The cost, stated plainly:** the SQL, the row mapping, and the endpoint wiring get no automated coverage in this story. Task 6 is the only proof they work — do not skip or hand-wave it.

### D5. Do not scaffold `frontend/` — verify client generation to a scratch path

`npm run gen:client` writes to `./frontend/src/client.ts`, and `frontend/` does not exist until Epic 4. `project-context.md` states that this command failing today is "expected, not a bug to fix." Creating a frontend here would drag Epic 4's Vite/React/tsconfig decisions into a backend restructure.

Satisfy AC 5's testable half — *the endpoint move did not break client generation* — by generating to a throwaway path **while `encore run` is up** (`--env=local` needs the local app built):

```bash
mkdir -p <scratch>                     # the output directory must already exist
encore gen client tcgourney-46xi --output=<scratch>/client.ts --env=local
```

Assert the generated client exposes `collection.getBinder` and contains **no** `roster` namespace. Do not commit the scratch file. Leave the `gen:client` npm script pointing at `./frontend/src/client.ts` unchanged.

**Heads-up:** the HEAD commit message records that local `encore run` was "pending a one-time `encore auth login`." If `encore run` or client generation prompts for auth, run `encore auth login` once. If you cannot authenticate, note it in the Dev Agent Record and treat this as blocked rather than inventing a workaround.

**Note for Story 4.1:** when `frontend/` lands, the root `tsconfig.json` has no `include`/`exclude`, so `tsc --noEmit` will start typechecking the generated client under `lib: ["ES2022"]` with `types: ["node"]` and no DOM lib. The frontend will need its own tsconfig and an `exclude` at the root.

---

## Dev Notes

### Data Model — exact DDL

`charting/migrations/1_roster.up.sql`:

```sql
CREATE TABLE roster_entry (
  slug         TEXT PRIMARY KEY CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  display_name TEXT NOT NULL,
  dex_number   INTEGER NOT NULL CHECK (dex_number > 0),
  line_slug    TEXT NOT NULL CHECK (line_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  stage_order  INTEGER NOT NULL CHECK (stage_order >= 0),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (line_slug, stage_order)
);

CREATE TABLE roster_milestone (
  id         BIGSERIAL PRIMARY KEY,
  entry_slug TEXT NOT NULL REFERENCES roster_entry (slug) ON DELETE CASCADE,
  type       TEXT NOT NULL CHECK (type IN
               ('catch','opponent','teammate','encounter','bond','glory','loyal')),
  region     TEXT NOT NULL,
  episode    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX roster_milestone_entry ON roster_milestone (entry_slug);
```

Constraints that are load-bearing, and the traps behind them:

- **No `UNIQUE (entry_slug, type)`.** It looks obviously right — `CONTEXT.md` says each Milestone type is earned at most once per Entry — and it is wrong. AD-10 requires the slot-details story row to show *all* Milestone records of the attributed type, flipping when there are several, and FR-006 gives each its own Region and episode. The engine already collapses duplicates for scoring via a `Set` in `starsOf`, so the invariant is enforced where it belongs.
- **`roster_milestone` has no natural-key uniqueness at all**, so exact duplicate rows are possible. That is fine here — nothing writes to the table in this story. Deduplication on re-drafting belongs to Stories 1.5 and 2.8. Do not add `UNIQUE (entry_slug, type, region, episode)` either; it collides with AD-10 in a subtler way.
- **No derived columns.** No `stars`, no `rank`, no `caught`, no slot count, now or ever (AD-2 / ADR-0003). Adding a cached column "for query performance" is the single most tempting mistake in this story; the dataset is a few hundred Entries and there is no performance problem to solve. `caught` is derived from the presence of a `catch` milestone row.
- **The slug `CHECK`** encodes AD-4's character set structurally. The regex rejects leading, trailing, and doubled hyphens, so `mr-mime` passes and `-mime`, `mr--mime` do not.
- **`type` as `TEXT` + `CHECK`**, not a Postgres enum — altering an enum in a later migration is painful, and the seven values are fixed by the ruleset. The list matches the engine's `Milestone` union exactly.
- **`episode TEXT`** for now. AD-10 will eventually need Milestones ordered by *canonical episode order* to attribute a badge's Region; a sortable episode key is a later story's problem. Do not build it here, and do not treat `created_at` as a substitute — it is review-order-dependent and domain-wrong.

Everything else stays out: `roster_source` (Stories 1.2–1.4), `roster_proposal` (1.5), Verdicts and `roster_version` (2.2), the Appearance / explainer / Citation columns on `roster_milestone` (2.2), catalog tables and the Rarity Translation Map (Epic 3), `collection_chase` (5.2), the fill join table (5.3).

### The exact queries

Postgres folds unquoted identifiers to lowercase, and `db.queryAll<T>` is an **unchecked cast** — it validates nothing at runtime. Select `snake_case` columns into `camelCase` fields with **double-quoted** aliases, or every field arrives `undefined` and TypeScript reports nothing:

```ts
const entryRows = await db.queryAll<RosterEntryRow>`
  SELECT slug,
         display_name AS "displayName",
         dex_number   AS "dexNumber",
         line_slug    AS "lineSlug",
         stage_order  AS "stageOrder"
    FROM roster_entry
   ORDER BY line_slug, stage_order`;

const milestoneRows = await db.queryAll<RosterMilestoneRow>`
  SELECT entry_slug AS "entrySlug", type
    FROM roster_milestone
   ORDER BY entry_slug, id`;
```

Both `ORDER BY` clauses are required for a stable response. Entry order fixes the order of `entries[]` and `line[]`; milestone order fixes the order of the wire's `milestones[]` array, which follows insertion. Without them, two identical calls can return different JSON. Neither ordering is a domain claim — presentation order (Pokédex order within Region, via a swappable comparator) is Story 4.4's job.

SQL goes through Encore's tagged templates only — never string concatenation.

### Files to touch

| Path | Action | Notes |
|---|---|---|
| `charting/encore.service.ts` | NEW | `export default new Service("charting")` |
| `charting/db.ts` | NEW | Declares the one `SQLDatabase` |
| `charting/migrations/1_roster.up.sql` | NEW | DDL above |
| `catalog/encore.service.ts` | NEW | Skeleton only |
| `collection/encore.service.ts` | NEW | |
| `collection/binder-view.ts` | NEW | Wire types + pure composition. No Encore, no DB import |
| `collection/binder.ts` | NEW | `GET /binder` |
| `shared/db.ts` | NEW | Shared handle; **not** a service folder |
| `collection/binder-view.test.ts` | NEW | Pure tests |
| `.github/workflows/ci.yml` | NEW | typecheck + test |
| `docs/project-context.md` | UPDATE | See "Docs this story invalidates" |
| `roster/binder.ts` | **DELETE** | Ported to `collection/` |
| `roster/encore.service.ts` | **DELETE** | Service dissolves |
| `encore.gen/` | **DELETE, then regenerate** | See the trap below |

Do not touch `tsconfig.json`, `vite.config.ts`, `package.json`, or `encore.app`. The `~encore` alias, the `@tcgourney/rank-engine` path mapping, and the npm scripts already work. In particular the `~encore` alias in the root `vite.config.ts` exists for the Encore test harness: don't remove it, don't duplicate it per service.

> **The `encore.gen` trap — this will bite you.** `encore.gen/` currently contains generated TypeScript that hard-imports the files you are deleting:
> `encore.gen/internal/entrypoints/combined/main.ts:3` → `import { getBinder } from "../../../../roster\binder"`, plus two more under `internal/entrypoints/services/roster/` and `internal/clients/roster/`.
> The root `tsconfig.json` has **no `exclude`**, so `tsc --noEmit` typechecks `encore.gen/**` — which is exactly why typecheck passes today. Delete `roster/` without regenerating and `npm run typecheck` fails with unresolved-module errors, and this story forbids editing `tsconfig.json`.
> **Do this:** delete `roster/`, delete the `encore.gen/` directory, then run `encore run` to regenerate it, and only then run `npm run typecheck`. `encore.gen/` is gitignored and untracked, so CI is unaffected.

### The endpoint being ported — current state

`roster/binder.ts` today (83 lines) holds three things: `SEED_LINES` (the hand-written seed roster), the four wire interfaces, and the `getBinder` handler. Read the whole file before you start. The seed dies; the wire interfaces and the handler's shape survive.

**Preserve these wire types exactly** — they are what `encore gen client` reads and what Epic 4 will consume. Declare them in `collection/binder-view.ts`; `collection/binder.ts` imports them:

```ts
interface RankView    { stars: number; name: string; token: string; }
interface SlotView    { rank: RankView; isCatchSlot: boolean; owned: boolean; }
interface BinderEntry { species: string; line: string[]; caught: boolean; stars: number;
                        rank: RankView; milestones: Milestone[]; slots: SlotView[]; }
interface BinderResponse { entries: BinderEntry[]; }
```

**Export the endpoint under exactly this name** — Encore derives the generated client's method name from the exported const, and D5's check asserts `collection.getBinder`:

```ts
export const getBinder = api(
  { method: "GET", path: "/binder", expose: true },
  async (): Promise<BinderResponse> => { /* … */ },
);
```

Behaviors that must survive the port:

- **The "earned a place" filter stays service-side**, not in the engine: `if (!stage.caught && stage.stars === 0) continue;`. A stage never caught and holding no Star is not in the binder. Meowth — never caught, yet Encounter + Bond earn two Stars — proves the filter is not simply "caught."
- **Copy at the boundary, never forward.** `{ ...stage.rank }`, `[...stage.milestones]`, and a fresh object per Slot. The engine's `readonly` and `ReadonlySet` types must never reach the wire — a `Set` on a response type breaks both JSON serialization and client generation.
- **`owned: false` stays hardcoded.** No collection tables exist until Story 5.2.
- **`species` carries the display name**, and `line` lists the display names of every stage in the Line that has a row — including stages filtered out of `entries`.

### Composing the binder from rows

`collection/binder-view.ts` exports one pure function:

```ts
export interface RosterEntryRow {
  slug: string; displayName: string; dexNumber: number;
  lineSlug: string; stageOrder: number;
}
export interface RosterMilestoneRow { entrySlug: string; type: Milestone; }

export function composeBinder(
  entries: readonly RosterEntryRow[],
  milestones: readonly RosterMilestoneRow[],
): BinderResponse;
```

The algorithm: group entries by `lineSlug`, sort each group by `stageOrder`, project each stage's own milestone rows into a `StageInput`, call `computeLine(stages)` per Line, apply the "earned a place" filter, and copy into the wire types.

Two things to get right:

- **Feed each stage only its *own* Milestones.** `computeLine` performs the forward inheritance itself; pre-accumulating up the Line double-applies the rule. The engine's contract says `milestones` are "those earned directly at this stage."
- **`RosterEntryRow` / `RosterMilestoneRow` are sanctioned names** despite `CONTEXT.md` listing "Row" under Entry's *Avoid* list. These types are literally rows of `roster_entry` and `roster_milestone`, not domain Entries. Don't rename them mid-implementation.

**The empty-roster trap:** with no rows, `composeBinder([], [])` returns `{ entries: [] }` and the handler returns HTTP 200. Do not add an `if (!rows.length) throw APIError.notFound(...)` reflex. An empty binder is the correct state of a project where nothing has been charted. Where you do need to raise an error, use Encore's `APIError` codes — no `{ ok, error }` envelopes.

### Engine API you will call

`@tcgourney/rank-engine` imports nothing and must stay that way — never put derivation logic in a service (AD-1). Import through the alias, never a relative `../../packages/...` path, and use the `type` keyword for type-only imports:

```ts
import { computeLine, type Milestone, type StageInput } from "@tcgourney/rank-engine";
```

Relevant surface:

```ts
type Milestone = 'catch'|'opponent'|'teammate'|'encounter'|'bond'|'glory'|'loyal';
interface StageInput  { readonly species: string; readonly milestones: readonly Milestone[]; }
interface StageResult { readonly species: string; readonly milestones: ReadonlySet<Milestone>;
                        readonly caught: boolean; readonly stars: number;
                        readonly rank: Rank; readonly slots: readonly Slot[]; }
function computeLine(stages: readonly StageInput[]): StageResult[];
```

`StageInput.species` is a plain string — pass the **display name**, since it flows straight into `StageResult.species` and on to the wire.

### Testing

Conventions to match (see `packages/rank-engine/src/rank-engine.test.ts` for the reference style): colocated `<module>.test.ts`, one `describe` per exported function, test names as domain sentences rather than implementation notes, real worked examples as fixtures instead of foo/bar data, inline comments citing the story being encoded. No mocks.

**Take fixtures from `packages/rank-engine/src/rank-engine.test.ts` and the retiring `SEED_LINES`, not from the ruleset prose.** `ashs-journey-ruleset.md`'s Charizard table lists Catch + Bond + Teammate + Encounter + Loyal + Glory yet claims six Stars — five star-granting Milestones for a six-Star total. `SEED_LINES` reconciles it by giving Charizard `opponent` as well. Copy the test file's fixtures so your numbers match the existing suite.

Cases `collection/binder-view.test.ts` must cover:

1. **Forward inheritance across a Line** — Charmander (catch, bond, teammate), Charmeleon (none), Charizard (encounter, loyal, glory, opponent) yields Charmander at 2 Stars / Double Rare / 3 Slots, Charmeleon at 2 Stars / 3 Slots, Charizard at 6 Stars / Hyper Rare / 7 Slots.
2. **The "earned a place" filter** drops a stage neither caught nor starred, while keeping the rest of its Line.
3. **Meowth** — never caught, Encounter + Bond — appears with 2 Stars and 2 Slots, and **no** ⚫ Catch Slot.
4. **An empty roster** returns `{ entries: [] }`.
5. **The view mapping** — `milestones` serializes as an array (not a `Set`), `owned` is present and `false`, `line` lists every stage's display name in order.
6. **Duplicate Milestone rows of the same type** for one Entry do not inflate its Star count.

Useful regression baseline: the retired seed produced **7 entries and 29 slots** — Charmander (2★, 3 slots), Charmeleon (2★, 3), Charizard (6★, 7), Pikachu (6★, 7), Bulbasaur (3★, 4), Squirtle (2★, 3), Meowth (2★, 2).

### CI

`.github/workflows/ci.yml` — the first CI in this repo, and the only remote automation this project will ever have (AD-13). No Docker, no deploy step, no publish step.

```yaml
name: CI

on: [push, pull_request]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm
      - run: npm ci
      - run: npm run typecheck
      - run: npm test
```

`package.json` pins `@types/node ^22.10.0` while CI runs Node 24. That mismatch is harmless and pre-existing — do not "fix" it here.

### Verified baseline — what passes today

Measured on this branch before any change:

- `npm run typecheck` → passes.
- `npm test` → passes, 1 file / 14 tests (the engine suite).
- Root `vitest run` collects `packages/rank-engine/src/rank-engine.test.ts`. Because the root `vite.config.ts` sets no `test.include`, it will also collect anything added under `charting/`, `catalog/`, or `collection/` — which is why D4 keeps this story's tests database-free.
- `encore.gen/` exists and is gitignored; the Encore CLI is at `~/.encore/bin`.
- No `.github/` directory exists.

Both commands must pass again when you are done — after regenerating `encore.gen/`. That is the regression gate.

### Docs this story invalidates

`project-context.md` binds agents to "update this file if new patterns emerge," and names this exact trigger: "update when the technology stack changes or when the `frontend/` and Postgres migrations land." This story makes four of its statements false. Update them:

- "Docker Desktop becomes a hard prerequisite the moment a `SQLDatabase` is declared; **today `encore run` works without it**" — that moment is now.
- "Today's `roster/` service is temporary: it dissolves into `collection` when Postgres lands, and `SEED_LINES` dies with it" — done.
- The "planned" framing of the shared `SQLDatabase`.
- The "planned" framing of CI.

**Out of scope, deliberately:** the brownfield snapshots under `docs/` (`api-contracts-backend.md`, `integration-architecture.md`, `data-models-backend.md`, `architecture-backend.md`, `development-guide-backend.md`, `source-tree-analysis.md`, `index.md`, `project-overview.md`, `project-parts.json`) all describe `roster/binder.ts` as it stands today. They are point-in-time snapshots, not living specs. Leave them; refreshing them is a documentation pass of its own.

### Guardrails — the mistakes this story invites

- **Never store derived data** (AD-2 / ADR-0003).
- **Never put derivation logic in a service.** It all lives in `@tcgourney/rank-engine`, which imports nothing (AD-1). The "earned a place" filter is presentation policy, not derivation, and is the documented exception.
- **Services never import each other.** Cross-domain access is read-only SQL through the shared handle. Each service is sole writer of tables carrying its prefix: `roster_` belongs to charting even though collection reads it.
- **`charting` is card-agnostic** — never reads `catalog_*` or `collection_*`. Nothing to enforce yet; don't create the habit.
- **Don't "fix" Postgres to SQLite or files.** The single-user mismatch is deliberate (ADR-0002). Docker Desktop becomes a hard prerequisite from this story onward.
- **No auth, no accounts, no hosting, no Dockerfile, no deploy step** (ADR-0004 / AD-13). `GET /binder` stays `expose: true` with no auth.
- **Never edit an applied migration.** Schema changes get a new sequential `N_*.up.sql`.
- **Don't add ESLint or Prettier.** No linter or formatter is configured; style is by example. Quote style is per package — double quotes in service code, single quotes in rank-engine.
- **The `roster_` prefix outlives the `roster` service.** The tables keep the prefix; the service folder disappears.

### Vocabulary

`CONTEXT.md` is authoritative in code, schema, tests, and comments, and its *Avoid* lists are binding: never "album" or "collection" for Binder, "tier" or "grade" for Rank, "spot" or "cell" for Slot, "user" or "player" for Collector. Domain terms are capitalized in prose and comments — Entry, Milestone, Slot, Rank, Star, Region.

One collision worth knowing: the service is named `collection` while "collection" is an *Avoid* word for Binder. The service name is mandated by the architecture spine; the vocabulary rule still governs prose and comments.

Comments explain the story, not the code. The seed's `// Never caught, yet woven into the tale all the same.` above Meowth is the register — not `// filter unearned stages`.

### Previous work, stack, and the dev loop

HEAD is `618cc7c Scaffold roster service: GET /binder via the rank engine` — the only prior implementation commit, and the one this story dismantles. Its notes record that `@tcgourney/rank-engine` is wired through a tsconfig path which Encore's builder resolves, and that local `encore run` was pending a one-time `encore auth login`. Expect that prompt. There is no previous story file; this is the project's first.

Work on `development`; `main` is the PR target. Commit messages are short imperative sentences with no conventional-commit prefixes, matching HEAD's style.

**Do not bump `encore.dev`.** It is pinned at ^1.57.10. As of 2026-08-02 the latest release is v1.57.13, and everything since v1.57.10 is security patches with no TypeScript-framework, database, migration, or client-generation changes — so there is no functional reason to move, and a version bump inside a structural restructure makes any regression harder to attribute.

Encore API surface you need:

```ts
import { SQLDatabase } from "encore.dev/storage/sqldb";
const db = new SQLDatabase("name", { migrations: "./migrations" });   // declare
const shared = SQLDatabase.named("name");                            // reference elsewhere

await db.queryAll`SELECT ...`;   // array
await db.queryRow`SELECT ...`;   // row | null
await db.exec`INSERT ...`;
```

Migrations are `<number>_<name>.up.sql`, applied in sequence; Encore creates and migrates the database automatically on `encore run`, which is why Docker is required. Endpoints are exported `api(...)` values discovered by static analysis — there is no route registration anywhere.

`encore run` serves the API on `:4000` and the local dev dashboard on `:9400`; the dashboard's API explorer and request traces are the fastest way to poke `GET /binder`. `encore db shell tcgourney` opens a psql session against the local database. If the CLI misbehaves, restart the daemon with `encore daemon`. This is a Windows/PowerShell machine. Run `npm install` at the repo root only — never inside a workspace package.

`docs/project-context.md` is the densest single source of binding rules for this repo and is required reading alongside this story.

---

## Tasks / Subtasks

- [ ] **Task 1 — Shared database and the charting service** (AC: 1, 4)
  - [ ] `charting/encore.service.ts`: `export default new Service("charting")`.
  - [ ] `charting/db.ts` declaring `new SQLDatabase("tcgourney", { migrations: "./migrations" })`.
  - [ ] `charting/migrations/1_roster.up.sql` with the exact DDL above.
  - [ ] `shared/db.ts` exporting `SQLDatabase.named("tcgourney")`. No `encore.service.ts` in this folder.
  - [ ] Start Docker Desktop, run `encore run`, confirm the migration applies cleanly.
- [ ] **Task 2 — The catalog service skeleton** (AC: 1)
  - [ ] `catalog/encore.service.ts` only. No tables (Epic 3 owns `catalog_*`), no endpoints.
  - [ ] Confirm via `encore run` that services with **no exported `api()` endpoint boot** — this applies to `charting` as well as `catalog`, since neither has an endpoint in this story. If Encore rejects them, add exactly one internal endpoint per affected service: `expose: false`, no path colliding with `/binder`, then re-run the D5 client-generation check to confirm the public client surface still shows only `collection.getBinder`. Record the deviation.
- [ ] **Task 3 — Port the binder into the collection service** (AC: 2, 3)
  - [ ] `collection/encore.service.ts`.
  - [ ] `collection/binder-view.ts` — wire types plus the pure `composeBinder` (no Encore import, no DB import, directly or transitively).
  - [ ] `collection/binder.ts` — `export const getBinder = api(...)` using the exact queries above via `shared/db.ts`.
  - [ ] Delete the entire `roster/` folder (`binder.ts` **and** `encore.service.ts`). `SEED_LINES` dies with it.
  - [ ] Delete `encore.gen/`, then `encore run` to regenerate it. See the `encore.gen` trap.
- [ ] **Task 4 — Tests** (AC: 2, 3, 5)
  - [ ] `collection/binder-view.test.ts` covering the six cases above.
  - [ ] `npm test` and `npm run typecheck` from the repo root — both pass.
- [ ] **Task 5 — CI** (AC: 5)
  - [ ] `.github/workflows/ci.yml` exactly as given above.
- [ ] **Task 6 — Verify the seam end to end** (AC: 1, 3, 5)
  - [ ] With `encore run` up, call `GET /binder` against the empty roster; confirm `200 {"entries":[]}`.
  - [ ] Open `encore db shell tcgourney` and insert the fixture rows (every column is `NOT NULL`, so improvised inserts will fail):
    ```sql
    INSERT INTO roster_entry (slug, display_name, dex_number, line_slug, stage_order) VALUES
      ('charmander','Charmander',4,'charmander',0),
      ('charmeleon','Charmeleon',5,'charmander',1),
      ('charizard', 'Charizard', 6,'charmander',2),
      ('meowth',    'Meowth',   52,'meowth',    0);

    INSERT INTO roster_milestone (entry_slug, type, region, episode) VALUES
      ('charmander','catch','Kanto','EP011'), ('charmander','bond','Kanto','EP011'),
      ('charmander','teammate','Kanto','EP011'),
      ('charizard','encounter','Johto','EP175'), ('charizard','loyal','Johto','EP175'),
      ('charizard','glory','Orange Islands','EP082'), ('charizard','opponent','Kanto','EP046'),
      ('meowth','encounter','Kanto','EP002'), ('meowth','bond','Kanto','EP002');
    ```
  - [ ] Call `GET /binder` again; confirm 4 entries and 15 Slots — Charmander 2★ Double Rare / 3 Slots, Charmeleon 2★ / 3, Charizard 6★ Hyper Rare / 7, Meowth 2★ / 2 with no ⚫.
  - [ ] `DELETE FROM roster_milestone; DELETE FROM roster_entry;` — this story ships an empty roster.
  - [ ] Run the D5 scratch-path client generation while `encore run` is up; confirm `collection.getBinder` exists and `roster` is gone.
  - [ ] Record observed responses in the Dev Agent Record.
- [ ] **Task 7 — Refresh `docs/project-context.md`** (AC: 2)
  - [ ] Update the four now-false statements listed under "Docs this story invalidates."

---

## References

- [Source: docs/planning-artifacts/epics.md#Story-1.1] — acceptance criteria, verbatim
- [Source: docs/planning-artifacts/epics.md#Epic-1] — Story 1.1 as the brownfield foundation
- [Source: .../ARCHITECTURE-SPINE.md#AD-3] — write authority is the seam; one `SQLDatabase` in a shared module
- [Source: .../ARCHITECTURE-SPINE.md#AD-4] — species slug minted once; row ids never cross the seam
- [Source: .../ARCHITECTURE-SPINE.md#AD-6] — `roster_entry` carries the National Dex number
- [Source: .../ARCHITECTURE-SPINE.md#AD-10] — rung attribution; several Milestone records of one type per Entry
- [Source: .../ARCHITECTURE-SPINE.md#Source-tree] — target shape; the migration note dissolving `roster/binder.ts`
- [Source: .../SOLUTION-DESIGN.md#3] — one app, one database, three services
- [Source: .../reviews/review-adversarial.md#A7] — the shared-database mechanism must be stated, not invented
- [Source: docs/adr/0002-encore-and-postgres-for-a-single-user-local-app.md] — Docker prerequisite; do not migrate to SQLite
- [Source: docs/adr/0003-rank-and-slots-are-derived-never-stored.md] — no derived columns
- [Source: docs/adr/0004-personal-use-only.md] — no auth, no hosting
- [Source: docs/project-context.md] — binding repo rules; the update obligation
- [Source: docs/integration-architecture.md] — the "earned a place" filter is backend-side; copy-don't-forward
- [Source: docs/api-contracts-backend.md] — current `GET /binder` contract; `owned` hardcoded `false`; 7 entries / 29 slots baseline
- [Source: docs/research/encore-ts-setup.md] — Encore CLI, `SQLDatabase`, migrations, `encore test`, client generation
- [Source: https://encore.dev/docs/ts/primitives/databases] — shared-database patterns; migration naming (fetched 2026-08-02)
- [Source: https://github.com/encoredev/encore/releases] — v1.57.13 latest; security-only since v1.57.10 (checked 2026-08-02)

---

## Dev Agent Record

### Agent Model Used

_To be filled by the dev agent._

### Debug Log References

### Completion Notes List

- [ ] D3 verified: did all three services import `shared/db.ts` successfully under `encore run`, or was the per-service `SQLDatabase.named()` fallback needed?
- [ ] Task 2 verified: do services with no exported `api()` endpoint boot?
- [ ] `encore.gen/` regenerated after deleting `roster/`; `npm run typecheck` green again.
- [ ] D5 verified: client generation output contains `collection.getBinder` and no `roster`.
- [ ] Task 6: observed `GET /binder` responses, empty and with fixture rows.

### File List
