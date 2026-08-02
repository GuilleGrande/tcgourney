---
name: Ash's Journey
status: final
project: tcgourney
created: 2026-07-31
updated: 2026-08-01
sources:
  - docs/planning-artifacts/briefs/brief-tcgourney-2026-07-25/brief.md
  - docs/planning-artifacts/briefs/brief-tcgourney-2026-07-25/addendum.md
  - docs/planning-artifacts/prds/prd-tcgourney-2026-07-26/prd.md
  - docs/planning-artifacts/prds/prd-tcgourney-2026-07-26/addendum.md
  - CONTEXT.md
---

# Ash's Journey — Experience Spine

> This spine and its peer `DESIGN.md` are the contract. On any conflict with a mock or working file, the spines win. Behavioral references: [mockups/direction-merged-lofi-tool.html](mockups/direction-merged-lofi-tool.html) (approved direction), [mockups/entry-view-mock-2026-07-31.html](mockups/entry-view-mock-2026-07-31.html) (slot-details layout grammar; ladder Variant A chosen, Variant B rejected), [mockups/key-screen-cover.html](mockups/key-screen-cover.html) (the Cover), [mockups/key-screen-region-title.html](mockups/key-screen-region-title.html) (Region title card with trophy shelf), `.working/spread-options-2026-07-31.html` (layout study; Option A Purist chosen, title cards adopted from Option C).

## Foundation

Desktop-first, mouse-driven web app. Single user — the Collector — local, no accounts or auth (a legal constraint upstream, not a preference). This run covers the **Collection App only**; the Charting Tool is deferred to a later, more utilitarian design pass. `DESIGN.md` is the visual identity reference; this spine is the experience. The app is a **companion during the chase** — emotional engagement with the cards being hunted, not a passive tracker — used in bursts weeks apart, so every open must re-orient a returning Collector. The roster is read-only here (FR-032). A mobile read of The Hunt is a future door: keep responsive open, design nothing for it now.

## Information Architecture

The binder is the app. There are no screens beside it — only the binder in different states, plus one chrome element.

| Surface | Reached from | Purpose |
|---|---|---|
| The Cover | App open — always | Closed binder; the opening ritual. Pure and quiet, no data on it. |
| Progress spread | Cover ritual completes | Front matter: overall journey status (FR-030), Errata slip when the roster changed. |
| Region chapters | Flipping forward / Search bar | Kanto→Galar in order; each opens with a full-page Region Title card, then 3×3 two-page spreads (18 sleeves). Pokédex order within Region ships first; the ordering must stay swappable (chronological later). An Entry's Slots sit adjacent. |
| Slot details | Click any sleeve, filled or empty | Single centered 3×3 page, slot-scoped: row 1 the soul, row 2 the chase Carousel, row 3 the story (FR-033/034/035 satisfied distributed across slot pages). |
| Filtered binder | Search bar / Filter chips | The binder **re-deals** into a temporary binder led by the matching Title card — same spreads, same 3×3 rules (FR-031: Region, Milestone, Rank; further categories deferred upstream). |
| The Hunt | Filter chip / `status:chasing` | Not a separate surface: the status=Chasing filter, re-dealt like any other (FR-041). |

Chrome is a **single advanced Search bar above the binder** (persistent HUD, outside the page grid) plus its Filter chips, Progress meter, and Mode toggle. No TOC, no tabs, no sidebar — travel is search/filter-driven. All other chrome is contextual (Hover HUDs, Rung ladder). Chrome is absent at the Cover — the HUD arrives with the open binder.

## Voice and Tone

Microcopy register: **warm field-guide storyteller**. The chrome looks like a game tool; the words read like a field guide.

| Do | Don't |
|---|---|
| "This sleeve waits." | "Empty slot" |
| "Awaiting its Ultra Rare." | "Missing: 1 card" |
| "No card was ever printed for this rung." | "No results found." |
| "The chronicle was revised — 3 entries changed." | "Sync complete. Data updated." |
| "Kanto — 12 of 31 sleeved · only Filled counts." | "Progress: 38.7%" |
| Quiet, complete sentences; the binder speaks of itself | Exclamation marks, SaaS-speak, gamer hype, shame for undoing |

