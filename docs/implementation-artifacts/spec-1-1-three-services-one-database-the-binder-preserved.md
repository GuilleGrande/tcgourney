---
title: 'Story 1.1 — Three Services, One Database, the Binder Preserved'
type: 'refactor'
created: '2026-08-02'
status: 'done'
baseline_revision: 'fc1c99f5feecdb9b72dd30eadc21cd9d36452bc6'
final_revision: '6ea0a57a06d314be5fadd934852306700f81c461'
review_loop_iteration: 0
followup_review_recommended: false # 13 patches, but zero touched production code — tests and documents only, and the tests pass
context:
  - '{project-root}/docs/implementation-artifacts/1-1-three-services-one-database-the-binder-preserved.md'
  - '{project-root}/docs/implementation-artifacts/epic-1-context.md'
  - '{project-root}/docs/project-context.md'
warnings: ['oversized']
---

<intent-contract>

## Intent

**Problem:** The app is a single temporary `roster` service serving `GET /binder` from a hand-written `SEED_LINES` constant with no database at all, so every later story has nowhere to land and the write-authority seam that the whole architecture rests on does not exist yet.

**Approach:** Restructure into the three domain services — `charting`, `catalog`, `collection` — over one Postgres `SQLDatabase`, move the binder endpoint into `collection` where it computes Rank and Slots from `roster_entry` / `roster_milestone` rows via `@tcgourney/rank-engine`, retire `roster/` entirely, and add the repo's first CI.

## Boundaries & Constraints

**Always:**
- One `SQLDatabase`, declared in `charting/db.ts` with `migrations: "./migrations"`; every service (charting included) takes its handle from `shared/db.ts` via `SQLDatabase.named("tcgourney")`. `shared/` is a plain module folder with **no** `encore.service.ts`.
- Services never import each other. `roster_*` tables stay charting's to write; `collection` reads them read-only.
- Derived data is never stored — no `stars`, `rank`, `caught`, or slot-count column, now or ever.
- All derivation stays in `@tcgourney/rank-engine`, imported through the `@tcgourney/rank-engine` alias with `type`-only imports keyworded. The "earned a place" filter (`!caught && stars === 0` ⇒ omit) is presentation policy and stays service-side — the documented exception.
- Copy at the wire boundary: `{ ...rank }`, `[...milestones]`, a fresh object per Slot. Engine `readonly`/`ReadonlySet` types must never reach a response type.
- SQL only through Encore tagged templates. Every `snake_case` column selected into a `camelCase` field needs a **double-quoted** alias, or `queryAll`'s unchecked cast silently yields `undefined`.
- Both `ORDER BY` clauses are load-bearing: `roster_entry` by `(line_slug, stage_order)`, `roster_milestone` by `(entry_slug, id)`. Without them identical calls can return different JSON.
- Wire types and the exported const name `getBinder` are preserved byte-for-byte — client generation reads them and Epic 4 consumes them.

**Block If:**
- Encore's builder rejects a database resource referenced from the non-service `shared/` directory. Fallback is per-consumer `SQLDatabase.named("tcgourney")` in `catalog/db.ts` and `collection/db.ts`, declaration staying in `charting/db.ts` — never move the declaration into `shared/`.
- Services with no exported `api()` endpoint fail to boot. Fallback is exactly one `expose: false` internal endpoint per affected service, then re-run the client-generation check.
- **KNOWN BLOCKED IN THIS ENVIRONMENT:** `encore.exe` is blocked machine-wide by Windows Smart App Control / Device Guard (`VerifiedAndReputablePolicyState = 1`), so `encore run`, `encore db shell`, and `encore gen client` cannot execute. Docker Desktop itself is up (server 29.5.3). Everything gated on the Encore CLI is unverifiable here and must be reported as such, never assumed green.

