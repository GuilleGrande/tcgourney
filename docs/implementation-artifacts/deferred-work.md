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

- source_spec: `docs/implementation-artifacts/spec-1-2-propose-the-reading-list.md`
  summary: `ON CONFLICT DO NOTHING` freezes a Source's `page_title`, `url` and `kind` at first sight, so a page Bulbapedia later renames or re-files keeps stale display data forever.
  evidence: D5 correctly forbade `DO UPDATE` because it would reset an `approved`/`declined` Source to `proposed` and destroy the Collector's rulings — but the fix was applied to every column, not just `state`. `discoverSources` is the only writer and is a no-op on existing rows, so nothing can ever repair a renamed page's title or link. Worse, `kind` freezes while expected types keep accumulating: a page first seen only in `Category:Legendary Pokémon (anime)` and later added to `Category:Ash's Pokémon` gains `catch`/`opponent`/`teammate`/`glory`/`loyal` rows while its `kind` stays `legendary_page` — a stored row asserting a Legendary that expects a Catch, the exact contradiction D2's kind split exists to prevent. The shape of the fix is `DO UPDATE SET page_title = …, url = …, kind = …` with `state` deliberately absent from the SET list, but writing to a conflict path at all needs the ruling-safety argument made explicitly before it ships.

- source_spec: `docs/implementation-artifacts/spec-1-2-propose-the-reading-list.md`
  summary: `roster_source.page_title` carries a `UNIQUE` constraint even though D4 makes `page_id` the identity and the title is mutable display data.
  evidence: A unique index on a column the wiki can change at will has no domain meaning, and it interacts badly with insert idempotency: if page A is renamed and a different page later takes A's old title, the new page's insert conflicts on `page_title`. This story's review changed the insert to an untargeted `ON CONFLICT DO NOTHING` so that case is passed over rather than failing the whole run permanently — but passing it over means the new page is silently never proposed, which is exactly the "silently dropping one is the system lying" failure the story warns against elsewhere. Dropping the `UNIQUE` in a later migration is probably right; it needs a decision, not a patch.

- source_spec: `docs/implementation-artifacts/spec-1-2-propose-the-reading-list.md`
  summary: `listSources` assembles the manifest from two non-transactional queries, and this story is what makes that race reachable.
  evidence: The identical defect is already logged above for `collection/binder.ts`, where it was recorded as "unreachable today because no service can write `roster_*` yet." `discoverSources` is now that writer. Sources are read, then expected types are read; a discovery interleaving between the two yields either a Source absent from the manifest whose types were read and discarded, or a Source rendering `expectedTypes: []` — which the Collector reads as "this page is expected to yield nothing," a materially wrong basis for the approval ruling. A single `LEFT JOIN` would remove the seam entirely and is likely simpler than what is there now.

- source_spec: `docs/implementation-artifacts/spec-1-2-propose-the-reading-list.md`
  summary: The seven Milestone types are declared independently in the engine's `Milestone` union and in two SQL `CHECK` constraints, with nothing tying them together.
  evidence: `packages/rank-engine/src/rank-engine.ts` owns the union; `charting/migrations/1_roster.up.sql` and now `2_roster_source.up.sql` each repeat the seven literals in a `CHECK`. Adding a Milestone type to the engine would flow into `EXPECTED_TYPES` with a green typecheck and a green suite, then fail at runtime on the join-table insert. Story 1.1 shipped the duplication once; this story doubled it. A single test asserting the union's members against the constraint's would close it cheaply.

- source_spec: `docs/implementation-artifacts/spec-1-2-propose-the-reading-list.md`
  summary: `charting/bulbapedia.ts` and `charting/sources.ts` have no automated coverage — the HTTP client, all SQL, every column alias, and both endpoints are proven only by a manual sweep.
  evidence: The same gap D4 accepted for `collection/binder.ts` in Story 1.1, now doubled in surface area and reaching the network. `db.queryAll<T>` is an unchecked cast, so a dropped double-quoted alias yields `undefined` fields with a green build. This is the second story to pay the cost, and the blocker is unchanged: root `vitest run` has no `test.include`, so any test importing Encore is collected by bare `npm test` and fails on a Docker-less CI runner. The Encore CLI now runs in WSL, so `encore test` is available the moment a `test.exclude` or naming convention lands.
