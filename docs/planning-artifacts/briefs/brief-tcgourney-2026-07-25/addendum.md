---
title: "Addendum: Ash's Journey Product Brief"
status: final
created: 2026-07-25
updated: 2026-07-26
---

# Addendum — Ash's Journey

Depth the Collector supplied that belongs downstream (PRD, architecture, ADRs)
rather than in a one-to-two page brief.

## Charting Tool — requirements gathered in discovery

The tool is used once and retired, but it must carry the Collector through
several hundred rulings without the process becoming unbearable. Stated
requirements:

- **Citation-first review.** Each Proposal presents the Bulbapedia passage and a
  link. The Collector's stated expectation is that a citation plus link is
  sufficient for a "quick review and approval" — the citation is the interface,
  not supporting metadata.
- **Throughput matters.** The Collector is willing to sit through however many
  approvals are required, but explicitly called the volume "not an easy task."
  Keyboard-driven review, bulk-accept for unambiguous cases, and resumability
  across sessions are implied.
- **Output is a frozen artifact.** A verified roster with every Milestone,
  Citation, and source link attached. This is the handoff to the app.

## Citations as a shipped feature

The Collector's framing: citations are *"a neat addition for the final product so
it could actually be verified by anyone who is curious enough."*

This upgrades provenance from an audit trail to a user-facing feature, with
consequences for the data model: citation text and source URL must survive the
freeze, be stored per Milestone (not per Entry), and be presentable in the app.
[ADR-0001](../../../adr/0001-bulbapedia-proposes-the-collector-decides.md)
already mandates storing them; what is new is that they are *displayed*.

## ADR amendments implied by this brief

1. **ADR-0001** — mechanism is unchanged and was already correct (LLM proposes
   all seven Milestones from Bulbapedia prose, each with a Citation, Collector
   rules). Only the framing shifts: Bulbapedia becomes the **sole admissible
   evidence** for every Milestone including Bond and Encounter, rather than "a
   Source, never an oracle." The Collector will not watch the series, so prose is
   the only basis a Verdict can rest on.
2. **New ADR needed** — review tooling lives outside the collection app. The app
   never implements Proposals, Verdicts, sticky-verdict logic, or re-ingestion
   conflict handling. This is the largest scope reduction available to the
   project and should be recorded so it is not accidentally undone.
3. **ADR-0004** — untouched for now. Parked by explicit decision.

## Architectural constraint: single-user now, multi-user not foreclosed

The Collector's intent is that if the project is ever shared, the app itself —
not merely the roster — should work for whoever picks it up, which implies
per-user progress tracking. That is explicitly deferred and gated on the
licensing question, but it sets a constraint on work done in the meantime:

**Build single-user, but do not bake single-user assumptions into places that
would be expensive to unpick.** Chiefly, ownership state (which Slot is filled by
which specific card) should be modelled as belonging to *a* Collector rather than
being globally scoped. The roster, Milestones, and citations are shared and
immutable and need no such treatment.

This is a shape constraint, not a feature. No accounts, auth, or multi-tenancy
are in scope — see [ADR-0004](../../../adr/0004-personal-use-only.md).

## Feasibility analysis — method, for when charting completes

The completion question cannot be answered yet, but the method is fixed:

- Total Slot count is the sum over Entries; an Entry with N Stars contributes N
  Slots, plus the ⚫ Slot when Caught.
- **Difficulty is not proportional to Slot count.** It concentrates almost
  entirely in the top three Ranks (Ultra Rare, Illustration Rare, Special
  Illustration Rare, Hyper Rare). A roster of a thousand mostly-low-rank Slots is
  a cheaper chase than one with thirty ceiling Slots.
- Therefore the feasibility metric is **the distribution of Entries by Star
  count**, which falls out of the Milestone data with no card pricing required.
- If infeasible, the adjustment levers are: raise the Star thresholds for the top
  Ranks, cap Slots per Entry, or redefine completion against the interim
  milestones in the brief.

## Deferred and rejected features

- **Pricing / market value / buying assistance.** Not rejected on principle, but
  conspicuously absent when the Collector was asked directly to name the core of
  the app. Treat as out of scope until raised.
- **Watching the series as a research method.** Explicitly rejected — *"Pokémon
  is too much of a kids show for me to sit down and watch it."* This is the
  constraint that makes Bulbapedia load-bearing.
- **Feedback and collaboration from shared users.** Explicitly not wanted. If
  published, others "tag along"; they do not contribute.

## Known state at time of writing

From the repository scan: the rank engine is complete and tested (14 unit tests),
`GET /binder` serves a computed Binder from five hand-authored seed evolution
lines, and there is no database, no frontend, and no card catalog. Charting
covers Kanto plus the Journeys returns; Johto through Alola are outstanding, as
are the Trophies, the returns, Team Rocket, the Encounters, and the Rarity
Translation Map.
