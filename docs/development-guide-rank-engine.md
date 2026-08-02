# Development Guide — `rank-engine`

**Part:** `rank-engine` · **Package:** `@tcgourney/rank-engine`
**Root:** [`packages/rank-engine`](../packages/rank-engine/)
**Generated:** 2026-07-25 · exhaustive scan

---

## Prerequisites

Node.js 24+ and npm. **That's it** — no Encore CLI, no Docker, no database, no
environment variables. The package has zero runtime dependencies, so it can be
developed and tested in complete isolation from the backend.

```powershell
npm install     # from the repo root — workspaces link the package
```

---

## Commands

Run from the repo root (workspace-scoped) or from `packages/rank-engine/`:

| Command                                          | What it does                          |
| ------------------------------------------------ | ------------------------------------- |
| `npm test -w @tcgourney/rank-engine`             | `vitest run` — the 14 unit tests.     |
| `npm run test:watch -w @tcgourney/rank-engine`   | Vitest in watch mode.                 |
| `npm run typecheck -w @tcgourney/rank-engine`    | `tsc --noEmit` with the strict config.|

Vitest picks up `src/**/*.test.ts` (`vitest.config.ts`). The whole suite runs in
well under a second — keep watch mode on while working.

**There is no build step.** `package.json` points `main`, `types`, and `exports`
at `src/rank-engine.ts` directly, and the tsconfig sets `noEmit: true`. Consumers
compile the TypeScript source themselves.

---

## Layout

```
packages/rank-engine/
├── package.json
├── tsconfig.json         # stricter than the root config
├── vitest.config.ts
└── src/
    ├── rank-engine.ts        # the entire implementation
    └── rank-engine.test.ts   # the entire test suite
```

Two files. Keep it that way unless the module genuinely outgrows one file — the
value of this package is that the whole ruleset is readable in one sitting.

---

## The stricter tsconfig

This package compiles under tighter rules than the root:

| Option                     | What it will catch                                                            |
| -------------------------- | ------------------------------------------------------------------------------ |
| `noUncheckedIndexedAccess` | `RANKS[stars]` is `Rank \| undefined`. This is *why* `rankForStars` checks for undefined instead of trusting the index — don't "simplify" that away. |
| `verbatimModuleSyntax`     | Type-only imports must be written `import type { … }`.                        |
| `strict`                   | The usual family.                                                              |
| `noEmit`                   | Type-check only.                                                               |

In tests you'll see non-null assertions (`line[0]!`, `charmander!`) — that's the
sanctioned way to deal with `noUncheckedIndexedAccess` inside assertions where the
index is obviously valid.

---

## Working on the rules

The [ruleset](../ashs-journey-ruleset.md) is the specification and
[`CONTEXT.md`](../CONTEXT.md) is the vocabulary. The module header says as much,
and the tests name their story cases directly ("an idle Tauros", "Meowth — never
caught"). Keep that link visible when you change anything.

**Test-first is the established rhythm here.** The README names the flow:
domain-modeling → research → TDD → implement → review. Every existing behavior has
a test that names the story case it protects.

### Common changes

| Change                        | Where                                                                            |
| ----------------------------- | -------------------------------------------------------------------------------- |
| Add a Milestone type          | The `Milestone` union **and** `STAR_MILESTONES`. `MAX_STARS` follows automatically — but add a matching `RANKS` rung or `rankForStars` will throw at the new ceiling. |
| Rename a Rank / change a token| The `RANKS` table and the `RankName` union.                                      |
| Change which Slots open       | `slotsFor` — the only place Slot composition is decided.                          |
| Change inheritance semantics  | `computeLine`'s accumulator fold.                                                 |

### Rules that are easy to break

Each of these is load-bearing and has a test guarding it. If you touch one, expect
a failure and think hard before "fixing" the test:

1. **`catch` is not a Star.** It's the `⚫` base. `STAR_MILESTONE_SET` deliberately
   excludes it.
2. **Each Milestone type counts at most once.** Enforced by the `Set` in `starsOf`.
3. **The climb never slides back.** `computeLine` folds one accumulator forward, so
   a later stage always holds a superset of an earlier one's Milestones.
4. **No `⚫` Slot without a Catch.** Meowth is the canonical uncaught case.
5. **Rank is derived, never stored.** Persisting a computed Rank creates a second
   source of truth that will drift.

---

## Testing conventions

- One `describe` per exported function.
- Test names state the *story* case, not the mechanics — "scores no Stars for a
  caught Pokémon that did nothing more", not "returns 0 for ['catch']".
- A comment above each assertion block names the Pokémon it encodes (an idle
  Tauros, Meowth, the Charizard line).
- The Charizard worked example is asserted stage by stage against the table in
  the ruleset. If the ruleset table changes, that test changes with it.

**Gaps worth filling:** `computeLine([])`, property-based testing of the
monotonicity invariant, and coverage thresholds (none are configured).

---

## Style

- Single quotes in this package (the backend uses double quotes; no formatter
  enforces either — follow the file you're in).
- JSDoc on every export, written in the domain's voice. The existing comments
  reference `CONTEXT.md` and the ruleset by name; keep doing that.
- `readonly` / `ReadonlySet` on everything returned. Callers that need mutability
  copy — as `roster/binder.ts` does.
- Named-argument objects where two parameters could be transposed
  (`slotsFor({ stars, caught })`).

---

## Keep out of this package

No I/O, no async, no Encore imports, no HTTP concerns, no card data. The moment
this package needs a dependency, the seam has been drawn in the wrong place —
see [Integration Architecture](./integration-architecture.md).
