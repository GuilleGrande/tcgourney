---
id: SPEC-tcgourney
companions:
  - rarity-map-rules.md
  - card-catalog-sourcing.md
  - feasibility-method.md
  - ../../../CONTEXT.md
  - ../../../ashs-journey-ruleset.md
  - ../../planning-artifacts/ux-designs/ux-tcgourney-2026-07-31/DESIGN.md
  - ../../planning-artifacts/ux-designs/ux-tcgourney-2026-07-31/EXPERIENCE.md
  - ../../planning-artifacts/architecture/architecture-tcgourney-2026-08-01/ARCHITECTURE-SPINE.md
sources:
  - ../../planning-artifacts/prds/prd-tcgourney-2026-07-26/prd.md
  - ../../planning-artifacts/prds/prd-tcgourney-2026-07-26/addendum.md
  - ../../planning-artifacts/briefs/brief-tcgourney-2026-07-25/brief.md
  - ../../planning-artifacts/briefs/brief-tcgourney-2026-07-25/addendum.md
---

> **Canonical contract.** This SPEC and the files in `companions:` are the complete, preservation-validated contract for what to build, test, and validate. Source documents listed in frontmatter are for traceability only — consult them only if you need narrative rationale or prose color this contract intentionally omits.

# Ash's Journey

## Why

A vision to realize, opened by a pain. Modern Pokémon collecting has no finish line — tens of thousands of cards, boundaries set by print runs, nothing marking which cards *mean* something. Ash Ketchum's story is over, so its cast is final and knowable, and that finished story can be the structure the hobby lacks: every Pokémon that mattered earns a place in one Binder, and the rarity each place demands is set by how much of the story that Pokémon lived through. The Collector — sole user, both author of the roster and its only reader — grew up on Kanto and Johto and will not watch twenty-six seasons; charting the roster *is* how he finds out how far Ash actually went. Discovery, not data entry. Two builds share the work: a Charting Tool used heavily once then mothballed, and a Collection App that runs forever. The domain vocabulary in `CONTEXT.md` is authoritative; the Milestone mechanics live in `ashs-journey-ruleset.md` (as amended below and in `rarity-map-rules.md`).

## Capabilities

### Part A — the Charting Tool

- **CAP-1**
  - **intent:** Before ingesting, the tool proposes the set of Bulbapedia pages it intends to read — each with its title, URL, and the Milestone types it is expected to yield — and the Collector approves or rejects each page.
  - **success:** No page is ever ingested without prior approval; the recorded manifest answers what was read and what was declined.
- **CAP-2**
  - **intent:** An LLM reads approved pages and proposes Milestones spanning all seven types, each carrying a drafted explainer of at most one paragraph, its Region, episode, and Appearance, and a Citation.
  - **success:** A Proposal without a Citation cannot be created; every generated Proposal presents its explainer, Region, episode, and Appearance for review.
- **CAP-3**
  - **intent:** The Collector reviews Proposals in a queue ordered by Milestone type — evidence quality tracks type: Bulbapedia has structured lists for Catch, Teammate, Opponent, and Glory, only prose for Bond and Encounter — with the Citation passage and a working link as the primary content, accepting, rejecting, or editing the explainer before accepting.
  - **success:** The full queue is clearable keyboard-only; closing and reopening the tool resumes at the same position with progress intact.
- **CAP-4**
  - **intent:** Bulk-accept clears an unambiguous category wholesale, operating within a single Milestone type.
  - **success:** All pending Proposals of the selected type are accepted in one action. Every one of the seven types qualifies — the Collector's ruling, overriding the PRD's expectation that Bond and Encounter never would; whether to use it on a given pass stays his per-session call.
- **CAP-5**
  - **intent:** Verdicts are sticky against re-ingestion: re-reading a Source never resurrects a rejected Proposal; it only flags Sources whose content changed.
  - **success:** Re-ingesting a Source holding a rejected Proposal yields zero new Proposals; a content change (detected via stored revision id + content hash, AD-8) flags the Source.
- **CAP-6**
  - **intent:** When a Loyal Verdict is accepted but the Entry's Milestone Regions do not span beyond its original Region, the tool warns without blocking — derived-as-a-check, not derived-as-truth.
  - **success:** The warning fires on the contradicting accept and the Collector can proceed anyway.
- **CAP-7**
  - **intent:** The Collector can create a Milestone manually with a non-Bulbapedia Citation — a URL, a timestamp, his own words — the path for the Encounters phase, which runs last as a separate exploratory pass once Bulbapedia is exhausted.
  - **success:** A manual Milestone lands in the roster and displays in the App exactly like an accepted Proposal, citation included.
