# Architecture — `backend`

**Part:** `backend` · **Type:** backend (service/API-centric)
**Root:** repo root + [`roster/`](../roster/)
**Generated:** 2026-07-25 · exhaustive scan

---

## Executive summary

A single-service Encore.ts application exposing one public read endpoint,
`GET /binder`. It owns the roster data and the wire format; all rank computation
is delegated to the [`rank-engine`](./architecture-rank-engine.md) workspace
package.

The service is currently **stateless and I/O-free**. The roster is a hand-authored
compile-time constant, so every request recomputes the entire Binder from scratch
and returns an identical response. This is scaffolding — the README and the code's
own comments describe Postgres persistence and a Vite + React frontend as the next
steps, neither of which exists yet.

**Maturity:** early scaffold. One endpoint, no persistence, no auth, no CI, no
tests at this layer.

---

## Technology stack

| Category            | Technology         | Version     | Justification / notes                                                    |
| ------------------- | ------------------ | ----------- | ------------------------------------------------------------------------ |
| Language            | TypeScript         | `^7.0.2`    | `strict`, `isolatedModules`, `moduleResolution: bundler`, `composite`.   |
| Runtime             | Node.js            | 24+         | Per README prereqs. Encore docs don't pin a floor.                       |
| Backend framework   | Encore.ts          | `^1.57.10`  | Type-safe APIs from plain TS interfaces; infra-from-code.                |
| API style           | REST               | —           | `api({ method, path, expose })`; request/response are TS interfaces.     |
| Test runner         | Vitest             | `^4.1.10`   | Encore's recommended runner. **No backend tests exist yet.**             |
| Test harness config | Vite               | (transitive) | `vite.config.ts` aliases `~encore` → `./encore.gen`, per Encore's testing guide. |
| Package management  | npm workspaces     | —           | `workspaces: ["packages/*"]`.                                            |
| Database            | *(none)*           | —           | Postgres is planned; no `SQLDatabase` declared.                          |
| Auth                | *(none)*           | —           | No auth handler; `/binder` is `expose: true` and public.                 |
| CI/CD               | *(none)*           | —           | No `.github/workflows/`, no Jenkinsfile, no pipeline config.             |

App id: **`tcgourney-46xi`** (`encore.app`), `lang: typescript`,
`build.docker.bundle_source: true`.

---

## Architecture pattern

**Single-service, layered, infra-from-code.**

Encore's model is that a folder containing `encore.service.ts` *is* a service, and
that exported `api(...)` handlers *are* the routes — there is no router file, no
registration step, and no dependency-injection container. Structure comes from the
filesystem plus static analysis of the exported symbols.

Within the service, the layering is thin but real:

```
HTTP boundary        roster/binder.ts — api({ method: "GET", path: "/binder" })
                              │
View / DTO layer     RankView, SlotView, BinderEntry, BinderResponse
                     mutable, serialization-shaped, `owned` flag added here
                              │
Policy layer         "earned a place" filter: !caught && stars === 0 → drop
                              │
Data source          SEED_LINES: StageInput[][]   ← will become Postgres
                              │
Domain               @tcgourney/rank-engine (separate part, pure)
```

The load-bearing decision is that **the domain layer is a separate package with
zero dependencies**, so the rules can be tested and reasoned about without Encore,
HTTP, or a database in the picture. See [Integration
Architecture](./integration-architecture.md) for where exactly the seam is drawn.

---

## API design

One endpoint. Full schemas, worked example, and the seed's deterministic output
are in **[API Contracts — backend](./api-contracts-backend.md)**.

| Method | Path      | Exposed | Auth | Params | Returns          |
| ------ | --------- | :-----: | :--: | ------ | ---------------- |
| `GET`  | `/binder` |   ✅    | none | none   | `BinderResponse` |

Design notes:

- Response types are **plain TypeScript interfaces** — this is what enables
  `encore gen client` to emit a typed frontend client.
