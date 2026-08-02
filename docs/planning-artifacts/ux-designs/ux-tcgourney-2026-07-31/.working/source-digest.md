# Ash's Journey — UX Digest (extracted from brief + PRD, 2026-07-31)

Sources: `docs/planning-artifacts/briefs/brief-tcgourney-2026-07-25/` (brief.md + addendum.md), `docs/planning-artifacts/prds/prd-tcgourney-2026-07-26/` (prd.md + addendum.md). PRD is newer and wins on conflict. `CONTEXT.md` at repo root is authoritative for domain vocabulary; `ashs-journey-ruleset.md` and ADRs 0001–0004 referenced but not read.

## 1. Product
**Ash's Journey** turns the finished Pokémon anime (26 seasons, Kanto→Galar) into a finite, ranked Pokémon TCG collection. Every Pokémon that mattered earns a place in a single **Binder**; the rarity each place demands is set by how much of the story that Pokémon lived through. Core value: "a chase with **edges**" — a defined list, defined difficulty per entry, a defined end — plus auditable provenance (every Rank carries citations) and discovery (the Collector learns the story he never watched). It is **two builds**: a Charting Tool (produces the roster, used heavily once then mothballed) and a Collection App (chases cards, runs forever).

## 2. Users
- **The Collector** — primary, and for now the only one. Grew up on Kanto/Johto, refuses to watch 26 seasons, wants a chase with meaning and boundaries. Both author and only reader of the roster.
- **The Traveler** — secondary, deferred, gated on licensing. "Would rather walk a mapped trail than blaze one." No feedback loop wanted; they tag along, they do not contribute.

## 3. Scope (UX-relevant FRs)

