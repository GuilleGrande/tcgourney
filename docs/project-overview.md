# Project Overview — tcgourney

**Generated:** 2026-07-25 · exhaustive scan (all 19 tracked files read)

---

## What this is

**Ash's Journey** — a planner for a Pokémon TCG collection that retraces Ash
Ketchum's anime journey. Every Pokémon that *mattered* to the story earns a place
in a single **Binder**, and the rarity of card each place demands is set by how
many story **Milestones** that Pokémon lived through.

> _One binder to retrace an entire journey — from a boy leaving Pallet Town to the
> first-ever World Champion._

The premise that makes it tractable: Ash's journey is finished, so the roster is
**final and knowable**. Nothing new will ever be added.

### The core rule, in one paragraph

A Pokémon accrues **Stars** from six story Milestones — Opponent, Teammate,
Encounter, Bond, Glory, Loyal — on top of the **Catch** (the `⚫` base). Stars flow
*up* the evolution line and aggregate across every appearance. The Star count picks
a **Rank** (Common/Uncommon → Hyper Rare), and the Rank expands into **Slots**: one
card per rank rung, with the `⚫` rung only if the Pokémon was caught. Any real card
from any set fills a Slot when its rarity maps to that Slot's Rank.

Start with [`CONTEXT.md`](../CONTEXT.md) for the ubiquitous language and
[`ashs-journey-ruleset.md`](../ashs-journey-ruleset.md) for the full narrative
ruleset.

---

## Executive summary

An early-stage TypeScript monorepo. The **domain is done and tested**; the
**application around it is scaffolding**.

- ✅ The rank engine — Milestones → Stars → Rank → Slots — is complete, pure,
  dependency-free, and covered by 14 unit tests that transcribe the ruleset.
- ✅ One Encore.ts endpoint, `GET /binder`, serves a computed Binder.
- ⚠️ The roster is a **hand-authored compile-time constant** of five evolution
  lines. There is no database.
- ⚠️ The frontend is documented in the README and referenced by an npm script, but
  **does not exist on disk**.
- ⚠️ The card catalog and rarity → rank translation map are thoroughly researched
  and entirely unbuilt.

Two of the repository's most valuable documents are its research notes: both are
source-cited against primary sources and read as implementation specs for the
features that haven't been written yet.

---

## Tech stack

| Category           | Technology       | Version    | Where                       |
| ------------------ | ---------------- | ---------- | --------------------------- |
| Language           | TypeScript       | `^7.0.2`   | both parts                  |
| Runtime            | Node.js          | 24+        | —                           |
| Backend framework  | Encore.ts        | `^1.57.10` | `backend`                   |
| API style          | REST             | —          | `backend` — one endpoint    |
| Test runner        | Vitest           | `^4.1.10`  | both parts                  |
| Package management | npm workspaces   | —          | root, `packages/*`          |
| Domain logic       | *(none — pure TS)* | —        | `rank-engine`, zero deps    |
| Database           | *(none yet)*     | —          | Postgres planned via Encore |
| Frontend           | *(none yet)*     | —          | Vite + React planned        |
| CI/CD              | *(none)*         | —          | —                           |

Encore app id: **`tcgourney-46xi`**.

---

## Repository structure

**Type:** monorepo (npm workspaces) · **Parts:** 2

| Part          | Type    | Root                   | Role                                                            |
| ------------- | ------- | ---------------------- | --------------------------------------------------------------- |
| `backend`     | backend | repo root + `roster/`  | Encore.ts service. Owns the roster data, the API, and the wire format. |
| `rank-engine` | library | `packages/rank-engine` | Pure domain logic. Zero dependencies, no I/O, fully tested.      |

One integration edge, one direction: `backend` imports `@tcgourney/rank-engine`
in-process. The library knows nothing about HTTP, Encore, or the Binder.

```
roster/binder.ts  ──import──▶  packages/rank-engine/src/rank-engine.ts
  GET /binder                    computeLine · starsOf · rankForStars · slotsFor
  SEED_LINES                     pure · no deps · no I/O
  view types
```

---

## Architecture type

**Functional core / imperative shell.** The rank engine is the functional core —
deterministic, dependency-free, and testable without a server. The Encore service
is the shell: it holds the data, applies the "earned a place" filter, and maps
domain results into mutable wire types.

The consequence to preserve: **Rank and Slots are always derived, never stored.**
Persisting them would create a second source of truth that drifts from the engine.

---

## Current capability

`GET /binder` returns 7 entries and 29 slots computed from five seed evolution
lines:

| Entry      | Caught | Stars | Rank        | Slots |
| ---------- | :----: | :---: | ----------- | :---: |
| Charmander |   ✅   |   2   | Double Rare |   3   |
| Charmeleon |   ✅   |   2   | Double Rare |   3   |
| Charizard  |   ✅   |   6   | Hyper Rare  |   7   |
| Pikachu    |   ✅   |   6   | Hyper Rare  |   7   |
| Bulbasaur  |   ✅   |   3   | Ultra Rare  |   4   |
| Squirtle   |   ✅   |   2   | Double Rare |   3   |
| Meowth     |   ❌   |   2   | Double Rare |   2   |

Charmeleon earns nothing of its own yet holds Double Rare by inheritance; Meowth
was never caught yet earns two Stars and gets no `⚫` Slot. Those two rows are the
ruleset's sharpest edges, and both are covered by tests.

---

## Roadmap

From [`ashs-journey-ruleset.md`](../ashs-journey-ruleset.md) — *"The Trail Ahead"* —
plus what the scan found missing:

**Domain work (roster charting):**
- Chart the full catch list, region by region. *(Kanto and the Journeys returns are done; Johto through Alola await.)*
- Pin the Trophies that fix the Glory roster.
- Pin the returns that fix the Loyal roster.
- Settle Team Rocket's place.
- Settle the Encounters (mainly Legendaries).
- Draw the Rarity Translation Map.

**Engineering work:**
- Postgres persistence + migrations (replaces `SEED_LINES`).
- Write endpoints — edit the roster, record Milestones, mark Slots owned.
- Pokémon TCG API integration + card catalog + the rarity → rank lookup table.
- Scaffold the Vite + React frontend (`npm run gen:client` fails until it exists).
- Backend tests; CI running `typecheck` + `test`.

---

## Getting started

```powershell
npm install                          # install workspace deps
npm test -w @tcgourney/rank-engine   # run the domain tests
encore run                           # API :4000, dev dashboard :9400
curl http://localhost:4000/binder
```

Then read, in this order: [`CONTEXT.md`](../CONTEXT.md) →
[`ashs-journey-ruleset.md`](../ashs-journey-ruleset.md) →
[`rank-engine.ts`](../packages/rank-engine/src/rank-engine.ts) →
[`roster/binder.ts`](../roster/binder.ts). That's the whole system.

---

## Detailed documentation

See the [documentation index](./index.md) for the full set.