- The handler is `async (): Promise<BinderResponse>` — no request payload at all,
  so Encore's payload validation has nothing to validate.
- The domain's `readonly` and `ReadonlySet` types are deliberately **not** exposed
  on the wire. `binder.ts` spreads and copies (`{ ...stage.rank }`,
  `[...stage.milestones]`) into mutable view interfaces, decoupling the API
  contract from the domain representation.

---

## Data architecture

**There is no database.** No `SQLDatabase`, no `migrations/`, no ORM, no SQL.

The entire dataset is `SEED_LINES` in [`roster/binder.ts:10`](../roster/binder.ts) —
five hand-authored Evolution Lines yielding **7 Binder entries** and **29 Slots**.
The code says so plainly: *"the real roster will be edited through the app and
persisted in Postgres."*

A practical consequence worth knowing: **`encore run` does not currently need
Docker**, because there is no database for Encore to provision — even though the
README lists Docker Desktop as a prerequisite. That prereq becomes real the moment
a `SQLDatabase` is declared.

Full domain model, invariants, and a schema-design checklist:
**[Data Models — backend](./data-models-backend.md)**.

---

## Source tree

```
tcgourney/
├── encore.app          # app id, lang, docker build
├── package.json        # workspaces, encore.dev dep, scripts
├── tsconfig.json       # ~encore/* and @tcgourney/rank-engine path aliases
├── vite.config.ts      # Vitest harness; ~encore alias
└── roster/             # the only service
    ├── encore.service.ts   # new Service("roster")
    └── binder.ts           # GET /binder, SEED_LINES, view types
```

Annotated in full, including what's missing and why it matters:
**[Source Tree Analysis](./source-tree-analysis.md)**.

---

## Development workflow

```powershell
npm install     # install workspace deps
encore run      # API :4000, local dashboard :9400
npm run typecheck
```

Full setup, commands, and gotchas: **[Development Guide —
backend](./development-guide-backend.md)**.

---

## Deployment architecture

No deployment has been configured or performed. `encore.app` sets
`build.docker.bundle_source: true`, which prepares for `encore build docker`, but
there is no Dockerfile, no infra config, no CI pipeline, and no `encore` git
remote in the repo.

Two documented paths — Encore Cloud (`git push encore`) and self-hosted Docker
(`encore build docker`): **[Deployment Guide](./deployment-guide.md)**.

---

## Testing strategy

**This part has no tests.** `vite.config.ts` exists at the root purely to satisfy
Encore's testing guide (aliasing `~encore` → `./encore.gen`), and the root
`npm test` script runs `vitest run`, but no test file lives outside
`packages/rank-engine`.

The rank engine's 14 unit tests cover the domain rules thoroughly. What is
untested at this layer:

- the "earned a place" filter (`!caught && stars === 0`),
- the `StageResult` → view-type mapping (the `Set` → array, `readonly` → mutable copies),
- the HTTP contract of `GET /binder` itself.

When backend tests are added, run them with `encore test` rather than `vitest`
directly — Encore provisions test-mode infrastructure first and then delegates to
the `test` script.

---

## Known gaps

| Gap                                       | Evidence                                                        |
| ----------------------------------------- | --------------------------------------------------------------- |
| No persistence                            | No `SQLDatabase`; `SEED_LINES` is a constant.                    |
| No write endpoints                        | Only `getBinder` is exported.                                    |
| `owned` is always `false`                 | Hardcoded at `roster/binder.ts:76`.                              |
| `npm run gen:client` fails                | Writes to `./frontend/src/client.ts`; no `frontend/` exists.     |
| No auth                                   | `expose: true`, no `auth` option, no auth handler.               |
| No CORS config for deployed frontends     | `encore.app` has no `global_cors` block.                         |
| No CI                                     | No workflow files anywhere.                                      |
| No card catalog / rarity map              | Researched only — see [`research/pokemontcg-api.md`](./research/pokemontcg-api.md). |
