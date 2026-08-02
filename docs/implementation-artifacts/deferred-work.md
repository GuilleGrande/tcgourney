# Deferred Work

Findings surfaced by review passes that were real but out of scope for the story that found them.
Append-only. Each entry names the spec whose review raised it.

- source_spec: `docs/implementation-artifacts/spec-1-1-three-services-one-database-the-binder-preserved.md`
  summary: Branching Evolution Lines cannot be represented — `UNIQUE (line_slug, stage_order)` rejects two stages sharing a position, and forward inheritance would be wrong across branches anyway.
  evidence: Eevee's Line is the plain counterexample — `vaporeon` and `umbreon` both sit at `stage_order = 1` under `line_slug = 'eevee'`, and the second insert violates the unique constraint. D1 documented one known limit (a milestone-less intermediate stage) but never considered branching. Nothing writes these tables yet, so no data is at risk; settle it before Story 2.2 starts creating Entries, most likely with a `roster_line_stage` join table.

- source_spec: `docs/implementation-artifacts/spec-1-1-three-services-one-database-the-binder-preserved.md`
  summary: Nothing stops a Line's `line_slug` pointing at a row whose `stage_order` is not 0, which silently inverts inheritance.
  evidence: The schema permits `slug = 'charizard', line_slug = 'charizard', stage_order = 2` alongside other stages, making a final form the nominal base. `CHECK (slug <> line_slug OR stage_order = 0)` would close it, but applied migrations are never edited — this needs a new sequential migration, best combined with the branching decision above.

- source_spec: `docs/implementation-artifacts/spec-1-1-three-services-one-database-the-binder-preserved.md`
  summary: `collection/binder.ts` — the SQL, the column aliases and the endpoint wiring — has no automated coverage at all.
  evidence: D4 deliberately kept this story's tests database-free, and accepted the cost in writing. But `db.queryAll<T>` is an unchecked cast: drop one double-quoted alias and every field arrives `undefined` with a green build and an empty Binder. The only proof it works was a manual `psql` session that no longer exists. This is now actionable in a way it was not when D4 was written — the Encore CLI runs in WSL, so `encore test` is available.

- source_spec: `docs/implementation-artifacts/spec-1-1-three-services-one-database-the-binder-preserved.md`
  summary: The Binder is assembled from two separate `queryAll` calls with no transaction, so a concurrent write yields a Binder computed from mismatched halves.
  evidence: Entries are read, then Milestones are read. A Milestone inserted between them belongs to an Entry that may not be in the first result (silently dropped), or an Entry renders without Milestones it already has — wrong Stars, Rank and Slot count. Unreachable today because no service can write `roster_*` yet; it becomes live the moment Story 2.2 lands Verdict writes. The two awaits are also needlessly serialized.

- source_spec: `docs/implementation-artifacts/spec-1-1-three-services-one-database-the-binder-preserved.md`
  summary: `display_name`, `region` and `episode` are `TEXT NOT NULL` with no non-empty constraint, while `slug` and `line_slug` get careful kebab-case regexes.
  evidence: `''` passes `NOT NULL`. A nameless Entry would render as a blank stage name in `line[]` and in `species`. The asymmetry is the tell — the identity columns were guarded and the display columns were not. `CHECK (btrim(display_name) <> '')` and the same on `region`/`episode`, in a later migration.

- source_spec: `docs/implementation-artifacts/spec-1-1-three-services-one-database-the-binder-preserved.md`
  summary: Nothing prevents one species being charted under two slugs, splitting its Milestones across two Entries.
  evidence: `dex_number` has no `UNIQUE` and no upper bound, and the slug is the only key. `farfetchd` and `farfetch-d` both satisfy the kebab-case `CHECK` and would appear as two Entries for one Pokémon — breaking "one Entry per species". A naive `UNIQUE (dex_number)` is wrong (regional forms), so this needs a domain decision, not just a constraint.

- source_spec: `docs/implementation-artifacts/spec-1-1-three-services-one-database-the-binder-preserved.md`
  summary: The "service tests must be database-free" rule is enforced by prose alone, and CI can never run a database-backed test.
  evidence: Root `vitest run` has no `test.include`, so the first `*.test.ts` added under a service folder that touches `shared/db.ts` is collected by bare `npm test` and fails on a runner with no Docker. `project-context.md` documents the exception in words; there is no `test.exclude`, naming convention, or CI guard. Relatedly, `packages/rank-engine/vitest.config.ts` is not used by the root run at all — the engine tests are collected by default-glob coincidence.

- source_spec: `docs/implementation-artifacts/spec-1-1-three-services-one-database-the-binder-preserved.md`
  summary: Retiring `SEED_LINES` removed the only roster data, and no dev fixture strategy replaced it.
  evidence: The epic context flagged this as "worth deciding while drafting 1.1" and it was not decided. The story ships an empty roster, `charting` has no write endpoints, and the verification rows were inserted by hand then deleted. `GET /binder` returns `{"entries":[]}` in every environment with no supported way to change that — Epic 4's Binder UI will have nothing to render.

- source_spec: `docs/implementation-artifacts/spec-1-1-three-services-one-database-the-binder-preserved.md`
  summary: The CI workflow has no `permissions`, `concurrency` or `timeout-minutes` block, unpinned action versions, and a floating Node minor.
  evidence: Written exactly as the story dictated, so not a deviation — but every push to a PR branch runs the job twice (`push` + `pull_request`), the default `GITHUB_TOKEN` scope is inherited rather than narrowed to `contents: read`, and `node-version: 24` drifts against a locally verified 24.18.1 with no `.nvmrc` or `engines` field. `@types/node` also stays pinned at `^22.10.0` against a Node 24 runtime.

- source_spec: `docs/implementation-artifacts/spec-1-1-three-services-one-database-the-binder-preserved.md`
  summary: No automated guard stops `encore run`'s rewrite of `package.json` / `package-lock.json` from being committed.
  evidence: The rewrite happens on every run and a desynced lockfile fails `npm ci` at CI's first step. The mitigation shipped is a note in `project-context.md` telling a human to check `git status`. A `git diff --exit-code package.json package-lock.json` step in CI, or a pre-commit hook, would make it self-enforcing.

- source_spec: `docs/implementation-artifacts/spec-1-1-three-services-one-database-the-binder-preserved.md`
  summary: `@tcgourney/rank-engine` resolves by two different mechanisms depending on which tool is running.
  evidence: `tsc` resolves it through the `paths` mapping in `tsconfig.json`; vitest has no such alias and resolves it through the npm-workspace symlink and the package's `exports` field. Pre-existing, and it works today — but the two will diverge the moment the package gains a build step or a real `exports` map, and CI runs both.
