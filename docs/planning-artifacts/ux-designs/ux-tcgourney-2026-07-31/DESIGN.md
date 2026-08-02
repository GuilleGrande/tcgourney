---
name: Ash's Journey
description: Cozy lofi world, Trainer chrome — a leather binder on a wood desk, warm game-tool controls around it. Visual identity spine for the Collection App.
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
colors:
  # Day — world
  room-wall: '#ecdcbf'
  window-frame: '#6b4a30'
  window-sky: '#cfe3d8'
  window-light: '#ffe9b8'
  sun-glow: '#fff3cd'
  desk-wood: '#a06b46'
  desk-grain-dark: '#8a5a3a'
  desk-grain-light: '#b57d54'
  binder-leather: '#7b523a'
  leather-stitch: '#5c3c28'
  page: '#fbf4e3'
  sleeve: '#f1e7d0'
  sleeve-rim: '#dbcba6'
  ink: '#4a392b'
  ink-soft: '#97826a'
  plant-green: '#7d9b5d'
  terracotta-pot: '#c2713f'
  # Day — chrome (Trainer register)
  chrome-panel: '#fff9ec'
  chrome-edge: '#3b2a1c'
  ember: '#d95f36'
  ember-press: '#b34a28'
  honey: '#d29a3a'
  honey-text: '#8a6410'
  # Night — world
  room-wall-night: '#251d17'
  desk-wood-night: '#533826'
  desk-grain-dark-night: '#45301f'
  desk-grain-light-night: '#6b492f'
  binder-leather-night: '#4b3221'
  leather-stitch-night: '#33220f'
  page-night: '#f0e2c2'
  sleeve-night: '#e4d4ae'
  sleeve-rim-night: '#c9b489'
  window-sky-night-top: '#101720'
  window-sky-night-bottom: '#1d2733'
  moon: '#f4e9c8'
  lamp-glow: '#ffbe69'
  fairy-gold: '#ffd98a'
  fairy-coral: '#f2a68a'
  fairy-green: '#b9d189'
  # Night — chrome
  chrome-panel-night: '#33261a'
  chrome-edge-night: '#57422e'
  chrome-ink-night: '#f2e3c4'
  ember-night: '#ff8257'
  honey-night: '#e0a94e'
typography:
  # GAP: no brand font family was ever decided in Discovery. The approved merged
  # mock ships a warm system stack; these values are the standing spec until a
  # deliberate type decision replaces them.
  display:
    fontFamily: 'ui-rounded, "Segoe UI Variable Display", "Trebuchet MS", "Segoe UI", sans-serif'
    fontWeight: '800'
    letterSpacing: -0.01em
  body:
    fontFamily: '"Segoe UI Variable Text", "Segoe UI", system-ui, sans-serif'
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  label-caps:
    fontFamily: '"Segoe UI Variable Text", "Segoe UI", system-ui, sans-serif'
    fontSize: 11px
    fontWeight: '700'
    letterSpacing: 0.08em
  meta:
    fontFamily: '"Segoe UI Variable Text", "Segoe UI", system-ui, sans-serif'
    fontSize: 12.5px
    fontWeight: '600'
rounded:
  sm: 6px
  md: 8px
  lg: 10px
  xl: 12px
  scene: 20px
  # no `full` token — deliberately. Pills are banned (see Shapes).
spacing:
  '1': 4px
  '2': 8px
  '3': 12px
  '4': 16px
  pocket-gap: 12px
  page-pad: 16px
  chrome-gap: 10px
