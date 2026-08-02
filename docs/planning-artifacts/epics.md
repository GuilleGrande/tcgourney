---
stepsCompleted: ['step-01-validate-prerequisites', 'step-02-design-epics', 'step-03-create-stories', 'step-04-final-validation']
inputDocuments:
  - docs/planning-artifacts/prds/prd-tcgourney-2026-07-26/prd.md
  - docs/planning-artifacts/prds/prd-tcgourney-2026-07-26/addendum.md
  - docs/planning-artifacts/architecture/architecture-tcgourney-2026-08-01/ARCHITECTURE-SPINE.md
  - docs/planning-artifacts/architecture/architecture-tcgourney-2026-08-01/SOLUTION-DESIGN.md
  - docs/planning-artifacts/ux-designs/ux-tcgourney-2026-07-31/DESIGN.md
  - docs/planning-artifacts/ux-designs/ux-tcgourney-2026-07-31/EXPERIENCE.md
  - CONTEXT.md
  - docs/adr/0001-bulbapedia-proposes-the-collector-decides.md
  - docs/adr/0002-encore-and-postgres-for-a-single-user-local-app.md
  - docs/adr/0003-rank-and-slots-are-derived-never-stored.md
  - docs/adr/0004-personal-use-only.md
---

# tcgourney - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for tcgourney (Ash's Journey), decomposing the requirements from the PRD, UX Design if it exists, and Architecture requirements into implementable stories.

## Requirements Inventory

### Functional Requirements

FR numbering follows the PRD verbatim (FR-001..FR-041); the architecture spine binds to these same identifiers.

**Part A — The Charting Tool**

- FR-001: Before ingesting, the tool proposes the set of Bulbapedia pages it intends to read; each proposed page presents its title, URL, and the Milestone types it is expected to yield.
- FR-002: The Collector approves or rejects each proposed page; only approved pages are ingested.
- FR-003: The approved manifest is recorded, so a later pass shows what was read and what was declined.
- FR-004: An LLM reads approved pages and proposes Milestones, spanning all seven types.
- FR-005: Each Proposal carries a drafted explainer of at most one paragraph describing how the Pokémon earned that Milestone; the LLM drafts, the Collector edits or approves.
- FR-006: Each Proposal records the Region, the episode, and the Appearance that justified it.
- FR-007: A Proposal without a Citation cannot be created — Citation is the interface, not supporting metadata.
- FR-008: The review queue is ordered by Milestone type (every Catch, then every Teammate, and so on).
- FR-009: Each Proposal presents its Citation passage and a working link as the primary content of the review.
- FR-010: The Collector accepts, rejects, or edits the explainer before accepting.
- FR-011: Bulk-accept operates within a Milestone type; all seven types qualify (Collector ruling 2026-08-01), per-pass use stays his call.
- FR-012: Review is keyboard-driven end to end.
- FR-013: Review is resumable across sessions; position and progress persist.
- FR-014: Verdicts are sticky against re-ingestion — re-reading a Source never resurrects a rejected Proposal; it only flags Sources whose content changed.
- FR-015: When a Loyal Verdict is accepted but the Entry's Milestone Regions do not span beyond its original Region, the tool warns without blocking.
- FR-016: The Collector can create a Milestone manually, carrying a non-Bulbapedia Citation: a URL, a timestamp, and his own words.
- FR-017: Any settled Verdict can be revised at any time, including after charting is declared done.
- FR-018: Revising a Verdict triggers a re-export and advances the roster's version stamp, so the App can never silently serve a stale roster.
- FR-019: A command exports the complete roster to JSON committed to the repository (git history for hand-made rulings + the publishable artifact).
- FR-020: The roster carries a version stamp identifying when it was charted.
- FR-021: The tool reports progress per Milestone type across the roster.
- FR-022: The tool reports charting-done status against all three conditions — every chasable Pokémon identified, ranked, and its Slots identified — answerable from Milestone data alone, no card catalog required.

**Cross-Cutting — The Rarity Translation Map & No Unfillable Slot**

- FR-023: The card catalog is ingested from a static bulk source, not from live API calls in a request path.
- FR-024: Each of the seven Ranks is defined as a group of source Rarities, not a single string; the Scarlet & Violet (2023+) classification is canonical and every other era translates against it.
- FR-025: A Card is eligible for a Slot only if its printed Rarity maps cleanly onto that Slot's Rank; unclean mappings are excluded outright (no review bucket, no fallback) — named exclusions include `Promo` and `MEGA_ATTACK_RARE`.
- FR-026: Source Rarity values absent from the Map are reported at ingestion, and the Cards carrying them are held out of eligibility until the Map is updated; nothing defaults silently into the Binder.
- FR-027: The system detects species × Rank combinations with zero eligible Cards and surfaces them, so substitution rules can be authored where actually needed.
- FR-028: The Map is editable and versioned; changing it re-derives eligible Cards without touching any Verdict.
- FR-029: Where FR-027 identifies an unfillable Slot, an equivalence rule can be defined that satisfies it using Cards of a lower Rank (mechanism deferred; the data model must not foreclose N-cards-per-Slot).

**Part B — The Collection App**

- FR-030: Opening the Binder shows overall progress first.
- FR-031: Progress is filterable by category; the required set is by Region, by Milestone, and by Rank (pre-approved opportunistic candidates: by Evolution Line, by card era, by status filled/empty).
- FR-032: The App treats the roster as read-only; it exposes no path to change a Milestone, a Citation, or an explainer.
- FR-033: An Entry shows its Rank and the Stars that earned it.
- FR-034: An Entry shows each Milestone it holds, with its explainer paragraph, its Citation, and a working link to the source.
- FR-035: An Entry shows its Slots, low Rank to high.
- FR-036: A Slot shows every eligible Card — a shortlist, not a single answer — drawn from the catalog through the Map, spanning sets and eras.
- FR-037: The Collector can choose a specific Card for a Slot, which sets the Slot to Chasing; the choice persists.
- FR-038: The Collector can mark a Slot Filled, recording the specific Card from the specific set that fills it.
- FR-039: A Slot is Filled only when the Card is physically sleeved in the binder — not when bought, not when it arrives.
- FR-040: Only Filled counts toward progress; Chasing does not.
- FR-041: The App lists every Slot currently Chasing — the Collector's hunting list.

### NonFunctional Requirements

- NFR1: Throughput is a hard requirement — several hundred Entries and 700+ explainer paragraphs; keyboard-driven review, bulk-accept, and resumability are what make charting finishable rather than abandoned.
- NFR2: The rank engine stays pure — no I/O, no async, no framework coupling, no dependencies; all derivation (Stars, Rank, Slots, rung attribution) lives in `@tcgourney/rank-engine`.
- NFR3: No live third-party API in any request path — card data is ingested ahead of time (measured 40–58% failure rate on the live source).
- NFR4: The roster survives the tooling — committed JSON export means hand-made rulings outlive any database, framework, or rewrite.
- NFR5: Provenance survives the freeze — Citation text and source link are stored per Milestone, not per Entry, and are displayed to the reader.
- NFR6: Finished by construction — no update pipeline, no change feed, no re-sync mechanism; their absence is a property of the closed domain.
- NFR7: Single-user, local, never deployed (ADR-0004, a legal constraint) — no accounts, no auth, no multi-tenancy, no hosting work.
- NFR8: Ownership state (chase/fill/digest) is Collector-scoped even though exactly one Collector exists; roster and catalog stay globally scoped.
- NFR9: Rank and Slots are derived, never stored (ADR-0003) — the database persists authored facts only; no column ever caches a derived value.
- NFR10: The Collector decides — Sources propose, they never rule; this holds for all seven Milestone types including Loyal.

### Additional Requirements

**Starter/foundation context (brownfield, not greenfield):** no starter template applies. The repo already holds the Encore.ts scaffold, the pure `packages/rank-engine`, and a `roster` service serving `GET /binder` from seed data. Migration note from the spine: `roster/binder.ts` dissolves into the `collection` service once Postgres lands; `SEED_LINES` dies with it. Docker Desktop becomes a hard prerequisite from the first `SQLDatabase` declaration (ADR-0002).

