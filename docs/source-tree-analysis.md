# Source Tree Analysis

**Generated:** 2026-07-25 · exhaustive scan (all 19 tracked files read)
**Repository type:** monorepo (npm workspaces), 2 parts

---

## Annotated tree

```
tcgourney/
├── encore.app                    # Encore app config — id `tcgourney-46xi`, lang `typescript`,
│                                 #   docker.bundle_source. No `global_cors` block yet.
├── package.json                  # Root manifest + npm workspaces (`packages/*`).
│                                 #   Runtime dep: encore.dev ^1.57.10. Scripts: test, typecheck, gen:client.
├── tsconfig.json                 # Root TS config. `composite: true`, `strict`, moduleResolution `bundler`.
│                                 #   Path aliases: `~encore/*` → ./encore.gen/*
│                                 #                 `@tcgourney/rank-engine` → packages/rank-engine/src/rank-engine.ts
├── vite.config.ts                # Vitest harness for the root. Aliases `~encore` → ./encore.gen
│                                 #   (required by Encore's testing guide).
│
├── roster/                       # ◀ PART: backend — the only Encore service
│   ├── encore.service.ts         #   ENTRY POINT: `export default new Service("roster")`.
│   │                             #   A folder becomes a service by containing this file.
│   └── binder.ts                 #   GET /binder endpoint + SEED_LINES constant + response view types.
│                                 #   → imports @tcgourney/rank-engine  ⟵ the one cross-part edge
│
├── packages/                     # npm workspace root
│   └── rank-engine/              # ◀ PART: rank-engine — pure domain library, zero runtime deps
│       ├── package.json          #   @tcgourney/rank-engine. `main`/`types`/`exports` all point at
│       │                         #   raw TypeScript source (src/rank-engine.ts) — no build step.
│       ├── tsconfig.json         #   Stricter than root: noUncheckedIndexedAccess, verbatimModuleSyntax, noEmit.
│       ├── vitest.config.ts      #   include: ['src/**/*.test.ts']
│       └── src/
│           ├── rank-engine.ts    #   ENTRY POINT: Milestone → Stars → Rank → Slots.
│           │                     #   Exports: starsOf, rankForStars, slotsFor, computeLine,
│           │                     #            RANKS, STAR_MILESTONES, MAX_STARS + types.
│           └── rank-engine.test.ts  # 14 unit tests across 4 describe blocks. The de facto spec.
│
├── docs/                         # ◀ project knowledge (this documentation set)
│   └── research/                 #   Source-cited research notes, primary sources only
│       ├── encore-ts-setup.md    #     Encore.ts install/API/DB/secrets/client-gen/testing/deploy
│       └── pokemontcg-api.md     #     pokemontcg.io v2 — endpoints, auth, rate limits, the 38
│                                 #     rarity strings, and a proposed rarity → Rank mapping
│
├── CONTEXT.md                    # Ubiquitous language / domain glossary. Read this first.
├── ashs-journey-ruleset.md       # The narrative ruleset the rank engine encodes. ⚠️ uncommitted edits.
├── README.md                     # Orientation, stack, develop commands.
├── .gitignore                    # Ignores node_modules, /encore.gen, .encore, dist, .env*, coverage
└── .gitattributes                # LF normalization; binary image types
```

### Present but not tracked

```
.encore/       # Encore CLI local runtime state       — gitignored
encore.gen/    # Encore-generated client/infra code    — gitignored, referenced by both tsconfig and vite.config
node_modules/  # gitignored
.claude/       # Claude Code + BMad skill definitions — untracked tooling, not application code
_bmad/         # BMad module config and scripts       — untracked tooling, not application code
```

---

## Critical directories

| Path                       | Part         | Purpose                                                                 |
| -------------------------- | ------------ | ----------------------------------------------------------------------- |
| `roster/`                  | backend      | The single Encore service. All HTTP surface lives here.                 |
| `packages/rank-engine/src/`| rank-engine  | All domain logic. Pure functions, no I/O, no dependencies.              |
| `docs/`                    | —            | Project knowledge; the AI-retrieval entry point is `docs/index.md`.     |
| `docs/research/`           | —            | Primary-source research feeding unbuilt features.                       |

**Notably absent** — expected by config or documentation but not on disk:

| Missing                | Referenced by                                     | Impact                                                        |
| ---------------------- | ------------------------------------------------- | ------------------------------------------------------------- |
| `frontend/`            | `package.json` → `gen:client` script; README stack | `npm run gen:client` writes into a non-existent directory.     |
| `roster/migrations/`   | README ("Postgres"), research notes                | No persistence — the roster is a compile-time constant.        |
| `.github/workflows/`   | —                                                  | No CI. Tests and typecheck run only locally.                   |
| `CONTRIBUTING.md`      | —                                                  | No documented contribution process.                            |

---

## Entry points

| Entry point                                  | Kind             | Reached by                                        |
| -------------------------------------------- | ---------------- | ------------------------------------------------- |
| `roster/encore.service.ts`                   | Service manifest | Encore runtime discovers it by filename.          |
| `roster/binder.ts` → `getBinder`             | HTTP handler     | `GET http://localhost:4000/binder`                |
| `packages/rank-engine/src/rank-engine.ts`    | Library barrel   | `import … from "@tcgourney/rank-engine"`          |
| `packages/rank-engine/src/rank-engine.test.ts` | Test suite     | `npm test -w @tcgourney/rank-engine`              |

---

## How the parts fit together

One import edge, in one direction:

```
┌─────────────────────────────────┐        ┌──────────────────────────────────┐
│ PART: backend                   │        │ PART: rank-engine                │
│ Encore.ts service `roster`      │ import │ @tcgourney/rank-engine           │
│                                 │───────▶│                                  │
│ roster/binder.ts                │        │ src/rank-engine.ts               │
│  • GET /binder                  │        │  • computeLine()                 │
│  • SEED_LINES (hand-authored)   │        │  • starsOf / rankForStars        │
│  • view types (+ `owned` flag)  │        │  • slotsFor                      │
│  • the "earned a place" filter  │        │  pure · no deps · no I/O         │
└─────────────────────────────────┘        └──────────────────────────────────┘
```

The library knows nothing about HTTP, Encore, or the Binder response shape. See
[Integration Architecture](./integration-architecture.md) for how the alias is
wired and where the boundary is enforced.

---

## Size

19 tracked files. The two source files that carry the system are
`packages/rank-engine/src/rank-engine.ts` (~152 lines, heavily documented) and
`roster/binder.ts` (~84 lines). Everything else is config, tests, or prose.
