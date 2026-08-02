# Integration Architecture

**Generated:** 2026-07-25 · exhaustive scan
**Repository type:** monorepo (npm workspaces), 2 parts

---

## Parts

| Part id       | Type      | Root                    | Runtime deps        |
| ------------- | --------- | ----------------------- | ------------------- |
| `backend`     | backend   | repo root + `roster/`   | `encore.dev@^1.57.10` |
| `rank-engine` | library   | `packages/rank-engine`  | **none**            |

---

## Integration points

There is exactly **one** integration point in the codebase today.

### 1. `backend` → `rank-engine` (in-process TypeScript import)

| Field   | Value                                                        |
| ------- | ------------------------------------------------------------ |
| From    | `backend` — [`roster/binder.ts:2`](../roster/binder.ts)      |
| To      | `rank-engine` — `packages/rank-engine/src/rank-engine.ts`    |
| Type    | Direct module import (same process, no network, no serialization) |
| Surface | `computeLine`, and the types `Milestone`, `StageInput`       |

```ts
import { computeLine, type Milestone, type StageInput } from "@tcgourney/rank-engine";
```

**Direction is strictly one-way.** The library imports nothing from the backend and
has no knowledge of Encore, HTTP, or the Binder response shape. This is what keeps
it unit-testable with no harness.

#### How resolution is wired

Three mechanisms have to agree for that import to work, and each serves a
different tool:

| Mechanism                                          | Consumer                       | Effect                                                  |
| -------------------------------------------------- | ------------------------------ | ------------------------------------------------------- |
| `"workspaces": ["packages/*"]` in root `package.json` | npm                          | Symlinks `@tcgourney/rank-engine` into `node_modules/`. |
| `paths` in root `tsconfig.json`                    | TypeScript                     | `@tcgourney/rank-engine` → `packages/rank-engine/src/rank-engine.ts`. |
| `exports: { ".": "./src/rank-engine.ts" }`         | Node / bundler resolution      | Package entry points at **raw `.ts` source**, not a build artifact. |

**Consequence:** there is no build step for the library. The backend consumes
TypeScript source directly, which means no stale `dist/`, no watch mode, and no
publish step — but also that any consumer must be able to compile TypeScript.

#### Where the boundary sits

The seam is deliberately drawn at "pure domain computation" vs. "everything else":

| Concern                                            | Lives in      |
| -------------------------------------------------- | ------------- |
| Milestones → Stars → Rank → Slots                  | `rank-engine` |
| Range validation (`RangeError` on bad Star counts) | `rank-engine` |
| Up-the-line inheritance ("the climb never slides back") | `rank-engine` |
| The roster data itself (`SEED_LINES`)              | `backend`     |
| The "earned a place" filter (`!caught && stars === 0`) | `backend`  |
| Wire/view shapes (`RankView`, `SlotView`, `BinderEntry`) | `backend` |
| `Set` → array and `readonly` → mutable conversion  | `backend`     |
| The `owned` flag (hardcoded `false`)               | `backend`     |

`roster/binder.ts` copies rather than forwards: `{ ...stage.rank }`,
`[...stage.milestones]`, `slots.map(...)`. The engine's `readonly` / `ReadonlySet`
types never leak into the API contract, so the wire format can change without
touching the domain.

---

## Planned integration points

Neither exists on disk. Both are documented rather than built.

### 2. `frontend` → `backend` (generated typed client) — **not built**

| Field   | Value                                                                 |
| ------- | --------------------------------------------------------------------- |
| From    | Vite + React frontend (planned; no `frontend/` directory exists)      |
| To      | `backend`, `GET /binder`                                              |
| Type    | Encore-generated TypeScript request client over REST                  |
| Command | `npm run gen:client` → `encore gen client tcgourney-46xi --output=./frontend/src/client.ts --env=local` |

The `gen:client` script is already in `package.json` but **will fail today**, since
its output directory does not exist.

Per [`research/encore-ts-setup.md`](./research/encore-ts-setup.md) §6, the intended
local flow is: `encore run` (API `:4000`) alongside the Vite dev server (`:5173`),
importing the generated client with the `Local` target — no Vite proxy needed,
because Encore allows all origins when developing locally. For a deployed frontend
a `global_cors` block must be added to `encore.app`; it is currently absent.

⚠️ The generated client must be regenerated after **every** endpoint change.

### 3. `backend` → Pokémon TCG API — **not built**

| Field   | Value                                                             |
| ------- | ----------------------------------------------------------------- |
| From    | `backend`                                                         |
| To      | `https://api.pokemontcg.io/v2` (third party)                      |
| Type    | Outbound REST, `X-Api-Key` header                                 |
| Purpose | Card catalog + the Rarity Translation Map (Rarity → Rank)         |

Fully researched in [`research/pokemontcg-api.md`](./research/pokemontcg-api.md);
no `fetch` call, no `secret("…")` declaration, and no HTTP client exist in the
codebase. Key constraints when it is built:

- Rate limits: **20,000/day with a key**, 1,000/day + 30/min without one.
- `pageSize` hard-caps at **250** — a full catalog requires paging.
- `/rarities` returns **38 free-form strings**, not a fixed enum; new sets
  introduce un-normalized values (e.g. `MEGA_ATTACK_RARE`). Map via an explicit
  lookup table with a loud `UNKNOWN` fallback.
- The API key belongs in `secret("PokemonTcgApiKey")`, set with
  `encore secret set --type dev,preview,local PokemonTcgApiKey`.

### 4. `backend` → Postgres — **not built**

No `SQLDatabase`, no `migrations/`. The roster is a compile-time constant. See
[Data Models](./data-models-backend.md) for what a schema will need to encode.

---

## Data flow, end to end (current)

```
SEED_LINES (compile-time constant, roster/binder.ts)
      │
      ▼  for each Evolution Line
computeLine(stages)                          ── rank-engine ──
      │   accumulate Milestones forward up the line
      │   starsOf → rankForStars → slotsFor
      ▼
StageResult[]  (readonly, Set-based)
      │
      ▼  filter: drop stages with !caught && stars === 0    ── backend ──
      │  map:    copy into mutable view types, owned = false
      ▼
BinderResponse → HTTP 200 → GET /binder
```

Every call recomputes from scratch. There is no cache, no database read, and no
external call anywhere in the request path — which is why the response is
deterministic and the endpoint cannot fail.

---

## Shared dependencies

Effectively none. The library declares **zero** runtime dependencies; the backend
declares one (`encore.dev`). Both dev-depend on the same `typescript@^7.0.2` and
`vitest@^4.1.10` versions, declared separately in each manifest — worth keeping in
sync manually, as nothing enforces it.