- Three Encore.ts domain services in one Encore app — `charting` (writes `roster_*`), `catalog` (writes `catalog_*`), `collection` (writes `collection_*`); each service is the sole writer of its prefixed tables (AD-3).
- One shared Postgres database declared as a single `SQLDatabase` in a shared module imported by all three services; cross-domain access is read-only SQL; `charting` never reads `catalog_*`/`collection_*` (card-agnostic); the App reads roster tables directly, never through charting endpoints.
- FR-032 is enforced structurally: no write path from the App to roster tables exists at all.
- The species slug (lowercase kebab, e.g. `mr-mime`) is minted exactly once by the charting service, is `roster_entry`'s primary key (one Entry per species), and is copied verbatim across domains, never re-derived (AD-4).
- Chase state addresses a Slot by natural key `(species, rung)`, rung 0 = the ⚫ Catch slot; the fill relation is slot → N cards (join table) from day one, UI enforces 1 until equivalence rules exist; orphaned chase rows are surfaced through the errata flow, never auto-deleted (AD-4).
- All rarity → Rank knowledge lives in the versioned, editable Rarity Translation Map table; no source-rarity string ever appears in TypeScript; eligibility queries run against the current Map only, versions are audit history (AD-5).
- Species resolution happens at ingestion via National Dex numbers — catalog rows carry dex number(s) resolved from source data, `roster_entry` carries its species' dex number authored during charting; eligibility joins on dex number, never card-name parsing (AD-6).
- Catalog ingests the `pokemon-tcg-data` bulk JSON dump; card images are requested only from the catalog service, which fetches from the CDN once on first view, caches to local disk, and serves from disk thereafter (AD-7).
- All Claude API calls live in the charting service; the key is an Encore secret, never client-side; drafting is a batch job per Milestone type that pre-populates the review queue; model `claude-opus-5` via `@anthropic-ai/sdk` (AD-8).
- Every Source row stores its MediaWiki revision id + content hash; Verdict stickiness (FR-014) is checked against the hash (AD-8).
- The roster version stamp (single `roster_version` row) advances automatically on any accepted Verdict write (AD-8).
- Errata is computed App-side: the collection service stores the last-acknowledged per-entry binder snapshot (species → rank, slots, milestone types — never a scalar hash) and diffs it against the freshly computed binder at open; the version stamp is only the cheap change signal (AD-9).
- Rung attribution is engine law: the k-th rung is attributed to the k-th earned Milestone type in canonical ruleset order (opponent, teammate, encounter, bond, glory, loyal), computed in `rank-engine`; badge Region comes from the earliest record of the attributed type by canonical episode order (AD-10).
- One data path in the frontend: all server data flows through the one generated Encore client wrapped in TanStack Query; no hand-rolled `fetch`; client regenerated (`npm run gen:client`) after every endpoint change (AD-11).
- The binder scene is one React Three Fiber canvas (cover, pages, cards, light, page-turns, sleeving); interactive text renders as DOM projected into the scene (drei `Html`); persistent HUD chrome is DOM overlay outside the canvas; accessibility is a parallel DOM tree; `prefers-reduced-motion` replaces animations with cuts (AD-12).
- Frontend has two route worlds — `binder/` (cozy R3F world) and `charting/` (utilitarian review queue) — in one Vite + React app.
- Local-only forever (AD-13): dev = `encore run` + Vite dev server; CI = GitHub Actions running typecheck + all tests on push (the only remote automation); backup = committed roster JSON export + Docker-managed Postgres volume; no staging, no production, no deploy pipeline.
- Conventions: `CONTEXT.md` ubiquitous language is authoritative in code and schema; tables `snake_case` with domain prefix; migrations per service in Encore sequential `migrations/*.up.sql`; secrets via Encore `secret()`; timestamps `timestamptz` / ISO 8601 UTC on the wire; errors are Encore `APIError` codes; wire types are mutable copies of engine output (engine `readonly`/`Set` types never leak).
- Stack (verified 2026-08-01): TypeScript ^7.0.2, Node 24+, Encore.ts ^1.57.10, Postgres via Docker Desktop, Vitest ^4.1.10, React ^19.2, Vite ^8.2 (Rolldown), @react-three/fiber ^9.6, three r185, @react-three/drei ^10.7, @tanstack/react-query ^5.101, @anthropic-ai/sdk (latest), pokemon-tcg-data bulk JSON.
- Roster export (FR-019) is a charting service endpoint + npm script writing to the committed `roster-export/` directory.
- Deferred by architecture (do not schedule): equivalence-rule mechanism, the Map's actual rarity→tier assignments (Collector authoring), publishing/licensing/imagery rights, Charting Tool visual design pass, Encounters-phase source workflow, within-Region ordering beyond Pokédex (swappable comparator), badge artwork, batch drafting transport choice.

### UX Design Requirements

Scope note: the UX contract covers the **Collection App only**; the Charting Tool's visual design is deferred to a later utilitarian pass (its routes and data discipline are already fixed by the architecture).

