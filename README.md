# tcgourney — Ash's Journey

A web app to **plan, identify, and manage** a Pokémon TCG collection that retraces Ash
Ketchum's anime journey. Every Pokémon that *mattered* to the story earns a place in a
single Binder, and the rarity of card each place demands is set by how many story
**Milestones** that Pokémon lived through.

> One binder to retrace an entire journey — from a boy leaving Pallet Town to the
> first-ever World Champion.

See [`ashs-journey-ruleset.md`](./ashs-journey-ruleset.md) for the full ruleset and
[`CONTEXT.md`](./CONTEXT.md) for the domain glossary.

## How ranks work

A Pokémon accrues **Stars** from six story Milestones — Opponent, Teammate, Encounter,
Bond, Glory, Loyal — on top of the **Catch** (the ⚫ base). Stars flow *up* the evolution
line and aggregate across every appearance; the Star count picks a **Rank**
(Common/Uncommon → Hyper Rare), and the Rank expands into **Slots**: one card per rank
rung, with the ⚫ rung only if the Pokémon was caught. Any real card from any set fills a
Slot when its rarity maps to that Slot's Rank.

## Stack

- **Backend:** [Encore.ts](https://encore.dev) — type-safe APIs + Postgres. App id `tcgourney-46xi`.
- **Frontend:** Vite + React, binder-first UI. *(coming)*
- **Card data:** the [Pokémon TCG API](https://pokemontcg.io), for the card catalog and the rarity → rank translation map.
- **Rank engine:** [`packages/rank-engine`](./packages/rank-engine) — pure, dependency-free domain logic, fully unit-tested.

## Develop

Prereqs: Node 24+, the [Encore CLI](https://encore.dev/docs/ts/install), and Docker
Desktop running (Encore provisions local Postgres via Docker).

```bash
npm install                          # install workspace deps
npm test -w @tcgourney/rank-engine   # run the rank-engine tests
encore run                           # start the backend (API :4000, dashboard :9400)
```

## Methodology

Built with the [Matt Pocock engineering skills](https://github.com/mattpocock/skills)
flow: domain-modeling → research → TDD → implement → review.
