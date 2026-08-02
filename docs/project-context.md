---
project_name: 'tcgourney'
user_name: 'Guille'
date: '2026-08-01'
sections_completed:
  [
    'technology_stack',
    'language_rules',
    'framework_rules',
    'testing_rules',
    'quality_rules',
    'workflow_rules',
    'anti_patterns',
  ]
existing_patterns_found: 14
status: 'complete'
rule_count: 54
optimized_for_llm: true
---

# Project Context for AI Agents

_This file contains critical rules and patterns that AI agents must follow when implementing code in this project. Focus on unobvious details that agents might otherwise miss._

---

## Technology Stack & Versions

**Installed today** (root + `packages/rank-engine` npm workspaces):
- TypeScript ^7.0.2 · Node.js 24+ · Encore.ts ^1.57.10 (app id `tcgourney-46xi`) · Vitest ^4.1.10
- Postgres via Encore + Docker Desktop — the one `tcgourney` `SQLDatabase` is live as of Story 1.1.
- `typescript` and `vitest` are pinned separately in root and rank-engine `package.json` — keep versions in sync manually when bumping.

**Mandated by the architecture spine for upcoming work** (verified 2026-08-01 — do not silently downgrade or substitute):
- React ^19.2 · Vite ^8.2 (Rolldown) · @react-three/fiber ^9.6 · three r185 (0.185.x) · @react-three/drei ^10.7 · @tanstack/react-query ^5.101
- @anthropic-ai/sdk (latest), model `claude-opus-5`
- `pokemon-tcg-data` GitHub bulk JSON dump (never live pokemontcg.io calls)

**Version constraints:**
- Encore.ts + Postgres is deliberate despite the single-user mismatch — do NOT "fix" it to SQLite/files (ADR-0002).
- Docker Desktop is a hard prerequisite: the `SQLDatabase` is declared, so `encore run` needs Docker running.
- `npm run gen:client` targets `./frontend/src/client.ts` and fails until `frontend/` exists — expected, not a bug to fix.

## Critical Implementation Rules

### Language-Specific Rules (TypeScript)

- ESM only — `"type": "module"` everywhere. No `require`, no CommonJS output.
- Two tsconfigs with different strictness. The Encore app uses the root config (strict,
  `composite`, bundler resolution). `packages/rank-engine` additionally enforces
  `noUncheckedIndexedAccess` and `verbatimModuleSyntax`: indexed access returns
  `T | undefined` (check it — see `rankForStars`), and type-only imports MUST use the
  `type` keyword (`import { computeLine, type Milestone } from '@tcgourney/rank-engine'`).
- Cross-package imports go through the alias `@tcgourney/rank-engine` (root tsconfig
  `paths` + workspace symlink), never a relative `../../packages/...` path.
- `~encore/*` resolves to `./encore.gen/*` (root tsconfig + vite.config.ts alias). Never
  import from `encore.gen` by relative path; never edit generated files.
- Engine API surface is `readonly`/`ReadonlySet` — it never leaks onto the wire. Services
  copy at the boundary: `[...stage.milestones]`, `{ ...stage.rank }`. Wire types are plain
  mutable interfaces.
- Invalid domain input in the engine throws `RangeError` with a message stating the valid
  range and the received value. Services translate failures into Encore `APIError` codes —
  no custom error envelopes, no `{ ok, error }` wrappers.
- Every exported symbol in rank-engine carries a JSDoc line; use `{@link X}` for
  cross-references.
- Quote style is per-package: double quotes in backend/service code, single quotes in
  rank-engine. No formatter enforces it — match the file you're in.

### Framework-Specific Rules (Encore.ts + React/R3F)

**Encore.ts:**
- A folder becomes a service by containing `encore.service.ts` with
  `export default new Service("name")` — service names lowercase singular. The services are
  `charting`, `catalog`, `collection`. (The temporary `roster/` service dissolved into
  `collection` in Story 1.1, and `SEED_LINES` died with it. `shared/` is a plain module
  folder, deliberately NOT a service — never give it an `encore.service.ts`.)