## Component Patterns

Behavioral. Visual specs live in `DESIGN.md` Components.

| Component | Use | Behavioral rules |
|---|---|---|
| Search bar | Global chrome | The only navigation. Accepts name, Region, Milestone, Rank, `status:chasing`. `/` focuses it. Results re-deal the binder (never a dropdown list of links). |
| Filter chip | Global chrome | One click applies; active chip shows ember. Clearing re-deals back to the home binder. The Hunt is a chip. |
| Progress meter | Global chrome | Scope follows the active filter (overall, or per-Region etc.). Counts Filled only (FR-040). |
| Mode toggle | Global chrome | One click swaps Day/Night — both first-class, instant, remembered. |
| Flip button | Spread corners | Turns one spread. Also triggered by the page-flip ritual (see Interaction Primitives). |
| Title card | Chapter openers, filtered binders | Full-page, non-interactive except as a page. Region Title cards double as trophy shelves (see Gamification & Summits). |
| Pocket / Card frame | Everywhere | Every interactive element lives in a card frame inside a pocket. Clicking a sleeve — filled or empty — opens that slot's details. |
| Data card | Slot details rows 1 & 3 | Chase data · the Pokémon alive · facts (row 1); milestone · explainer · citation with working link (row 3, per FR-034). Citation links open the source. |
| Carousel | Slot details row 2 | Strict three-sleeve window — never five. Edge buttons rotate; candidates render semi-transparent (not yet real) and may be 3D: center card taller/dominant, side cards recede, rotating into place. Shortlist spans sets/eras (FR-036) and flows in **era chapters** (Base era → EX → Sun & Moon → SV…); the row's Hover HUD shows era chips to jump straight to a chapter — the binder's chapter logic in miniature. Selecting a card highlights it and sets the Slot to Chasing (FR-037). |
| Ghost card | Home spread | The chosen candidate sits translucent in its empty sleeve — the spread always shows what is being chased. |
| Empty sleeve | Home spread | States the Rank it demands in quiet honey ({colors.honey}/{colors.honey-text}); ⚫ base rung in ink. Confronts, never nags. |
| Throne | Slot details (Filled) | The sleeved card's clear image enthroned in the Carousel's center; Motif cards flank it. |
| Motif card | Slot details (Filled) | Non-interactive rank-flavored filler, one sleeve each; the correct Rank's set accompanies its enthroned card. |
| Rung ladder | Slot details, edge-docked | Variant A (chosen). One rung per Slot of this Entry, low→high; click a rung to flip to that Slot's page; brightens when the pointer reaches the page. |
| Hover HUD | Slot details rows; spread rows | Contextual controls (back to spread, prev/next slot, category/paging, era chips on the Carousel row) appear on row hover; chrome stays invisible until needed. |
| Rank chip | Sleeve tags | Names the Slot's demanded Rank; ember treatment only while Chasing. |
| Sleeve button | Slot details (Chasing) | Triggers the sleeving ritual (FR-038/039). Ember; present only when a chase target is set. |
| Badge | Region Title cards | Earned trophies rendered on the shelf; not clickable actions. |
| Errata slip | Progress spread | Appears when the roster changed since last open; links to what moved. |

## State Patterns

