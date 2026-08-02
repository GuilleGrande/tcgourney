---
title: "PRD: Ash's Journey"
status: final
created: 2026-07-26
updated: 2026-08-01
---

# PRD: Ash's Journey

> **Status:** ready for UX, architecture, and epic creation. No phase-blockers —
> three open items, all carried deliberately (§12).

Ash Ketchum's journey is finished, so its cast is final and knowable. **Ash's
Journey** turns that closed story into a finite, ranked Pokémon TCG collection:
every Pokémon that mattered earns a place in a single **Binder**, and the rarity
each place demands is set by how much of the story that Pokémon lived through.

Product context, motivation, and market framing live in the
[product brief](../../briefs/brief-tcgourney-2026-07-25/brief.md). The domain
vocabulary is [CONTEXT.md](../../../../CONTEXT.md) and is authoritative — this
document uses it exactly. Mechanism and technical-how live in
[addendum.md](./addendum.md).

---

## 1. The Seam

The central structural claim of this product is that **two builds exist and only
one of them is used continuously.** Every requirement below belongs to one side or
the other, and the boundary is the reason the expensive complexity stays contained.

| | **The Charting Tool** | **The Collection App** |
|---|---|---|
| **Job** | Produce the roster | Chase the cards |
| **Lifespan** | Used heavily once, then mothballed | Runs forever |
| **Writes the roster?** | Yes — exclusively | Never |
| **Knows about Cards?** | **Never** — entirely card-agnostic | Entirely |
| **Knows about Proposals and Verdicts?** | Entirely | Never |

**The contract between them is the roster**: every Entry, its Milestones, and for
each Milestone its Citation, Region, episode, Appearance, and explainer.

**How it moves.** Postgres is the source of truth. A command exports the complete
roster to JSON committed to the repository (FR-019) — both the git history that
hand-made rulings would otherwise never get, and the publishable artifact a Traveler
would receive. A version stamp (FR-020) means a re-export is visible rather than
silent.

**Direction, not immutability, enforces the seam.** Corrections flow one way —
Charting Tool writes, roster exports, App reads. This is what lets the Collector fix
a bad ruling years later without dissolving the separation.

> **Amends the brief.** The brief describes the Charting Tool as *"used once, then
> retired"* and puts *"anything that re-opens a settled Verdict"* out of scope. The
> Collector requires the ability to fix any ruling at any time. The tool is
> **mothballed, not retired**. Verdict stickiness still holds against
> *re-ingestion* — it was never meant to bind the Collector.

---

## 2. Users

**The Collector** — primary, and for now the only one. Grew up on Kanto and Johto,
has no intention of watching twenty-six seasons, and wants a chase with meaning and
boundaries. He is both the author of the roster and its only reader. Charting is
not data entry for him; it is how he finds out how far Ash actually went.

**The Traveler** — secondary, deferred. Someone who would rather walk a mapped
trail than blaze one. No feedback loop is wanted. Serving them is gated on the
licensing question in §9 and is out of scope here.

---

## 3. Goals and Success Criteria

| Goal | Measure | Counter-metric |
|---|---|---|
| Charting completes | Every chasable Pokémon identified, ranked, and its Slots identified | Time-to-complete does not outrun the Collector's patience — throughput (FR-011, FR-012, FR-013) is what protects this |
| The Binder is chaseable | Every Slot has at least one eligible Card, by construction (§7) | Substitution rules do not become so common that Rank stops meaning anything |
| The chronicle reads as a chronicle | Every Milestone carries an explainer and a working citation | Explainer authoring does not become the bottleneck that stalls charting — hence FR-005, LLM drafts and Collector approves |
| The Collector reaches for it | He opens the Binder instead of drifting | The App does not become a chore with its own backlog |

**Charting is done when every chasable Pokémon has been identified, ranked, and its
fillable Slots identified.** This is the gate; nothing downstream is real until it
closes.

**Completion has fallbacks.** Whether the full Binder is completable cannot be
known until the roster is charted and the Slots counted, so the brief names interim
milestones that remain reachable if it is not: **every Entry holding at least one
Card**, **every ⚫ base Slot filled**, and **a Region completed at a time**. These
are not consolation prizes — they are the progress views FR-031 must be able to
express, which is why they belong here and not only in the brief.

