---
title: "Product Brief: Ash's Journey"
status: final
created: 2026-07-25
updated: 2026-07-26
---

# Product Brief: Ash's Journey

## Executive Summary

Ash Ketchum's journey is over. Twenty-six seasons, nine regions, a World
Championship — a story that ran for nearly thirty years and then ended. That
ending is what makes this possible: the cast is **final and knowable**. Nothing
new will ever be added to it.

**Ash's Journey** turns that finished story into a finite, ranked Pokémon TCG
collection. Every Pokémon that mattered earns a place in a single **Binder**, and
the rarity each place demands is set by how much of the story that Pokémon lived
through — Milestones become Stars, Stars pick a **Rank**, a Rank expands into
**Slots** that a real card can fill. Pikachu, who was there for all of it, demands
a Hyper Rare. A Pokémon Ash merely caught demands a Common/Uncommon.

The result is something modern Pokémon collecting almost never offers: a chase
with **edges**. A defined list, a defined difficulty per entry, and a defined end.

There is a second thing happening here, and it is the honest reason this exists.
The Collector building it watched the first two generations and stopped. The
remaining twenty-eight years are a story he knows *of* but has never seen. So
charting the roster is not data entry — it is the act of finding out how far Ash
actually went. Nostalgia is the doorway. Discovery is what is on the other side.

## The Problem

"Gotta catch 'em all" stopped being possible a long time ago. With tens of
thousands of cards in print and more every set, collecting the Pokémon TCG has no
finish line — so collectors chase market value, chase a single set, or drift. The
hobby is enormous and completely shapeless.

Existing collection tools are built for that shapelessness. They are excellent at
recording **what you own** and silent on **what is worth owning**. Set checklists
inherit their boundaries from print runs — a manufacturing decision, not a
meaningful one. Nothing says which cards *mean* something.

Meanwhile the story that made people care in the first place sits right there,
finished and unused as a source of structure.

Two consequences are worth stating plainly:

- **No stakes.** Every slot in a set checklist is worth exactly as much as every
  other one. Nothing in the hobby distinguishes a card that means something from
  a card that merely exists.
- **The story is locked away.** Knowing which Pokémon mattered takes thirty years
  of viewing or hundreds of hours of wiki research. This Collector will not do
  the first, and the second is the problem this project solves once, for good.

## The Solution

A binder whose contents are decided by the story, and an app that makes that
binder chaseable.

The ruleset does the deciding. Seven **Milestones** — the Catch, plus Opponent,
Teammate, Encounter, Bond, Glory, and Loyal — record what a Pokémon lived through.
Each grants a **Star**; Stars flow forward up the evolution line and aggregate
across every appearance in the series. The Star count sets the **Rank**, and the
Rank expands downward into **Slots**: one per rung of the ladder it climbed. Six
Stars means seven Slots for a Pokémon that was caught, from Common/Uncommon up to
Hyper Rare. (Full mechanics live in
[`ashs-journey-ruleset.md`](../../../../ashs-journey-ruleset.md); the engine that
computes them is built and tested.)

The app is what you open on a Saturday. For every Slot it shows:

- **The Rank it demands**, and the Stars that earned it.
- **Why** — each Milestone with its citation and the moment from the story that
  justified it. Charizard is Hyper Rare and the app can tell you the six reasons.
- **What can fill it** — every real printed card, from any set and any era, whose
  rarity maps onto that Rank. A slot is rarely a single card; it is a shortlist,
  and choosing from it is part of the fun.
- **What you chose** — not merely "filled" but filled *with the 2003 Skyridge
  holo*. The binder becomes a record of decisions, not a checkbox list.

Card imagery is wanted and would make the whole thing sing, but it depends on
third-party art and is not guaranteed. See Open Questions.

## The Two Builds

The most important structural decision in this project: **the charting tool and
the collection app are separate things, and only one of them lives forever.**

**1. The Charting Tool — used once, then retired.** Bulbapedia is ingested and an
LLM proposes Milestones with citations; the Collector rules on each one. This is
several hundred judgment calls and it is real work. But it happens *before* the
journey begins, and none of it — no Proposals, no Verdicts, no re-ingestion
conflicts — needs to exist inside the app. Its output is a frozen, verified,
fully-cited roster.

