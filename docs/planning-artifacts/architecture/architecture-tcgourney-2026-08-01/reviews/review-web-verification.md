# Web-Verification Review — is every committed decision reality-checked?

**Verdict:** Pass. Every Stack row and fit claim traces to a live web check (2026-08-01) or to the repo's own source-cited research notes; two low-severity notes.

## Verified

| Claim | Check |
| --- | --- |
| React Three Fiber ^9.6 pairs with React 19 (compat 19.0–19.2) | npm/@react-three/fiber, pmndrs releases (web, 2026-08-01) |
| @react-three/drei ^10.7 (drei Html = real DOM projected into the scene) | npm/@react-three/drei 10.7.7; drei docs |
| three r185 current | mrdoob/three.js releases |
| @tanstack/react-query ^5.101 current | TanStack/query releases (2026-06-27 train) |
| Vite ^8.2 current; v8 = Rolldown bundler | vite.dev blog (8.0 2026-03-12; 8.2 published ~2026-07-31) |
| Encore.ts ^1.57.10; Node 24; Docker prerequisite | repo research docs/research/encore-ts-setup.md, source-cited 2026-07-16 against encore.dev |
| Multiple Encore services sharing one Postgres DB; per-service isolation by default | encore.dev/docs/how-to/share-db-between-services (web, 2026-08-01) |
| Encore secrets for the Anthropic key | encore.dev docs (repo research §secrets) |
| pokemon-tcg-data bulk JSON active | github.com/PokemonTCG/pokemon-tcg-data, last update 2026-07-17 |
| Live pokemontcg.io API unfit for request path (40–58% 500s); CDN mid-migration to Scrydex | repo research docs/research/pokemontcg-api.md (measured live) + PRD research memlog |
| claude-opus-5 as the model; @anthropic-ai/sdk; structured outputs | claude-api reference skill (authoritative, cached 2026-06), not training memory |
| MediaWiki API plaintext extracts for Bulbapedia | ADR-0001 (adopted, working assumption of the existing design) |
| TypeScript ^7.0.2, Vitest ^4.1.10 | existing repo manifests (adopted) |

## Findings

- **(low)** `@anthropic-ai/sdk` is listed as "latest" — the only unpinned Stack row. Acceptable for seed; pin the exact version at first implementation.
- **(low)** React "^19.2": R3F's bundled reconciler tracks React minor versions closely; on a future React 19.3+ upgrade, re-check R3F compatibility before bumping.

Nothing was found asserted from training data without a web or in-repo verification trail.