*Slots here are the rungs an Entry opens — pure output of its Milestones, per
[ADR-0003](../../../adr/0003-rank-and-slots-are-derived-never-stored.md). Whether
eligible Cards exist to fill them is checked later, not here; see §7.*

---

## 4. User Journey

### UJ-1 — The Saturday Session

**The Collector**, who charted this roster himself and hasn't opened it in three
weeks, sits down with an hour.

He opens the Binder. The front page tells him where he stands overall, and he
slices it **by Region**, because that is how he thinks about the journey. Kanto is
nearly done; Sinnoh has barely started. He came to see the shape of things, not
with a plan.

He drops into Kanto and finds **Bulbasaur** — Ultra Rare, four Slots, three
filled. The Entry shows him *why*: Catch, Teammate, Bond, Loyal, each with a
paragraph telling him what happened and the citation behind it. He reads the Loyal
explainer even though he wrote it, because he'd half-forgotten the story.

He opens the empty Ultra Rare Slot and gets **a shortlist, not a card** — every
real printing whose Rarity maps to that Rank, across eras. The modern one has
better art; the older one means more. **He chooses.** The Slot becomes *Chasing*,
and the App remembers the decision.

Then he leaves. The hunting happens elsewhere — a shop, a listing, a trade.

**Eleven days later** the card arrives. He sleeves it in the physical binder, opens
the App, and marks the Slot **Filled** — recorded not as *filled* but as *filled
with that specific card, from that specific set*. Kanto ticks forward.

---

## 5. Part A — The Charting Tool

Its entire job is producing a roster the App can trust. Throughput is a hard
requirement, not a nicety: the roster is several hundred Entries and upwards of
seven hundred explainer paragraphs.

### 5.1 Source Scoping

Ingestion is gated by human approval *before* it runs, so bad Proposals are never
generated rather than reviewed and discarded.

- **FR-001** — Before ingesting, the tool proposes the set of Bulbapedia pages it
  intends to read. Each proposed page presents its **title**, its **URL**, and the
  **Milestone types it is expected to yield**.
- **FR-002** — The Collector approves or rejects each proposed page. Only approved
  pages are ingested.
- **FR-003** — The approved manifest is recorded, so a later pass shows what was
  read and what was declined.

> Bulbapedia carries a single page listing all of Ash's Pokémon. Candidate
> discovery for the Catch category is therefore near-free, which makes it the
> natural first pass and the one that makes the Binder take visible form fastest.

### 5.2 Proposal Generation

- **FR-004** — An LLM reads approved pages and proposes Milestones, spanning all
  seven types.
- **FR-005** — Each Proposal carries a drafted explainer of **at most one
  paragraph** describing how the Pokémon earned that Milestone. The LLM drafts;
  the Collector edits or approves. This is the decision that makes the volume
  survivable.
- **FR-006** — Each Proposal records the **Region**, the **episode**, and the
  **Appearance** that justified it.
- **FR-007** — A Proposal without a Citation cannot be created. Citation is the
  interface, not supporting metadata.

### 5.3 Verdict Review

- **FR-008** — The review queue is ordered **by Milestone type** — every Catch,
  then every Teammate, and so on. Difficulty tracks type because evidence quality
  does: Bulbapedia has structured lists for Catch, Teammate, Opponent, and Glory,
  and only prose for Bond and Encounter.
- **FR-009** — Each Proposal presents its Citation passage and a working link as
  the primary content of the review.
- **FR-010** — The Collector accepts, rejects, or edits the explainer before
  accepting.
- **FR-011** — **Bulk-accept** operates within a Milestone type, so an unambiguous
  category can be cleared wholesale. Every Milestone type qualifies — the
  Collector's ruling (2026-08-01, resolving Open Item #2); whether to use it on a
  given pass stays his per-session call.
- **FR-012** — Review is keyboard-driven end to end.
- **FR-013** — Review is resumable across sessions; position and progress persist.
- **FR-014** — Verdicts are **sticky against re-ingestion**. Re-reading a Source
  never resurrects a rejected Proposal; it only flags Sources whose content
  changed.
- **FR-015** — When a Loyal Verdict is accepted but the Entry's Milestone Regions
  do not span beyond its original Region, the tool **warns without blocking**.
  Derived-as-a-check, not derived-as-truth — the Collector keeps the final word.

### 5.4 Evidence Beyond Bulbapedia

Encounters have no enumeration anywhere; they must be derived from individual
Pokémon pages, and the Collector will research some off-wiki.