**Collection App (Part B)**
- FR-030 Binder opens showing **overall progress first**
- FR-031 Progress **filterable by Region, Milestone, Rank** (further categories = Open Item #7)
- FR-032 Roster is **read-only** in the App — no path to edit Milestone/Citation/explainer
- FR-033 Entry shows **Rank** + the Stars that earned it
- FR-034 Entry shows **each Milestone** with explainer paragraph, Citation, working source link
- FR-035 Entry shows its **Slots, low Rank to high**
- FR-036 Slot shows **every eligible Card** — a shortlist, not a single answer, spanning sets/eras
- FR-037 Choosing a specific Card sets Slot to **Chasing**; choice persists
- FR-038 Mark Slot **Filled**, recording the specific Card from the specific set
- FR-039 Filled **only when physically sleeved** — not bought, not arrived
- FR-040 **Only Filled counts toward progress**; Chasing does not
- FR-041 **The Hunt** — list every Slot currently Chasing (the hunting list)

**Charting Tool (Part A)** — separate surface, throughput-critical: source-scoping approve/reject of proposed Bulbapedia pages (FR-001–003, each page shows title, URL, expected Milestone types); Proposal review queue **ordered by Milestone type** (FR-008); Citation passage + working link is the **primary content** of review (FR-009); accept/reject/edit-explainer (FR-010); **bulk-accept within a Milestone type** (FR-011, blocked on Open Item #2); **keyboard-driven end to end** (FR-012); **resumable across sessions**, position + progress persist (FR-013); non-blocking warning on Loyal geography (FR-015); manual Milestone creation with URL/timestamp/own words (FR-016); progress **per Milestone type** (FR-021); charting-done status against three conditions (FR-022).

**Explicitly out of scope:** Pricing, market value, buying assistance. **Card-first lookup** ("does this card in my hand fit anywhere?") — the App is a desk tool used before and after the hunt, not during it; explicitly forfeits point-of-purchase use. Proposal/Verdict review inside the Collection App. Video ingestion/transcription. Confidence scoring of Proposals. Accounts, auth, multi-tenancy, deployment, publishing. Anything that *automatically* re-opens a settled Verdict.

## 4. Named surfaces/flows
- **The Binder** (§8.1) — "front page," overall progress, sliceable by Region
- **The Entry** (§8.2)
- **The Slot** (§8.3)
- **The Hunt** (§8.4)
- **UJ-1 — The Saturday Session**: opens Binder → sees overall standing → slices by Region → drops into Kanto → finds Bulbasaur (Ultra Rare, 4 Slots, 3 filled) → reads Milestone explainers → opens empty Ultra Rare Slot → gets shortlist → chooses → Slot becomes **Chasing** → leaves (hunting happens elsewhere) → **eleven days later** sleeves the card, marks **Filled** → Kanto ticks forward.
- Charting sub-flows: **Source Scoping**, **Proposal Generation**, **Verdict Review**, **Evidence Beyond Bulbapedia** (Encounters run last as a separate exploratory phase), **Correction**, **The Roster Artifact**, **The Completion Gate**.
- Slot states named: **Chasing**, **Filled** (implicitly empty/unfilled).
- Interim progress views FR-031 must express: every Entry holding at least one Card; every **⚫ base Slot** filled; a **Region completed at a time**.

## 5. Form factor & platform
- **Single-user, local, not deployed.** No accounts, no auth, no multi-tenancy — a *legal* constraint (ADR-0004), not a preference.
- **Encore + Postgres** (ADR-0002) as backend; Postgres is source of truth; roster exports to **JSON committed to the repo** (FR-019) with a **version stamp** (FR-020).
- Card data from the **Pokémon TCG API** dataset, but **ingested from a static bulk dump** (github.com/PokemonTCG/pokemon-tcg-data), **never live in a request path** — live `api.pokemontcg.io/v2` measured at ~40–58% HTTP 500. Fallback: TCGdex.
- Rank engine is a pure package (`packages/rank-engine`), no I/O/async/framework coupling.
- Keyboard-driven review is a hard NFR for the Charting Tool → desktop-first, keyboard-centric.
- No frontend exists yet (brief addendum: "no database, no frontend, and no card catalog"; `GET /binder` serves a computed Binder from five hand-authored seed evolution lines).
- The four documents do **not** name Vite or any frontend framework.

## 6. Domain vocabulary
- **Binder** — the single container for the whole collection; the product's home surface.
- **Entry** — one Pokémon's place in the Binder.
- **Milestone** — one of **seven** types: **the Catch**, plus **Opponent, Teammate, Encounter, Bond, Glory, Loyal**. Records what a Pokémon lived through. Each carries a Citation, Region, episode, Appearance, and a ≤1-paragraph **explainer**.
- **Star** — granted by each Milestone; Stars flow forward up the evolution line and aggregate across every appearance.
- **Rank** — set by Star count; **seven Ranks**, from Common/Uncommon up to **Hyper Rare**. Top tiers named: Ultra Rare, Illustration Rare, Special Illustration Rare, Hyper Rare. Difficulty concentrates at the ceiling, not in the count.
- **Slot** — a rung the Rank expands into; one per rung of the ladder climbed. Six Stars + Caught = seven Slots. **⚫ base Slot** = the Slot granted by the Catch. Rank and Slots are **derived, never stored** (ADR-0003).
- **Card / eligible Card** — a real printed card whose Rarity maps cleanly onto a Slot's Rank. Reprints are separate records per printing → one species yields many candidates per Slot.
- **Rarity Translation Map** — a third artifact with its own ruleset; no canonical version exists anywhere. Lives in the DB, editable and versioned. Scarlet & Violet (2023+) classification is canonical. **Excluded outright**: `Promo`, `MEGA_ATTACK_RARE`.
- **Equivalence rule** — where no eligible Card was ever printed for a species×Rank, N Cards of a lower Rank may satisfy the Slot (e.g. three Special Illustration Rares for one Hyper Rare). Mechanism deferred; **breaks the one-Slot-one-Card assumption** in the rank engine and in `SlotView`.
- **Proposal / Verdict** — Charting Tool only; LLM proposes, Collector rules. Verdicts are **sticky against re-ingestion**, never against the Collector.
- **Citation** — passage + working source URL, stored **per Milestone**, and **displayed** as a user-facing feature: *"a neat addition for the final product so it could actually be verified by anyone who is curious enough."*
- **Chasing / Filled** — Slot states. **Filled = physically sleeved.**
- **Roster** — the frozen, fully-cited contract between the two builds. "Frozen" = **authoritative and app-read-only**, not unchangeable.
- **Chase / The Hunt** — the act of acquiring; happens *outside* the app.
- **Region** — Kanto through Galar; the Collector's primary mental slicing axis.
- **Appearance** — recorded per Milestone alongside Region and episode.

## 7. Brand/tone signals
- Vision: *"A single binder that reads as a chronicle. Open it and the whole arc is there in physical form — a Common Caterpie near the front, a Hyper Rare Pikachu at the back, and the rarity of every card in between telling you exactly how much that Pokémon meant to the story. Not a set. Not an investment. A retelling."*
- **Chronicle over checklist**: *"The binder becomes a record of decisions, not a checkbox list."* Success goal: "The chronicle reads as a chronicle."
- **Nostalgia is the doorway. Discovery is what is on the other side.**
- Auditability as identity: a stranger can ask *"why is Meowth in here at all?"* and be shown the answer, with a link.
- Anti-portfolio: no pricing, no market value — *"this is a chase, not a portfolio."*
- Trail/journey metaphor throughout: "mapped trail," "blaze one," "trail map anyone can pick up," "The Trail Ahead," "The Outfitter's Note" (ruleset section names).
- Emotional beat in UJ-1: *"The modern one has better art; the older one means more. **He chooses.**"* — choosing from the shortlist is explicitly "part of the fun."
- One typographic asset appears in both docs: the **⚫** glyph for the base Slot.
- No color palette, typography, or explicit visual direction is specified anywhere in these four documents.

## 8. Constraints & risks for UX
- **No auth, no accounts, no login screens.** Single-user, local. But **do not bake single-user assumptions into expensive places** — ownership state (which Card fills which Slot, which Slots are Chasing) belongs to *a* Collector, not global scope. Roster/Milestones/Citations are shared and immutable.
- **Card imagery is not guaranteed** (Open Item #4). Strongly wanted — *"would make the whole thing sing"* — but depends on third-party art; unblocked for **local** use, gated on licensing for anything public. **UX must degrade gracefully to text-only card candidates.**
- **Shortlists can be long**: reprints are separate records per printing, "which suits the shortlist model but inflates card counts." Needs filtering/sorting affordances the docs do not specify.
- **Cards held out of eligibility** (FR-026) when their source Rarity is absent from the Map — nothing defaults silently in; needs a reporting surface.
- **Unfillable Slots exist** (FR-027) and must be surfaced; equivalence rules mean a Slot may need **N cards**, not one — the UI must not foreclose multi-card fill.
- **Volume**: several hundred Entries, upwards of 700 explainer paragraphs. Charting throughput is a hard NFR — keyboard-first, bulk actions, resumable.
- **No live API in a request path**; data is pre-ingested and refreshed on a deliberate schedule → no real-time card lookups, no live search-as-you-type against the API.
- **The gap between Chasing and Filled is weeks** ("eleven days later") — the app is used in bursts, not daily.
- **Sessions are infrequent** — "hasn't opened it in three weeks"; the front page must re-orient a returning user.
- Counter-metric risk: *"The App does not become a chore with its own backlog."*
- Roster version stamp (FR-018/020) means the App must never silently serve a stale roster.

## 9. Open questions a UX designer would need
From the PRD's own list (§12): (1) equivalence-rule mechanism; (2) which Milestone types qualify for bulk-accept — **blocking FR-011**; (3) publishing/licensing — parked; (4) **card imagery** — wanted, not required; (5) roster persistence — *resolved*; (6) Loyal's three examples (Charizard/Pidgeot/Primeape) under strict geography; (7) **further progress filter categories** beyond Region/Milestone/Rank.

Not covered by the docs at all, and needed for DESIGN.md/EXPERIENCE.md:
- Any visual identity direction — palette, typography, iconography, motion, dark/light.
- Whether Charting Tool and Collection App share a shell/design system or are two distinct UIs.
- How a Slot's shortlist is browsed, sorted, filtered, or searched when it holds many printings.
- How Star/Rank is visually encoded beyond the ⚫ glyph and star counts.
- Whether the Binder metaphor is literal (page-turn/spread layout) or a list/grid.
- Empty, loading, and error states; how "held out of eligibility" and "unfillable Slot" are shown to the Collector.
- Undo/reversal — no FR covers un-marking a Filled or abandoning a Chasing Slot.
- Viewport/responsive expectations (local desktop is implied by keyboard-driven charting, never stated for the App).

## Contradictions (PRD is newer and wins)
1. **"Used once, then retired" → "mothballed, not retired."** The brief puts *"anything that re-opens a settled Verdict"* out of scope; the PRD requires FR-017 (any Verdict revisable at any time). The PRD's out-of-scope line narrows to *"anything that **automatically** re-opens a settled Verdict."*
2. **"Every real printed card, from any set and any era"** (brief §Solution) narrows to *any era, so long as the printed Rarity maps cleanly onto the seven standard tiers* (PRD §6). `Promo` and `MEGA_ATTACK_RARE` are excluded outright.
3. **Bulbapedia as sole admissible evidence.** The brief addendum elevates Bulbapedia to *"sole admissible evidence for every Milestone."* The PRD §5.4 demotes it to *"primary source and first pass"* — FR-016 allows manual, non-Bulbapedia citations.
4. **Charting order.** The ruleset says *"chart the full catch list, region by region."* The PRD charts **by Milestone type** (FR-008). Tension for UX: charting is by-type, but the *Collection App's* primary slice is **by Region** (UJ-1, FR-031).
5. **Charting-done definition.** Brief: *"every region, Kanto to Galar, has been walked and every Entry carries a cited Rank."* PRD §3: *"every chasable Pokémon has been identified, ranked, and its Slots identified."*
6. **Live API.** Brief §Scope: *"Card candidates per Slot, drawn from the Pokémon TCG API via the Rarity Translation Map"* — the PRD (FR-023) forbids live API calls in a request path; the same dataset arrives via static bulk ingest.
7. **One-Slot-one-Card.** Currently assumed in `packages/rank-engine/src/rank-engine.ts` and in `SlotView`; PRD §7 says the data model (and by extension the UI) must not foreclose N-cards-fill-one-Slot.