**Never:**
- Never scaffold `frontend/`, never repoint the `gen:client` script, never commit a generated client.
- Never edit `tsconfig.json`, `vite.config.ts`, `package.json`, `encore.app`, or an applied migration.
- Never add `UNIQUE (entry_slug, type)` or any natural-key uniqueness to `roster_milestone` — AD-10 needs several records of one type per Entry.
- Never add tables beyond the two this story needs; never add ESLint/Prettier; never bump `encore.dev`; never add auth, hosting, a Dockerfile, or a deploy step.
- Never throw on an empty roster — an empty binder is the correct state.
- Never touch the brownfield snapshots under `docs/` (`api-contracts-backend.md` and friends).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Empty roster | no rows in either table | `{ "entries": [] }`, HTTP 200 | none — empty is valid, no `APIError` |
| Forward inheritance across a Line | Charmander `catch,bond,teammate`; Charmeleon none; Charizard `encounter,loyal,glory,opponent` (one `line_slug`, `stage_order` 0/1/2) | Charmander 2★ Double Rare 3 Slots; Charmeleon 2★ 3 Slots; Charizard 6★ Hyper Rare 7 Slots; each carries `line: ["Charmander","Charmeleon","Charizard"]` | none |
| Earned-a-place filter | a stage neither caught nor starred | omitted from `entries`, yet still listed in its Line-mates' `line[]` | none |
| Uncaught but starred | Meowth `encounter,bond`, own single-stage Line | present, 2★, exactly 2 Slots, **no** `isCatchSlot` | none |
| Duplicate Milestone rows | two `bond` rows on one Entry | Star count unchanged (engine dedupes via `Set`) | none |
| Wire shape | any entry | `milestones` serializes as a JSON array; every Slot has `owned: false` | a `Set` reaching the wire breaks JSON + client gen |
| Malformed slug written | `mr--mime`, `-mime`, trailing hyphen | rejected at insert | Postgres `CHECK` violation |

</intent-contract>

## Code Map

- `roster/binder.ts` -- being ported then DELETED; holds `SEED_LINES`, the four wire interfaces, the `getBinder` handler. Read before starting.
- `roster/encore.service.ts` -- DELETED; the service dissolves.
- `packages/rank-engine/src/rank-engine.ts` -- `computeLine`, `StageInput`, `StageResult`, `Milestone`. Imports nothing; keep it that way.
- `packages/rank-engine/src/rank-engine.test.ts` -- the reference test style **and** the fixture source of truth (its Charizard numbers, not the ruleset prose).
- `tsconfig.json` -- no `include`/`exclude`, so `tsc --noEmit` walks `encore.gen/` too. Do not edit; this drives the `encore.gen` trap.
- `vite.config.ts` -- no `test.include`, so root `vitest run` collects any `*.test.ts` anywhere. This is why this story's tests must be database-free.
- `encore.gen/` -- gitignored, and its `internal/entrypoints/**` + `internal/clients/roster/**` hard-import `../../../../roster\binder`. Stale the moment `roster/` dies.
- `docs/implementation-artifacts/1-1-...-preserved.md` -- the authored story: exact DDL, exact queries, six required test cases, scope decisions D1–D5.

## Tasks & Acceptance

**Execution:**
- [x] `charting/encore.service.ts` -- NEW: `export default new Service("charting")` -- the service that owns `roster_*`.
- [x] `charting/db.ts` -- NEW: `new SQLDatabase("tcgourney", { migrations: "./migrations" })` -- the single declaration, anchoring migrations in charting.
- [x] `charting/migrations/1_roster.up.sql` -- NEW: the story's exact DDL for `roster_entry` + `roster_milestone` -- two tables, no more, no derived columns.
- [x] `shared/db.ts` -- NEW: `SQLDatabase.named("tcgourney")` -- the shared handle; **no** `encore.service.ts` in this folder.
- [x] `catalog/encore.service.ts` -- NEW: skeleton only -- Epic 3 owns `catalog_*`; no tables, no endpoints.
- [x] `collection/encore.service.ts` -- NEW -- the service that serves the binder.
- [x] `collection/binder-view.ts` -- NEW: the four wire interfaces + pure `composeBinder(entries, milestones)` -- imports neither Encore nor the DB, directly or transitively, so it is testable without infrastructure.
- [x] `collection/binder.ts` -- NEW: `export const getBinder = api({ method: "GET", path: "/binder", expose: true }, ...)` -- thin shell: two ordered queries, hand rows to `composeBinder`, return.
- [x] `collection/binder-view.test.ts` -- NEW: the six I/O-matrix cases, fixtures lifted from the engine suite and the retiring seed -- pure, no mocks, no database.
- [x] `roster/` -- DELETE the whole folder -- `SEED_LINES` dies with it.
- [x] `encore.gen/` -- REMOVE the stale tree -- it hard-imports the deleted `roster/` files and would break `tsc --noEmit`. Regeneration needs `encore run`.
- [x] `.github/workflows/ci.yml` -- NEW: checkout, Node 24, `npm ci`, `npm run typecheck`, `npm test` -- no Docker, no deploy, no publish.
- [x] `docs/project-context.md` -- UPDATE the four statements this story falsifies (Docker now a hard prerequisite; `roster/` dissolved and `SEED_LINES` dead; the shared `SQLDatabase` no longer "planned"; CI no longer "planned").