**Encounters run last, as a separate exploratory phase**, once Bulbapedia has been
exhausted. This follows from by-type ordering (FR-008): Encounter is the type with
the weakest evidence, so it is the type where the Collector's own research is worth
spending, and it is worth spending only after everything cheaper is done.

- **FR-016** — The Collector can create a Milestone manually, carrying a
  non-Bulbapedia Citation: a URL, a timestamp, and his own words.

> No video ingestion or transcription pipeline exists. Off-wiki research happens
> conversationally outside the tool; only the resulting ruling and citation land
> in it. **Amends [ADR-0001](../../../adr/0001-bulbapedia-proposes-the-collector-decides.md):**
> Bulbapedia is the **primary source and first pass**, not the sole admissible
> evidence.

### 5.5 Correction

- **FR-017** — Any settled Verdict can be revised at any time, including after
  charting is declared done.
- **FR-018** — Revising a Verdict triggers a re-export and advances the roster's
  version stamp, so the App can never silently serve a stale roster.

### 5.6 The Roster Artifact

- **FR-019** — A command exports the complete roster to JSON committed to the
  repository, per
  [ADR-0002](../../../adr/0002-encore-and-postgres-for-a-single-user-local-app.md).
  This is both the git history for hand-made rulings and the publishable artifact.
- **FR-020** — The roster carries a **version stamp** identifying when it was
  charted.

### 5.7 The Completion Gate

- **FR-021** — The tool reports progress **per Milestone type** across the roster,
  so "have I finished the Opponent pass?" has an answer.
- **FR-022** — The tool reports charting-done status against all three conditions:
  every chasable Pokémon **identified**, **ranked**, and its **Slots identified**.
  All three are answerable from Milestone data alone — no card catalog required.

---

## 6. Cross-Cutting — The Rarity Translation Map

The Map is neither charting work nor app work. It is a **third artifact with its
own ruleset**, and no canonical version of it exists anywhere — not commercial,
not community. It is the project's real long pole.

It lives in the database and is editable.

- **FR-023** — The card catalog is ingested from a **static bulk source**, not
  from live API calls in a request path. *(Rationale and measured evidence:
  [addendum](./addendum.md).)*
- **FR-024** — Each of the seven Ranks is defined as a **group of source
  Rarities**, not a single string. The Scarlet & Violet (2023+) classification is
  canonical; every other era is translated against it.
- **FR-025** — A Card is eligible for a Slot only if its printed Rarity maps
  **cleanly** onto that Slot's Rank. Rarities that do not map cleanly are
  **excluded outright** — no review bucket, no fallback into the Binder. Named
  exclusions include `Promo` and `MEGA_ATTACK_RARE`.
- **FR-026** — Source Rarity values absent from the Map are **reported at
  ingestion**, and the Cards carrying them are **held out of eligibility** until
  the Map is updated. Nothing defaults silently into the Binder.
- **FR-027** — The system detects **species × Rank combinations with zero eligible
  Cards** and surfaces them, so substitution rules (§7) can be authored where they
  are actually needed.
- **FR-028** — The Map is editable and versioned; changing it re-derives eligible
  Cards without touching any Verdict.

> **Amends the ruleset.** The Outfitter's Note promises *"any card, from any era,
> may fill a slot."* The Collector judged this too wide. The promise is now: **any
> era, so long as the printed Rarity maps cleanly onto the seven standard tiers.**
>
> Rungs 4 and 5 need grouping specifically because printed Rarity symbols were only
> circle/diamond/star from 1999 until 2023 — everything above Rare shared one
> symbol, and the source data folds card *mechanic* into the Rarity string, so a
> Sword & Shield alternate-art VMAX and a standard VMAX are indistinguishable. The
> Collector chose to **group upward** rather than restrict rungs 4 and 5 to 2023+
> cards.

---

## 7. Cross-Cutting — No Unfillable Slot

**Every Slot must be fillable.** This is an invariant of the product, not a hope.

Where a species reaches a Rank for which no eligible Card was ever printed, an
**equivalence rule** is defined so the Slot can still be satisfied — the
Collector's own example being that three Special Illustration Rares might stand in
for one Hyper Rare.

- **FR-029** — Where FR-027 identifies an unfillable Slot, an equivalence rule can
  be defined that satisfies it using Cards of a lower Rank.