- UX-DR1: Implement the DESIGN.md token set as the app's design tokens: full color system with day and night siblings for every world and chrome color, typography roles (display / body / label-caps / meta), radius scale 6–20px with deliberately no `full` token, spacing scale, and all component token blocks (card-frame, pocket, search-bar, filter-chip, progress-meter, ghost-card, empty-sleeve, rank-chip, hover-hud, rung-ladder, throne, sleeve-button, mode-toggle).
- UX-DR2: Day/Night mode toggle — one click swaps two first-class moods of the same room (never a generic dark mode that inverts the paper), instant, preference remembered across sessions.
- UX-DR3: The Cover — the app's open state is the closed leather binder: blind-debossed "Ash's Journey" (never foil, never chrome ink), stitch inset frame, debossed medallion, cream page-block edge; carries no data and no chrome; the whole binder is the single invitation target with hover/focus lift under a honeyed halo; ember appears only as the keyboard-focus ring.
- UX-DR4: Cover-open ritual on every single open — skippable-fast, satisfying every time, never a chore; honors `prefers-reduced-motion` with a cut.
- UX-DR5: Progress spread as front matter immediately after the cover — overall journey standing first (satisfies FR-030), scoped counts in field-guide voice ("Kanto — 12 of 31 sleeved · only Filled counts"); detailed layout is a flagged gap to resolve in design-adjacent stories.
- UX-DR6: Region chapters Kanto→Galar in order — each opens with a full-page Region Title card (chapter voice in display type, region crest in the throne's triple-ring language, badge trophy shelf), followed by 3×3 two-page spreads (18 sleeves); Pokédex order within Region ships first with the ordering comparator swappable; an Entry's Slots sit adjacent.
- UX-DR7: Slot-details page — clicking any sleeve (filled or empty) collapses to a single centered 3×3 page, slot-scoped: row 1 the soul (chase data · the Pokémon alive · facts), row 2 the chase Carousel, row 3 the story (milestone · explainer · citation with working link) — FR-033/034/035 satisfied distributed across slot pages.
- UX-DR8: Search bar — the only navigation; persistent HUD floating above the binder outside the page grid; accepts name, Region, Milestone, Rank, and `status:chasing`; `/` focuses it; results re-deal the binder (never a dropdown list of links); no TOC, no tabs, no sidebar anywhere.
- UX-DR9: Filter chips — one click applies, active chip shows ember fill, clearing re-deals back to the home binder; The Hunt is a chip (`status:chasing`), not a separate surface (FR-041).
- UX-DR10: Filtered binder re-deal — the binder re-deals into a temporary binder fronted by the matching Title card, same spreads, same 3×3 rules (FR-031: Region, Milestone, Rank required).
- UX-DR11: Progress meter — bordered track with plant-green striped fill (progress reads as growth); scope follows the active filter; counts Filled only (FR-040).
- UX-DR12: Carousel — strict three-sleeve window (never five) with chunky edge rotate buttons; candidates render semi-transparent, center card taller and dominant, side cards recede; shortlist spans sets and eras flowing in era chapters (Base → EX → Sun & Moon → SV…); the row's Hover HUD shows era chips to jump chapters; selecting a card highlights it and sets the Slot to Chasing (FR-036/037).
- UX-DR13: Ghost card — the chosen candidate sits translucent in its empty sleeve on the home spread (dashed ember frame, art at 55% opacity, pulsing ember CHASING chip; pulse honors reduced motion), so the spread always shows what is being chased.
- UX-DR14: Empty sleeve — translucent paper card, dashed inner frame, open star, demanded Rank in a honey frame with "this sleeve waits" whisper; ⚫ base rung uses ink instead of honey; confronts, never nags.
- UX-DR15: Throne + Motif cards — a Filled slot's card enthroned in the Carousel center under the triple ring (ink–cream–honey) with FILLED · SLEEVED chip; seven designed Rank motif-card sets (one per Rank) flank the enthroned card as non-interactive filler.
- UX-DR16: Rung ladder (Variant A, chosen; B rejected) — edge-docked Trainer rung strip on slot details: one rung per Slot low→high, filled = solid espresso, open = dashed, current = ember ring; clicking a rung flips to that Slot's page; brightens when the pointer reaches the page.
- UX-DR17: Hover HUDs — dark espresso strips docked at row top edges, hidden until hover: back-to-spread, prev/next slot, category/paging, era chips on the Carousel row; chrome stays invisible until needed.
- UX-DR18: Sleeve button + sleeving ritual — ember button present only when a chase target is set; the ritual is the climax (FR-038/039): everything but the card dims → light falls from above → the card slides into the sleeve → satisfying glow + the sleeving sound → it becomes the enthroned card; reduced-motion variant keeps the meaning through a cut (dim → placed → done).
- UX-DR19: Un-fill and chase-swap semantics — un-fill allowed with exactly one confirmation, sleeve returns to empty or Chasing, no celebration and no shame; abandoning or swapping a chase is free with no confirmation (changing your mind is part of the fun).
- UX-DR20: Foley set + audio toggle — page-flip whisper, cover open/close, soft chip taps, with the sleeving sound as the loud centerpiece; one explicit audio preference controls the entire set; every ritual completes silently without loss of state.
- UX-DR21: Page-flip ritual — two-page spreads with full page-turn animation (the flip is the travel); flip buttons at spread corners.
- UX-DR22: Field-guide state pages inside the binder metaphor with required wording: zero-match filter ("Nothing in the binder answers that."), empty Hunt ("No chases underway. The binder rests."), load failure ("The binder couldn't be opened."), no candidates ("No card was ever printed for this rung." — history, not a bug); unfillable slots render as normal empty sleeves on the home spread.
- UX-DR23: Errata slip — paper-register slip on the progress spread when the roster changed since last open: "The chronicle was revised — N entries changed," with a way to see what moved; roster updates are adopted immediately and the opening ritual is never blocked; the App never silently serves a stale roster.
- UX-DR24: Badges — earned per region × milestone type, rendered as circular coins (world objects, exempt from the pill ban): earned = radial honey face, espresso ring, embossed glyph, breathing halo; unearned = blind-debossed silhouette; ember never appears on badges; displayed on the Region Title card's trophy shelf; glyphs are placeholder pending badge artwork; worked example — filling all Common/base slots of Kanto earns Kanto's "The Catch" badge (generalized rule to be verified against the rank engine's rung attribution).
- UX-DR25: Accessibility floor — `prefers-reduced-motion` honored on every ritual (cover, flips, carousel, ghost pulse, sleeving); every interactive element keyboard-reachable and operable, `/` focuses Search, tab order follows reading order (fuller keyboard model is a flagged gap); contrast rules: reading text always ink on paper or chrome-ink-night on night chrome, honey text uses honey-text never raw honey, ember always accompanied by shape and never the only signal.
- UX-DR26: Voice and tone — warm field-guide storyteller microcopy throughout ("This sleeve waits." / "Awaiting its Ultra Rare." / "The chronicle was revised — 3 entries changed."); quiet complete sentences; no exclamation marks, no SaaS-speak, no gamer hype, no shame for undoing.
- UX-DR27: Card-art degradation — everywhere cards render, the UI must degrade gracefully to text-only candidates when art is unavailable (imagery wanted, not guaranteed); visual treatment is a flagged gap to settle during implementation.
- UX-DR28: The universal grid law — every piece of interactive content lives inside a 63:88 card frame inside a pocket on the 3×3 page grid; one card, one sleeve — spotlight via neighbors, framing, glow, never size; background imagery may span slots, interactive content never; rounded rectangles 8–12px with thick 2px chrome borders, pills banned; typography gap (no brand typeface chosen) ships the warm system stack as standing spec.

### FR Coverage Map

- FR-001: Epic 1 - Proposed Bulbapedia pages with title, URL, expected Milestone types
- FR-002: Epic 1 - Approve/reject each proposed page; only approved ingested
- FR-003: Epic 1 - Approved manifest recorded
- FR-004: Epic 1 - LLM proposes Milestones across all seven types
- FR-005: Epic 1 - Drafted one-paragraph explainer per Proposal
- FR-006: Epic 1 - Proposal records Region, episode, Appearance
- FR-007: Epic 1 - No Proposal without a Citation
- FR-008: Epic 2 - Review queue ordered by Milestone type
- FR-009: Epic 2 - Citation passage + working link as primary review content
- FR-010: Epic 2 - Accept, reject, or edit explainer before accepting
- FR-011: Epic 2 - Bulk-accept within a Milestone type (all seven qualify)
- FR-012: Epic 2 - Keyboard-driven review end to end
- FR-013: Epic 2 - Review resumable across sessions
- FR-014: Epic 2 - Verdicts sticky against re-ingestion; changed Sources flagged
- FR-015: Epic 2 - Loyal warning without blocking
- FR-016: Epic 2 - Manual Milestone with off-wiki Citation
- FR-017: Epic 2 - Any settled Verdict revisable at any time
- FR-018: Epic 2 - Revision triggers re-export + version stamp advance
- FR-019: Epic 2 - Roster JSON export command, committed to repo
- FR-020: Epic 2 - Roster version stamp
- FR-021: Epic 2 - Progress per Milestone type
- FR-022: Epic 2 - Charting-done status from Milestone data alone
- FR-023: Epic 3 - Catalog ingested from static bulk source
- FR-024: Epic 3 - Ranks defined as groups of source Rarities (SV canonical)
- FR-025: Epic 3 - Clean-mapping eligibility; unclean excluded outright
- FR-026: Epic 3 - Unmapped Rarities reported and held out of eligibility
- FR-027: Epic 3 - Species × Rank zero-eligible-Card detection surfaced
- FR-028: Epic 3 - Map editable + versioned; re-derives eligibility without touching Verdicts
- FR-029: Epic 3 - Equivalence-rule door held open (slot → N cards; mechanism deferred)
- FR-030: Epic 4 - Opening the Binder shows overall progress first
- FR-031: Epic 4 - Progress filterable by Region, Milestone, Rank
- FR-032: Epic 4 - Roster read-only in the App (structural)
- FR-033: Epic 4 - Entry shows Rank + Stars
- FR-034: Epic 4 - Entry shows each Milestone with explainer, Citation, working link
- FR-035: Epic 4 - Entry shows Slots low to high
- FR-036: Epic 5 - Slot shows every eligible Card as a shortlist
- FR-037: Epic 5 - Choose a Card → Chasing; choice persists
- FR-038: Epic 5 - Mark Filled with specific Card from specific set
- FR-039: Epic 5 - Filled only when physically sleeved
- FR-040: Epic 5 - Only Filled counts toward progress
- FR-041: Epic 5 - The Hunt lists every Chasing Slot

## Epic List

### Epic 1: The Journey Charted — Sources, Proposals, and Drafted Explainers

The Collector can propose and approve the Bulbapedia pages to be read, run the LLM drafting pipeline, and see a fully drafted review queue take form. Story 1.1 is the brownfield foundation: first `SQLDatabase` declaration, three-service skeleton with the shared DB module, `roster_*` migrations, and dissolving `roster/binder.ts` into `collection` per the spine's migration note.
**FRs covered:** FR-001, FR-002, FR-003, FR-004, FR-005, FR-006, FR-007

### Epic 2: The Record Settled — Review, Verdicts, and the Frozen Roster

The Collector can review at throughput (by type, keyboard-driven, bulk-accept, resumable), settle sticky Verdicts, add manual Milestones, revise any ruling, export the versioned roster JSON, and see the completion gate answer "is charting done?" Utilitarian charting frontend, deliberately outside the UX contract.
**FRs covered:** FR-008, FR-009, FR-010, FR-011, FR-012, FR-013, FR-014, FR-015, FR-016, FR-017, FR-018, FR-019, FR-020, FR-021, FR-022

### Epic 3: Every Slot Findable — The Catalog and the Rarity Translation Map

The Collector can ingest the card catalog, author and version the Map, see unmapped rarities reported and held out, ask which real Cards fit any Slot, and learn which Slots are unfillable. FR-027's detection query lives in the `collection` service; FR-029 means the data model holds the door open (slot → N cards), mechanism deferred. Can proceed in parallel once Story 1.1 lands.
**FRs covered:** FR-023, FR-024, FR-025, FR-026, FR-027, FR-028, FR-029

### Epic 4: Opening the Binder — The World, the Chapters, the Chronicle

The Collector can open the Binder to the Cover, complete the opening ritual, see overall progress and the Errata slip, travel by search and filter through re-dealt Region chapters, and read every Entry's story — Rank, Stars, Milestones, explainers, working citations. The R3F risk boundary: one canvas, DOM words, design tokens, day/night, rituals, field-guide state pages, errata diffing, rung attribution, accessibility floor. Covers UX-DR1–11, 14, 16–17, 21–23, 25–28.
**FRs covered:** FR-030, FR-031, FR-032, FR-033, FR-034, FR-035

### Epic 5: The Chase — Choosing, Hunting, Sleeving

The Collector can browse a Slot's era-chaptered Carousel shortlist, choose a Card (Chasing, with its Ghost on the spread), work The Hunt, perform the sleeving ritual to mark a Slot Filled, un-fill without shame, watch Filled-only progress tick, and earn region × milestone badges on trophy shelves. Covers UX-DR12–13, 15, 18–20, 24.
**FRs covered:** FR-036, FR-037, FR-038, FR-039, FR-040, FR-041

## Epic 1: The Journey Charted — Sources, Proposals, and Drafted Explainers

The Collector can propose and approve the Bulbapedia pages to be read, run the LLM drafting pipeline, and see a fully drafted review queue take form. Story 1.1 is the brownfield foundation; the pipeline then lands in gate order — propose → approve → ingest → draft. No binder-world UX applies; the charting frontend is deliberately utilitarian.

### Story 1.1: Three Services, One Database, the Binder Preserved

As the Collector,
I want the app restructured into its three domain services over one Postgres database with the existing binder endpoint still working,
So that every later story lands in its final home and the write-authority seam is structural from day one.

**Acceptance Criteria:**

**Given** Docker Desktop is running,
**When** `encore run` starts,
**Then** the app boots with three services — `charting`, `catalog`, `collection` — sharing one `SQLDatabase` declared in a single shared module imported by all three.

**Given** the restructure is complete,
**When** `GET /binder` is called,
**Then** the `collection` service serves it by computing Rank and Slots via `@tcgourney/rank-engine` over the `roster_entry` and `roster_milestone` tables,
**And** `roster/binder.ts` and `SEED_LINES` no longer exist.

**Given** an empty roster (nothing charted yet),
**When** `GET /binder` is called,
**Then** it returns an empty binder, not an error.

**Given** the charting service's migrations,
**When** they run,
**Then** `roster_entry` exists keyed by the species slug (lowercase kebab) carrying the National Dex number, and `roster_milestone` carries type, Region, and episode — only the tables this story needs, no more.

**Given** the endpoint moved,
**When** `npm run gen:client` runs,
**Then** the frontend compiles against the regenerated client and CI (typecheck + all tests) passes.

### Story 1.2: Propose the Reading List

As the Collector,
I want the tool to propose the set of Bulbapedia pages it intends to read — each with its title, URL, and the Milestone types it is expected to yield,
So that I can see exactly what evidence the charting pass will draw on before anything is ingested. *(FR-001)*

**Acceptance Criteria:**

**Given** the charting world is open,
**When** I run source discovery,
**Then** candidate pages are proposed — the master "Ash's Pokémon" listing, per-Pokémon pages, and `Category:Legendary Pokémon (anime)` members per ADR-0001 — each presenting title, URL, and expected Milestone types.

**Given** proposed pages are stored as `roster_source` rows in a `proposed` state,
**When** I leave and return,
**Then** the proposed list persists unchanged.

**Given** a page was already proposed,
**When** discovery runs again,
**Then** no duplicate Source rows are created.

**Given** this story is complete,
**When** any Source is inspected,
**Then** no page content has been fetched — the approval gate (FR-002) has not been crossed.

### Story 1.3: Approve or Decline Each Page

As the Collector,
I want to approve or reject each proposed page and have every ruling recorded,
So that only evidence I sanctioned is ever read, and a later pass shows what was read and what was declined. *(FR-002, FR-003)*

**Acceptance Criteria:**

**Given** proposed pages in the charting world,
**When** I approve or decline one,
**Then** its state persists as `approved` or `declined` with the ruling timestamp.

**Given** the manifest view,
**When** I open it,
**Then** every Source shows its current state — proposed, approved, declined (and, once later stories land, ingested) — so the manifest answers "what was read and what was declined."

**Given** a declined page,
**When** any ingestion or drafting runs in later stories,
**Then** that page is never fetched and yields no Proposals.

### Story 1.4: Ingest Approved Sources with Provenance

As the Collector,
I want approved pages fetched and their content stored with revision id and content hash,
So that drafting works from a stable, provable snapshot — and re-ingestion can later detect change instead of re-litigating. *(FR-002; provenance groundwork for FR-014)*

**Acceptance Criteria:**

**Given** approved Sources,
**When** ingestion runs,
**Then** each page's plaintext extract is fetched from the MediaWiki API and stored with its revision id, content hash, and fetched-at timestamp (AD-8).

**Given** a Source that is proposed or declined,
**When** ingestion runs,
**Then** it is not fetched.

**Given** a fetch fails for one Source,
**When** ingestion completes,
**Then** that Source is marked failed and can be retried without disturbing the others.

**Given** ingestion has run,
**When** I open the manifest,
**Then** ingested Sources show their ingested state and fetch timestamp.

### Story 1.5: Draft Proposals Across All Seven Types

As the Collector,
I want a batch drafting job per Milestone type that reads ingested Sources and populates the review queue with cited, drafted Proposals,
So that review never waits on an API call and seven hundred explainers become survivable. *(FR-004, FR-005, FR-006, FR-007)*

**Acceptance Criteria:**

**Given** ingested Sources and the Claude API key stored as an Encore secret (never client-side),
**When** I run the drafting batch for a Milestone type,
**Then** Proposals of that type are created, each carrying: the species (slug minted exactly once by the charting service, with dex number), the Region, the episode, the Appearance that justified it, and a drafted explainer of at most one paragraph.

**Given** any Proposal candidate without a Citation (passage + working source link),
**When** the pipeline attempts to store it,
**Then** no Proposal row is created — the constraint is enforced at the database level, not just in prompt instructions.

**Given** batches exist for all seven Milestone types,
**When** I view the charting world,
**Then** I see the pending-Proposal count per type — the review queue visibly taking form.

**Given** a batch already ran,
**When** it runs again over unchanged Sources,
**Then** existing Proposals are not duplicated.

## Epic 2: The Record Settled — Review, Verdicts, and the Frozen Roster

The Collector can review at throughput (by type, keyboard-driven, bulk-accept, resumable), settle sticky Verdicts, add manual Milestones, revise any ruling, export the versioned roster JSON, and see the completion gate answer "is charting done?" Export (2.7) deliberately precedes revision (2.9) because FR-018's revision-triggered re-export needs the export command to exist.

### Story 2.1: The Review Queue, Ordered by Type, Citation First

As the Collector,
I want the review queue ordered by Milestone type, with each Proposal presenting its Citation passage and a working source link as the primary content,
So that I judge evidence rather than summaries, and clear categories in coherent passes. *(FR-008, FR-009)*

**Acceptance Criteria:**

**Given** drafted Proposals across several types,
**When** I open review,
**Then** Proposals are presented grouped by Milestone type in a fixed order — every Catch, then every Teammate, and so on — never interleaved.

**Given** a Proposal on screen,
**When** I review it,
**Then** the Citation passage and a working link to its source are the primary content, with species, type, Region, episode, Appearance, and the drafted explainer also visible.

**Given** I am reviewing within a type,
**When** I look at the queue chrome,
**Then** I see my position within that type (e.g. "12 of 87 Teammate Proposals").

**Given** the Citation link,
**When** I activate it,
**Then** the source page opens in a new tab and the review position is not lost.

### Story 2.2: Pass Verdicts — Accept, Reject, or Edit-Then-Accept

As the Collector,
I want to accept, reject, or edit the explainer before accepting each Proposal,
So that the roster records only my rulings, and the binder grows as I judge. *(FR-010; stamp per AD-8)*

**Acceptance Criteria:**

**Given** a Proposal under review,
**When** I accept it,
**Then** an accepted Verdict is recorded, a `roster_milestone` row is created carrying type, Region, episode, Appearance, explainer, and Citation,
**And** the `roster_entry` for that species exists (created on its first accepted Milestone, slug and dex number carried from the Proposal).

**Given** a Proposal under review,
**When** I edit the explainer and then accept,
**Then** the edited text (still at most one paragraph) is what the Milestone stores.

**Given** a Proposal under review,
**When** I reject it,
**Then** a rejected Verdict is recorded, no Milestone is created, and the Proposal leaves the queue.

**Given** any accepted Verdict write,
**When** it commits,
**Then** the roster version stamp (single `roster_version` row) advances automatically.

**Given** Verdicts have been passed,
**When** `GET /binder` is called,
**Then** accepted Milestones are reflected in computed Rank and Slots — proof the seam flows end to end.

### Story 2.3: Keyboard-Driven, Resumable Review

As the Collector,
I want the entire review operable from the keyboard and resumable across sessions,
So that a seven-hundred-paragraph review is finishable in real sittings, weeks apart. *(FR-012, FR-013, NFR1)*

**Acceptance Criteria:**

**Given** the review queue is open,
**When** I work without touching the mouse,
**Then** every action — next/previous, accept, reject, enter/exit explainer editing, jump between types — is reachable and operable by keyboard, with the bindings visible on screen.

**Given** I close the tool mid-pass,
**When** I reopen review later,
**Then** I resume at my saved position with progress intact — position persists server-side, not in browser state.

**Given** I pass a Verdict,
**When** the next Proposal is presented,
**Then** it appears without a full page reload and without losing queue context.

### Story 2.4: Bulk-Accept Within a Type

As the Collector,
I want to bulk-accept the remaining Proposals of one Milestone type,
So that an unambiguous category can be cleared wholesale instead of one keystroke at a time. *(FR-011)*

**Acceptance Criteria:**

**Given** the queue is scoped to one Milestone type,
**When** I trigger bulk-accept,
**Then** a confirmation states exactly how many pending Proposals will be accepted, and nothing happens until I confirm.

**Given** I confirm,
**When** the operation completes,
**Then** every pending Proposal of that type is accepted — Verdicts recorded, Milestones created, version stamp advanced — and a summary reports the count.

**Given** any of the seven Milestone types,
**When** I scope the queue to it,
**Then** bulk-accept is available (all seven qualify; per-pass use is my call).

**Given** Proposals of other types are pending,
**When** bulk-accept runs,
**Then** they are untouched.

### Story 2.5: The Loyal Warning

As the Collector,
I want a warning when I accept a Loyal Verdict for an Entry whose Milestone Regions never leave its original Region,
So that a provably failing geography claim is caught — without the tool taking the ruling from me. *(FR-015)*

**Acceptance Criteria:**

**Given** an Entry whose accepted Milestones all sit in its original Region,
**When** I accept a Loyal Proposal for it,
**Then** a warning states the geographic check fails, and I may proceed or back out — accepting is never blocked.

**Given** an Entry whose Milestones span beyond its original Region,
**When** I accept a Loyal Proposal,
**Then** no warning appears.

**Given** the check runs,
**When** it evaluates,
**Then** it is derived on the fly from Milestone data (derived-as-a-check, never stored).

### Story 2.6: Manual Milestones with Off-Wiki Citations

As the Collector,
I want to create a Milestone by hand carrying a non-Bulbapedia Citation — a URL, a timestamp, and my own words,
So that off-wiki research (especially Encounters) lands in the roster with full provenance. *(FR-016)*

**Acceptance Criteria:**

**Given** the charting world,
**When** I create a manual Milestone,
**Then** I supply species, Milestone type, Region, episode, Appearance, an explainer, and a Citation of URL + timestamp + my own words — and the Milestone is recorded exactly like an accepted one.

**Given** any Citation field is missing,
**When** I attempt to save,
**Then** creation is refused — FR-007 holds for manual entries too.

**Given** the species has no Entry yet,
**When** the manual Milestone is created,
**Then** the slug is minted by the charting service with its dex number, per AD-4/AD-6.

**Given** the Milestone is created,
**When** the version stamp and `GET /binder` are checked,
**Then** the stamp has advanced and the Milestone is indistinguishable downstream from a reviewed one.

### Story 2.7: Export the Roster to Committed JSON

As the Collector,
I want a command that exports the complete roster to JSON in the repository,
So that weeks of hand-made rulings get git history and a portable artifact that outlives any database. *(FR-019, FR-020)*

**Acceptance Criteria:**

**Given** a roster with accepted Milestones,
**When** I run the export command (npm script driving a charting endpoint),
**Then** the complete roster — every Entry with slug and dex number, every Milestone with type, Region, episode, Appearance, explainer, and Citation — is written as JSON into `roster-export/`.

**Given** the export runs,
**When** the artifact is inspected,
**Then** it carries the roster version stamp identifying when it was charted.

**Given** two exports with no roster change between them,
**When** their outputs are diffed,
**Then** they are byte-identical — stable ordering, no timestamps beyond the stamp — so git diffs show real change only.

### Story 2.8: Sticky Verdicts Against Re-Ingestion

As the Collector,
I want re-ingestion to flag changed Sources without ever resurrecting a rejected Proposal,
So that a re-crawl never re-litigates hundreds of settled rulings. *(FR-014)*

**Acceptance Criteria:**

**Given** approved Sources with settled Verdicts,
**When** re-ingestion runs and a Source's content hash is unchanged,
**Then** nothing is re-drafted and no queue entries appear.

**Given** a Source whose fetched content hash differs from the stored one,
**When** re-ingestion completes,
**Then** that Source is flagged as changed in the manifest, and only flagged Sources are eligible for re-drafting.

**Given** a flagged Source is re-drafted,
**When** the batch runs,
**Then** no Proposal is created that matches an existing rejected Verdict — rejection is checked before insertion,
**And** no settled Verdict or accepted Milestone is modified by any part of re-ingestion.

### Story 2.9: Revise Any Settled Verdict

As the Collector,
I want to revise any settled Verdict at any time — including after charting is declared done,
So that a bad ruling can be fixed years later without the two builds collapsing into one. *(FR-017, FR-018)*

**Acceptance Criteria:**

**Given** a settled Verdict, accepted or rejected,
**When** I revise it (flip the ruling, or edit the explainer of an accepted one),
**Then** the roster reflects the change — Milestone created, removed, or updated accordingly.

**Given** any revision commits,
**When** it completes,
**Then** the roster version stamp advances and a re-export runs, so the committed JSON can never silently go stale.

**Given** a revision removes a Milestone that lowers an Entry's Rank,
**When** the App next computes the binder,
**Then** collection-side chase rows are left untouched by the charting service — orphan surfacing is the App's errata concern (AD-9), never a cascade here.

### Story 2.10: Progress and the Completion Gate

As the Collector,
I want per-type progress and a charting-done report,
So that "have I finished the Opponent pass?" and "is charting done?" both have answers. *(FR-021, FR-022)*

**Acceptance Criteria:**

**Given** charting is underway,
**When** I open the progress view,
**Then** I see, per Milestone type, the counts of pending, accepted, and rejected Proposals across the roster.

**Given** the completion report,
**When** I open it,
**Then** it states status against all three gate conditions — every chasable Pokémon identified, ranked, and its Slots identified — computed from Milestone data alone via the rank engine, with no card catalog involved.

**Given** the gate is not yet satisfied,
**When** I read the report,
**Then** it shows what remains (e.g. types with pending Proposals) rather than a bare yes/no.

## Epic 3: Every Slot Findable — The Catalog and the Rarity Translation Map

The Collector can ingest the card catalog, author and version the Map, see unmapped rarities reported and held out, ask which real Cards fit any Slot, and learn which Slots are unfillable. Rarity knowledge lives only in the Map (AD-5); species matching is dex-number joins resolved at ingestion (AD-6); nothing is fetched live in a request path (AD-7, NFR3).

### Story 3.1: Ingest the Card Catalog from the Bulk Dump

As the Collector,
I want the full card catalog ingested from the `pokemon-tcg-data` bulk JSON,
So that every real printing is locally known, with no live API in any request path. *(FR-023)*

**Acceptance Criteria:**

**Given** the `pokemon-tcg-data` bulk JSON,
**When** I run catalog ingestion,
**Then** `catalog_card` rows are created carrying the source card id verbatim, name, set, series/era, printed Rarity string, image references, and National Dex number(s) resolved from the source data at ingestion (AD-6).

**Given** cards with no National Dex number (Trainers, Energy),
**When** ingestion runs,
**Then** they are excluded — only Pokémon cards become candidates.

**Given** ingestion already ran,
**When** it runs again,
**Then** rows are upserted with no duplicates — refresh is a deliberate command, never request-time (NFR3).

**Given** ingestion completes,
**When** I read its summary,
**Then** it reports sets ingested, cards ingested, and the distinct printed-Rarity strings encountered (~38 expected).

### Story 3.2: The Map — Seven Ranks as Groups of Rarities

As the Collector,
I want the Rarity Translation Map as a versioned table where each Rank is a group of source Rarities, seeded from the Scarlet & Violet canon,
So that rarity semantics live in data I rule over, never in code. *(FR-024)*

**Acceptance Criteria:**

**Given** the catalog service's migrations,
**When** they run,
**Then** the Map table exists with version bookkeeping: each row maps one source Rarity string to one of the seven Ranks, and a Rank may hold many Rarities.

**Given** the seed,
**When** the first Map version lands,
**Then** the SV (2023+) classification is mapped as canonical onto the seven Ranks (Common and Uncommon both to the ⚫ base).

**Given** the named exclusions `Promo` and `MEGA_ATTACK_RARE`,
**When** the seed lands,
**Then** they are recorded as explicitly excluded — distinguishable from "not yet ruled on."

**Given** the codebase,
**When** searched,
**Then** no source-Rarity string literal appears in TypeScript outside migrations/seed data (AD-5).

### Story 3.3: Eligibility Through the Current Map

As the Collector,
I want to ask which real Cards are eligible for any Slot,
So that every shortlist is drawn from the catalog through the Map — cleanly, or not at all. *(FR-025)*

**Acceptance Criteria:**

**Given** a Slot addressed as (species, rung),
**When** eligibility is queried,
**Then** it returns exactly the Cards whose dex number matches the species and whose printed Rarity maps cleanly to that rung's Rank in the **current** Map version — spanning sets and eras, each printing its own candidate.

**Given** a Card whose Rarity is excluded or unmapped,
**When** eligibility is queried,
**Then** it never appears — no review bucket, no fallback into the Binder.

**Given** the Map has prior versions,
**When** any eligibility query runs,
**Then** only the current version is consulted; versions are audit history, never a query target.

### Story 3.4: Unmapped Rarities Reported and Held Out

As the Collector,
I want Rarity values absent from the Map reported, with their Cards held out of eligibility,
So that nothing ever defaults silently into the Binder. *(FR-026)*

**Acceptance Criteria:**

**Given** ingestion encounters a Rarity string absent from the Map,
**When** it completes,
**Then** the ingestion report lists each unmapped value with its card count.

**Given** a Card carrying an unmapped Rarity,
**When** any eligibility query runs,
**Then** it is held out until the Map rules on that Rarity.

**Given** time has passed since ingestion,
**When** I ask for the current unmapped set,
**Then** it is viewable on demand, not only in the ingestion-time report.

### Story 3.5: Edit the Map, Version It, Re-Derive Eligibility

As the Collector,
I want to edit the Map — assign, reassign, or exclude a Rarity — with every change versioned,
So that Map judgment calls evolve without touching a single Verdict. *(FR-028)*

**Acceptance Criteria:**

**Given** the current Map,
**When** I assign an unmapped Rarity, reassign one to a different Rank, or exclude one,
**Then** the change persists as a new Map version and the prior state remains as audit history.

**Given** a Map edit commits,
**When** eligibility is next queried,
**Then** results reflect the new mapping immediately (recomputed on read),
**And** no Verdict, Milestone, or chase row is modified.

**Given** a previously unmapped Rarity is now mapped,
**When** eligibility runs,
**Then** its held-out Cards become eligible with no re-ingestion required.

### Story 3.6: Unfillable-Slot Detection

As the Collector,
I want every species × Rank combination with zero eligible Cards detected and surfaced,
So that equivalence rules can be authored exactly where they are needed — and nowhere else. *(FR-027, FR-029's open door)*

**Acceptance Criteria:**

**Given** a charted roster and an ingested catalog,
**When** I run the unfillable report,
**Then** the `collection` service lists every demanded Slot (engine output) with zero eligible Cards, by species and Rank.

**Given** a Map edit or roster revision,
**When** the report runs again,
**Then** results reflect current state — the report is derived, never stored (AD-2).

**Given** FR-029's deferred mechanism,
**When** this story is complete,
**Then** no equivalence rule is implemented, and nothing in the report or eligibility API assumes one-card-per-Slot — the N-capable shape stays open.

### Story 3.7: Card Images from the Local Cache

As the Collector,
I want card images served by the catalog service from a local disk cache,
So that the binder still shows its cards in ten years, offline, with the CDN gone. *(AD-7; supports UX-DR27)*

**Acceptance Criteria:**

**Given** a card image request for an uncached image,
**When** the catalog service handles it,
**Then** it fetches from the CDN once, stores to the disk cache, and serves it.

**Given** the image is cached,
**When** it is requested again,
**Then** it is served from disk with no outbound call.

**Given** the CDN fails or the image doesn't exist,
**When** the request completes,
**Then** the service returns a clean not-available signal so the UI can degrade to text-only, and the failure is not cached as if it were an image (retry stays possible).

**Given** the frontend,
**When** it renders any card image,
**Then** it requests only the catalog service, never the CDN directly.

## Epic 4: Opening the Binder — The World, the Chapters, the Chronicle

The Collector can open the Binder to the Cover, complete the opening ritual, see overall progress and the Errata slip, travel by search and filter through re-dealt Region chapters, and read every Entry's story. The R3F risk boundary: one canvas, DOM words (AD-12), the engine's rung-attribution extension (AD-10), App-side errata (AD-9). Staged so the scene exists before anything sits on it; sleeve-click navigation is specified in 4.6, where the details page exists — no forward dependencies.

### Story 4.1: The Stage — One Canvas, the Tokens, Day and Night

As the Collector,
I want the binder world staged as one React Three Fiber scene of the cozy room, with the full design-token set and a remembered Day/Night toggle,
So that every later surface inherits the same warm world by construction. *(UX-DR1, UX-DR2; AD-11, AD-12)*

**Acceptance Criteria:**

**Given** the binder route opens,
**When** the scene renders,
**Then** one R3F canvas draws the room — wall, six-pane window, desk, binder position, light as atmosphere — layered back-to-front: wall → window → light shafts → desk → binder → room objects → chrome.

**Given** the DESIGN.md frontmatter,
**When** tokens are implemented,
**Then** all colors (every day value with its night sibling), typography roles, the radius scale (deliberately no `full` token), spacing, and every component token block exist as the single token source — no new accents, no pure white or black surfaces.

**Given** the Mode toggle,
**When** clicked,
**Then** Day ↔ Night swap instantly across world and chrome, the preference persists across sessions, and night stays lamp-lit cream — the page never inverts to dark.

**Given** the two rendering registers,
**When** examples of each are built,
**Then** in-scene words render as DOM projected via drei `Html` (selectable text, clickable links), persistent HUD chrome is DOM overlay outside the canvas, a parallel DOM tree serves assistive tech, and `prefers-reduced-motion` swaps animation for cuts.

**Given** any server data on this route,
**When** it is fetched,
**Then** it flows only through the generated Encore client wrapped in TanStack Query — no hand-rolled `fetch`.

### Story 4.2: The Cover and the Opening Ritual

As the Collector,
I want the app to open on the closed binder and play the opening ritual every time,
So that every session begins with the object, not a dashboard. *(UX-DR3, UX-DR4)*

**Acceptance Criteria:**

**Given** the app opens,
**When** the first frame renders,
**Then** it is always the Cover: leather face with blind-debossed "Ash's Journey" (leather-on-leather — never foil, never chrome ink), stitch inset frame, debossed medallion, cream page-block edge — carrying no data and no chrome.

**Given** hover or keyboard focus,
**When** it lands on the binder,
**Then** the whole binder lifts gently under a honeyed halo (window-light by day, lamp-glow by night); ember appears only as the keyboard-focus ring.

**Given** click or Enter,
**When** the ritual plays,
**Then** the cover opens into the open binder — satisfying, skippable-fast (any input mid-ritual jumps to the end), never a chore.

**Given** `prefers-reduced-motion`,
**When** the ritual would play,
**Then** it becomes a cut that preserves the meaning (closed → open).

**Given** the ritual completes,
**When** the open binder appears,
**Then** the persistent HUD chrome arrives only now — the Cover itself stays pure.

### Story 4.3: Spreads, Pockets, and the Page-Flip Ritual

As the Collector,
I want the open binder to present two-page 3×3 spreads with real page-turns,
So that travel through the binder feels like flipping a physical object. *(UX-DR21, UX-DR28)*

**Acceptance Criteria:**

**Given** the open binder,
**When** content renders,
**Then** it presents as two-page spreads — 3×3 pockets per page, 18 sleeves per spread — and every interactive element lives inside a 63:88 card frame inside a pocket, at token grid gaps and padding.

**Given** flip buttons at the spread corners,
**When** one is activated,
**Then** a full page-turn animation travels exactly one spread; under reduced motion it cuts.

**Given** background imagery on a page,
**When** it spans multiple slots,
**Then** that is permitted — while interactive content never spans a slot, and no card ever occupies more than one sleeve.

**Given** the chrome,
**When** any surface renders,
**Then** chrome never enters a sleeve — the Search bar floats above the binder, outside the page grid.

### Story 4.4: Region Chapters — the Home Binder

As the Collector,
I want the binder dealt into Region chapters, Kanto→Galar, each fronted by its Title card, with every Entry's Slots adjacent,
So that the journey reads in the order it was walked. *(UX-DR6, UX-DR14; FR-035 adjacency)*

**Acceptance Criteria:**

**Given** a charted roster,
**When** the home binder deals,
**Then** Region chapters run Kanto→Galar in order, each opening with a full-page Region Title card — chapter voice in display type, region crest in the throne's triple-ring language, trophy-shelf area present (badges arrive in Epic 5).

**Given** a chapter's spreads,
**When** Entries lay out,
**Then** they follow Pokédex order within the Region via a swappable comparator, and each Entry's Slots sit adjacent, low Rank to high.

**Given** an empty Slot's sleeve,
**When** it renders,
**Then** it shows translucent paper, a dashed inner frame, an open star, the demanded Rank in quiet honey (honey-text ink, ⚫ base rung in ink instead), and the whisper "This sleeve waits."

**Given** an unfillable Slot,
**When** the home spread renders,
**Then** it appears as a normal empty sleeve — no distinct mark; its emptiness is discovered in the details view.

### Story 4.5: The Progress Spread

As the Collector,
I want the first thing after the cover to be my overall journey standing,
So that a returning Collector is re-oriented before anything else. *(FR-030; UX-DR5, UX-DR11; FR-040's display rule)*

**Acceptance Criteria:**

**Given** the cover ritual completes,
**When** the binder opens,
**Then** the first surface is the Progress spread — overall standing before any chapter, in field-guide voice ("Kanto — 12 of 31 sleeved · only Filled counts"), with the per-Region shape of the journey visible.

**Given** the Progress meter chrome,
**When** it renders,
**Then** it is a bordered track with plant-green striped fill, its scope follows the active filter (overall at home), and it counts Filled only — Chasing never moves it.

**Given** progress values,
**When** they are computed,
**Then** they derive on read from roster and chase state via the rank engine — never cached (AD-2); with nothing filled yet, honest zeros in the same quiet register.

**Given** the upstream layout gap (progress-spread detail undecided),
**When** this story is implemented,
**Then** the layout stays within the card-frame grid and spine rules, and the chosen composition is noted for the UX spine to ratify.

### Story 4.6: Slot Details — the Soul and the Story

As the Collector,
I want to click any sleeve and land on that Slot's own page — its facts, its rung ladder, and the story that earned it,
So that Charizard being Hyper Rare comes with the six reasons. *(FR-032, FR-033, FR-034, FR-035; UX-DR7, UX-DR16, UX-DR17; AD-10)*

**Acceptance Criteria:**

**Given** any sleeve on any spread, filled or empty,
**When** I click it,
**Then** the binder collapses to a single centered 3×3 page scoped to that Slot — row 1 the soul (chase data · the Pokémon alive · facts, including the Entry's Rank and the Stars that earned it), row 2 reserved as a quiet band for the Carousel (Epic 5), row 3 the story.

**Given** row 3,
**When** it renders,
**Then** it shows the Milestone attributed to this rung — type, explainer paragraph, Citation passage, and a working link that opens the source — and when several records of that type exist, the row flips through all of them.

**Given** the rank engine,
**When** rung attribution is needed,
**Then** it exists as pure, unit-tested derivation in `@tcgourney/rank-engine`: the k-th rung attributes to the k-th earned Milestone type in canonical order (opponent, teammate, encounter, bond, glory, loyal) — no attribution logic in UI code (AD-1, AD-10).

**Given** the Rung ladder docked at the page edge (Variant A),
**When** it renders,
**Then** it shows one rung per Slot of this Entry, low→high — filled solid espresso, open dashed, current with an ember ring — clicking a rung flips to that Slot's page, and the ladder brightens as the pointer reaches the page.

**Given** row Hover HUDs,
**When** the pointer rests on a row,
**Then** a dark espresso strip docks at the row's top edge with back-to-spread and previous/next-slot controls — invisible until hover.

**Given** the collection service's API surface,
**When** it is inspected,
**Then** no endpoint mutates roster data — the App's read-only stance is structural (FR-032, AD-3).

### Story 4.7: Search, Filters, and the Re-Deal

As the Collector,
I want one Search bar and its chips as the only navigation, re-dealing the binder rather than listing results,
So that travel never leaves the binder metaphor. *(FR-031; UX-DR8, UX-DR9, UX-DR10; UX-DR22 partial)*

**Acceptance Criteria:**

**Given** the Search bar floating above the binder,
**When** I enter a name, Region, Milestone, Rank, or `status:chasing`,
**Then** the binder re-deals into a temporary binder fronted by the matching Title card — same spreads, same 3×3 rules — never a dropdown list of links,
**And** `/` focuses the Search bar from anywhere in the open binder.

**Given** the required filter categories,
**When** I filter by Region, by Milestone, or by Rank,
**Then** each re-deals correctly (FR-031's required set).

**Given** filter chips,
**When** one is clicked,
**Then** it applies in one click with the active chip in ember; clearing re-deals back to the home binder; The Hunt exists as a chip (its populated behavior arrives with Epic 5 — before any chase exists it re-deals to the empty-Hunt page).

**Given** a query nothing answers,
**When** the re-deal completes,
**Then** a quiet Title card page renders inside the binder — "Nothing in the binder answers that." — card frames throughout, no system chrome.

**Given** the whole app,
**When** any surface renders,
**Then** there is no TOC, no tabs, no sidebar — page-flips plus search/filter are all the travel there is.

### Story 4.8: The Errata Slip

As the Collector,
I want the binder to notice when the chronicle changed since my last visit and tell me quietly,
So that roster fixes from any writer, in any decade, surface without ever blocking the ritual. *(UX-DR23; AD-9, AD-14)*

**Acceptance Criteria:**

**Given** the collection service stores my last-acknowledged per-entry binder snapshot (species → rank, slots, milestone types — Collector-scoped, never a scalar hash),
**When** the App opens and the freshly computed binder differs,
**Then** the Progress spread carries a paper-register Errata slip: "The chronicle was revised — N entries changed."

**Given** the slip,
**When** I ask to see what moved,
**Then** changed entries are listed with what changed — rank moved, slots appeared or vanished, milestone types changed.

**Given** the diff mechanism,
**When** any roster change occurs — through the Tool or a hand edit in Postgres while the Tool sleeps,
**Then** the slip is still correct, because the diff runs snapshot-vs-computed; the version stamp is only the cheap "something moved" signal.

**Given** I acknowledge the slip,
**When** I next open the App,
**Then** no slip appears until the roster changes again.

**Given** any roster change,
**When** the App opens,
**Then** the new roster is adopted immediately, the opening ritual is never blocked, and the App never silently serves a stale roster,
**And** the errata flow is where orphaned chase rows will surface when they exist (AD-4) — never auto-deleted.

### Story 4.9: The Accessibility Floor and the Field-Guide Voice

As the Collector,
I want the binder to honor reduced motion, keyboard travel, contrast, and the field-guide register everywhere,
So that the world stays warm, legible, and operable — even with the rituals off. *(UX-DR22, UX-DR25, UX-DR26, UX-DR27 baseline)*

**Acceptance Criteria:**

**Given** `prefers-reduced-motion`,
**When** any ritual built so far plays — cover open, page flips —
**Then** it renders as a cut, verified for each.

**Given** keyboard-only use,
**When** I traverse the open binder,
**Then** every interactive element is reachable and operable, tab order follows reading order, and the ember focus ring is always visible.

**Given** the contrast rules,
**When** any surface is audited,
**Then** reading text is always ink on paper (or chrome-ink-night on night chrome), honey text uses honey-text never raw honey, and ember is always accompanied by shape — never the only signal.

**Given** the binder cannot load,
**When** the app opens,
**Then** a Title card inside the binder metaphor reads "The binder couldn't be opened." — same quiet register, no system chrome.

**Given** card art is unavailable anywhere a card renders,
**When** the frame draws,
**Then** it degrades to a text-only card (name, set, Rarity) inside the same frame — the baseline for UX-DR27, with the visual treatment noted as a flagged gap.

**Given** all microcopy across Epic 4 surfaces,
**When** reviewed against the EXPERIENCE voice table,
**Then** it reads as the warm field-guide storyteller — quiet complete sentences, no exclamation marks, no SaaS-speak.

## Epic 5: The Chase — Choosing, Hunting, Sleeving

The Collector can browse a Slot's era-chaptered Carousel shortlist, choose a Card (Chasing, with its Ghost on the spread), work The Hunt, perform the sleeving ritual to mark a Slot Filled, un-fill without shame, watch Filled-only progress tick, and earn region × milestone badges on trophy shelves. Chase state lands at `(species, rung)`, Collector-scoped (AD-4, AD-14); `collection_chase` is created in 5.2 and the fill join table in 5.3 — each story creates only what it needs.

### Story 5.1: Browse the Shortlist — the Carousel

As the Collector,
I want a Slot's eligible Cards presented in a three-sleeve Carousel flowing in era chapters,
So that choosing is a browse through real printings, not a database query. *(FR-036; UX-DR12 browsing; UX-DR22's no-candidates state)*

**Acceptance Criteria:**

**Given** the details page of an empty Slot,
**When** row 2 renders,
**Then** the Carousel replaces the reserved band: a strict three-sleeve window (never five), center card taller and dominant, side cards receding, chunky chrome rotate buttons at the edges.

**Given** the shortlist,
**When** it loads,
**Then** it is every eligible Card for this (species, rung) from the Epic 3 eligibility query — spanning sets and eras, each printing its own candidate — rendered semi-transparent (not yet real) and flowing in era chapters (Base era → EX → Sun & Moon → SV…).

**Given** the Carousel row's Hover HUD,
**When** the pointer rests on the row,
**Then** era chips appear and jump straight to that era's chapter — the binder's chapter logic in miniature.

**Given** rotation,
**When** I turn the window,
**Then** cards rotate into place, scrollability is conveyed by visual cues without widening the window, and reduced motion cuts.

**Given** a Slot with zero eligible Cards,
**When** the row renders,
**Then** it reads "No card was ever printed for this rung." — history, not a bug — and nothing about the sleeve forecloses a future N-for-one equivalence fill.

### Story 5.2: Choose a Card — the Slot Turns Chasing

As the Collector,
I want to choose a specific candidate and have the Slot remember it as Chasing,
So that the decision is made at the desk and the hunting can happen elsewhere. *(FR-037; UX-DR13; UX-DR19's free swap; AD-4, AD-14)*

**Acceptance Criteria:**

**Given** the Carousel,
**When** I select a candidate,
**Then** it highlights and the Slot becomes Chasing with that specific Card recorded — persisted in `collection_chase` keyed by (species, rung), Collector-scoped, with the chosen date; the table is created by this story with only the columns it needs.

**Given** the home spread,
**When** a Chasing slot renders,
**Then** the Ghost card sits translucent in its sleeve — dashed ember frame, art at 55% opacity, pulsing ember CHASING chip (pulse honors reduced motion) — and the Rank chip takes ember treatment only while Chasing.

**Given** a Chasing slot,
**When** I pick a different candidate,
**Then** the ghost swaps with no confirmation; and clearing the choice returns the sleeve to waiting with no confirmation — changing your mind is part of the fun.

**Given** the choice persists,
**When** I close and reopen the App,
**Then** the Chasing state and chosen Card remain.

**Given** progress,
**When** a chase is set or swapped,
**Then** nothing moves — Chasing never counts (FR-040).

### Story 5.3: The Sleeving Ritual — Mark It Filled

As the Collector,
I want the Sleeve button to perform the sleeving ritual and record the fill,
So that the climax of the chase is honored, and the record says exactly which card from which set. *(FR-038, FR-039; UX-DR18; AD-4)*

**Acceptance Criteria:**

**Given** a Chasing slot's details page,
**When** it renders,
**Then** the Sleeve button waits in ember — present only when a chase target is set.

**Given** I trigger it,
**When** the ritual plays,
**Then** everything but the card dims under a veil → light falls from above in a single shaft → the card slides into the sleeve → a satisfying glow and the sleeving sound → it becomes the page's enthroned card; skippable-fast, and reduced motion keeps the meaning through a cut (dim → placed → done).

**Given** the action's language,
**When** the ritual is offered,
**Then** it affirms FR-039: Filled means the physical card is sleeved in the real binder — not bought, not arrived.

**Given** the fill commits,
**When** it is stored,
**Then** it records the specific Card from the specific set in a slot → N cards join table (created by this story; the UI enforces exactly one card until equivalence rules exist), Collector-scoped.

**Given** the fill lands,
**When** the home spread and Progress meter refresh,
**Then** the real card shows in its sleeve and progress ticks forward — Filled counts, and only Filled (FR-040).

### Story 5.4: The Throne and Its Motif Court

As the Collector,
I want a Filled slot's page to enthrone the sleeved card among its Rank's motif cards,
So that a filled sleeve reads as quiet pride, not a checked box. *(UX-DR15)*

**Acceptance Criteria:**

**Given** a Filled slot's details page,
**When** row 2 renders,
**Then** the sleeved card's clear image sits enthroned in the Carousel's center — triple ring (ink–cream–honey), raised on a pedestal glow, FILLED · SLEEVED chip in espresso.

**Given** the flanking sleeves,
**When** they render,
**Then** the correct Rank's Motif cards accompany the throne — non-interactive, one sleeve each, carrying that Rank's decorative element set.

**Given** the seven Ranks,
**When** motif assets are built,
**Then** all seven designed motif-card sets exist, one per Rank (e.g. Common = quiet dot lattice / plain weave).

### Story 5.5: Un-Fill — the Binder Reflects Reality

As the Collector,
I want to un-fill a slot with one confirmation and no ceremony,
So that the binder always tells the truth, and being wrong costs nothing but the correction. *(UX-DR19)*

**Acceptance Criteria:**

**Given** a Filled slot's details page,
**When** I un-fill,
**Then** exactly one confirmation is asked; on confirm the fill record is removed and the sleeve returns to its prior state — Chasing if a chase target remains recorded, otherwise empty.

**Given** the un-fill completes,
**When** the binder refreshes,
**Then** there is no celebration and no shame — the same quiet register — and progress adjusts downward honestly.

**Given** the rituals,
**When** un-fill runs,
**Then** nothing plays — un-fill is quiet by design.

### Story 5.6: The Hunt — the Binder Re-Dealt to Its Ghosts

As the Collector,
I want The Hunt to re-deal the binder to every Chasing slot,
So that the weeks between choosing and acquiring have a hunting list — inside the same binder, never another app. *(FR-041)*

**Acceptance Criteria:**

**Given** Chasing slots exist,
**When** I click The Hunt chip or search `status:chasing`,
**Then** the binder re-deals into the Chasing binder fronted by the Hunt Title card — same spreads, same 3×3 rules, only ghosts — showing every currently Chasing slot with its chosen Card and set.

**Given** no chases underway,
**When** The Hunt is invoked,
**Then** the Title card reads "No chases underway. The binder rests."

**Given** the re-dealt Hunt,
**When** I click a ghost's sleeve,
**Then** that slot's details open, where I can swap the chase or sleeve the card,
**And** clearing the filter re-deals home with the ghosts sitting in their sleeves.

### Story 5.7: Foley and the Audio Toggle

As the Collector,
I want the binder's full quiet foley set under one explicit audio preference,
So that sound is part of the design — and silence loses nothing. *(UX-DR20)*

**Acceptance Criteria:**

**Given** the foley set,
**When** interactions play,
**Then** the page-flip whisper, cover open/close, and soft chip taps accompany their actions — all understated — and the sleeving sound is the loud centerpiece.

**Given** one explicit audio toggle in the chrome,
**When** sound is off,
**Then** the entire set is silent, every ritual completes without loss of state, and the preference persists across sessions.

**Given** the sound design,
**When** audited,
**Then** no audio plays outside the named rituals and interactions — no gratuitous sound.

### Story 5.8: Badges on the Trophy Shelf

As the Collector,
I want region × milestone-type badges earned by filling and displayed on each Region's Title card,
So that summits are recorded where the journey lives — flipped to, not popped up. *(UX-DR24; AD-2, AD-10)*

**Acceptance Criteria:**

**Given** badge law,
**When** it is implemented,
**Then** badge computation lives in `@tcgourney/rank-engine` as pure, unit-tested derivation: for (region × milestone type), the badge is earned when every Slot whose rung attributes to that type — with the Region taken from the earliest record of the attributed type per AD-10 — is Filled; the generalized rule is verified against the engine's attribution model, and the worked example holds: filling all of Kanto's ⚫ base slots earns Kanto's "The Catch."

**Given** a Region Title card,
**When** its shelf renders,
**Then** earned badges appear as coins — radial honey face, espresso 2px ring, cream inner ring, embossed espresso glyph, soft breathing halo (still under reduced motion) — and unearned ones as blind-debossed silhouettes with dashed sleeve-rim rings and no halo; ember never appears on badges; glyphs are placeholder pending badge artwork.

**Given** a sleeving completes a region × type set,
**When** the ritual ends,
**Then** the badge lands on its shelf as the quiet echo — no toast, no fanfare — waiting to be flipped to.

**Given** badge state,
**When** it is read,
**Then** it is derived on read, never stored (AD-2).
