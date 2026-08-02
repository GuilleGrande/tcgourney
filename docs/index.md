# Project Documentation Index — tcgourney

**Generated:** 2026-07-25 · exhaustive scan (all 19 tracked files read)
👆 **This file is the primary entry point for AI-assisted development.**

---

## Project Overview

- **Name:** tcgourney — *Ash's Journey*
- **Purpose:** Plan, identify, and manage a Pokémon TCG collection that retraces Ash Ketchum's anime journey.
- **Type:** monorepo (npm workspaces) with **2 parts**
- **Primary Language:** TypeScript `^7.0.2` (Node 24+)
- **Architecture:** functional core / imperative shell — a pure domain library behind a single Encore.ts service
- **Encore app id:** `tcgourney-46xi`
- **Maturity:** domain complete and tested; application layer is scaffolding (no database, no frontend, no CI)

---

## Quick Reference

### `backend` — Encore.ts Backend

- **Type:** backend (service/API-centric)
- **Root:** repo root + [`roster/`](../roster/)
- **Tech:** Encore.ts `^1.57.10`, TypeScript, Vitest (no tests yet)
- **Entry points:** `roster/encore.service.ts` · `roster/binder.ts`
- **API:** one endpoint — `GET /binder` (public, no auth, no params)
- **Data:** none persisted — a compile-time `SEED_LINES` constant
- **Local:** `encore run` → API `:4000`, dashboard `:9400`

### `rank-engine` — Rank Engine (domain library)

- **Type:** library
- **Root:** [`packages/rank-engine`](../packages/rank-engine/)
- **Package:** `@tcgourney/rank-engine`
- **Tech:** TypeScript only — **zero runtime dependencies**, no build step
- **Entry point:** `src/rank-engine.ts`
- **Tests:** 14 unit tests / 4 describe blocks — the de facto executable spec
- **Exports:** `starsOf` · `rankForStars` · `slotsFor` · `computeLine` · `RANKS` · `STAR_MILESTONES` · `MAX_STARS`

### Cross-part

One integration edge, one direction: `backend` imports `@tcgourney/rank-engine`
in-process. Three planned integrations (frontend client, Pokémon TCG API, Postgres)
are documented but unbuilt.

---

## Generated Documentation

**Start here**

- [Project Overview](./project-overview.md) — what this is, stack, current capability, roadmap
- [Source Tree Analysis](./source-tree-analysis.md) — annotated tree, entry points, what's missing and why

**Per part**

- [Architecture — backend](./architecture-backend.md)
- [Architecture — rank-engine](./architecture-rank-engine.md)
- [API Contracts — backend](./api-contracts-backend.md) — `GET /binder`, full schemas, deterministic output
- [Data Models — backend](./data-models-backend.md) — the domain model, its invariants, and what a future schema must encode
- [Development Guide — backend](./development-guide-backend.md)
- [Development Guide — rank-engine](./development-guide-rank-engine.md)

**Cross-cutting**

- [Integration Architecture](./integration-architecture.md) — how the parts connect, where the seam sits, what's planned
- [Deployment Guide](./deployment-guide.md) — Encore Cloud vs. self-hosted Docker; nothing deployed yet
- [`project-parts.json`](./project-parts.json) — machine-readable parts + integration metadata

---

## Existing Documentation

- [CONTEXT.md](../CONTEXT.md) — **the ubiquitous language.** Read this first; it defines Binder, Entry, Slot, Rank, Star, Milestone and lists the words to avoid.
- [ashs-journey-ruleset.md](../ashs-journey-ruleset.md) — the narrative ruleset the rank engine encodes, with the Charizard worked example. ⚠️ *had uncommitted local edits at scan time.*
- [README.md](../README.md) — orientation, stack, develop commands.
- [research/encore-ts-setup.md](./research/encore-ts-setup.md) — source-cited Encore.ts reference: install, APIs, Postgres, secrets, client generation, testing, deployment.
- [research/pokemontcg-api.md](./research/pokemontcg-api.md) — source-cited pokemontcg.io v2 reference: endpoints, auth, rate limits, all 38 rarity strings, and a proposed rarity → Rank mapping.

Both research notes are effectively implementation specs for features that have
not been written yet.

---

## Getting Started

```powershell
npm install                          # install workspace deps
npm test -w @tcgourney/rank-engine   # run the domain tests (fast)
npm run typecheck
encore run                           # API :4000, dev dashboard :9400
curl http://localhost:4000/binder    # expect 7 entries, 29 slots
```

**Prereqs:** Node 24+, the [Encore CLI](https://encore.dev/docs/ts/install)
(`iwr https://encore.dev/install.ps1 | iex`). Docker Desktop is listed in the
README but **is not needed today** — there is no database for Encore to provision.

**Reading path for a new contributor (or a new agent context):**
[`CONTEXT.md`](../CONTEXT.md) → [`ashs-journey-ruleset.md`](../ashs-journey-ruleset.md)
→ [`rank-engine.ts`](../packages/rank-engine/src/rank-engine.ts) →
[`roster/binder.ts`](../roster/binder.ts). That is the entire system.

---

## Known Gaps

Consolidated from the scan — these are the honest edges of the project today:

| Gap                                    | Where documented                                                  |
| -------------------------------------- | ------------------------------------------------------------------ |
| No persistence — roster is a constant  | [Data Models](./data-models-backend.md)                            |
| No write endpoints; `owned` always `false` | [API Contracts](./api-contracts-backend.md)                     |
| `npm run gen:client` fails — no `frontend/` | [Integration Architecture](./integration-architecture.md)      |
| No card catalog / rarity translation map | [research/pokemontcg-api.md](./research/pokemontcg-api.md)        |
| No auth; no `global_cors` config       | [Deployment Guide](./deployment-guide.md)                          |
| No backend tests                       | [Architecture — backend](./architecture-backend.md)                |
| No CI pipeline                         | [Deployment Guide](./deployment-guide.md)                          |
| Roster charting incomplete (Johto → Alola) | [Project Overview](./project-overview.md) roadmap              |

---

## Using this index

When planning new features, point the PRD or architecture workflow at **this
file**. For UI-only work reference the frontend integration section of
[Integration Architecture](./integration-architecture.md); for API work reference
[Architecture — backend](./architecture-backend.md); for anything touching the
rules, [Architecture — rank-engine](./architecture-rank-engine.md) plus
[`CONTEXT.md`](../CONTEXT.md) are authoritative.