| State | Surface | Treatment |
|---|---|---|
| Empty sleeve | Home spread | Open star + demanded Rank + "this sleeve waits." |
| Chasing | Home spread + details | Ghost card in the sleeve; details view marks target, set, chosen date. Chasing never counts toward progress (FR-040). |
| Filled | Home spread + details | Real card in the sleeve; Throne treatment in details, recorded as the specific card from the specific set (FR-038/039). |
| Unfillable slot | Home spread | Rendered as a **normal empty sleeve** — no distinct mark; emptiness is discovered in the details view. |
| No candidates | Slot details Carousel | Required wording: no card was ever printed for this rung — it must read as history, not a bug. The sleeve must not foreclose a future N-for-one equivalence fill (mechanism deferred upstream). |
| Un-fill | Slot details | Allowed, one confirmation. Sleeve returns to empty or Chasing. No celebration, no shame — the binder reflects reality. |
| Abandon / swap chase | Slot details | Free, no confirmation. Picking a different candidate replaces the ghost; clearing empties the sleeve back to waiting. Changing your mind is part of the fun. |
| Roster revised | Progress spread | Updates adopted immediately; Errata slip: "the chronicle was revised — N entries changed," with a way to see what moved. The opening ritual is never blocked. |
| Stale roster | Global rule | The App must never silently serve a stale roster; the roster version stamp governs. |
| Card art unavailable | Anywhere cards render | Must degrade gracefully to text-only candidates (imagery is wanted, not guaranteed upstream). Visual treatment undecided — gap. |
| Zero-match filter | Filtered binder | A quiet field-guide Title card page inside the binder: "Nothing in the binder answers that." Card frames throughout; no system chrome. |
| Empty Hunt | The Hunt | Title card: "No chases underway. The binder rests." |
| Load failure | App open | Title card: "The binder couldn't be opened." Same quiet register — the failure stays inside the binder metaphor. |

## Interaction Primitives

Mouse-first. Hover reveals; click acts.

- **Click a sleeve** (filled or empty) → that slot's details page. Seeing all sleeved cards at once is the home spread's job.
- **Carousel rotate** — edge buttons turn the three-sleeve window; scrollability conveyed by visual cues, never by widening the window.
- **Page flip ritual** — two-page spreads with full page-turn animation; the flip is the travel.
- **Cover-open ritual** — every single open. Execution quality is make-or-break: skippable-fast, satisfying every time, never a chore.
- **The sleeving ritual** — the climax (FR-038/039), from the Sleeve button: everything but the card dims → light falls from above → the card slides into the sleeve → satisfying glow + the sleeving sound → it becomes the page's enthroned card.
- **Mode toggle** — one click, Day ↔ Night.
- **Foley** — the full quiet set: page-flip whisper, cover open/close, soft chip taps — all understated, all governed by the single audio toggle. The sleeving sound is the loud centerpiece.
- **Banned:** breaking the 3×3 grid, cards spanning sleeves, pills, sidebars/TOC/tabs, ember on non-actionable elements, celebration on un-fill.

## Accessibility Floor

- `prefers-reduced-motion` honored on **every** ritual — cover open, page flips, carousel rotation, ghost pulse, and the sleeving ritual, which keeps its meaning through a reduced cut (dim → card placed → done). All rituals are additionally skippable-fast for everyone.
- **Audio toggle** — sound is part of the design (see Foley), so one explicit preference controls the entire set; every ritual completes silently without loss of state.
- **Keyboard reachability baseline** — every interactive element reachable and operable by keyboard; `/` focuses the Search bar; tab order follows reading order. (A fuller keyboard model was never designed — gap.)
- **Contrast per `DESIGN.md` tokens** — reading text always {colors.ink} on paper or {colors.chrome-ink-night} on night chrome; honey text uses {colors.honey-text}, never raw {colors.honey}; ember is accompanied by shape (dashed frame, chip, ring), never the only signal.

## Inspiration & Anti-patterns

- **Lifted from the Michi method** (collector @peeplop/Michi, Instagram): binder pages as curated visual displays — cohesive spreads, intentional composition. Resolved against our strict grid: **composition through neighbors, never size**. A valuable card is spotlighted by framing, glow, and surrounding slots used as supporting imagery — never by occupying more than one sleeve.
- **Lifted from the physical ritual of collecting:** page flips, sleeving, the closed cover. The app earns emotion by imitating the object, not by adding game systems on top.
- **Rejected — corporate SaaS dashboard (hard wall):** no KPI tiles, no data-grid chrome, no admin registers. This is a tool for a game.
- **Rejected — gacha explosion loudness:** the sleeving climax is warm light and one sound, not particle storms. Celebration is quiet pride, not noise.
- **Rejected — chore-making mechanics:** no streaks, no reminders, no backlog framing. The counter-metric stands: the App must never become a chore with its own backlog.

