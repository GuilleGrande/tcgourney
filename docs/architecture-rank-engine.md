# Architecture — `rank-engine`

**Part:** `rank-engine` · **Type:** library
**Root:** [`packages/rank-engine`](../packages/rank-engine/)
**Package:** `@tcgourney/rank-engine` (private, `0.0.0`)
**Generated:** 2026-07-25 · exhaustive scan

---

## Executive summary

The domain core of Ash's Journey: a pure, dependency-free TypeScript module that
answers one question — *given the story Milestones a Pokémon earned, what Rank does
it hold and which Binder Slots does it open?*

Two source files, ~290 lines total, **zero runtime dependencies**, no I/O, no
async, no framework coupling. Every exported function is deterministic and total
except for two explicit `RangeError` guards. This is the most mature part of the
repository and the only one with tests.

The design bet: encode the [ruleset](../ashs-journey-ruleset.md) once, in a place
that can be tested without spinning up a server, and let every consumer — the
Encore backend today, a frontend or a CLI tomorrow — derive from the same source.

---

## Technology stack

| Category     | Technology | Version    | Notes                                                             |
| ------------ | ---------- | ---------- | ----------------------------------------------------------------- |
| Language     | TypeScript | `^7.0.2`   | Stricter than the root config (see below).                        |
| Runtime deps | **none**   | —          | `dependencies` is absent from the manifest entirely.              |
| Test runner  | Vitest     | `^4.1.10`  | `include: ['src/**/*.test.ts']`.                                  |
| Build        | **none**   | —          | `exports` points at raw `.ts`; `noEmit: true`.                    |

The package tsconfig is deliberately stricter than the root's:

| Option                   | Effect                                                                        |
| ------------------------ | ----------------------------------------------------------------------------- |
| `noUncheckedIndexedAccess` | `RANKS[stars]` is typed `Rank \| undefined`, which is exactly why `rankForStars` has an explicit undefined check rather than a silent `any`. |
| `verbatimModuleSyntax`   | Type-only imports must be marked `import type` — no accidental runtime imports. |
| `noEmit`                 | Type-checking only; consumers compile the source themselves.                   |

---

## Architecture pattern

**Pure functional core** — a functional-core / imperative-shell split, where this
package is the entire core and the Encore service is the shell.

Structurally there is no layering, because there is nothing to layer: one module
exports a handful of small functions, a couple of frozen-by-convention constant
tables, and the types that tie them together. The composition is a pipeline:

```
Milestone[]
     │  starsOf         — count distinct star-granting Milestones, cap at MAX_STARS
     ▼
  stars: 0..6
     │  rankForStars    — index into the RANKS ladder
     ▼
  Rank
     │  slotsFor        — ⚫ rung if caught, then one rung per rank 1..stars
     ▼
  Slot[]

computeLine(stages)     — folds an accumulator Set forward through an Evolution
                          Line, running the whole pipeline at each stage
```

### Design decisions worth knowing

| Decision                                              | Why it matters                                                                                     |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `MAX_STARS = STAR_MILESTONES.length`                  | The ceiling of 6 is *derived*, not a magic number. Adding a Milestone raises the cap automatically. |
| `RANKS` indexed by Star count                         | `RANKS[n]` **is** the Rank for n Stars — the ladder and the ordering key are the same structure.    |
| `Set`-based counting in `starsOf`                     | Enforces "each Milestone type at most once" structurally, so duplicates cannot inflate a Rank.      |
| `catch` excluded from `STAR_MILESTONE_SET`            | The Catch is the `⚫` base, not a Star. This is the single most easily-broken rule in the ruleset.   |
| Single accumulator `Set` in `computeLine`             | Makes "the climb never slides back" a structural property, not a check — later stages hold a superset of earlier ones. |
| `readonly` / `ReadonlySet` on every result type       | Callers cannot mutate returned domain objects; the backend copies into mutable view types instead.  |
| `as const satisfies readonly Milestone[]`             | `STAR_MILESTONES` keeps literal types *and* is validated against `Milestone` — a typo fails to compile. |
| Named-argument object in `slotsFor({ stars, caught })`| Two same-shaped booleans/numbers can't be swapped at a call site.                                    |

---

## Public API

