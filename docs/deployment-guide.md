# Deployment Guide

**Generated:** 2026-07-25 · exhaustive scan
**Status:** ⚠️ **Nothing has been deployed or configured.** This documents the two
paths Encore supports and exactly what is missing for each.

---

## Current state

| Artifact                     | Present? | Notes                                                    |
| ---------------------------- | :------: | -------------------------------------------------------- |
| `encore.app`                 |    ✅    | `id: tcgourney-46xi`, `lang: typescript`, `build.docker.bundle_source: true` |
| `global_cors` in `encore.app`|    ❌    | Needed before any deployed frontend can call the API.    |
| Dockerfile / docker-compose  |    ❌    | Not needed — `encore build docker` generates the image.  |
| CI/CD pipeline               |    ❌    | No `.github/workflows/`, no GitLab CI, no Jenkinsfile.   |
| Infra config (`infra-config.json`) | ❌ | Required for self-hosting only.                          |
| `encore` git remote          |    ❌    | Required for the Encore Cloud path.                      |
| Declared secrets             |    ❌    | None yet; the Pokémon TCG API key will be the first.     |
| Database                     |    ❌    | No `SQLDatabase` — nothing to provision or migrate.      |

The only deployment-relevant setting that *is* configured is
`build.docker.bundle_source: true` in `encore.app`, which bundles source into the
built image.

---

## Path A — Encore Cloud (managed)

Encore Cloud builds the app and provisions infrastructure from the code itself.

```powershell
git remote add encore encore://tcgourney-46xi   # not currently configured
git add -A
git commit -m "…"
git push encore
```

**Before this can work:**

1. Add the `encore` git remote (the app id `tcgourney-46xi` already exists in `encore.app`).
2. Set values for any declared secrets — the compiler refuses to deploy until every
   `secret()` has one:
   ```powershell
   encore secret set --type prod PokemonTcgApiKey
   ```
3. Add `global_cors` to `encore.app` if a deployed frontend will call the API
   (see below).

Databases, if any are later declared, are provisioned and migrated by the platform
— no manual step.

---

## Path B — Self-hosted Docker

`encore build docker` produces a standalone image. The TypeScript base defaults to
`node:slim` and the container listens on **`:8080`** (override with `PORT`).

```powershell
encore build docker tcgourney:latest
docker run -e PORT=8081 -p 8081:8081 tcgourney:latest
```

With runtime infrastructure config and a registry push:

```powershell
encore build docker --config=infra-config.json --push tcgourney:latest
```

Useful flags: `--services`, `--gateways`, `--arch` (`amd64|arm64`), `--base`,
`--push`, `--config`.

**Self-hosting means you supply the infrastructure yourself** — databases,
secrets, and networking all come from your `infra-config.json` rather than being
provisioned for you. Today there is no database and there are no secrets, so an
image would run with no external dependencies at all.

---

## CORS for a deployed frontend

Encore allows **all origins when developing locally**, so no configuration is
needed for `encore run` + Vite on `:5173`. For deployed frontends, add a
`global_cors` block to `encore.app`:

```jsonc
{
  "id": "tcgourney-46xi",
  "lang": "typescript",
  "build": { "docker": { "bundle_source": true } },
  "global_cors": {
    "allow_origins_with_credentials": ["http://localhost:5173", "https://*.example.com"]
  }
}
```

`allow_origins_without_credentials` defaults to `["*"]`; credentialed origins must
be listed explicitly.

---

## Environment configuration

There is nothing to configure yet — no `.env` is read, no environment variables
are consulted, and no secrets are declared. `.gitignore` already covers `.env*`
(with `!.env.example` un-ignored) for when that changes.

When the Pokémon TCG API integration lands, its key belongs in an Encore secret,
**not** an env file:

```powershell
encore secret set --type dev,preview,local PokemonTcgApiKey
encore secret set --type prod PokemonTcgApiKey
```

Encore's `--type` accepts `production`, `development`, `preview`, `local`
(comma-separated), or target a named environment with `--env <name>`.

---

## Recommended pre-deploy checklist

Nothing enforces any of this today — there is no CI — so it's manual:

1. `npm run typecheck` — clean.
2. `npm test` — the rank-engine suite passes.
3. `encore run` + `curl http://localhost:4000/binder` returns 7 entries.
4. Every declared secret has a value for the target environment.
5. `global_cors` covers the deployed frontend's origin, if one exists.
6. If a database was added: migrations are sequential, named `N_name.up.sql`, and
   apply cleanly from scratch.

**Suggested first CI job** (none exists): `npm ci && npm run typecheck && npm test`
on push. That alone would cover everything the repo can currently verify.

---

## Source

All Encore commands and behaviors above are from
[`research/encore-ts-setup.md`](./research/encore-ts-setup.md) §5, §6, §8, which
cites the official Encore docs inline.