components:
  card-frame:
    aspect: '63 / 88'
    radius: '{rounded.md}'
    inner-edge: 'inset 0 0 0 2px rgba(59,42,28,.35)'
  pocket:
    background: '{colors.sleeve}'
    radius: '{rounded.xl}'
    rim: 'inset 0 0 0 1.5px {colors.sleeve-rim}'
  search-bar:
    background: '{colors.chrome-panel}'
    border: '2px solid {colors.chrome-edge}'
    radius: '{rounded.xl}'
    press-shadow: '0 3px 0 {colors.chrome-edge}'
    glyph-tile: '{colors.ember}'
  filter-chip:
    radius: '{rounded.lg}'
    border: '2px solid {colors.chrome-edge}'
    active-background: '{colors.ember}'
    active-border: '{colors.ember-press}'
  progress-meter:
    fill: '{colors.plant-green}'
    track: '{colors.chrome-panel}'
    border: '2px solid {colors.chrome-edge}'
  ghost-card:
    border: '2px dashed {colors.ember}'
    background: 'rgba(255,253,246,.6)'
    art-opacity: '0.55'
    chip: '{colors.ember}'
  empty-sleeve:
    rank-border: '2px solid {colors.honey}'
    rank-ink: '{colors.honey-text}'
    base-rank-ink: '{colors.ink}'
  rank-chip:
    radius: 7px
    honey-border: '{colors.honey}'
    honey-ink: '{colors.honey-text}'
  hover-hud:
    background: '{colors.chrome-edge}'
    ink: '{colors.chrome-ink-night}'
    radius: '{rounded.lg}'
  rung-ladder:
    rung-radius: '{rounded.lg}'
    filled: '{colors.chrome-edge}'
    open: 'dashed {colors.chrome-edge} on {colors.chrome-panel}'
    current-ring: '{colors.ember}'
  throne:
    ring: '0 0 0 2px {colors.chrome-edge}, 0 0 0 6px {colors.chrome-panel}, 0 0 0 8px {colors.honey}'
  sleeve-button:
    background: '{colors.ember}'
    border: '2px solid {colors.ember-press}'
    ink: '{colors.chrome-panel}'
    radius: '{rounded.lg}'
  mode-toggle:
    day-knob: '{colors.honey}'
    night-knob: '#b9c6e8'
---

# Ash's Journey — Design Spine

> This spine and its peer `EXPERIENCE.md` are the contract. On any conflict with a mock or working file, the spines win. Approved visual direction: [mockups/direction-merged-lofi-tool.html](mockups/direction-merged-lofi-tool.html) (Lofi world + Trainer chrome); key screens: [mockups/key-screen-cover.html](mockups/key-screen-cover.html), [mockups/key-screen-region-title.html](mockups/key-screen-region-title.html). The four single-direction studies in `.working/` are superseded exploration.

## Brand & Style

Ash's Journey is a chronicle, not a checklist — a companion during the chase, not a passive tracker. The identity is a deliberate remix of two souls: **the Lofi Desk's world** (a leather binder as a physical object in an inhabited cozy room — wood desk, plants, a mug going cold, honeyed light) wrapped in **the Trainer's Tool's chrome** (high-contrast, thick-bordered, fun game-menu controls). Crisp tool around soft pages; the chrome deliberately contrasts with the binder world it serves.

The canonical mood reference is the **SV 151 Bulbasaur Art Rare illustrated by Orca**: a cozy sunlit kitchen — watercolor warmth, plant greens, soft yellows, terracotta, warm woods, honeyed light. The window behind the desk echoes that card's window light and has real presence in the scene — a large six-pane frame spanning the width behind the binder.

This is a tool for a game: game-menu polish, never enterprise software. Sound is part of the design, not an afterthought — the binder carries a full quiet foley set (page-flip whisper, cover open/close, soft chip taps) with the sleeving sound as its loud centerpiece (behavior in `EXPERIENCE.md` Interaction Primitives).

## Colors

Two moods of the same cozy room, both first-class, with an easy toggle: **Day** (sunlit window, beams on the desk) and **Night** (moonlit window, lamp pool, fairy lights). Every world and chrome color carries a day value and a night sibling (`-night` tokens).