**The mechanism is deliberately deferred** — it will be settled when the unfillable
set is actually known. What is settled now is that the *ladder bends, the chase
does not break*.

**When this happens.** Fillability is checked **after** charting closes, not as
part of it (§3). The sequence is: charting completes from Milestone data alone →
catalog and Map are built → FR-027 reveals which Slots have no eligible Card →
equivalence rules are authored for those and only those. This keeps the Charting
Tool card-agnostic and defers the hardest, least-precedented work (the Map) until
the roster it serves actually exists.

> **Consequence for whoever builds this:** an equivalence rule means a Slot may be
> satisfied by **N Cards of a lower Rank**. That breaks the current one-Slot-one-Card
> assumption in [rank-engine](../../../../packages/rank-engine/src/rank-engine.ts)
> and in `SlotView`. The rule is deferred; the data model must not foreclose it.

---

## 8. Part B — The Collection App

Starts from a charted roster and never re-litigates it. It implements no Proposal,
no Verdict, and no re-ingestion conflict handling — that is the largest scope
reduction available to this project.

### 8.1 The Binder

- **FR-030** — Opening the Binder shows **overall progress** first.
- **FR-031** — Progress is **filterable by category**. The required set is **by
  Region**, **by Milestone**, and **by Rank**. Pre-approved candidates — by
  Evolution Line, by card era, by status filled/empty — may be added
  opportunistically (Open Item #7, resolved 2026-08-01).
- **FR-032** — The App treats the roster as **read-only**. It exposes no path to
  change a Milestone, a Citation, or an explainer.

### 8.2 The Entry

- **FR-033** — An Entry shows its **Rank** and the Stars that earned it.
- **FR-034** — An Entry shows **each Milestone it holds**, with its explainer
  paragraph, its Citation, and a working link to the source. Charizard is Hyper
  Rare and the App can tell you the six reasons.
- **FR-035** — An Entry shows its **Slots**, low Rank to high.

### 8.3 The Slot

- **FR-036** — A Slot shows **every eligible Card** — a shortlist, not a single
  answer — drawn from the catalog through the Map, spanning sets and eras.
- **FR-037** — The Collector can choose a specific Card for a Slot, which sets the
  Slot to **Chasing**. The choice persists.
- **FR-038** — The Collector can mark a Slot **Filled**, recording the *specific*
  Card from the *specific* set that fills it.
- **FR-039** — A Slot is Filled **only when the Card is physically sleeved in the
  binder** — not when bought, not when it arrives.
- **FR-040** — **Only Filled counts toward progress.** Chasing does not.

### 8.4 The Hunt

- **FR-041** — The App lists every Slot currently **Chasing** — the Collector's
  hunting list, and what makes the weeks between choosing and acquiring useful.

---

## 9. Constraints

**Single-user, local, not deployed.**
[ADR-0004](../../../adr/0004-personal-use-only.md) makes this a **legal**
constraint, not a scoping preference: Bulbapedia's text is CC BY-NC-SA 2.5
(non-commercial, share-alike) and a derived roster is plausibly a derivative work;
Pokémon card art remains © The Pokémon Company. Research conducted for this PRD
confirmed that The Pokémon Company's own asset terms grant *editorial and
informational use only* and explicitly forbid commercialisation, and that **no
licence anywhere**
covers a publicly hosted product serving card images. No accounts, no auth, no
multi-tenancy. That absence is deliberate.

**Do not bake single-user assumptions into expensive places.** Ownership state —
which Card fills which Slot, and which Slots are Chasing — should belong to *a*
Collector rather than being globally scoped. The roster, Milestones, and Citations
are shared and immutable and need no such treatment. This is a shape constraint,
not a feature.

**Rank and Slots are derived, never stored** —
[ADR-0003](../../../adr/0003-rank-and-slots-are-derived-never-stored.md). The
database persists Milestones; everything downstream is computed.

**The Collector decides.** Sources propose; they never rule. This holds for all
seven Milestones, including Loyal, which the Collector explicitly chose to keep
ruling rather than derive.

---

## 10. Non-Functional Requirements

- **Throughput is a hard requirement.** Several hundred Entries and upwards of
  seven hundred explainer paragraphs. Keyboard-driven review, bulk-accept, and
  resumability (FR-011 to
  FR-013) are what make charting finishable rather than abandoned.
- **The rank engine stays pure.** No I/O, no async, no framework coupling, no
  dependencies. If it ever needs one, the seam has been drawn in the wrong place.
- **No live third-party API in a request path.** Card data is ingested ahead of
  time. The measured reliability of the live source does not support anything else.
- **The roster survives the tooling.** Committed JSON export means the hand-made
  rulings outlive any database, any framework, and any rewrite.
- **Provenance survives the freeze.** Citation text and source link are stored per
  Milestone, not per Entry, and are displayed to the reader.
- **Finished by construction.** The story is over, so there is no live series to
  track, no roster churn, and no maintenance treadmill. This is why the product
  needs no update pipeline, no change feed, and no re-sync mechanism — their
  absence is a property of the domain, not an unfinished feature.

---

## 11. Out of Scope

- **Pricing, market value, and buying assistance.** Deliberately absent — this is a
  chase, not a portfolio.
- **Card-first lookup** — "does this card in my hand fit anywhere?" The App is a
  desk tool used before and after the hunt, not during it. **What this forfeits:**
  the App is of no use at the point of purchase — standing in a shop with a card in
  hand, the Collector has no way to ask whether it fits. Accepted deliberately.
- **Video ingestion or transcription.** Off-wiki research happens outside the tool.
- **Confidence scoring of Proposals.** By-type ordering removes the need.
- **Proposal and Verdict review inside the Collection App.**
- **Accounts, auth, multi-tenancy, deployment, publishing.**
- **Anything that *automatically* re-opens a settled Verdict.** The Collector may
  always revise; re-ingestion may not.

---

## 12. Open Questions and Deferred Decisions

| # | Item | Status |
|---|---|---|
| 1 | **Equivalence rules** — what stands in for an unfillable Slot | Deferred until FR-027 reveals the actual unfillable set. Invariant settled (§7); mechanism open. |
| 2 | **Which Milestone types qualify for bulk-accept** | **Resolved (2026-08-01).** All seven types qualify, by the Collector's ruling; use per pass is his call. FR-011 unblocked. |
| 3 | **Publishing and licensing** | Parked by explicit decision. Needs a real answer before any hosting work; none needed before then. |
| 4 | **Card imagery** | **Resolved for local use (2026-08-01).** In scope as a capability (spec CAP-22): art served from the catalog's disk cache, degrading to text-only. Anything public remains gated on #3. |
| 5 | **Roster persistence shape** | **Resolved.** Confirmed by the Collector; now stated as a decision in §1. |
| 6 | **Loyal's three examples** | The ruleset names Charizard, Pidgeot, and Primeape as Loyal. Under strict geography, Charizard's *stated reason* provably fails. If the other two also fail, the geographic definition is likely wrong. Charting settles it. |
| 7 | **Further progress filter categories** | **Resolved (2026-08-01).** Candidates pre-approved: by Evolution Line, by card era, by status filled/empty — opportunistic, not required. Region, Milestone, and Rank remain the required set (FR-031). |

---

## 13. Documents This PRD Amends

Each of these is `final` today and states something this PRD contradicts. None
should be quietly overwritten.

| Document | What changes |
|---|---|
| [ashs-journey-ruleset.md](../../../../ashs-journey-ruleset.md) | *"Any card, from any era"* narrows to *maps cleanly onto the seven tiers* (§6). Charizard's Loyal citation is wrong under strict geography — the Battle Frontier is in Kanto (§12.6). The Trail Ahead says *"chart the full catch list, region by region"*; charting now proceeds **by Milestone type**, not by Region (FR-008). |
| [brief.md](../../briefs/brief-tcgourney-2026-07-25/brief.md) | Charting Tool is **mothballed, not retired** (§1). *"Every real printed card, from any set and any era"* narrows (§6). |
| [ADR-0001](../../../adr/0001-bulbapedia-proposes-the-collector-decides.md) | Bulbapedia is **primary source and first pass**, not sole admissible evidence (§5.4). Verdict stickiness binds re-ingestion, never the Collector (§5.5). Ingestion gains a **source-scoping approval gate** the ADR does not describe (§5.1) — an addition rather than a contradiction, but it changes the mechanism the ADR documents. |
| [research/pokemontcg-api.md](../../../research/pokemontcg-api.md) | Live-API paging strategy superseded by static bulk ingestion (§6, FR-023). |
| [integration-architecture.md](../../../integration-architecture.md) | Same — the planned outbound live-API integration is not the shape to build. |