**Acceptance Criteria:**
- Given `roster/` is deleted and `encore.gen/` is absent (the CI condition — it is gitignored, so a fresh clone never has it), when `npm run typecheck` and `npm test` run from the repo root, then both pass and the engine's 14 tests still pass alongside the new binder-view tests.
- Given the migration file, when it is read, then `roster_entry` is keyed by the slug with a kebab-case `CHECK`, carries `display_name`, `dex_number`, `line_slug`, `stage_order`, `UNIQUE (line_slug, stage_order)`, and `roster_milestone` carries `type` (seven-value `CHECK`), `region`, `episode` with **no** uniqueness constraint and no derived column.
- Given the endpoint moved, when `collection/binder.ts` is read, then the exported const is named `getBinder`, the path is `/binder`, `expose: true`, and the response type is structurally identical to the retired one.
- Given Docker Desktop is running, when `encore run` starts, then all three services boot sharing the one database and the migration applies cleanly. *(Requires the Encore CLI — see Block If.)*
- Given the app is running, when a client is generated to a scratch path, then it exposes `collection.getBinder` and contains no `roster` namespace. *(Requires the Encore CLI — see Block If.)*
- Given `docs/project-context.md` after the change, when its Docker, `roster/`, shared-database, and CI statements are read, then none of them is still false.

## Spec Change Log

## Review Triage Log

### 2026-08-02 — Review pass

- intent_gap: 0
- bad_spec: 0
- patch: 13: (high 1, medium 9, low 3)
- defer: 11: (high 0, medium 7, low 4)
- reject: 7: (high 0, medium 0, low 7)
- addressed_findings:
  - `[high]` `[patch]` Cross-Line grouping — the entire justification for D1's `line_slug` — was never exercised: all six tests passed a single Line's rows. Added a test over the full retired seed (7 Entries / 29 Slots) asserting Line isolation, ordering, and per-Entry Stars.
  - `[medium]` `[patch]` `stages.sort(...)` was unreachable by the suite — it could have been deleted with every test still green. Added a reversed-row test that pins stage ordering independently of SQL ordering.
  - `[medium]` `[patch]` The caught-with-zero-Stars quadrant (the commonest early Entry) was untested. Added an idle-Tauros case asserting the lone ⚫ rung.
  - `[medium]` `[patch]` The authored story file was never updated — status, all seven task checkboxes, Dev Agent Record and Completion Notes were untouched despite the story explicitly demanding recorded observations. Filled in full.
  - `[medium]` `[patch]` `sprint-status.yaml` still read `ready-for-dev`, leaving three artifacts disagreeing about the story's state. Set to `done`.
  - `[medium]` `[patch]` `project-context.md`'s sole-writer rule still mapped tables to a `roster` service that no longer exists. Rewritten to name `charting` as the writer of `roster_*`.
  - `[medium]` `[patch]` The `encore run` rewrite of `package.json`/`package-lock.json` was recorded only in this spec. Promoted to `project-context.md` as a standing hazard, with the revert-both-together instruction.
  - `[medium]` `[patch]` The stale-`encore.gen/` typecheck trap was undocumented for anyone pulling this change. Added to `project-context.md`, along with the CLI-runs-only-in-WSL constraint and the daemon-caches-its-environment trap.
  - `[medium]` `[patch]` AC 1's literal wording ("imported by all three") is not met and the deviation was unrecorded — the spec ticked it anyway. Recorded explicitly under Deviations; code left unchanged, since importing an unused handle into `charting`/`catalog` would be dead code.
  - `[medium]` `[patch]` This spec contradicted itself — `status: in-review` over `Status: blocked` prose over an "all met" table. Reconciled, with the halt kept as history rather than erased.
  - `[low]` `[patch]` `epic-1-context.md` was generated stale on arrival, asserting the `SQLDatabase` lives in a shared module and that Docker "becomes" a prerequisite. Both corrected.
  - `[low]` `[patch]` Missing assertions: a caught Entry's ⚫ rung position and rank, `meowth.line`, and that the wire `milestones` array is itself deduped. All added.
  - `[low]` `[patch]` The "Recoverable" claim about the relocated `encore.gen/` overstated an ephemeral scratchpad copy. Corrected to name `encore run` in WSL as the real recovery path.