- **Ember (`{colors.ember}` day / `{colors.ember-night}` night)** — the one accent. The Trainer's Tool flame annealed toward the Lofi terracotta pot: fired clay in honeyed light, part of the room. Reserved **exclusively** for act-here / chase emphasis: the search glyph, active filter chips, the Chasing ghost, the current ladder rung, the sleeve button. Press edge `{colors.ember-press}`; night glow `rgba(255,130,87,.35)`. Never decorative, never a state badge, never chrome filler.
- **Honey (`{colors.honey}` / `{colors.honey-night}`)** — the quiet Rank tone. Rank labels and empty-sleeve rank frames stay honey-and-ink so rarity reads as patina, not alarm. Text on light surfaces uses `{colors.honey-text}` (the raw honey is decorative-weight only).
- **Espresso (`{colors.chrome-edge}`)** — the chrome's thick border and hard press shadow; the high-contrast Trainer voice. Night chrome shifts to `{colors.chrome-panel-night}` panels, `{colors.chrome-edge-night}` edges, `{colors.chrome-ink-night}` ink.
- **Page & sleeve (`{colors.page}`, `{colors.sleeve}`, rim `{colors.sleeve-rim}`)** — cream paper with subtle grain; night keeps them lamp-lit cream (`{colors.page-night}`, `{colors.sleeve-night}`), never inverted to dark — the page is always paper.
- **Ink (`{colors.ink}`) / soft ink (`{colors.ink-soft}`)** — all reading text; soft ink for whispers and metadata.
- **World colors** — wall, desk wood + grains, leather + stitch, window frame/sky/light, plant green, terracotta pot, and the night set (moon, lamp glow, three fairy-light tones). These paint the room only. `{colors.terracotta-pot}` is a world object, never chrome. `{colors.plant-green}` is the single crossover: it fills the progress meter, so progress reads as growth.
- **Ghost (Chasing)** — dashed `{colors.ember}` frame on translucent paper (`rgba(255,253,246,.6)`), card art at 55% opacity.

Avoid: any new accent, cool grays, pure white or pure black surfaces, ember used for anything the Collector cannot act on.

## Typography

**Gap, surfaced:** Discovery never chose a brand typeface. The approved mock ships a warm system stack — rounded display for headers, system sans for body — and that is the standing spec until a deliberate type decision replaces it. Roles: `{typography.display}` for page/chapter voice, `{typography.body}` for reading text (explainers, citations), `{typography.label-caps}` for the Trainer chrome's tracked uppercase labels (chips, HUDs, rank chips, crumbs), `{typography.meta}` for set lines and whispers. The mock renders at miniature scale; sizes are directional, ratios and roles are the contract. The **⚫ base-slot glyph** is a typographic asset inherited from the sources — it marks the Catch's Common/Uncommon rung everywhere Ranks appear.

## Layout & Spacing

The **card-slot grid is the universal design primitive**: every piece of interactive content lives inside a card frame, on a 3×3 page. Two-page spreads (18 sleeves) are the home unit; the details view collapses to one centered page. Grid gap `{spacing.pocket-gap}`, page padding `{spacing.page-pad}`, chrome gaps `{spacing.chrome-gap}`; the 4/8/12/16 scale covers everything inside a card. The Search bar floats **above** the binder, outside the page grid — chrome never enters a sleeve. Background imagery may spread across multiple slots; interactive content never does.

## Elevation & Depth

Two depth languages, one per soul. **The world** is soft: diffuse warm shadows under the binder and page, light shafts from the window, the lamp pool at night — light as atmosphere, not hierarchy. **The chrome** is hard: every control sits on a solid press shadow (`0 3px 0` in its edge color) and sinks to `0 1px` on hover — buttons feel like buttons in a game menu. Night adds a gentle ember glow to active chrome. Scene layering back-to-front: wall → window → light shafts → desk → binder → room objects → chrome. The sleeving ritual owns one special depth move: a dim veil over the whole page with a single light shaft on the card (see `EXPERIENCE.md` Interaction Primitives).

## Shapes

**Rounded rectangles, never pills.** Chrome corners live at 8–12px (`{rounded.md}`–`{rounded.xl}`); small inner elements may drop to `{rounded.sm}`. There is deliberately no `full` radius token. Card frames are always **63:88** (`{components.card-frame.aspect}`) — the real card proportion; sleeves at `{rounded.xl}` hold cards at `{rounded.md}`. Thick 2px high-contrast borders on all chrome; the page and world stay border-soft.

## Components

Visual specs; behavior lives in `EXPERIENCE.md` Component Patterns.