- Endpoints are exported `api(...)` values discovered by static analysis — there is no route
  registration anywhere. `expose: true` makes an endpoint public; the default is
  service-internal.
- Request/response types are plain TS interfaces — that's what Encore validates and what
  client generation reads. Path params via `:name`; `Query<T>` / `Header<"Name">` from
  `encore.dev/api` for the rest.
- Services NEVER import each other. Each service is the sole writer of one table prefix:
  `charting` writes `roster_*` (the prefix outlived the dissolved `roster` service),
  `catalog` writes `catalog_*`, `collection` writes `collection_*`. Cross-domain access is
  read-only SQL — `collection` reads `roster_*` to build the Binder and never writes it.
- One `SQLDatabase` named `tcgourney` is declared in `charting/db.ts` (which anchors
  `charting/migrations/`); all three services take their handle from `shared/db.ts`, which
  is `SQLDatabase.named("tcgourney")`. Encore isolates per-service databases by default, so
  this is deliberate (AD-3).
- Migrations: per service, sequential `migrations/1_name.up.sql`, `2_...`. Query with tagged
  templates (`db.queryRow`, `db.queryAll`, `db.exec`) — never string-concatenated SQL.
- Secrets via `secret("Name")` from `encore.dev/config`, read by calling it. The Claude API
  key lives only in the charting service — never client-side (AD-8).
- After ANY endpoint change: `npm run gen:client`. The generated `frontend/src/client.ts` is
  the only client — never hand-write one.

**React frontend (spine-mandated, applies once `frontend/` exists):**
- Two route worlds: `src/binder/` (cozy R3F world) and `src/charting/` (utilitarian queue).
  All server data flows generated-client → TanStack Query. No hand-rolled `fetch`, no
  second cache layer (AD-11).
- The binder scene is ONE React Three Fiber canvas. Interactive text inside the scene uses
  drei `Html` projection (real links/selection); persistent HUD chrome is DOM overlay
  outside the canvas. Accessibility is a parallel DOM tree; `prefers-reduced-motion`
  replaces animation with cuts. No second scene technology, ever (AD-12).
- Frontend env vars via `import.meta.env` only.

### Testing Rules

- Test files are colocated with source, named `<module>.test.ts` (e.g.
  `src/rank-engine.test.ts`). One `describe` block per exported function.
- Test names are domain sentences, not implementation notes: "counts one Star per distinct
  star-granting Milestone", "caps at six Stars". Inline comments cite the story example
  being encoded ("// Meowth — never caught, yet Encounter + Bond earn two Stars.").
  Use real worked examples from `ashs-journey-ruleset.md` (the Charmander line, Meowth,
  Pikachu) as fixtures — not abstract foo/bar data.
- Engine tests use no mocks — pure functions, real values. Always test the rejection
  boundary too (`expect(() => rankForStars(7)).toThrow()`).
- Backend/service tests run with `encore test`, NEVER bare `vitest` — Encore provisions
  test-mode infrastructure (separate test databases, fsync off) before delegating to the
  `test` script. Extra flags pass through (`encore test --fileParallelism=true`). The one
  sanctioned exception (ratified in Story 1.1): a module inside a service folder that
  imports neither Encore nor the database — `collection/binder-view.ts` — is tested under
  bare `vitest`, because it needs no infrastructure and root `vitest run` collects it anyway.
  The rule stands for every test that touches the database.
- The `~encore` → `./encore.gen` alias in root `vite.config.ts` exists for this harness —
  don't remove it, don't duplicate it per-service.
- `npm test` at the root is `vitest run` and has no `test.include`, so it collects every
  `*.test.ts` in the repo — the engine suite and any pure module test alongside it;
  `npm run typecheck` is the other half of the gate. Run both before considering any
  change done. `.github/workflows/ci.yml` runs exactly those two on push and pull request —
  the only remote automation this project will ever have. It gets no Docker, so nothing it
  runs may need a database.