## Gamification & Summits

Progression is shown and accomplishments rewarded — journey mapping, not points.

- **Badges** — earned per **region × milestone type**. Worked example (decided): filling all Common/base slots of Kanto earns Kanto's "The Catch" badge. [ASSUMPTION] Generalized rule inferred from that example: for (region × milestone type), the badge is earned when every Slot whose rung was earned by that milestone type is Filled — verify the exact mapping against the rank engine's slot–milestone model.
- **Trophy shelves** — a Region's Title card showcases that region's earned badges; you revisit trophies by flipping to the chapter, not in a trophy screen.
- **Progress spread** — the front-matter spread is the journey overview: overall standing first (FR-030 is satisfied here, immediately after the cover — the cover itself stays pure and quiet, by decision). Detailed layout undecided — gap.
- **The sleeving ritual** is the reward loop's peak; badges are its echo. No other reward mechanics exist.

[ASSUMPTION] The story row's slot↔milestone pairing assumes each Slot maps cleanly to the one Milestone that earned its rung (six Stars + Caught = seven Slots). If milestones can outnumber or share rungs, the story row flips through them — verify against the rank engine model.

## Key Flows

### Flow 1 — The Saturday Session (Guille the Collector; retells UJ-1 through this UX)

1. Guille sits down with an hour. App open: the Cover. The opening ritual plays — leather, then paper.
2. First spread: the Progress spread. Overall standing, no errata slip today. Kanto nearly done; Sinnoh barely started.
3. He types "Kanto" — the binder re-deals; Kanto's Title card fronts the chapter, badges on its shelf.
4. He flips spreads to Bulbasaur — Ultra Rare, four adjacent sleeves, three real cards and one empty sleeve stating its demanded Rank in honey.
5. He clicks the empty Ultra Rare sleeve. The spread collapses to the single slot-details page; the Rung ladder docks at the edge — three rungs solid, this one dashed and ringed.
6. Row 3 tells him why: the milestone, the explainer he half-forgot, the citation with its working link.
7. Row 2: the Carousel. Semi-transparent candidates across eras rotate through the three-sleeve window. The modern one has better art; the older one means more. **He chooses.**
8. The chosen card highlights — the Slot is Chasing. Back on the spread, the Ghost card sits translucent in the sleeve. He closes the binder and leaves; the hunting happens elsewhere.
9. **Eleven days later** the card arrives. He sleeves it in the physical binder, opens the app — cover ritual, progress spread — and clicks straight through to the slot. The Sleeve button waits in ember.
10. **Climax — the Sleeving:** the page dims, light falls from above, the card slides home, glow and the sleeving sound. It is enthroned, flanked by Ultra Rare motif cards.
11. **Echo:** the Kanto meter ticks forward; if this completed a region × milestone set, the badge lands on Kanto's Title card — quiet, waiting to be flipped to.

Failure path: the card that arrived isn't right, or he regrets the choice — un-fill from the details view with one confirmation; the sleeve returns to Chasing or empty. No shame; the binder reflects reality.

### Flow 2 — The Hunt check-in (Guille, a weeknight, ten minutes)

1. App open: cover ritual, fast. Progress spread — an Errata slip: "the chronicle was revised — 2 entries changed." He glances at what moved; nothing he was chasing.
2. He clicks **The Hunt** chip. The binder re-deals into the Chasing binder, fronted by the Hunt Title card — same spreads, same grid, only ghosts.
3. He flips through his hunting list. One ghost has gone cold — a listing that never materialized.
4. He clicks that sleeve, rotates the Carousel, and swaps the ghost for the older printing. No confirmation; changing your mind is part of the fun.
5. **Climax:** he clears the filter — the binder re-deals home, and the new ghost sits in its sleeve on the Kanto spread. The hunting list was never another app; it was the same binder, re-dealt.