- **Card frame** — 63:88, `{rounded.md}`, hairline inner edge; the container for every card, motif, and data card.
- **Pocket** — sleeve-colored well `{components.pocket}`, inner rim + top-light sheen; holds exactly one card frame.
- **Data card** — a card frame carrying UI content (chase data, facts, story): cream face, tracked `{typography.label-caps}` header rule, ink body.
- **Search bar** — `{components.search-bar}`: chrome panel, espresso border, press shadow, ember glyph tile, `/` key hint.
- **Filter chip** — `{components.filter-chip}`: tracked caps, press shadow; active = ember fill on ember-press.
- **Progress meter** — bordered track, `{colors.plant-green}` striped fill.
- **Mode toggle** — day/night switch: honey sun knob ↔ moonlit night knob, same chrome body.
- **Flip button** — small chrome square with chevron, press shadow; page corners of the spread.
- **Rank chip** — small tracked label naming a Slot's Rank; ⚫ prefix on the base rung; honey treatment on empty sleeves, ember treatment only while Chasing.
- **Empty sleeve** — translucent paper card, dashed inner frame, open star, demanded Rank in a honey frame (`{components.empty-sleeve}`), a whispered "this sleeve waits". Base rung uses ⚫ and ink instead of honey.
- **Ghost card** — the Chasing placeholder: `{components.ghost-card}`, pulsing ember CHASING chip. Pulse honors reduced motion.
- **Motif card** — one per Rank: seven designed filler cards that flank an enthroned card, each carrying its Rank's decorative element set (e.g. Common = quiet dot lattice / plain weave). Ladder per `CONTEXT.md` (authoritative): Common/Uncommon (⚫), Rare, Double Rare, Ultra Rare, Illustration Rare, Special Illustration Rare, Hyper Rare.
- **Throne** — the filled slot's center treatment: triple ring `{components.throne}` (ink–cream–honey), raised on a pedestal glow, FILLED · SLEEVED chip in espresso.
- **Carousel** — the sleeve-well band holding exactly three card frames; chunky chrome rotate buttons at its edges; center card taller and dominant, side cards recede.
- **Rung ladder** — edge-docked Trainer rung strip (Variant A): one rung per Slot, filled = solid espresso, open = dashed, current = ember ring `{components.rung-ladder}`.
- **Hover HUD** — dark espresso strip `{components.hover-hud}`, tracked caps, docked at a row's top edge; hidden until hover.
- **Sleeve button** — the ritual trigger: ember fill, ember-press border, caps label `{components.sleeve-button}`.
- **Title card** — a full-page card frame opening each Region chapter and fronting each filtered binder; carries the chapter voice in `{typography.display}` and, on Region title cards, the earned badge shelf. Background washes (e.g. a region landscape) may span all nine card frames — background may cross slots, interactive content never does. Region crests reuse the throne's ink–cream–honey triple-ring language.
- **Badge** — a summit trophy (region × milestone type) displayed on its Region title card, rendered as a circular **coin**: a world object like the binder rings, exempt from the rounded-rect chrome rule (the pill ban remains a chrome rule). Earned: radial honey face, espresso 2px ring, cream inner ring, embossed espresso glyph, soft breathing honey halo. Unearned: blind-debossed silhouette — faint face, dashed sleeve-rim ring, muted glyph, no halo. Ember never appears on badges. The glyph set is placeholder iconography pending badge artwork.
- **Cover** — the closed binder, the app's first object: leather face with a blind-debossed "Ash's Journey" (leather-on-leather; never foil, never chrome ink), stitch inset frame, debossed medallion, cream page-block edge showing past the cover. It carries **no data and no chrome** — the persistent HUD arrives with the open binder. The whole binder is the single invitation target: hover/focus lifts it gently under a honeyed halo (window-light by day, lamp-glow by night); ember appears only as the keyboard-focus ring.
- **Errata slip** — a paper slip on the progress spread noting roster revisions; paper register (like the desk's sticky note), not chrome.

## Do's and Don'ts

| Do | Don't |
|---|---|
| Ember only where the Collector acts or chases | Ember as decoration, state color, or chrome filler |
| Rank labels in quiet honey + ink | Loud rarity colors, foil rainbows in chrome |
| Every content element inside a 63:88 card frame on the 3×3 grid | Break the grid — ever, for anything |
| One card, one sleeve; spotlight via neighbors, framing, glow | Cards spanning multiple sleeves (no 2×2 heroes) |
| Rounded rectangles 8–12px with thick 2px borders | Pills, capsules, hairline borders on chrome |
| Two moods of one warm room (day/night both first-class) | A generic dark mode that inverts the paper |
| Game-menu polish: press shadows, chunky controls, warmth | Corporate SaaS dashboard register — hard wall |
| Light and sound as ritual (window shafts, sleeving effect) | Gratuitous motion or audio outside the rituals |