## Design Notes

**Why `line_slug` + `stage_order` on `roster_entry` (D1).** `computeLine` inherits Milestones forward across an *ordered array of stages in one Line*; nothing in the planning artifacts said how a Line persists, yet the wire contract carries `line: string[]`. Without grouping, Charizard silently loses Charmander's Milestones. `line_slug` is the base stage's slug (`charmander` on all three rows); a species that never evolves is its own Line (`line_slug = slug`, `stage_order = 0`). Deliberately **no** foreign key on `line_slug` — the base stage may legitimately have no row yet.

**Feed each stage only its own Milestones.** `composeBinder` groups by `lineSlug`, sorts by `stageOrder`, and passes each stage *only the rows whose `entrySlug` is that stage*. `computeLine` does the inheritance itself; pre-accumulating double-applies the rule.

```ts
const entryRows = await db.queryAll<RosterEntryRow>`
  SELECT slug, display_name AS "displayName", dex_number AS "dexNumber",
         line_slug AS "lineSlug", stage_order AS "stageOrder"
    FROM roster_entry ORDER BY line_slug, stage_order`;
```

**Why the tests dodge the database (D4).** Root `vitest run` has no `test.include`, so it collects *everything* — a database-dependent test under `collection/` would be picked up by bare `npm test` and fail without an Encore runtime, dragging Docker and Encore auth into CI on day one. Keeping `binder-view.ts` free of Encore and DB imports lets the domain logic be tested exhaustively for free. The stated cost: the SQL, the row mapping, and the endpoint wiring get no automated coverage in this story.

**Regression baseline.** The retired seed produced 7 entries / 29 slots. The story's live fixture set (Charmander line + Meowth) is 4 entries / 15 slots.

## Verification

**Commands:**
- `npm run typecheck` -- expected: exits 0 with `encore.gen/` absent, proving the CI condition
- `npm test` -- expected: exits 0; engine suite 14 tests plus the new `collection/binder-view.test.ts` cases, all green
- `git status --porcelain` -- expected: only intended additions/deletions; no `encore.gen/` noise (it is gitignored)

**Manual checks (if no CLI):**
- `charting/migrations/1_roster.up.sql` matches the story DDL character-for-character in its constraints, and no second migration file exists.
- `collection/binder-view.ts` imports only from `@tcgourney/rank-engine` — grep it for `encore` and for `db` and expect nothing.
- No file under `charting/`, `catalog/`, `collection/`, or `shared/` imports another service's module.
- **Unverifiable here (Encore CLI blocked by Device Guard):** migration application, three-service boot, D3's `shared/db.ts` acceptance, endpoint-less service boot, live `GET /binder` against empty and seeded rosters, and the `collection.getBinder` client-generation check. Report these as outstanding — do not mark them met.

## Auto Run Result

Status: **done**