### Code Quality & Style Rules

- No linter or formatter is configured — style is by example. Match the file you're in;
  don't introduce ESLint/Prettier configs as a side quest.
- The ubiquitous language of `CONTEXT.md` is authoritative in code, schema, tests, and
  comments: Entry, Milestone, Proposal, Verdict, Source, Citation, Slot, Rank, Star,
  Chasing/Filled, the Map, Collector. Its _Avoid_ lists are binding — never write
  "album/collection" for Binder, "tier/grade" for Rank, "spot/cell" for Slot,
  "user/player" for Collector, "suggestion" for Proposal, "release" for Farewell.
  Domain terms are capitalized in prose and comments.
- Naming: files kebab-case (`rank-engine.ts`, `encore.service.ts`); tables `snake_case`
  with domain prefix (`roster_`, `catalog_`, `collection_`); services lowercase singular.
- The species slug (lowercase ASCII letters/digits/hyphens: `mr-mime`, `farfetchd`) is the
  only cross-domain natural key. It is minted exactly once — by the charting service on
  `roster_entry`, where it is the primary key — and copied verbatim everywhere else, never
  re-derived from a display name. Row ids never cross the domain seam. Card ids are
  `pokemon-tcg-data` ids verbatim.
- Timestamps: `timestamptz` in Postgres, ISO 8601 UTC on the wire.
- Comments explain the story, not the code — "Never caught, yet woven into the tale all
  the same." above Meowth, not "// filter unearned stages". Match that register; no
  boilerplate comments.

### Development Workflow Rules