**2. The Collection App — the thing that lasts.** It starts from that frozen
roster and never re-litigates it. Its entire job is the chase.

This seam keeps the expensive complexity on the disposable side.

## What Makes This Different

Honestly assessed — there is no technical moat here, and the code is not the
valuable part.

- **The ruleset is the product.** A rarity ladder derived from narrative weight
  is, as far as we know, novel. It is also the piece that transfers: someone
  could adopt it without ever running the software.
- **It is auditable.** Every Rank carries its citations. A stranger can ask "why
  is Meowth in here at all?" and be shown the answer, with a link. Subjective
  rulings made inspectable is a rare thing in a fan project.
- **It is finished by construction.** No live series to track, no roster churn,
  no maintenance treadmill. The dataset is closed the day it is charted.
- **The moat, such as it is, is the charting work itself** — the hundreds of
  hours of ruling that nobody else has bothered to do.

## Who This Serves

**The Collector (primary, and for now the only one).** Grew up on Kanto and
Johto, loves Pokémon, has no interest in watching twenty-six seasons of a
children's show. Wants a chase with meaning and boundaries, and wants to *learn*
the rest of the story as a side effect of building the list. Success for him is
opening a binder that is both a collection and a chronicle.

**The Traveler (secondary, later).** Someone who wants the same journey and would
rather walk a mapped trail than blaze one. Not a collaborator — no feedback loop
is expected or wanted — just someone welcome to tag along. Serving them is a
post-charting concern.

## Scope

**In, for the first version:**

- The frozen roster: every Entry, its Stars, its Rank, its Slots.
- Milestone display with citations and story context per Entry.
- Card candidates per Slot, drawn from the Pokémon TCG API via the Rarity
  Translation Map.
- Marking a Slot as filled by a *specific* card from a *specific* set.
- Progress across the whole Binder.

**Explicitly out:**

- **Pricing, market value, and buying assistance.** Deliberately absent — this is
  a chase, not a portfolio.
- **Proposal/Verdict review UI.** Belongs to the charting tool.
- **Accounts, auth, multi-tenancy.** Single-user by design, per
  [ADR-0004](../../../adr/0004-personal-use-only.md).
- **Anything that re-opens a settled Verdict.**

## Success Criteria

The Binder should be **completable** — that is the intent. But whether it *is*
cannot be known until the roster is charted and the Slots are counted, and the
criteria will be adjusted if the chase proves impossible.

What can be said now:

- **Charting is done** when every region, Kanto to Galar, has been walked and
  every Entry carries a cited Rank. This is the gate; nothing downstream is real
  until it closes.
- **Difficulty lives at the ceiling, not in the count.** A thousand low-Rank
  Slots are a cheaper chase than thirty Hyper Rare ones, so feasibility turns on
  how many Entries reach four Stars or more — knowable from Milestone data alone,
  before a single card is priced. (Method and adjustment levers in the addendum.)
- **Interim milestones that are reachable** if full completion proves out of
  reach: every Entry holding at least one card; every ⚫ base Slot filled; a
  region completed at a time.
- **The real signal:** the Collector reaches for this binder instead of drifting.

## Open Questions

- **Feasibility of completion.** Unanswerable until charting finishes. Carried
  deliberately.
- **Publishing and licensing.** *Parked by decision, not resolved.* The intent is
  to share the app so others can walk the journey, which by
  [ADR-0004](../../../adr/0004-personal-use-only.md)'s own terms reopens both the
  Bulbapedia CC BY-NC-SA question and the card-art question. It needs a real
  answer before any hosting work, and none is needed before then.
- **Card imagery** depends on that same answer for anything public, though not
  for local use.

## Vision

A single binder that reads as a chronicle. Open it and the whole arc is there in
physical form — a Common Caterpie near the front, a Hyper Rare Pikachu at the
back, and the rarity of every card in between telling you exactly how much that
Pokémon meant to the story. Not a set. Not an investment. A retelling.

And if it is published: a trail map anyone can pick up — the ruleset, the roster,
and every citation behind it — so that a journey charted once can be walked by
whoever wants to walk it.
