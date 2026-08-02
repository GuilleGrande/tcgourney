# Data Models — `backend`

**Part:** `backend` (Encore.ts application, repo root)
**Generated:** 2026-07-25 · exhaustive scan
**Sources:** [`packages/rank-engine/src/rank-engine.ts`](../packages/rank-engine/src/rank-engine.ts), [`roster/binder.ts`](../roster/binder.ts)

---

## ⚠️ There is no database yet

**Nothing is persisted.** The scan found:

- no `SQLDatabase` declaration anywhere in the codebase,
- no `migrations/` directory,
- no ORM, no Prisma schema, no SQL files,
- no `secret()` declarations.

The README and [`docs/research/encore-ts-setup.md`](./research/encore-ts-setup.md)
describe Encore's Postgres primitive as the intended persistence layer, and
`roster/binder.ts` says so directly in a comment:

> _"The Milestones here are hand-set for demonstration; the real roster will be
> edited through the app and persisted in Postgres."_

Until then, the only "data" is the compile-time constant `SEED_LINES` in
`roster/binder.ts:10`. **`encore run` does not currently require Docker**, because
there is no database for Encore to provision — despite what the README prereqs say.

What follows documents the **domain model as it exists in code**, which is what a
future schema will have to encode.

---

## Domain model

The model is a four-level chain, and each level is derived purely from the one
before it:

```
Milestones  ──starsOf──▶  Stars  ──rankForStars──▶  Rank  ──slotsFor──▶  Slots
```

### `Milestone`

A string union of seven values. Six grant Stars; `catch` does not.

| Value       | Grants          | Meaning (see [CONTEXT.md](../CONTEXT.md))                    |
| ----------- | --------------- | ------------------------------------------------------------ |
| `catch`     | the `⚫` base   | Ash caught it. The only Milestone that unlocks the ⚫ Slot.   |
| `opponent`  | +1 ⭐           | Faced Ash as an opponent in Official Competition.            |
| `teammate`  | +1 ⭐           | Fought on Ash's side in Official Competition.                |
| `encounter` | +1 ⭐           | A wild Pokémon whose path crossed Ash's memorably.           |
| `bond`      | +1 ⭐           | A memorable emotional tie, ownership aside.                  |
| `glory`     | +1 ⭐           | On the active roster the day Ash won a Trophy.               |
| `loyal`     | +1 ⭐           | Earned a Milestone in a Region beyond its original one.      |

`STAR_MILESTONES` is the six-element ordered tuple (excludes `catch`);
`MAX_STARS` is derived from its length, so the ceiling is `6` by construction
rather than by magic number.

**Invariant:** each Milestone type counts at most once per Entry. `starsOf` enforces
this with a `Set`, so a duplicated `bond` cannot inflate a Rank.

### `Rank`

```ts
interface Rank {
  readonly stars: number;   // 0..6 — the canonical ordering key
  readonly name: RankName;
  readonly token: string;
}
```

`RANKS` is a frozen-by-convention array indexed by Star count, so `RANKS[n]` *is*
the Rank for n Stars:

| Index (Stars) | `name`                      | `token`      |
| :-----------: | --------------------------- | ------------ |
| 0             | `Common/Uncommon`           | `⚫`         |
| 1             | `Rare`                      | `⭐`         |
| 2             | `Double Rare`               | `⭐⭐`       |
| 3             | `Ultra Rare`                | `⭐⭐⭐`     |
| 4             | `Illustration Rare`         | `⭐⭐⭐⭐`   |
| 5             | `Special Illustration Rare` | `⭐⭐⭐⭐⭐` |
| 6             | `Hyper Rare`                | `⭐⭐⭐⭐⭐⭐` |

### `Slot`

```ts
interface Slot {
  readonly rank: Rank;
  readonly isCatchSlot: boolean;   // the ⚫ rung, which only a Catch unlocks
}
```

**Invariant:** an Entry with `stars = n` has exactly `n` non-catch Slots (ranks 1
through n), plus one `⚫` catch Slot if and only if `caught` is true. So Slot count
is `stars + (caught ? 1 : 0)`, ranging from 0 (uncaught, star-less — filtered out
of the Binder) to 7 (caught, Hyper Rare).

### `StageInput` → `StageResult`

```ts
interface StageInput {
  readonly species: string;
  readonly milestones: readonly Milestone[];   // earned directly at this stage
}

interface StageResult {
  readonly species: string;
  readonly milestones: ReadonlySet<Milestone>; // cumulative: own ∪ every earlier stage's
  readonly caught: boolean;
  readonly stars: number;
  readonly rank: Rank;
  readonly slots: readonly Slot[];             // ⚫ (if caught), then ranks 1..stars
}
```

**Invariant — "the climb never slides back":** `computeLine` folds a single
accumulator `Set` forward through the stages, so a later form's Milestone set is a
superset of every earlier form's. Therefore `stars` is monotonically
non-decreasing along an Evolution Line. This is asserted directly in
[`rank-engine.test.ts:119`](../packages/rank-engine/src/rank-engine.test.ts).

---

## The seed roster

`SEED_LINES: StageInput[][]` in `roster/binder.ts:10` — five Evolution Lines,
hand-authored:

| Line | Stages                              | Notable                                                  |
| ---- | ----------------------------------- | -------------------------------------------------------- |
| 1    | Charmander → Charmeleon → Charizard | The ruleset's worked example; Charmeleon earns nothing of its own and rides on inheritance. |
| 2    | Pikachu                             | All seven Milestones — the maximum.                      |
| 3    | Bulbasaur                           | Catch + Teammate + Bond + Loyal → 3 ⭐.                  |
| 4    | Squirtle                            | Catch + Teammate + Bond → 2 ⭐.                          |
| 5    | Meowth                              | **Uncaught** — Encounter + Bond → 2 ⭐, no `⚫` Slot.    |

---

## What a future schema must encode

Derived from the model above and the open items in
[`ashs-journey-ruleset.md`](../ashs-journey-ruleset.md):

| Concept              | Persistence need                                                       |
| -------------------- | ---------------------------------------------------------------------- |
| Evolution Line       | Ordered stages; a Line is the walked path, not a branching family.      |
| Entry / Stage        | Species + its position in a Line. Rank and Slots stay **derived**, not stored. |
| Milestone            | Per-stage, per-type, unique. Ideally with the Appearance that justified it. |
| Appearance           | Ash's, a rival's, or a wild one — several Appearances feed one Entry's Milestone set. |
| Region / Trophy      | Needed to *justify* `loyal` and `glory` rather than assert them by hand. |
| Card                 | From the Pokémon TCG API — `id`, `name`, `rarity`, `set`, `images`, `nationalPokedexNumbers`. |
| Rarity Translation Map | 38+ free-form API rarity strings → 7 Ranks, with an explicit review bucket. Fully researched in [`research/pokemontcg-api.md`](./research/pokemontcg-api.md) §5. |
| Ownership            | Which Card fills which Slot — the field `SlotView.owned` currently hardcodes to `false`. |

**Design note:** Rank and Slots are pure functions of Milestones. Storing them
would create a second source of truth that can drift from the rank engine. Persist
Milestones; compute the rest.
