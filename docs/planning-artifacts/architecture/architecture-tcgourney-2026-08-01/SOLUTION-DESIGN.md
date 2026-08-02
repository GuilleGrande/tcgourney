# Solution Design — Ash's Journey (tcgourney)

**Status:** final · 2026-08-01 · companion to [ARCHITECTURE-SPINE.md](./ARCHITECTURE-SPINE.md)

The spine is the terse build contract; this document is the *why*. It is written for the Collector today and for any collector or developer who reads the project later. Every decision here is binding only in its spine form (AD-1…AD-14) — if the two ever disagree, the spine wins.

---

## 1. What the system is

Ash's journey is finished, so the roster of Pokémon that mattered is **final and knowable**. The product turns that closed story into a finite, ranked TCG collection: two builds, one seam.

- **The Charting Tool** produces the roster — several hundred Entries, upwards of seven hundred cited, human-approved explainer paragraphs. Used heavily once, then mothballed (never retired: any ruling can be fixed years later).
- **The Collection App** is the binder — a cozy, ritualized desk companion for choosing, chasing, and sleeving cards. It runs forever and never writes the roster.

Everything in the architecture exists to keep those two builds compatible while they are built at different times, in different moods, possibly years apart.

## 2. The paradigm: a pure core, three shells

The repo already had the right shape before this design existed: a **pure, zero-dependency rank engine** (`Milestones → Stars → Rank → Slots`, fully unit-tested) and a thin imperative shell around it. The architecture ratifies that and extends it systemwide — *functional core / imperative shell*.

The consequence carried forward from ADR-0003 is the project's deepest invariant: **nothing derivable is ever stored**. The database persists what humans authored — Milestones, Verdicts, Citations, chase state, the Rarity Map — and everything else (Rank, Slots, rung attribution, badges, progress, errata) is recomputed on every read. A few hundred Entries make recomputation free; a cached Rank column would be the first lie the system ever told.

New derivation added by this design — **rung attribution** (which Milestone type earned which rung, in canonical ruleset order) — goes into the engine, not into UI code. It is what makes the App's story row and the badge system computable *by construction* instead of by two teams' guesses.

## 3. The seam is write authority, not distance

The PRD fixed *what* the seam is (Postgres is the source of truth; the App is read-only on the roster). The architecture had to pick the *mechanism*, and three honest options were weighed:

| Option | Why not |
| --- | --- |
| Hard seam — separate databases, App reads roster via Tool APIs | Puts the mothballed Tool in the App's hot path forever, kills cross-domain SQL, heavy plumbing for a solo project |
| One service, folder convention | The seam lives in a README; a future builder crosses it without noticing |
| **Three domain services, one database, write ownership** ✅ | The seam becomes structure: each service is sole writer of its own tables |

So: **one Encore app, one Postgres database, three services** — `charting` (writes `roster_*`), `catalog` (writes `catalog_*`), `collection` (writes `collection_*`). Cross-domain access is read-only SQL through one shared `SQLDatabase` reference; Encore isolates databases per service by default, so every crossing is explicit and greppable. The App reads roster tables directly — the Tool's endpoints are never in the binder's hot path, which is exactly what "mothballed" requires.

Two properties fall out for free:

- **Card-agnosticism is structural.** The charting service simply has no path to `catalog_*`. The PRD's cleanest scope cut can't erode.
- **FR-032 (App never edits the roster) is not a policy — no write path exists.**

## 4. Addressing a thing that is never stored

The subtlest problem in the design: the App must attach state (*Chasing*, *Filled*, chosen card) to a **Slot**, and Slots are forbidden from existing in the database. The resolution is a *stable address for a derivable thing*: `(species, rung)`, where rung 0 is the ⚫ Catch slot and rungs 1–6 are the Star rungs.

For that address to be safe, three details had to be pinned:

- **The species slug is minted once**, by the charting service, and is the roster's primary key — one Entry per species (thirty Tauros are one Entry). Nobody else ever re-derives a slug from a display name; `mr-mime` and `farfetchd` are decided exactly once.
- **Fills are slot → N cards** from day one. The PRD warns that equivalence rules (three Special Illustration Rares standing in for one Hyper Rare) must not be foreclosed. The join table costs nothing now; a single-card column would cost a migration later. The UI enforces one card until the rules exist.
- **Orphans are surfaced, never deleted.** If a roster fix removes a rung, a Filled chase row pointing at it represents a physical card sleeved in a real binder — the system reports it through the errata flow and lets the Collector decide.

Ownership state is also **Collector-scoped** (a `collector` reference on every collection table) even though exactly one Collector exists — the PRD's instruction not to bake the single-user assumption into the one place it would be expensive to undo.

## 5. Cards, the Map, and eligibility

Card data is **ingested, never fetched live**. The measured case is brutal: the live pokemontcg.io API showed a 40–58% server-error rate, and its image CDN is mid-migration to a new owner. So the catalog ingests the maintained `pokemon-tcg-data` bulk JSON, and card images are served only by the catalog service, which fetches each image from the CDN once, caches it to disk, and never asks again. The binder must still open flawlessly in ten years, offline, with the Tool mothballed.