```ts
// Types
type Milestone  = 'catch' | 'opponent' | 'teammate' | 'encounter' | 'bond' | 'glory' | 'loyal';
type RankName   = 'Common/Uncommon' | 'Rare' | 'Double Rare' | 'Ultra Rare'
                | 'Illustration Rare' | 'Special Illustration Rare' | 'Hyper Rare';
interface Rank        { readonly stars: number; readonly name: RankName; readonly token: string }
interface Slot        { readonly rank: Rank; readonly isCatchSlot: boolean }
interface StageInput  { readonly species: string; readonly milestones: readonly Milestone[] }
interface StageResult { readonly species: string; readonly milestones: ReadonlySet<Milestone>;
                        readonly caught: boolean; readonly stars: number;
                        readonly rank: Rank; readonly slots: readonly Slot[] }

// Constants
const STAR_MILESTONES: readonly Milestone[];   // the six star-granting Milestones, ruleset order
const MAX_STARS: number;                       // 6, derived from STAR_MILESTONES.length
const RANKS: readonly Rank[];                  // the ladder, low → high; RANKS[n] ⇒ n Stars

// Functions
function starsOf(milestones: Iterable<Milestone>): number;
function rankForStars(stars: number): Rank;                        // throws RangeError outside 0..6
function slotsFor(args: { stars: number; caught: boolean }): Slot[]; // throws RangeError on bad stars
function computeLine(stages: readonly StageInput[]): StageResult[];
```

Full field-level detail and the invariants each function upholds:
**[Data Models — backend](./data-models-backend.md)** (the domain section applies
to this package; it lives there because that is where the backend's persistence
questions are answered).

### Error behavior

Both range guards throw `RangeError` with a message naming the offending value:

- `rankForStars(n)` — when `RANKS[n]` is `undefined` (i.e. `n` outside `0..6`).
- `slotsFor({ stars })` — when `stars` is non-integer, negative, or `> MAX_STARS`.

`starsOf` and `computeLine` are total: they cannot throw, because `starsOf` clamps
with `Math.min(earned.size, MAX_STARS)` and `computeLine` only ever feeds it
in-range values.

---

## Source tree

```
packages/rank-engine/
├── package.json        # @tcgourney/rank-engine; main/types/exports → src/rank-engine.ts
├── tsconfig.json       # noUncheckedIndexedAccess, verbatimModuleSyntax, noEmit
├── vitest.config.ts    # include: ['src/**/*.test.ts']
└── src/
    ├── rank-engine.ts       # the whole implementation (~152 lines, heavily documented)
    └── rank-engine.test.ts  # 14 tests / 4 describe blocks
```

**No build step.** `main`, `types`, and `exports` all point at
`src/rank-engine.ts` directly, so consumers compile the TypeScript source. That
removes a whole class of stale-artifact bugs at the cost of requiring every
consumer to handle `.ts`.

---

## Development workflow

```powershell
npm test -w @tcgourney/rank-engine        # vitest run
npm run test:watch -w @tcgourney/rank-engine
npm run typecheck -w @tcgourney/rank-engine
```

Full detail: **[Development Guide — rank-engine](./development-guide-rank-engine.md)**.

---

## Testing strategy

[`src/rank-engine.test.ts`](../packages/rank-engine/src/rank-engine.test.ts) — 14
tests across four `describe` blocks. The suite reads as an executable
transcription of the ruleset, and each test names the story case it encodes:

| Block           | Tests | Covers                                                                                 |
| --------------- | :---: | -------------------------------------------------------------------------------------- |
| `starsOf`       |   5   | Catch grants no Star (an idle Tauros); Meowth's uncaught two Stars; deduplication; the 6-Star cap. |
| `rankForStars`  |   2   | All seven ladder rungs by name; `RangeError` at `-1` and `7`.                          |
| `slotsFor`      |   4   | Caught ⇒ `⚫` + rungs; uncaught ⇒ no `⚫`; caught & star-less ⇒ `⚫` only; uncaught & star-less ⇒ `[]`. |
| `computeLine`   |   3   | The ruleset's Charizard worked example; monotonic Star counts up the line; Meowth as a single-stage line. |

The Charizard case is the load-bearing one — Charmeleon earns nothing of its own
yet still holds Double Rare by inheritance, and Charizard accumulates all six Stars
into seven Slots. It mirrors the worked-example table in
[`ashs-journey-ruleset.md`](../ashs-journey-ruleset.md) row for row.

**Coverage gaps:** no test for the empty-line case (`computeLine([])`), no
property-based testing, and no coverage thresholds configured.

---

## Extending this package

Because Star count, Rank, and Slots are all derived, most ruleset changes are
local:

- **New Milestone type** → add to the `Milestone` union and to `STAR_MILESTONES`.
  `MAX_STARS` updates itself, but `RANKS` must gain a matching rung or
  `rankForStars` will throw at the new ceiling.
- **Rank renamed / re-tokened** → edit the `RANKS` table and the `RankName` union.
- **New rule about which Slots open** → `slotsFor` is the only place Slot
  composition is decided.

The one thing *not* to do is store a computed Rank anywhere. Rank is a pure
function of Milestones; persisting it creates a second source of truth that will
drift.

---

## Not in scope for this package

By design, all of these live in the backend or don't exist yet: the roster data
itself, the "earned a place" filter, ownership tracking, the Rarity Translation
Map (real TCG rarity strings → these seven Ranks), and anything touching the
Pokémon TCG API. The engine knows the rules, not the cards.