- **CAP-8**
  - **intent:** Any settled Verdict can be revised at any time, including after charting is declared done.
  - **success:** A revision triggers a re-export and advances the roster version stamp — the App can never silently serve a stale roster.
- **CAP-9**
  - **intent:** A command exports the complete roster — every Entry, its Milestones, and per Milestone its Citation, Region, episode, Appearance, and explainer — to JSON committed to the repository.
  - **success:** The export carries a version stamp; a re-export is visible in git history, never silent.
- **CAP-10**
  - **intent:** The tool reports progress per Milestone type and charting-done status against all three gate conditions: every chasable Pokémon identified, ranked, and its Slots identified.
  - **success:** All three answers derive from Milestone data alone — no card catalog required.

### Cross-cutting — cards, the Map, fillability

- **CAP-11**
  - **intent:** The card catalog is ingested from a static bulk source on a deliberate schedule (sourcing in `card-catalog-sourcing.md`), never fetched live in a request path.
  - **success:** Source Rarity values absent from the Map are reported at ingestion and their Cards held out of eligibility — nothing defaults silently into the Binder.
- **CAP-12**
  - **intent:** The Rarity Translation Map defines each of the seven Ranks as a group of source Rarities, with the Scarlet & Violet (2023+) classification as the canonical reference (full ruleset in `rarity-map-rules.md`).
  - **success:** The Map is editable and versioned; changing it re-derives eligible Cards without touching any Verdict.
- **CAP-13**
  - **intent:** A Card is eligible for a Slot only if its printed Rarity maps cleanly onto that Slot's Rank; Rarities that do not map cleanly are excluded outright — no review bucket, no fallback into the Binder.
  - **success:** The named exclusions (`Promo`, `MEGA_ATTACK_RARE`) never appear in any shortlist.
- **CAP-14**
  - **intent:** The system detects and surfaces species × Rank combinations with zero eligible Cards.
  - **success:** The unfillable list — demanded Slots (engine output) minus catalog eligibility — is computable on demand and is the exact worklist for authoring equivalence rules.
- **CAP-15**
  - **intent:** Where CAP-14 identifies an unfillable Slot, an equivalence rule can be defined that satisfies it using N Cards of a lower Rank — the ladder bends, the chase does not break.
  - **success:** The data model permits slot → N cards today (fill join table, AD-4) while the UI enforces one; the mechanism itself is deferred to OQ-1.

### Part B — the Collection App

- **CAP-16**
  - **intent:** Opening the Binder shows overall progress first, filterable by Region, by Milestone, and by Rank.
  - **success:** Only Filled counts toward progress — Chasing never moves a meter — and each interim milestone (every Entry holding one Card, every ⚫ base Slot filled, a Region at a time) is expressible as a progress view. Pre-approved candidate filters — by Evolution Line, by card era, by status `filled`/`empty` — may be added opportunistically without a new decision; only Region, Milestone, and Rank are required.
- **CAP-17**
  - **intent:** The App treats the roster as read-only, exposing no path to change a Milestone, a Citation, or an explainer.
  - **success:** Structural, not policed: no roster write path exists outside the charting service (AD-3).
- **CAP-18**
  - **intent:** An Entry shows its Rank and the Stars that earned it, every Milestone it holds with its explainer paragraph, its Citation, and a working source link, and its Slots low to high.
  - **success:** Charizard is Hyper Rare and the App can show the six reasons, each with a working link.
- **CAP-19**
  - **intent:** A Slot presents every eligible Card across sets and eras — a shortlist, not a single answer; the Collector chooses one, setting the Slot to Chasing (persisted), and later marks it Filled, recorded as the specific Card from the specific set.
  - **success:** Filled is recorded only when the Card is physically sleeved in the binder — not when bought, not when it arrives — and a chase choice survives restarts.
- **CAP-20**
  - **intent:** The App lists every Slot currently Chasing — the Collector's hunting list, what makes the weeks between choosing and acquiring useful.
  - **success:** Every Chasing Slot and only Chasing Slots appear, reachable in one action from the open Binder (the Hunt is a filter, not a separate surface — `EXPERIENCE.md`).
- **CAP-21**
  - **intent:** The App adopts roster revisions immediately and reports what changed — "the chronicle was revised, N entries changed" — by diffing its own last-acknowledged snapshot against the freshly derived binder (AD-9).
  - **success:** A roster edit from any writer, Tool or hand-edit in Postgres, produces a correct errata slip at next open; the opening ritual is never blocked.
