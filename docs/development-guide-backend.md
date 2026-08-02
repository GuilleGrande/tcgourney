# Development Guide — `backend`

**Part:** `backend` (Encore.ts application, repo root)
**Generated:** 2026-07-25 · exhaustive scan

---

## Prerequisites

| Requirement       | Version / notes                                                                    |
| ----------------- | ---------------------------------------------------------------------------------- |
| Node.js           | **24+** (per README). Encore's docs don't publish a hard floor.                     |
| npm               | Workspaces are used; npm ships with Node.                                           |
| Encore CLI        | v1.57.10 or newer. Install on Windows: `iwr https://encore.dev/install.ps1 \| iex`  |
| Docker Desktop    | Listed in the README — **not actually needed today** (see note below).             |

> **Docker note.** Encore requires Docker only to provision local databases. This
> app declares no `SQLDatabase`, so `encore run` works without Docker running right
> now. The prerequisite becomes real the moment persistence is added.

Verify the CLI:

```powershell
encore version          # prints e.g. "encore version v1.57.10"
encore version update   # upgrade
```

If the CLI behaves oddly, restart its background daemon: `encore daemon`.

---

## Setup

```powershell
npm install     # installs root deps and symlinks the packages/* workspaces
```

No `.env` file is needed — there are no environment variables and no declared
secrets. `.gitignore` covers `.env*` for when that changes.

---

## Commands

| Command                    | What it does                                                       |
| -------------------------- | ------------------------------------------------------------------ |
| `encore run`               | Starts the backend. API on `:4000`, local dev dashboard on `:9400`. |
| `npm run typecheck`        | `tsc --noEmit` against the root config.                             |
| `npm test`                 | `vitest run` — currently exercises only the rank-engine tests.       |
| `npm run gen:client`       | Generates a typed frontend client. ⚠️ **fails today** — see below.  |
| `encore test`              | Provisions test-mode infra, then runs the `test` script.            |

### Verify it works

```powershell
encore run
# then, in another terminal:
curl http://localhost:4000/binder
```

Expect a `200` with 7 entries. The local dev dashboard at
`http://localhost:9400` gives you an API explorer and request traces — the fastest
way to poke at the endpoint.

---

## Project layout

A folder becomes an Encore service by containing `encore.service.ts`. There is one:

```
roster/
├── encore.service.ts   # export default new Service("roster")
└── binder.ts           # GET /binder + SEED_LINES + view types
```

Routes are not registered anywhere — Encore discovers exported `api(...)` values
by static analysis. Adding an endpoint means exporting a new `api(...)` from any
file inside a service folder.

---

## Adding an endpoint

```ts
import { api } from "encore.dev/api";

interface EntryParams { species: string }
interface EntryResponse { /* … */ }

export const getEntry = api(
  { method: "GET", path: "/binder/:species", expose: true },
  async (p: EntryParams): Promise<EntryResponse> => { /* … */ },
);
```

- `expose: true` makes it public; the default (`false`) is service-internal only.
- Path params come from `:name`; use `Query<T>` / `Header<"Name">` from
  `encore.dev/api` for query and header fields.
- Request/response must be plain TS interfaces — that's what Encore validates
  against and what client generation reads.
- **Regenerate the frontend client after every endpoint change.**

Full API primitives reference: [`research/encore-ts-setup.md`](./research/encore-ts-setup.md) §3.

---

## Adding persistence (not yet done)

When the roster moves out of `SEED_LINES`:

```ts
import { SQLDatabase } from "encore.dev/storage/sqldb";
const db = new SQLDatabase("roster", { migrations: "./migrations" });
```

Migrations go in `roster/migrations/` named `1_create_table.up.sql`,
`2_add_field.up.sql`, … applied in order. Encore creates and migrates the database
automatically on `encore run` — **this is the point where Docker Desktop becomes a
hard requirement.** Query with tagged templates (`db.queryRow`, `db.queryAll`,
`db.exec`), which interpolate parameters safely.

See [Data Models](./data-models-backend.md) for what the schema needs to encode.

---

## Adding a secret (not yet done)

For the Pokémon TCG API key:

```ts
import { secret } from "encore.dev/config";
const pokemonTcgKey = secret("PokemonTcgApiKey");
// read it by calling it: pokemonTcgKey()
```

```powershell
encore secret set --type dev,preview,local PokemonTcgApiKey
encore secret set --type prod PokemonTcgApiKey
```

The compiler refuses to run or deploy until every declared secret has a value.

---

## Testing

There are **no backend tests yet**. `vite.config.ts` at the root already aliases
`~encore` → `./encore.gen` as Encore's testing guide requires, so the harness is
ready.

Run backend tests with `encore test`, not bare `vitest` — Encore provisions
test-mode infrastructure (separate test databases, fsync skipped) before
delegating to the `test` script. Flags pass through, e.g.
`encore test --fileParallelism=true`.

Highest-value tests to add first, in order:

1. `GET /binder` returns 7 entries and 29 slots for the current seed.
2. The "earned a place" filter drops a stage that is neither caught nor starred.
3. The view mapping — that `milestones` serializes to an array and `owned` is present.

---

## Known friction

| Issue                                          | Detail                                                                       |
| ---------------------------------------------- | ---------------------------------------------------------------------------- |
| `npm run gen:client` fails                     | Output path `./frontend/src/client.ts`; no `frontend/` directory exists yet.  |
| README overstates the Docker prereq            | True only once a database is declared.                                        |
| Duplicated dev-dependency versions             | `typescript` and `vitest` are pinned separately in the root and package manifests; nothing keeps them in sync. |
| No CI                                          | `npm test` and `npm run typecheck` run only when you remember to run them.    |
| Uncommitted changes to `ashs-journey-ruleset.md` | The spec the engine encodes has local edits — check them before trusting docs against it. |

---

## Conventions observed in the codebase

Not written down anywhere else, but consistent across the existing source:

- **Domain vocabulary is capitalized in prose** — Binder, Entry, Slot, Rank, Star,
  Milestone. [`CONTEXT.md`](../CONTEXT.md) is the authority, including the
  _Avoid_ lists (don't write "collection", "tier", "spot", "release").
- **Comments explain the story, not the code** — e.g. *"Never caught, yet woven
  into the tale all the same"* above Meowth. Match that register.
- **Double-quoted strings in backend code**, single-quoted in the rank-engine
  package. No formatter config enforces either — follow the file you're in.
- **Domain logic goes in the rank-engine package, never in the service.** The
  service owns data, filtering, and wire shapes only.
