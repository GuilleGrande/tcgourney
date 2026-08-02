---
stepsCompleted: [1, 2, 3, 4, 5, 6]
documentsIncluded:
  prd:
    - docs/planning-artifacts/prds/prd-tcgourney-2026-07-26/prd.md
    - docs/planning-artifacts/prds/prd-tcgourney-2026-07-26/addendum.md
  architecture:
    - docs/planning-artifacts/architecture/architecture-tcgourney-2026-08-01/ARCHITECTURE-SPINE.md
    - docs/planning-artifacts/architecture/architecture-tcgourney-2026-08-01/SOLUTION-DESIGN.md
  epics:
    - docs/planning-artifacts/epics.md
  ux:
    - docs/planning-artifacts/ux-designs/ux-tcgourney-2026-07-31/DESIGN.md
    - docs/planning-artifacts/ux-designs/ux-tcgourney-2026-07-31/EXPERIENCE.md
  supporting:
    - docs/planning-artifacts/briefs/brief-tcgourney-2026-07-25/brief.md
    - docs/planning-artifacts/briefs/brief-tcgourney-2026-07-25/addendum.md
    - docs/specs/spec-tcgourney/SPEC.md
    - docs/specs/spec-tcgourney/rarity-map-rules.md
    - docs/specs/spec-tcgourney/card-catalog-sourcing.md
    - docs/specs/spec-tcgourney/feasibility-method.md
---

# Implementation Readiness Assessment Report

**Date:** 2026-08-01
**Project:** tcgourney

## Document Inventory

### PRD
- `prds/prd-tcgourney-2026-07-26/prd.md` (22.9 KB, 2026-08-01) — primary PRD
- `prds/prd-tcgourney-2026-07-26/addendum.md` (5.3 KB, 2026-07-31)
- `prds/prd-tcgourney-2026-07-26/review-rubric.md` (6.9 KB, 2026-07-31) — review artifact, not assessed

### Architecture
- `architecture/architecture-tcgourney-2026-08-01/ARCHITECTURE-SPINE.md` (16.7 KB, 2026-08-01)
- `architecture/architecture-tcgourney-2026-08-01/SOLUTION-DESIGN.md` (11.3 KB, 2026-08-01)
- `architecture/architecture-tcgourney-2026-08-01/reviews/` — 3 review artifacts, not assessed

### Epics & Stories
- `epics.md` (73 KB, 2026-08-01) — single whole document with embedded stories
- No separate story files yet; `docs/implementation-artifacts/` is empty (expected before sprint planning)

### UX Design
- `ux-designs/ux-tcgourney-2026-07-31/DESIGN.md` (16.0 KB, 2026-08-01)
- `ux-designs/ux-tcgourney-2026-07-31/EXPERIENCE.md` (16.5 KB, 2026-08-01)
- `ux-designs/ux-tcgourney-2026-07-31/mockups/` — 4 HTML mockups (visual reference)

### Supporting Context
- `briefs/brief-tcgourney-2026-07-25/brief.md` + `addendum.md` — product brief
- `docs/specs/spec-tcgourney/SPEC.md` + companions (`rarity-map-rules.md`, `card-catalog-sourcing.md`, `feasibility-method.md`) — spec kernel

### Issues
- **Duplicates:** none — each document type exists in exactly one format
- **Missing:** none — all four core document types present

## PRD Analysis

Source: `prd.md` (status: final, updated 2026-08-01) + `addendum.md` (status: final). PRD uses explicit FR-nnn numbering; NFRs are stated in §10 as named bullets and are numbered here for traceability.

### Functional Requirements

**Part A — Charting Tool: Source Scoping (§5.1)**
- FR-001: Before ingesting, the tool proposes the set of Bulbapedia pages it intends to read. Each proposed page presents its title, its URL, and the Milestone types it is expected to yield.
- FR-002: The Collector approves or rejects each proposed page. Only approved pages are ingested.
- FR-003: The approved manifest is recorded, so a later pass shows what was read and what was declined.

**Part A — Proposal Generation (§5.2)**
- FR-004: An LLM reads approved pages and proposes Milestones, spanning all seven types.
- FR-005: Each Proposal carries a drafted explainer of at most one paragraph describing how the Pokémon earned that Milestone. The LLM drafts; the Collector edits or approves.
- FR-006: Each Proposal records the Region, the episode, and the Appearance that justified it.
- FR-007: A Proposal without a Citation cannot be created. Citation is the interface, not supporting metadata.

