# Card Catalog — Sourcing

Why CAP-11 mandates static bulk ingestion, and where the data comes from.

## Primary source

[github.com/PokemonTCG/pokemon-tcg-data](https://github.com/PokemonTCG/pokemon-tcg-data) — the same dataset as the live API, published as static JSON files; how the community consumes it. Active as of 2026-08-01 (last update 2026-07-17). Verify the repo's licence and last-commit date before each reliance. Card ids are taken verbatim as the catalog's card ids (spine conventions).

Refresh on a deliberate schedule, never per request.

## Why not the live API

`api.pokemontcg.io/v2` was measured during discovery at roughly **40–58% HTTP 500**, reproduced live and corroborated by third-party uptime monitors. The original maintainers have redirected effort to a commercial successor (Scrydex), and the image CDN is mid-migration to a new owner. No live call may sit in any request path (AD-7); card images are fetched from the CDN once by the catalog service, cached to local disk, and served from disk thereafter.

## Fallback and dismissed sources

- **TCGdex** ([tcgdex.dev](https://tcgdex.dev/)) — the credible second source: open, forkable data repo, no published hard rate limit. Its vintage-era rarity completeness is **unverified**.
- **TCGCSV** — pricing-only. Dismissed.
- **Scryfall** — Magic-only. Dismissed.
- **PokeAPI** — video-game data, not TCG. Dismissed.

## Data shape consequence

Reprints are separate records per printing, so one species yields many candidates per Slot. This suits the shortlist model (CAP-19) but inflates card counts.