Eligibility — *which real cards can fill this slot* — is deliberately boring:

- **All rarity knowledge lives in the Rarity Translation Map table.** ~38 free-form rarity strings from the source data map onto the seven Ranks; the assignments are Collector judgment with their own ruleset, so they live in editable, versioned *data*, never in TypeScript. Unknown rarities are reported at ingestion and held out of eligibility — nothing defaults silently into the binder.
- **Species matching happens at ingestion**, via National Dex numbers, not name parsing. The roster carries each species' dex number (species identity, not card knowledge), the catalog resolves each card's at ingestion, and eligibility is one SQL join.

Unfillable-slot detection (FR-027) is then a query the collection service can run any time: demanded slots (engine output) minus available eligibility. Its output is the worklist for authoring equivalence rules — deferred until real data says where they're needed.

## 6. The charting pipeline

ADR-0001's philosophy — *Bulbapedia proposes, the Collector decides* — becomes machinery:

1. **Source scoping.** The Tool proposes pages; the Collector approves each before anything is read. Approved Sources are stored with their MediaWiki revision id and a content hash.
2. **Batch drafting.** A job per Milestone type calls the Claude API (`claude-opus-5`, TypeScript SDK, key in an Encore secret — never client-side) and pre-populates the review queue with Proposals: milestone, Region, episode, Appearance, a drafted one-paragraph explainer, and a mandatory Citation. Batch, not on-demand, because 700+ explainers are survivable only if review never waits on an API call and bulk-accept can operate on fully drafted categories.
3. **Review.** Keyboard-driven, resumable, ordered by Milestone type. The Collector accepts, edits, or rejects; Verdicts are sticky against re-ingestion (checked via the stored content hash), never against the Collector.
4. **Version stamp + export.** Any accepted Verdict write advances the roster version stamp; an export command dumps the whole roster to JSON committed to the repo — git history for hand-made rulings that could never be regenerated.

The alternative — driving the LLM work from chat sessions outside the app — was rejected because the pipeline must survive mothballing: in five years, a re-run has to be a command, not an archaeology project.

## 7. The errata slip

Roster fixes are adopted by the App immediately, and the progress spread shows "the chronicle was revised: N entries changed." Who computes that? The Tool could keep a changelog — but that couples it to App needs and misses the most likely future edit: a hand fix in Postgres while the Tool sleeps. So the **App diffs for itself**: the collection service stores the last-acknowledged per-entry snapshot and compares it against the freshly computed binder at open. The version stamp is just the cheap "something moved" signal. Any change, from any writer, in any decade, produces a correct errata slip.

## 8. The binder's rendering world

The one place the Collector overruled the coach: the binder scene is **WebGL**, chosen for the highest ceiling on the ritual that makes or breaks the app — the cover opening, pages turning, light falling on a card as it slides into its sleeve. The architecture makes that choice safe rather than romantic:

- **One React Three Fiber canvas owns the scene** — cover, pages, cards, light, turns, sleeving. One technology, one React tree; the divergence risk (a GL cover that can't compose with DOM spreads) is closed by rule.
- **Words stay real.** Explainers, citations with working links, and carousels render as DOM projected into the scene (drei `Html`); the search bar and hover HUDs are DOM overlay above the canvas. Text is selectable, links click, screen readers get a parallel DOM tree, and `prefers-reduced-motion` swaps animations for cuts.
- **Both frontend worlds** — the cozy binder and the utilitarian charting queue — fetch through the one generated Encore client wrapped in TanStack Query. No hand-rolled fetch anywhere, so the two worlds can never disagree about caching.

## 9. Stack and operational envelope

The stack is the existing repo's choices, ratified, plus the verified-current frontend additions: TypeScript 7, Node 24, Encore.ts (+ Postgres via Docker — deliberate despite the single-user mismatch; do not "fix" to SQLite, ADR-0002), Vitest, React 19.2, Vite 8 (Rolldown), React Three Fiber 9.6 + three r185 + drei 10.7, TanStack Query 5, `@anthropic-ai/sdk`.

The operational envelope is one sentence with legal teeth: **local-only, forever** (ADR-0004 — Bulbapedia's CC BY-NC-SA license and Pokémon card-art copyright make personal use a constraint, not a preference). Dev is `encore run` + Vite; CI is GitHub Actions running typecheck and tests — the only remote automation; backup is the committed roster export plus the Docker volume. There is no deploy pipeline because there must not be one.

## 10. What was deliberately not decided

The spine's `Deferred` section is half the contract. The load-bearing deferrals: the **equivalence-rule mechanism** (waits for FR-027's real unfillable list — the schema already leaves room), the **Map's actual rarity assignments** (Collector authoring, its own ruleset), the **bulk-accept type list** (blocks FR-011 only), **publishing and imagery licensing** (before any hosting work, and none is scheduled), and the **Charting Tool's visual design** (a later utilitarian UX pass — its routes and data discipline are already fixed, so it cannot drift while it waits).

---

*Decision history and rationale trail: [.memlog.md](./.memlog.md). Reviewer gate outputs: [reviews/](./reviews/).*
