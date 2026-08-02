---
title: "Addendum: Ash's Journey PRD"
status: final
created: 2026-07-26
updated: 2026-07-28
---

# Addendum — Ash's Journey PRD

Depth gathered during PRD discovery that belongs to architecture, ADRs, or the
Rarity Translation Map rather than to the PRD's own narrative. Mechanism and
technical-how live here; the PRD states capabilities.

## The seam — why the roster moves the way it does

The mechanism is in the PRD (§1). What belongs here is the reasoning behind it.

**Why Postgres rather than the JSON file alone.** The database holds Milestones,
Citations, the Region and episode a Milestone was earned in, the Appearance that
justified it, and the explainer. Per
[ADR-0003](../../../adr/0003-rank-and-slots-are-derived-never-stored.md), Stars,
Rank, and Slots stay derived — persisting them would create a second source of
truth that drifts from the rank engine.

**Why the export exists at all.**
[ADR-0002](../../../adr/0002-encore-and-postgres-for-a-single-user-local-app.md)
mandates it because Postgres gives hand-made rulings no version history, and those
rulings represent weeks of judgment that cannot be regenerated. Committing the JSON gives
them git history and a portable backup. That it doubles as the publishable artifact
a Traveler would receive is a second benefit, not the original reason.

**Why direction rather than immutability.** Enforcing the seam by making the roster
read-only *to the App* — rather than read-only outright — is what lets the Collector
fix a bad ruling years later without the two builds collapsing into one. *Frozen*
therefore means **authoritative and app-read-only**, not unchangeable.

## Mothballing — the distinction the amendment turns on

The amendment itself is in the PRD (§1, §13). The distinction worth preserving:
sticky Verdicts were always about *re-ingestion must not re-litigate settled
rulings* — never about *the Collector may never revise a ruling*. The second
reading was never intended, and
[ADR-0001](../../../adr/0001-bulbapedia-proposes-the-collector-decides.md)'s
sticky-Verdict consequence should be reworded so it cannot be read that way again.

## Rarity Translation Map — the mapping rules

The Map is a second ruleset, not a lookup table, and it lives in the database.

**Base classification.** The Scarlet & Violet (2023+) rarity structure is
canonical. Its eight names align 1:1 with the seven Ranks and are the reference
every other era is translated against.

**Admission rule.** A Card may fill a Slot if its printed Rarity maps cleanly onto
one of the seven tiers, regardless of era. Rarities that do not map cleanly are
**excluded outright** — no review bucket, no `UNKNOWN` fallback into the Binder.
Named exclusions: `Promo` (a distribution channel, not a tier) and
`MEGA_ATTACK_RARE` (an un-normalized raw enum). This narrows the ruleset's
original *"any card, from any era, may fill a slot"*, which the Collector judged
too wide.

**Grouping.** Tiers are defined as *groups* of source Rarities rather than single
strings. This matters most at rungs 4 and 5.

**Grouping candidates for rungs 4 and 5.** The reasoning is in the PRD (§6). What
belongs here is the working shortlist: pre-2023 premium-art Rarities that carry
distinct strings and are therefore groupable — `Trainer Gallery Rare Holo`,
`Amazing Rare`, `Rare Holo Star`. Each is a judgment call the data does not settle,
of the same class as a Milestone Verdict.

The actual rarity-to-tier assignments are Map work, not PRD work.

## Card catalog ingestion

- **Do not call the live API in a request path.** `api.pokemontcg.io/v2` was
  measured during discovery at roughly 40–58% HTTP 500, reproduced live and
  corroborated by third-party uptime monitors. The original maintainers have
  redirected effort to a commercial successor, Scrydex.
- **Ingest the bulk JSON dump instead** —
  [github.com/PokemonTCG/pokemon-tcg-data](https://github.com/PokemonTCG/pokemon-tcg-data)
  publishes the same dataset as static files, which is how the community
  consumes it. Refresh on a deliberate schedule, not per request. Verify the
  repo's licence and last-commit date before relying on it.
- This supersedes the paging strategy in
  [research/pokemontcg-api.md](../../../research/pokemontcg-api.md) §2 and the
  live-call assumption in
  [integration-architecture.md](../../../integration-architecture.md) §3.
- **Fallback:** TCGdex ([tcgdex.dev](https://tcgdex.dev/)) is the credible second
  source — open, forkable data repo, no published hard rate limit — but its
  vintage-era rarity completeness is unverified. TCGCSV is pricing-only. Scryfall
  is Magic-only and PokeAPI is video-game data; both were checked and dismissed.
- **Reprints are separate records per printing**, so one species yields many
  candidates per Slot. This suits the shortlist model but inflates card counts.

## Licensing — unchanged, and still parked

Research confirmed The Pokémon Company's asset terms grant *editorial and
informational use only* and explicitly forbid commercialisation, and that no
licence anywhere — TPC's, pokemontcg.io's, or TCGdex's — covers a publicly hosted
product serving card images. Local personal use carries very low practical risk;
public hosting is unresolved.

This reinforces [ADR-0004](../../../adr/0004-personal-use-only.md) without
resolving it. Parked by the Collector's explicit decision during the brief
session. Not to be relitigated here.