The run halted once at step 03 with `implementation verification failed` — the Encore CLI was blocked by
Windows Device Guard, leaving five runtime acceptance criteria unverifiable. That was resolved out of band by
moving Encore into WSL2 (see *Environment update*); the runtime sweep then passed and the review pass ran to
completion. Every acceptance criterion is now met and the history below is kept rather than rewritten.

### What landed — all 13 execution tasks complete

New: [charting/encore.service.ts](../../charting/encore.service.ts), [charting/db.ts](../../charting/db.ts),
[charting/migrations/1_roster.up.sql](../../charting/migrations/1_roster.up.sql),
[shared/db.ts](../../shared/db.ts), [catalog/encore.service.ts](../../catalog/encore.service.ts),
[collection/encore.service.ts](../../collection/encore.service.ts),
[collection/binder-view.ts](../../collection/binder-view.ts), [collection/binder.ts](../../collection/binder.ts),
[collection/binder-view.test.ts](../../collection/binder-view.test.ts),
[.github/workflows/ci.yml](../../.github/workflows/ci.yml).
Deleted: `roster/binder.ts`, `roster/encore.service.ts`.
Removed from tree: `encore.gen/` (gitignored generated output; it hard-imported the deleted `roster\binder`, and the story forbids editing `tsconfig.json`). A copy sits in the session scratchpad, but that is ephemeral — the real recovery path is `encore run` in WSL, which regenerates it.
Modified: [docs/project-context.md](../project-context.md), and — in the review pass —
[the authored story](1-1-three-services-one-database-the-binder-preserved.md),
[sprint-status.yaml](sprint-status.yaml), [epic-1-context.md](epic-1-context.md).
Baseline `fc1c99f`.

### Verified green (re-run independently of the implementation subagent)

- `npm run typecheck` → exit 0.
- `npm test` → exit 0, 2 files / **24 tests** (the engine's 14 unchanged, 6 original `composeBinder` cases, 4 added in review).
- Both run with `encore.gen/` **absent**, which is exactly the CI condition — `encore.gen/` is gitignored, so a fresh clone never has it.
- Migration DDL matches the story character-for-character; only one migration file exists.
- `collection/binder-view.ts` imports `@tcgourney/rank-engine` and nothing else — no Encore, no database, directly or transitively.
- No service imports another service. `collection/binder.ts` reaches the database only through the non-service `shared/db.ts`.
- No source file imports `~encore/*`. `shared/` contains no `encore.service.ts`.
- `tsconfig.json`, `vite.config.ts`, `package.json`, `encore.app`, `.gitignore` untouched.

### Why it halted at step 03 (resolved)

`encore.exe` cannot execute on the Windows host. Smart App Control is enforcing and the binary is unsigned, so
Device Guard blocks it under PowerShell, cmd and bash alike. SAC has no per-app allowlist, and turning it off
is irreversible without reinstalling Windows — so it was left on and Encore moved to WSL2 instead.
Docker Desktop is healthy and irrelevant without the CLI (server 29.5.3).

### Acceptance criteria — all met (runtime checks completed 2026-08-02 in WSL)

| AC | State | Evidence |
|---|---|---|
| Three services boot sharing one `SQLDatabase`; migration applies | **met** | `encore run` clean; `encore.gen/internal/entrypoints/services/` = `catalog`, `charting`, `collection`; "Running database migrations done" |
| Empty roster returns an empty Binder, not an error | **met** | `GET /binder` → `200` `{"entries":[]}` |
| Live Binder over the story's fixture roster | **met** | `200`, **4 entries / 15 Slots** — Charmander 2★ Double Rare 3, Charmeleon 2★ 3, Charizard 6★ Hyper Rare 7, Meowth 2★ 2 with no ⚫. `owned` false throughout; `milestones` a JSON array |
| Generated client exposes `collection.getBinder`, no `roster` namespace (D5) | **met** | `encore gen client --env=local` → sole namespace `public readonly collection: collection.ServiceClient`; no `roster` match |
| D3 — Encore accepts a DB resource referenced from the non-service `shared/` | **met** | Booted as written. **Fallback not needed** — do not switch to per-consumer `SQLDatabase.named()` |
| Task 2 — `charting` and `catalog` boot with no exported `api()` endpoint | **met** | Both registered as services with zero endpoints. **Fallback not needed** — do not add filler `expose: false` endpoints |
| Static gate, migration shape, endpoint identity, docs refresh | **met** | typecheck + 20 tests green on Windows **and** Linux |

Roster left empty, as this story ships. The fixture rows were inserted, asserted, then deleted.

### Toolchain hazard found during verification — recurring

`encore run` **rewrites `package.json`**, bumping `encore.dev` from `^1.57.10` to `^1.57.13` to match the CLI
version, and strips the file's trailing newline. It also rewrites `package-lock.json` (dropping `peer: true`
markers). This directly violates the story's "Do not bump `encore.dev`" and "do not touch `package.json`"
constraints — and it is the toolchain doing it, not the implementation. Both files were reverted
(`git checkout -- package.json package-lock.json`); the installed 1.57.13 still satisfies `^1.57.10`, so
nothing breaks. **Expect this on every `encore run`** — check `git status` before committing.