**Part A — Verdict Review (§5.3)**
- FR-008: The review queue is ordered by Milestone type — every Catch, then every Teammate, and so on.
- FR-009: Each Proposal presents its Citation passage and a working link as the primary content of the review.
- FR-010: The Collector accepts, rejects, or edits the explainer before accepting.
- FR-011: Bulk-accept operates within a Milestone type. Every Milestone type qualifies (Collector's ruling 2026-08-01, resolving Open Item #2); per-pass use is his call.
- FR-012: Review is keyboard-driven end to end.
- FR-013: Review is resumable across sessions; position and progress persist.
- FR-014: Verdicts are sticky against re-ingestion. Re-reading a Source never resurrects a rejected Proposal; it only flags Sources whose content changed.
- FR-015: When a Loyal Verdict is accepted but the Entry's Milestone Regions do not span beyond its original Region, the tool warns without blocking.

**Part A — Evidence Beyond Bulbapedia (§5.4)**
- FR-016: The Collector can create a Milestone manually, carrying a non-Bulbapedia Citation: a URL, a timestamp, and his own words.

**Part A — Correction (§5.5)**
- FR-017: Any settled Verdict can be revised at any time, including after charting is declared done.
- FR-018: Revising a Verdict triggers a re-export and advances the roster's version stamp, so the App can never silently serve a stale roster.

**Part A — Roster Artifact (§5.6)**
- FR-019: A command exports the complete roster to JSON committed to the repository (git history for hand-made rulings + publishable artifact).
- FR-020: The roster carries a version stamp identifying when it was charted.

**Part A — Completion Gate (§5.7)**
- FR-021: The tool reports progress per Milestone type across the roster.
- FR-022: The tool reports charting-done status against all three conditions: every chasable Pokémon identified, ranked, and its Slots identified — answerable from Milestone data alone.

**Cross-Cutting — Rarity Translation Map (§6)**
- FR-023: The card catalog is ingested from a static bulk source, not from live API calls in a request path.
- FR-024: Each of the seven Ranks is defined as a group of source Rarities, not a single string. Scarlet & Violet (2023+) classification is canonical.
- FR-025: A Card is eligible for a Slot only if its printed Rarity maps cleanly onto that Slot's Rank. Non-mapping Rarities excluded outright (named: `Promo`, `MEGA_ATTACK_RARE`).
- FR-026: Source Rarity values absent from the Map are reported at ingestion; Cards carrying them are held out of eligibility until the Map is updated. Nothing defaults silently into the Binder.
- FR-027: The system detects species × Rank combinations with zero eligible Cards and surfaces them.
- FR-028: The Map is editable and versioned; changing it re-derives eligible Cards without touching any Verdict.

**Cross-Cutting — No Unfillable Slot (§7)**
- FR-029: Where FR-027 identifies an unfillable Slot, an equivalence rule can be defined that satisfies it using Cards of a lower Rank. (Mechanism deferred; data model must not foreclose N-cards-per-Slot.)

**Part B — Collection App: The Binder (§8.1)**
- FR-030: Opening the Binder shows overall progress first.
- FR-031: Progress is filterable by category. Required set: by Region, by Milestone, by Rank. Pre-approved opportunistic candidates: by Evolution Line, by card era, by status filled/empty.
- FR-032: The App treats the roster as read-only. It exposes no path to change a Milestone, a Citation, or an explainer.

**Part B — The Entry (§8.2)**
- FR-033: An Entry shows its Rank and the Stars that earned it.
- FR-034: An Entry shows each Milestone it holds, with its explainer paragraph, its Citation, and a working link to the source.
- FR-035: An Entry shows its Slots, low Rank to high.

**Part B — The Slot (§8.3)**
- FR-036: A Slot shows every eligible Card — a shortlist, not a single answer — drawn from the catalog through the Map, spanning sets and eras.
- FR-037: The Collector can choose a specific Card for a Slot, which sets the Slot to Chasing. The choice persists.
- FR-038: The Collector can mark a Slot Filled, recording the specific Card from the specific set that fills it.
- FR-039: A Slot is Filled only when the Card is physically sleeved in the binder.
- FR-040: Only Filled counts toward progress. Chasing does not.

**Part B — The Hunt (§8.4)**
- FR-041: The App lists every Slot currently Chasing — the Collector's hunting list.

**Total FRs: 41 (FR-001 … FR-041, contiguous, no gaps)**

### Non-Functional Requirements

- NFR-1 (Throughput): Charting throughput is a hard requirement — several hundred Entries, 700+ explainer paragraphs. Keyboard-driven review, bulk-accept, and resumability (FR-011–FR-013) make charting finishable.
- NFR-2 (Purity): The rank engine stays pure — no I/O, no async, no framework coupling, no dependencies.
- NFR-3 (Reliability): No live third-party API in a request path. Card data ingested ahead of time (measured ~40–58% HTTP 500 on live source).
- NFR-4 (Durability): The roster survives the tooling — committed JSON export outlives any database, framework, or rewrite.
- NFR-5 (Provenance): Citation text and source link are stored per Milestone, not per Entry, and displayed to the reader.
- NFR-6 (Finished by construction): No update pipeline, no change feed, no re-sync mechanism — their absence is a property of the closed domain.

**Total NFRs: 6**

### Additional Requirements and Constraints

- C-1: Single-user, local, not deployed — a legal constraint (ADR-0004; CC BY-NC-SA source text, © card art). No accounts, no auth, no multi-tenancy.
- C-2: Ownership state (Slot choices, Chasing/Filled) must belong to *a* Collector, not be globally scoped — a shape constraint against baking single-user assumptions into expensive places.
- C-3: Rank and Slots are derived, never stored (ADR-0003). Database persists Milestones; everything downstream is computed.
- C-4: The Collector decides — sources propose, never rule, for all seven Milestone types including Loyal.
- C-5: The seam (§1): Charting Tool writes the roster exclusively and is card-agnostic; Collection App reads the roster and never writes it. Contract = roster export (Entries, Milestones, Citations, Region, episode, Appearance, explainers).
- C-6: Invariant — every Slot must be fillable (§7); the ladder bends (equivalence rules), the chase does not break.
- C-7: Fillability is checked after charting closes: charting completes from Milestone data alone → catalog + Map built → FR-027 reveals unfillable Slots → equivalence rules authored for those only.
- C-8: Encounters run last as a separate exploratory phase after Bulbapedia is exhausted (§5.4).
- C-9: Catalog source: bulk JSON dump (PokemonTCG/pokemon-tcg-data); fallback TCGdex; refresh on a deliberate schedule (addendum).

### Open Items (deliberately carried)

- OI-1: Equivalence rule mechanism — deferred until FR-027 reveals the actual unfillable set. Invariant settled; data model must not foreclose it.
- OI-3: Publishing/licensing — parked; blocks hosting work only.
- OI-6: Loyal's three named examples may fail strict geography — charting settles it.

### PRD Completeness Assessment

Strong. Requirements are explicitly numbered and contiguous (FR-001–FR-041), each is testable, and NFRs are concrete rather than aspirational. The seam (§1) gives every FR an unambiguous home (Tool / App / cross-cutting). Open items are enumerated with explicit resolution status and none blocks implementation phases — the only deferred mechanism (equivalence rules) carries an explicit data-model guard (FR-029). Scope exclusions (§11) are explicit. Amendments to upstream documents (§13) are tracked rather than silent. No orphan or ambiguous requirements detected at extraction time.

## Epic Coverage Validation

Epics document: `epics.md` — 5 epics, 34 stories. It restates the full FR inventory verbatim (FR-001..FR-041) and carries an explicit FR Coverage Map. Validation below is done at **story level**, not just against the claimed map.

### Coverage Matrix

| FR | Requirement (abbrev.) | Epic Coverage | Story-Level Verification | Status |
|---|---|---|---|---|
| FR-001 | Propose Bulbapedia pages (title, URL, expected types) | Epic 1 | Story 1.2 | ✓ Covered |
| FR-002 | Approve/reject each page; only approved ingested | Epic 1 | Stories 1.3, 1.4 | ✓ Covered |
| FR-003 | Approved manifest recorded | Epic 1 | Story 1.3 | ✓ Covered |
| FR-004 | LLM proposes Milestones, all seven types | Epic 1 | Story 1.5 | ✓ Covered |
| FR-005 | Drafted ≤1-paragraph explainer per Proposal | Epic 1 | Story 1.5 | ✓ Covered |
| FR-006 | Proposal records Region, episode, Appearance | Epic 1 | Story 1.5 | ✓ Covered |
| FR-007 | No Proposal without Citation (DB-enforced) | Epic 1 | Stories 1.5, 2.6 | ✓ Covered |
| FR-008 | Review queue ordered by Milestone type | Epic 2 | Story 2.1 | ✓ Covered |
| FR-009 | Citation passage + working link primary | Epic 2 | Story 2.1 | ✓ Covered |
| FR-010 | Accept / reject / edit-then-accept | Epic 2 | Story 2.2 | ✓ Covered |
| FR-011 | Bulk-accept within a type (all seven qualify) | Epic 2 | Story 2.4 | ✓ Covered |
| FR-012 | Keyboard-driven end to end | Epic 2 | Story 2.3 | ✓ Covered |
| FR-013 | Resumable across sessions | Epic 2 | Story 2.3 | ✓ Covered |
| FR-014 | Verdicts sticky against re-ingestion | Epic 2 | Story 2.8 (groundwork 1.4) | ✓ Covered |
| FR-015 | Loyal warning without blocking | Epic 2 | Story 2.5 | ✓ Covered |
| FR-016 | Manual Milestone w/ off-wiki Citation | Epic 2 | Story 2.6 | ✓ Covered |
| FR-017 | Any settled Verdict revisable anytime | Epic 2 | Story 2.9 | ✓ Covered |
| FR-018 | Revision → re-export + stamp advance | Epic 2 | Story 2.9 | ✓ Covered |
| FR-019 | Roster JSON export command, committed | Epic 2 | Story 2.7 | ✓ Covered |
| FR-020 | Roster version stamp | Epic 2 | Stories 2.7, 2.2 (auto-advance) | ✓ Covered |
| FR-021 | Progress per Milestone type | Epic 2 | Story 2.10 | ✓ Covered |
| FR-022 | Charting-done gate, Milestone data alone | Epic 2 | Story 2.10 | ✓ Covered |
| FR-023 | Catalog from static bulk source | Epic 3 | Story 3.1 | ✓ Covered |
| FR-024 | Ranks as groups of Rarities, SV canonical | Epic 3 | Story 3.2 | ✓ Covered |
| FR-025 | Clean-mapping eligibility, unclean excluded | Epic 3 | Story 3.3 | ✓ Covered |
| FR-026 | Unmapped rarities reported + held out | Epic 3 | Story 3.4 | ✓ Covered |
| FR-027 | Zero-eligible species × Rank detection | Epic 3 | Story 3.6 | ✓ Covered |
| FR-028 | Map editable + versioned, re-derives | Epic 3 | Story 3.5 | ✓ Covered |
| FR-029 | Equivalence-rule door open (N-per-Slot) | Epic 3 | Stories 3.6, 5.1, 5.3 (join table) | ✓ Covered |
| FR-030 | Binder opens to overall progress | Epic 4 | Story 4.5 | ✓ Covered |
| FR-031 | Filter by Region / Milestone / Rank | Epic 4 | Story 4.7 | ✓ Covered |
| FR-032 | Roster read-only in App (structural) | Epic 4 | Stories 4.6, 1.1 (seam) | ✓ Covered |
| FR-033 | Entry shows Rank + Stars | Epic 4 | Story 4.6 (row 1) | ✓ Covered |
| FR-034 | Milestones w/ explainer, Citation, link | Epic 4 | Story 4.6 (row 3) | ✓ Covered |
| FR-035 | Slots shown low → high | Epic 4 | Stories 4.4 (adjacency), 4.6 (ladder) | ✓ Covered |
| FR-036 | Slot shows eligible-Card shortlist | Epic 5 | Story 5.1 | ✓ Covered |
| FR-037 | Choose Card → Chasing, persists | Epic 5 | Story 5.2 | ✓ Covered |
| FR-038 | Mark Filled w/ specific Card + set | Epic 5 | Story 5.3 | ✓ Covered |
| FR-039 | Filled = physically sleeved only | Epic 5 | Story 5.3 | ✓ Covered |
| FR-040 | Only Filled counts toward progress | Epic 5 | Stories 5.2, 5.3, 4.5 (meter) | ✓ Covered |
| FR-041 | Hunt lists every Chasing Slot | Epic 5 | Story 5.6 | ✓ Covered |

### Missing Requirements

**None.** Every PRD FR (FR-001..FR-041) traces to at least one story with acceptance criteria. No FR appears in the epics that is absent from the PRD — the epics' FR inventory matches the PRD verbatim.

Consistency notes (not gaps):
- The epics document lists 10 NFRs where the PRD names 6; the extra four (NFR7–NFR10) are the PRD's §9 constraints (single-user/local, Collector-scoped ownership, derived-never-stored, the-Collector-decides) promoted to NFR status. Faithful, not divergent.
- Stories 1.1 (service restructure), 3.7 (image cache), 4.1–4.3, 4.8, 4.9, 5.4, 5.5, 5.7 carry no FR — they implement architecture decisions (AD-*) and UX requirements (UX-DR*), each explicitly tagged to its source. Traceability is maintained in both directions.
- The epics' FR Coverage Map (epic-level) is accurate against story-level content in all 41 cases.

### Coverage Statistics

- Total PRD FRs: 41
- FRs covered in epics: 41
- Coverage percentage: **100%**
- FRs with story-level acceptance criteria: 41/41
- Orphan FRs in epics (not in PRD): 0

## UX Alignment Assessment

### UX Document Status

**Found** — `DESIGN.md` (visual identity spine, with full token frontmatter) + `EXPERIENCE.md` (experience spine: IA, voice, component behavior, states, flows, accessibility floor), both status `final`, plus 4 approved HTML mockups. The two spines declare themselves the contract over the mocks.

### UX ↔ PRD Alignment

- **User journeys match.** EXPERIENCE Flow 1 retells the PRD's UJ-1 (Saturday Session) beat for beat through the designed UX; Flow 2 (Hunt check-in) exercises FR-041 and the errata surface. No journey contradiction found.
- **Every Part B FR has a designed UX home:** FR-030 → Progress spread; FR-031 → search/chip re-deal; FR-032 → read-only stance restated; FR-033/034/035 → slot-details rows + rung ladder (explicitly noted as "satisfied distributed across slot pages"); FR-036/037 → Carousel; FR-038/039 → sleeving ritual; FR-040 → progress meter counts Filled only; FR-041 → The Hunt chip.
- **FR-030 interpretation is documented, not silent:** the Cover (no data) precedes the Progress spread; EXPERIENCE explicitly records that FR-030 is satisfied immediately after the cover, by decision.
- **UX adds beyond the PRD** (day/night mode, foley + audio toggle, badges/trophy shelves, cover ritual, motif cards, errata slip): all additive and consistent with PRD goals ("the Collector reaches for it"; "never silently serve a stale roster"). None contradicts a requirement. The errata slip is the UX realization of FR-018's staleness rule.
- **Scope note is explicit:** the UX contract covers the **Collection App only**; Charting Tool visual design is deferred to a later utilitarian pass. See Warnings.

### UX ↔ Architecture Alignment

- **AD-12** (one R3F canvas, DOM-projected words, DOM overlay chrome, parallel accessibility tree, reduced-motion cuts) directly supports the UX's rituals and accessibility floor — the architecture was written with the UX spine as a source.
- **AD-9** (App-side errata snapshot diff) is exactly what UX-DR23's errata slip needs, including out-of-band edits.
- **AD-7** (image disk cache, clean not-available signal) supports UX-DR27's art degradation.
- **AD-10 resolves both UX `[ASSUMPTION]` blocks:** EXPERIENCE flagged the slot↔milestone pairing and the generalized badge rule as assumptions to verify; the architecture answers them as engine law (rung attribution in canonical order, badge Region from earliest record). Stories 4.6 and 5.8 encode the resolution. **Closed.**
- **Performance/ritual ceiling:** the WebGL choice is argued and bounded in SOLUTION-DESIGN §8; no UX requirement exceeds what the chosen stack supports.
- No UI component in the UX spines lacks architectural support; no architectural rule forbids anything the UX requires.

### Alignment Issues

**None blocking.** No contradiction found between UX, PRD, and Architecture. The three documents visibly derive from each other (each lists the others as sources) and the epics tag every story to UX-DR / AD / FR identifiers.

### Warnings

- **W-1 — Charting Tool has no UX spec (deliberate).** FR-001–FR-022 will be built as a "utilitarian" frontend outside the UX contract (Epic 2's stated stance; architecture defers the design pass). FR-012's keyboard-driven review is UX-heavy; its acceptance criteria in Story 2.3 partially compensate. Accepted risk: possible rework when the utilitarian pass happens.
- **W-2 — Five flagged UX gaps ride into implementation** (all self-documented in the spines): brand typeface (system stack is standing spec), progress-spread detailed layout (Story 4.5 carries it), fuller keyboard model (Story 4.9 carries the baseline), card-art-unavailable visual treatment (Story 4.9 baseline), badge glyph artwork (placeholder, deferred). None blocks a story from starting; two require in-story design decisions to be ratified back into the UX spine.

## Epic Quality Review

Reviewed against create-epics-and-stories best practices: user value, epic independence, dependency direction, story sizing, AC quality, database-creation timing.

### Epic Structure

| Epic | User-value framing | Independent? | Verdict |
|---|---|---|---|
| 1 — The Journey Charted | Collector proposes/approves sources, sees drafted queue form | Stands alone | ✓ Pass |
| 2 — The Record Settled | Collector reviews at throughput, settles the roster, exports | Uses Epic 1 output only | ✓ Pass |
| 3 — Every Slot Findable | Collector ingests catalog, authors Map, finds unfillables | Needs only Story 1.1 (parallel-capable, stated); 3.6 needs Epic 2 output (backward) | ✓ Pass |
| 4 — Opening the Binder | Collector opens, travels, reads the chronicle | Uses Epics 1–2 output; Carousel band explicitly *reserved* for Epic 5, not referenced | ✓ Pass |
| 5 — The Chase | Collector chooses, hunts, sleeves, earns badges | Uses Epics 3 + 4 outputs (backward) | ✓ Pass |

All five epic titles and goals are outcome-phrased ("The Collector can…"). No epic is a technical milestone. Epic N never requires Epic N+1: the two places that could have created forward dependencies are explicitly staged instead — Story 4.6 *reserves* row 2 as a quiet band (Carousel arrives in 5.1) and Story 4.7's Hunt chip re-deals to the empty-Hunt page before any chase exists. Story 4.4's trophy-shelf area is present with badges arriving in 5.8. This is deliberate, correct sequencing.

### Story Dependency Analysis

- **Epic 1:** 1.1 → 1.2 → 1.3 → 1.4 → 1.5, strictly linear, all backward. ✓
- **Epic 2:** all stories consume Epic 1 output; 2.7 (export) deliberately precedes 2.9 (revision) because FR-018's re-export needs the command to exist — ordering rationale stated in the epic itself. ✓
- **Epic 3:** 3.1/3.2 independent roots; 3.3–3.7 consume them. ✓
- **Epic 4:** 4.1 (stage) → 4.2–4.9, all backward; no story references Epic 5 functionality. ✓
- **Epic 5:** 5.1 consumes 4.6's reserved band + 3.3's eligibility query; 5.2–5.8 backward. ✓
- **Forward dependencies found: 0.**

### Database-Creation Timing

Exemplary. Story 1.1 creates only `roster_entry` + `roster_milestone` ("only the tables this story needs, no more"); 1.2 introduces `roster_source`; 3.2 the Map table; 5.2 creates `collection_chase` "with only the columns it needs"; 5.3 creates the fill join table. No create-everything-upfront story exists. ✓

### Acceptance Criteria Quality

All 34 stories use Given/When/Then BDD form. ACs are overwhelmingly specific and testable — e.g. 2.7's byte-identical re-export, 3.2's greppable "no rarity string in TypeScript," 3.7's "failure not cached as an image." Error paths present where they matter most (1.4 per-source fetch failure + retry; 3.7 CDN failure; 4.9 load-failure page; 5.5 un-fill semantics). Negative/idempotency ACs are consistently present (no duplicate Sources, no duplicate Proposals, upsert-no-duplicates, bulk-accept untouched other types).

### Special Checks

- **Starter template:** N/A — brownfield; the epics' starter/foundation context says so explicitly, and Story 1.1 is the correct brownfield foundation story (restructure with `GET /binder` preserved as a regression gate, `SEED_LINES` retired, CI green).
- **Brownfield integration:** migration note from the spine honored verbatim in 1.1. ✓
- **Traceability:** every story is tagged to its FR / AD-* / UX-DR* sources; coverage map verified in the previous section. ✓

### Findings

#### 🔴 Critical Violations
None.

#### 🟠 Major Issues
None.

#### 🟡 Minor Concerns
1. **Batch/bulk failure paths thin in three stories.** Story 1.5 (LLM drafting batch) has idempotent re-run ACs but no explicit AC for a batch failing partway (API error mid-type); Story 2.4 (bulk-accept) has no partial-failure/atomicity AC; Story 3.1 (catalog ingest) has no malformed-source-data AC. Recommendation: add one failure-mode AC each during story-file creation (bmad-create-story), not a re-plan.
2. **Three large stories.** 4.1 (canvas + full token set + day/night + rendering registers), 4.6 (details page + engine rung-attribution + ladder + HUDs), 5.8 (engine badge law + shelf rendering) each bundle engine/foundation work with UI. Coherent as written, but watch sizing at sprint planning; 4.6's engine work is a natural pre-story split if needed.
3. **Dev-data gap after `SEED_LINES` dies.** Story 1.1 retires the seed roster, and Epic 4's ACs assume "a charted roster." By sequence that's satisfied, but frontend development/testing of Epic 4 before charting is substantially complete will need a fixture strategy (e.g. a dev-only roster fixture or an exported-JSON import). Nothing in the plan forecloses this; it's simply unstated.
4. **Technical-enabler stories are justified but present:** 1.1, 3.7, 4.1 are enablers wearing user framing. Each is architecturally mandated (brownfield foundation, AD-7, AD-12) — acceptable, noted for transparency.

## Summary and Recommendations

### Overall Readiness Status

**READY** — Phase 4 implementation can begin.

This is an unusually clean planning set. All four core artifacts exist, are marked final, were updated within the last day, and visibly derive from one another (shared source lists, shared FR identifiers, shared vocabulary). FR traceability is 100% (41/41 with story-level acceptance criteria), no forward dependencies exist across 34 stories, and the epics honor the architecture's invariants (write-authority seam, derived-never-stored, tables-created-when-needed) at the story level rather than just citing them.

### Critical Issues Requiring Immediate Action

**None.** No critical or major issues were found in any step.

### Open Findings (non-blocking, in priority order)

1. **W-1 — Charting Tool ships without a UX contract** (deliberate, documented). Epic 2's utilitarian frontend carries UX-heavy requirements (FR-012 keyboard-driven review). Accepted risk of rework at the later design pass.
2. **Minor 3 — Dev-data gap:** Story 1.1 retires `SEED_LINES`; Epic 4 development before charting is substantially complete needs a fixture strategy (dev-only roster fixture or exported-JSON import). Unstated, not foreclosed.
3. **Minor 1 — Failure-path ACs thin** in Stories 1.5 (LLM batch partial failure), 2.4 (bulk-accept atomicity), 3.1 (malformed source data).
4. **Minor 2 — Sizing watch:** Stories 4.1, 4.6, 5.8 bundle engine/foundation work with UI; 4.6's rung-attribution engine work is the natural split point if needed.
5. **W-2 — Five self-documented UX gaps** (typeface, progress-spread layout, keyboard model, art-degradation treatment, badge glyphs) ride into implementation; two require in-story decisions ratified back into the UX spine.

### Recommended Next Steps

1. **Proceed to sprint planning** (`bmad-sprint-planning`) — nothing blocks it. Epic order 1 → 2 → 3(∥) → 4 → 5 as written; Epic 3 can start any time after Story 1.1.
2. **At story-file creation** (`bmad-create-story`): add one failure-mode AC each to 1.5, 2.4, and 3.1; decide the Epic 4 dev-fixture strategy when drafting Story 1.1 or 4.1; re-check the sizing of 4.1/4.6/5.8 and split 4.6's engine work into a pre-story if it feels heavy.
3. **Track the UX gap list** (W-2) so decisions made in Stories 4.5/4.9 get ratified back into DESIGN.md/EXPERIENCE.md rather than living only in code.

### Final Note

This assessment identified 6 non-blocking issues across 3 categories (UX scope warnings, AC completeness, story sizing/logistics) and 0 blocking issues. All 6 can be absorbed into the normal story-creation workflow — no artifact requires rework before implementation begins.

**Assessed:** 2026-08-01, Implementation Readiness workflow (bmad-check-implementation-readiness), for Guille.
