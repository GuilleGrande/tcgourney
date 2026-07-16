# Encore.ts — Setup & Build Reference

> **Note:** This repo had no prior `docs/research/` convention; this file establishes it. Keep research notes here as source-cited Markdown.
>
> **Scope:** Primary sources only — the official Encore docs (`encore.dev/docs`) and Encore's GitHub. Every claim is cited inline with its source URL.
> **Target environment:** Windows 11, Node 24, npm (no pnpm). **Compiled:** 2026-07-16.
> **Current version at time of writing:** Encore CLI **v1.57.10** (published 2026-07-16) — [github.com/encoredev/encore/releases/latest](https://api.github.com/repos/encoredev/encore/releases/latest). Docs pages sometimes show older example version strings (e.g. `v1.28.0`); trust the GitHub release for "current".

---

## 1. Install the CLI (Windows) + verify + daemon

Windows (PowerShell), one line — [encore.dev/docs/ts/install](https://encore.dev/docs/ts/install), confirmed in the [repo README](https://raw.githubusercontent.com/encoredev/encore/main/README.md):

```powershell
iwr https://encore.dev/install.ps1 | iex
```

(For reference — macOS: `brew install encoredev/tap/encore`; Linux: `curl -L https://encore.dev/install.sh | bash`. Same source.)

**Verify:**

```powershell
encore version          # prints e.g. "encore version v1.57.10"
encore version update   # upgrade to latest
```

Source: [encore.dev/docs/ts/install](https://encore.dev/docs/ts/install), [cli-reference](https://encore.dev/docs/ts/cli/cli-reference).

**Prerequisites:** Node.js is required to run Encore.ts apps; **Docker is required for Encore to provision local databases** (so on Windows 11 you need Docker Desktop / WSL2 running before `encore run` with a DB) — [encore.dev/docs/ts/install](https://encore.dev/docs/ts/install).

**Background daemon:** Yes. The CLI runs a background daemon; if you hit unexpected behavior, restart it with `encore daemon` — [encore.dev/docs/ts/cli/cli-reference](https://encore.dev/docs/ts/cli/cli-reference).

> ⚠️ **Node 24 note (version-sensitive):** The docs state "Node.js required" but do not pin a specific minimum in the pages reviewed. Node 24 (current LTS line) is expected to work; treat exact Node-version support as version-sensitive and re-check if `encore run` errors on the runtime.

---

## 2. Create a new app + templates + project structure

```powershell
encore app create            # interactive: pick language (TypeScript) + a starter (e.g. "Hello World")
```

`encore app create [name] [flags]` — key flags: `--example` (URL to example code), `-l, --lang`, `-r, --llm-rules`, `--platform` (default true). Source: [cli-reference](https://encore.dev/docs/ts/cli/cli-reference), [quick-start](https://encore.dev/docs/ts/quick-start).

- Templates are chosen **interactively** (e.g. "Hello World"); `--example=<url>` seeds from example code. Browse the catalog at [encore.dev/templates](https://encore.dev/templates) (e.g. [react starter](https://encore.dev/templates/react)).
- Optional AI-assistant rules: `encore llm-rules init` — [encore.dev/docs/ts/install](https://encore.dev/docs/ts/install).

**Resulting structure** (a service = a folder with an `encore.service.ts`) — [quick-start](https://encore.dev/docs/ts/quick-start):

```
my-app/
├── encore.app              # app config (id, global_cors, …) — JSON
├── package.json
├── hello/                  # a service
│   ├── encore.service.ts   # export default new Service("hello");
│   └── hello.ts            # API endpoints
```

---

## 3. Service + type-safe API endpoint

**Define a service** (`hello/encore.service.ts`) — [quick-start](https://encore.dev/docs/ts/quick-start):

```ts
import { Service } from "encore.dev/service";
export default new Service("hello");
```

**Type-safe endpoint** (`hello/hello.ts`) — [defining-apis](https://encore.dev/docs/ts/primitives/defining-apis):

```ts
import { api } from "encore.dev/api";

interface PingParams { name: string; }
interface PingResponse { message: string; }

export const ping = api(
  { method: "POST", path: "/ping/:name", expose: true },
  async (p: PingParams): Promise<PingResponse> => {
    return { message: `Hello ${p.name}!` };
  },
);
```

`api()` options: `method`, `path` (`:id` for a param, `*wild` for a wildcard), `expose` (public; default `false` = internal only), `auth`, `sensitive`. Request/response are plain TS interfaces; Encore validates payloads against them. Source: [defining-apis](https://encore.dev/docs/ts/primitives/defining-apis).

**Path / query / header fields** — [defining-apis](https://encore.dev/docs/ts/primitives/defining-apis):

```ts
import { Query, Header } from "encore.dev/api";
interface Params {
  id: number;                       // from path ":id"
  limit: Query<number>;             // ?limit= in query string
  language: Header<"Accept-Language">;
}
```

**Raw endpoint** (low-level `Request`/`Response`) — [defining-apis](https://encore.dev/docs/ts/primitives/defining-apis):

```ts
export const fallback = api.raw(
  { expose: true, method: "*", path: "/!path" },
  async (req, resp) => { /* handle raw request */ },
);
```

---

## 4. Postgres: `SQLDatabase`, migrations, querying

**Declare a DB** (inside a service) — [databases](https://encore.dev/docs/ts/primitives/databases):

```ts
import { SQLDatabase } from "encore.dev/storage/sqldb";

const db = new SQLDatabase("todo", { migrations: "./migrations" });
```

**Migrations** live in the referenced folder, named `<number>_<name>.up.sql`, applied sequentially (leading zeros OK) — [databases](https://encore.dev/docs/ts/primitives/databases):

```
todo/
├── migrations/
│   ├── 1_create_table.up.sql
│   └── 2_add_field.up.sql
├── todo.ts
```

Encore creates/migrates the DB automatically on `encore run` (needs Docker). Source: [databases](https://encore.dev/docs/ts/primitives/databases).

**Query** — tagged-template methods (params are safely interpolated) — [databases](https://encore.dev/docs/ts/primitives/databases):

```ts
await db.exec`INSERT INTO todo_item (title, done) VALUES (${title}, false)`;
const row  = await db.queryRow`SELECT title FROM todo_item WHERE id = ${id}`; // row | null
const all  = await db.query`SELECT * FROM todo_item`;   // async iterator
```

Also: `db.queryAll` (array), and raw variants `db.rawQuery` / `db.rawExec` using `$1` placeholders. Source: [databases](https://encore.dev/docs/ts/primitives/databases).

---

## 5. Secrets (e.g. Pokémon TCG API key)

**Declare** — [secrets](https://encore.dev/docs/ts/primitives/secrets):

```ts
import { secret } from "encore.dev/config";
const pokemonTcgKey = secret("PokemonTcgApiKey");   // call it as a function to read: pokemonTcgKey()
```

**Set the value** via CLI (`--type` accepts `production|development|preview|local`, comma-separated; or `--env <name>`) — [secrets](https://encore.dev/docs/ts/primitives/secrets), [cli-reference](https://encore.dev/docs/ts/cli/cli-reference):

```powershell
encore secret set --type dev,preview,local PokemonTcgApiKey
encore secret set --type prod PokemonTcgApiKey
```

**Use at runtime** — call the secret like a function — [secrets](https://encore.dev/docs/ts/primitives/secrets):

```ts
const resp = await fetch("https://api.pokemontcg.io/v2/cards", {
  headers: { "X-Api-Key": pokemonTcgKey() },
});
```

The compiler refuses to run/deploy until every declared secret has a value. Source: [secrets](https://encore.dev/docs/ts/primitives/secrets).

---

## 6. Frontend integration (separate Vite + React)

**Generate a request client** — [client-generation](https://encore.dev/docs/ts/cli/client-generation), [request-client](https://encore.dev/docs/ts/frontend/request-client):

```powershell
encore gen client <app-id> --output=./frontend/src/client.ts --env=local --lang=typescript
```

Languages: `typescript`, `javascript`, `go`, `openapi` (experimental). Add an npm script and re-run it after every endpoint change — [request-client](https://encore.dev/docs/ts/frontend/request-client):

```jsonc
// package.json
"scripts": { "generate-client:local": "encore gen client <app-id> --output=./frontend/src/client.ts --env=local" }
```

**Generated client shape** — a `Client` class; services are namespaced objects; endpoints are methods; targets pick the base URL. Auth is passed at construction (static or a per-request function); errors are checked with `isAPIError`. Source: [client-generation](https://encore.dev/docs/ts/cli/client-generation).

```ts
import Client, { Local } from "./client";           // Local => http://localhost:4000
const client = new Client(Local);                    // or new Client(Environment("staging"))
const res = await client.hello.ping({ name: "Ash" }); // client.<service>.<endpoint>(params)
```

**Recommended local dev flow for a SEPARATE Vite frontend** — [request-client](https://encore.dev/docs/ts/frontend/request-client), [cors](https://encore.dev/docs/ts/frontend/cors):

1. Run backend: `encore run` (API on `:4000`, dashboard on `:9400`).
2. Run Vite dev server separately (default `:5173`).
3. Import the generated client with the `Local` target — it calls `localhost:4000` directly (fetch-based), so **no Vite proxy is required**.
4. **CORS is not an issue locally**: "Encore allows all origins when developing locally." — [cors](https://encore.dev/docs/ts/frontend/cors).

**CORS for deployed frontends** — configure `global_cors` in `encore.app` (JSON). `allow_origins_without_credentials` defaults to `["*"]`; you must explicitly list credentialed origins — [cors](https://encore.dev/docs/ts/frontend/cors):

```json
{
  "id": "my-app-xxxx",
  "global_cors": {
    "allow_origins_with_credentials": ["http://localhost:5173", "https://*.example.com"]
  }
}
```

---

## 7. Testing (Vitest)

`encore test` provisions test-mode infrastructure (separate test DBs, fsync skipped) then runs the test script from `package.json` — [testing](https://encore.dev/docs/ts/develop/testing), [cli-reference](https://encore.dev/docs/ts/cli/cli-reference).

```jsonc
// package.json
"scripts": { "test": "vitest" }
```

Vitest is the recommended runner. Add `vite.config.ts` at the app root aliasing `~encore` to the generated code — [testing](https://encore.dev/docs/ts/develop/testing):

```ts
/// <reference types="vitest" />
import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
  resolve: { alias: { "~encore": path.resolve(__dirname, "./encore.gen") } },
  // test: { fileParallelism: false },  // needed for the VS Code Vitest extension
});
```

Run with `encore test` (passes flags through to Vitest, e.g. `encore test --fileParallelism=true`). Source: [testing](https://encore.dev/docs/ts/develop/testing).

---

## 8. Run locally + deployment

**Local:** `encore run` — API on `http://localhost:4000`, **local dev dashboard (traces, API explorer) on `http://localhost:9400`** — [quick-start](https://encore.dev/docs/ts/quick-start). Flags: `--port`, `--debug`, `--watch` — [cli-reference](https://encore.dev/docs/ts/cli/cli-reference).

**Encore Cloud (managed):** commit and `git push encore` — the platform builds and provisions infra — [quick-start](https://encore.dev/docs/ts/quick-start).

```powershell
git add -A; git commit -m "Initial commit"; git push encore
```

**Self-host via Docker:** `encore build docker` produces a standalone image (TS base defaults to `node:slim`; listens on `:8080`, override with `PORT`) — [self-host/build](https://encore.dev/docs/ts/self-host/build):

```powershell
encore build docker my-image:tag
encore build docker --config=infra-config.json --push my-image:tag   # runtime infra config + push
docker run -e PORT=8081 -p 8081:8081 my-image:tag
```

Flags: `--services`, `--gateways`, `--arch` (`amd64|arm64`), `--base`, `--push`, `--config`. Self-hosting means you supply the infra config (DBs, secrets) yourself vs. Encore Cloud provisioning it. Source: [self-host/build](https://encore.dev/docs/ts/self-host/build).

---

## 9. Current version + recent changes

- **Latest release: v1.57.10** (2026-07-16) — [github.com/encoredev/encore/releases/latest](https://api.github.com/repos/encoredev/encore/releases/latest). Notes are infra/runtime focused (Go 1.26.5 bump, splitting secret payloads across env vars, Redis `multiSet`, GCP logging fixes); **no TypeScript-framework breaking changes called out** in this release.
- No breaking API changes to `api()`, `SQLDatabase`, `secret()`, or `encore gen client` were surfaced in the current docs vs. this release. Re-verify against the [releases feed](https://github.com/encoredev/encore/releases) before a major upgrade.

---

## Key commands & gotchas

1. **Install/verify (Win):** `iwr https://encore.dev/install.ps1 | iex` → `encore version`; a background **daemon** runs (`encore daemon` to restart) — [install](https://encore.dev/docs/ts/install), [cli-reference](https://encore.dev/docs/ts/cli/cli-reference).
2. **Docker Desktop must be running** for local Postgres — `encore run` provisions DBs via Docker — [install](https://encore.dev/docs/ts/install).
3. **Create/run:** `encore app create` (interactive TS starter) → `encore run` → API `:4000`, dashboard **`:9400`** — [quick-start](https://encore.dev/docs/ts/quick-start).
4. **API/DB/secret:** `api({method,path,expose}, handler)`; `new SQLDatabase(name,{migrations})` with `N_name.up.sql`, query via ``db.queryRow`...` ``; `secret("Name")()` + `encore secret set --type dev,local Name` — [defining-apis](https://encore.dev/docs/ts/primitives/defining-apis), [databases](https://encore.dev/docs/ts/primitives/databases), [secrets](https://encore.dev/docs/ts/primitives/secrets).
5. **Frontend:** `encore gen client <app-id> -o ./frontend/src/client.ts --env=local`; import `Client, { Local }` → hits `:4000`; **local CORS is open (no proxy needed)**; set `global_cors` in `encore.app` for prod — [client-generation](https://encore.dev/docs/ts/cli/client-generation), [request-client](https://encore.dev/docs/ts/frontend/request-client), [cors](https://encore.dev/docs/ts/frontend/cors).
6. **Regenerate the client after every endpoint change** (wrap it in an npm script) — [request-client](https://encore.dev/docs/ts/frontend/request-client).
7. **Test:** `encore test` runs Vitest; needs `vite.config.ts` aliasing `~encore` → `./encore.gen` — [testing](https://encore.dev/docs/ts/develop/testing).
8. **Deploy:** `git push encore` (Encore Cloud) or `encore build docker my-image:tag` (self-host, `:8080`/`PORT`) — [quick-start](https://encore.dev/docs/ts/quick-start), [self-host/build](https://encore.dev/docs/ts/self-host/build). **Version-sensitive:** current CLI **v1.57.10**; exact Node-version floor isn't pinned in docs — re-check if the runtime errors.
