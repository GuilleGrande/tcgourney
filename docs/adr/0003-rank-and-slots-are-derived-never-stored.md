# Rank and Slots are derived, never stored

Stars, Rank, and Slots are pure functions of an Entry's Milestones, computed by `@tcgourney/rank-engine`. The database persists **Milestones only**. Nothing downstream of them is ever written to a column.

**Why:** storing a computed Rank creates a second source of truth. The moment a Verdict changes, or the ruleset is sharpened, or Milestones flow up an evolution line differently, the stored value is silently wrong — and nothing would catch it. The rank engine is dependency-free and fully unit-tested precisely so that recomputing is cheap and trustworthy.

**Consequences**

- Changing the ruleset is a code change in one package, not a data migration.
- The engine stays free of I/O and framework coupling; if it ever needs a dependency, the seam has been drawn in the wrong place.
- Persisting a Rank "for query performance" is the tempting mistake here. The dataset is a few hundred Entries — there is no performance problem to solve.