- **CAP-22**
  - **intent:** Card art renders wherever Cards appear — shortlists, ghosts, enthroned cards — served exclusively by the catalog service from its local disk cache (AD-7), never fetched by the frontend from a third party.
  - **success:** Previously viewed art renders with the network down; missing art degrades gracefully to text-only candidates; public display of art remains gated on OQ-3.

## Constraints

- **Personal use only — legal, not preference.** Bulbapedia text is CC BY-NC-SA 2.5; card art is © The Pokémon Company, whose terms grant editorial/informational use only. No accounts, no auth, no multi-tenancy, no deployment target (ADR-0004, AD-13).
- **Two builds, one seam.** The Charting Tool is the roster's exclusive writer and is entirely card-agnostic; the Collection App never writes the roster and never knows Proposals or Verdicts. Corrections flow one way: Tool writes → roster exports → App reads. The Tool is mothballed, not retired.
- **Derived is never stored.** The database persists authored facts only — Milestones, Verdicts, Citations, chase state, the Map. Stars, Rank, Slots, rung attribution, badges, and progress are recomputed on every read (ADR-0003, AD-2).
- **The rank engine stays pure.** No I/O, no async, no framework coupling, no dependencies; new derivation extends the package, never a service (AD-1).
- **No live third-party API in any request path.** Card data is ingested ahead of time; the live source measured 40–58% server errors.
- **The Collector decides.** Sources propose, never rule — for all seven Milestone types, including Loyal.
- **Ownership state is Collector-scoped** even though exactly one Collector exists; roster and catalog stay global (AD-14).
- **Throughput is hard.** Several hundred Entries, upwards of seven hundred explainer paragraphs; keyboard-driven review, bulk-accept, resumability, and batch LLM drafting are what make charting finishable rather than abandoned.
- **Provenance survives the freeze and is user-facing.** Citation text and source link are stored per Milestone, not per Entry, and are displayed to the reader.
- **Finished by construction.** No update pipeline, no change feed, no re-sync mechanism — the story is over; their absence is a domain property.
- **The written contracts bind.** `CONTEXT.md` vocabulary is authoritative in code and schema; the architecture spine's AD-1..AD-14 (stack included — Encore.ts + Postgres is deliberate, do not "fix" to SQLite) binds all implementation; the UX spines govern the Collection App's look, rituals, and voice. Charting Tool UX is deferred to a later utilitarian pass.

## Non-goals

- **Pricing, market value, buying assistance** — this is a chase, not a portfolio.
- **Card-first lookup** ("does this card in my hand fit anywhere?") — the App is a desk tool used before and after the hunt; being useless at the point of purchase is an accepted forfeit.
- **Video ingestion or transcription** — off-wiki research happens conversationally outside the tool; only rulings and citations land in it.
- **Confidence scoring of Proposals** — by-type ordering removes the need.
- **Proposal or Verdict review inside the Collection App** — the largest scope cut in the project.
- **Anything that *automatically* re-opens a settled Verdict** — the Collector may always revise; re-ingestion may not.
- **Chore mechanics** — no streaks, reminders, or backlog framing; no corporate-dashboard register (UX hard wall).
- **Serving the Traveler** — deferred, gated on the licensing question (OQ-3).

## Success signal

Charting closes: the gate report (CAP-10) shows every chasable Pokémon identified, ranked, and its Slots identified — nothing downstream is real until it does. Then the Saturday Session (`EXPERIENCE.md` Flow 1) runs end-to-end: open the Binder, read overall progress, drill to an Entry and its reasons, choose from a Slot's shortlist, watch it persist as Chasing, and — days later — sleeve the card and see the Region meter tick. The lasting signal: the Collector opens the Binder instead of drifting.

## Open Questions

- **OQ-1 — Equivalence-rule mechanism.** Deferred by decision until CAP-14 reveals the actual unfillable set. Invariant settled (every Slot fillable); mechanism open. Guardrail from the PRD: substitution rules must not become so common that Rank stops meaning anything.
- **OQ-3 — Publishing and licensing.** Parked by explicit decision; needs a real answer before any hosting work, none before then.
- **OQ-5 — Loyal's three named examples.** Charizard's stated reason provably fails strict geography (the Battle Frontier is in Kanto); if Pidgeot and Primeape also fail, the geographic definition is likely wrong. Charting settles it.
- **OQ-7 — UX spine gaps.** Four explicit gaps carried in `DESIGN.md`/`EXPERIENCE.md`: brand typeface (system stack stands meanwhile), card-art-unavailable visual treatment, a fuller keyboard model, and the progress spread's detailed layout. Decide during the relevant stories.