- Work happens on the `development` branch; `main` is the PR target. Commit messages are
  short imperative sentences, no conventional-commit prefixes ("Scaffold roster service:
  GET /binder via the rank engine").
- Dev loop: `encore run` serves the API on :4000 and the local dev dashboard on :9400
  (API explorer + request traces — use it to poke endpoints). The Vite dev server (:5173)
  joins once `frontend/` exists. If the CLI misbehaves, restart the daemon with
  `encore daemon` — the daemon is long-lived, so one started before Docker was reachable
  keeps insisting "The docker daemon is not running" even while `docker ps` works.
- **The Encore CLI does not run on the Windows host.** Smart App Control / Device Guard is
  enforcing and `encore.exe` is unsigned, so it is blocked machine-wide. Encore work happens
  in the `Ubuntu-24.04` WSL2 distro (Encore v1.57.13, Node 24), against the checkout at
  `~/tcgourney`. Windows still runs `npm test` and `npm run typecheck` fine.
- **`encore run` rewrites `package.json` and `package-lock.json`** — it bumps `encore.dev`
  to match the CLI version and strips the trailing newline. This violates the pin, and a
  desynced lockfile fails `npm ci` in CI. Check `git status` after every run and
  `git checkout -- package.json package-lock.json` — revert BOTH together or neither.
- **A stale `encore.gen/` breaks `tsc --noEmit`.** It is gitignored generated code that hard-
  imports service files by path, and the root `tsconfig.json` has no `exclude`, so it is
  typechecked. After any service is renamed, moved, or deleted, delete `encore.gen/` and let
  `encore run` regenerate it. Its absence is normal — CI never has it.
- `npm install` at the root installs everything and symlinks `packages/*` — never
  `npm install` inside a workspace package.
- Endpoint changed → `npm run gen:client` before touching frontend code. Schema changed →
  new sequential `migrations/N_*.up.sql` file, never edit an applied migration.
- There is NO staging, NO production, NO deploy pipeline — by design (AD-13). Never add
  hosting config, Dockerfiles for deployment, auth, accounts, or multi-tenancy. The only
  remote automation is GitHub Actions CI (typecheck + tests).
- Backup story: the committed roster JSON export (FR-019) plus the Docker-managed Postgres
  volume. The export is a committed artifact in `roster-export/` — treat it as data the
  Collector owns, not generated noise.

### Critical Don't-Miss Rules

**Anti-patterns (each of these will look like a reasonable "improvement" — don't):**
- NEVER store derived data. Stars, Rank, Slots, rung attribution, badges, and progress are
  recomputed on every read from authored facts (Milestones, Verdicts, chase state, the
  Map). No caching column, no denormalized field, ever (AD-2 / ADR-0003).
- NEVER put derivation logic in a service or component — all of it extends
  `@tcgourney/rank-engine`, which imports nothing (no Encore, no React, no deps) (AD-1).
- NEVER hardcode a rarity string in TypeScript. All rarity → Rank knowledge lives in the
  versioned Rarity Translation Map table. Eligibility queries the CURRENT Map; old
  versions are audit history, never a query target (AD-5).
- NEVER parse card names to identify species at query time — eligibility joins on National
  Dex numbers resolved once at ingestion (AD-6).
- NEVER call pokemontcg.io (or any live API) in a request path. Card data comes from the
  ingested `pokemon-tcg-data` dump; images are fetched once by the catalog service, cached
  to disk, and served from disk (AD-7).
- NEVER auto-delete orphaned chase rows when a roster fix removes a Slot — they surface
  through the errata flow (AD-4).
- The `charting` service is card-agnostic: it never reads `catalog_*` or `collection_*`.
  The App reads roster tables via read-only SQL, never through charting endpoints (AD-3).

**Domain edge cases the engine already encodes — preserve them:**
- The Catch is the ⚫ base, NOT a Star. An uncaught Pokémon can still earn Stars and belong
  (Meowth). A stage earns a place only if caught or ≥1 Star.
- Each Milestone type counts at most once per Entry; Stars cap at 6. Milestones inherit
  FORWARD up the Evolution Line only — never backward.
- One Entry per species slug: thirty Tauros are one Entry.
- Rung attribution is engine law: the k-th rung maps to the k-th earned Milestone type in
  canonical order (opponent, teammate, encounter, bond, glory, loyal). A badge's Region
  comes from the EARLIEST record of the attributed type, by canonical episode order,
  insertion order breaking ties (AD-10).
- A Verdict outlives its Proposal — re-reading a Source never overturns one. Stickiness is
  checked against the stored MediaWiki revision id + content hash (AD-8). The roster
  version stamp advances automatically on any accepted Verdict write.
- Chase state addresses a Slot as `(species, rung)` — no FK into roster tables, because
  Slots are derived. The fill relation is slot → N cards (join table); the UI enforces 1
  until equivalence rules exist (FR-029).
- Collection tables always carry a `collector` reference even though exactly one Collector
  exists (AD-14). Roster and catalog stay globally scoped.

**Security:**
- The Claude API key is an Encore `secret()` inside the charting service only — never in
  frontend code, never in a committed file.
- SQL only via Encore tagged templates — no string concatenation.
- No auth/accounts is a DESIGN DECISION (personal use only, ADR-0004), not a gap to fill.
  Equally: never add hosting or publishing paths — that's a licensing decision that
  precedes any engineering.

---

## Usage Guidelines

**For AI Agents:**

- Read this file before implementing any code.
- Follow ALL rules exactly as documented. When in doubt, prefer the more restrictive
  option.
- The deeper sources behind these rules: `CONTEXT.md` (vocabulary),
  `ashs-journey-ruleset.md` (domain rules), `docs/adr/` (decision rationale), and
  `docs/planning-artifacts/architecture/architecture-tcgourney-2026-08-01/ARCHITECTURE-SPINE.md`
  (AD-1..AD-14, cited throughout this file).
- Update this file if new patterns emerge.

**For Humans:**

- Keep this file lean and focused on agent needs.
- Update when the technology stack changes or when `frontend/` lands (several "planned"
  notes here become "live" then).
- Remove rules that become obvious over time.

Last Updated: 2026-08-02