### Deviations recorded

1. **Filter-test fixture is the Pidgey → Pidgeotto → Pidgeot Line**, not Charmander/Meowth/Pikachu. Because inheritance runs forward, the only stage that can be neither caught nor starred is a base stage with zero Milestone rows, and none of the three named fixtures has one. Ash's Line genuinely begins at Pidgeotto, so the fixture stays domain-true and also proves the omitted stage still appears in `line[]`.
2. **Three `project-context.md` edits beyond the four the story listed:** the `encore test` / never-bare-`vitest` rule now carries D4's ratified exception (the new test file would otherwise violate it verbatim); the "engine only today" description of `npm test` was falsified; and the For-Humans update trigger naming Postgres migrations had just fired.
3. `charting/db.ts` exports a `db` that nothing imports. Required by D3 — the declaration stays in charting, every consumer goes through `shared/db.ts`. Intentional, not dead code.
4. **AC 1's literal "imported by all three" is not met.** `shared/db.ts` is imported by exactly one file, `collection/binder.ts`; `charting` and `catalog` have no database code yet. The substance of AC 1 and D3 holds — one declaration, one shared non-service module, three services booting over one database, zero cross-service imports — and it was verified live. Adding an unused import to two services purely to satisfy the wording would be dead code. Flagged here rather than silently ticked; the wording should be relaxed when the spine is ratified.

### Environment update (2026-08-02, after the halt)

The Device Guard block was routed around rather than removed: Smart App Control stays **on**, and the Encore
CLI now runs inside a new WSL2 distro (`Ubuntu-24.04`, Encore v1.57.13, Node 24.18.1). The dev checkout for
Encore work is `~/tcgourney` inside that distro — cloned from origin at `fc1c99f` with this uncommitted work
copied on top; `git status` matches the Windows tree exactly. `npm ci && npm run typecheck && npm test` pass
there: **20 tests**, `encore.gen/` absent — which makes the Linux CI condition proven rather than inferred.

Docker Desktop WSL integration and `encore auth login` were then completed by the Collector, and the full
runtime sweep ran — see the acceptance table above. One trap worth recording: the Encore **daemon** is a
long-lived background process, so a daemon started before Docker integration was enabled keeps a stale
environment and reports "The docker daemon is not running" even while `docker ps` works fine. `encore daemon`
restarts it and clears this.

**Two checkouts now exist with identical uncommitted work** — `C:\Users\guill\Workspace\tcgourney` (Windows)
and `~/tcgourney` inside `Ubuntu-24.04` (where Encore and npm run). They must be reconciled by committing from
one and pulling into the other; leaving both live invites divergence.

### To resume

Implementation and every acceptance criterion are now verified; **only step 04 (Review) of the dev-auto
workflow has never run.** To finish the story, set `status` to `in-review` and re-invoke `/bmad-dev-auto`
pointing at this spec — it will construct the diff against `fc1c99f`, run the adversarial and edge-case review
passes, triage findings, and commit. Decide first which checkout that commit should land in.
