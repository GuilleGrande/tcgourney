# Epic 1 Context: The Journey Charted — Sources, Proposals, and Drafted Explainers

<!-- Generated from planning artifacts. Regenerate with compile-epic-context if planning docs change. -->

## Goal

This epic builds the front half of the Charting Tool: the Collector proposes and approves the Bulbapedia pages to be read, those approved pages are ingested with provenance, and an LLM drafting pipeline turns them into cited, drafted Proposals across all seven Milestone types — a fully populated review queue waiting for Epic 2 to settle it. It matters because the roster is several hundred subjective judgment calls and 700+ explainer paragraphs that exist nowhere and cannot be derived; only a pre-drafted, batch-produced queue makes that volume survivable. Story 1.1 is also the brownfield foundation for the whole project: the first `SQLDatabase`, the three-service skeleton, and the write-authority seam that every later story depends on.

## Stories

- Story 1.1: Three Services, One Database, the Binder Preserved
- Story 1.2: Propose the Reading List
- Story 1.3: Approve or Decline Each Page
- Story 1.4: Ingest Approved Sources with Provenance
- Story 1.5: Draft Proposals Across All Seven Types

## Requirements & Constraints

- **Human approval gates ingestion.** Pages are proposed with title, URL, and the Milestone types each is expected to yield; nothing is fetched until the Collector approves. Bad Proposals are never generated rather than reviewed and discarded.
- **The manifest is permanent record.** Every Source carries its current state — proposed, approved, declined, ingested, failed — so a later pass can answer "what was read and what was declined." Declined pages are never fetched and yield no Proposals.
- **Citation is the interface, not metadata.** A Proposal without a Citation (passage + working source link) cannot be created; enforce this as a database constraint, never as a prompt instruction.
- **Every Proposal records** the species, the Milestone type, the Region, the episode, the Appearance that justified it, and a drafted explainer of **at most one paragraph**.
- **All seven Milestone types are in scope** — Catch (the ⚫ base), Opponent, Teammate, Encounter, Bond, Glory, Loyal — each earned at most once per Entry. Bulbapedia has structured lists only for Catch, Teammate, Opponent, and Glory; Bond and Encounter exist only in narrative prose.
- **Candidate sources:** the master "Ash's Pokémon" listing, per-Pokémon pages, and the anime Legendary-Pokémon category (Encounter has no enumeration anywhere). Off-wiki Encounter research is a later phase, not this epic.
- **Sources advise; they never rule.** Nothing in this epic settles a Verdict or creates a Milestone — that is Epic 2.
- **Every repeatable operation is idempotent.** Re-running discovery creates no duplicate Sources; re-running drafting over unchanged Sources creates no duplicate Proposals. A fetch failure on one Source is isolated and independently retryable.
- **Throughput is a hard requirement.** Drafting is a batch job per Milestone type so that review never waits on an API call and bulk-accept can later operate on fully drafted categories.
- **Restructure regression gate (1.1):** `GET /binder` keeps working off real tables, an empty roster returns an empty binder rather than an error, and CI (typecheck + all tests) stays green.

## Technical Decisions

- **Write authority is the seam.** One Encore app, one Postgres database, three services — `charting` (writes `roster_*`), `catalog` (`catalog_*`), `collection` (`collection_*`). Each service is the sole writer of its prefixed tables; cross-domain access is read-only SQL. One `SQLDatabase` named `tcgourney` is declared in `charting/db.ts` (which anchors the migrations) and reached everywhere else through the plain, non-service module `shared/db.ts` via `SQLDatabase.named()` — Encore isolates DBs per service by default, so every crossing is explicit. `charting` is card-agnostic and never touches `catalog_*`/`collection_*`.
- **Docker Desktop is a hard prerequisite** as of Story 1.1, which declared the first `SQLDatabase`. The Encore CLI itself runs only inside WSL on this machine — see `project-context.md`.
- **Derived is never stored.** The database persists authored facts only — Sources, Proposals, Citations, Milestones. Stars, Rank, and Slots are recomputed on every read via the pure `@tcgourney/rank-engine` (no I/O, no framework imports, engine `readonly`/`Set` types never leak onto the wire). No column ever caches a derived value.
- **The species slug is minted exactly once**, by the charting service — lowercase ASCII kebab (`mr-mime`, `farfetchd`) — and is `roster_entry`'s primary key (one Entry per species, so thirty Tauros are one Entry). It is copied verbatim across domains, never re-derived from a display name. `roster_entry` also carries the species' National Dex number, authored during charting as species identity (not card knowledge).
- **Migrations are per-service and sequential** (`migrations/*.up.sql`); each story creates only the tables it needs, no create-everything-upfront schema.
- **Provenance is stored per Source:** the MediaWiki plaintext extract with its revision id, content hash, and fetched-at timestamp. The hash is the change signal later stickiness logic checks against — this epic only records it.
- **All LLM work lives in the charting service.** The Claude API key is an Encore secret, never client-side; model `claude-opus-5` via `@anthropic-ai/sdk`. Batch transport (Anthropic Batches API vs sequential calls) is an open implementation detail, not a fixed decision.
- **The existing seed roster dies here.** `roster/binder.ts` and `SEED_LINES` dissolve into the `collection` service, which computes the binder from `roster_entry` and `roster_milestone`.
- **One frontend data path:** all server data flows through the single generated Encore client wrapped in TanStack Query — no hand-rolled `fetch` — and the client is regenerated (`npm run gen:client`) after every endpoint change.
- **Naming is domain-driven.** The ubiquitous language (Entry, Milestone, Proposal, Verdict, Source, Slot, Rank, Citation, Appearance) is authoritative in code and schema; tables are `snake_case` with the domain prefix; timestamps are `timestamptz` in the DB and ISO 8601 UTC on the wire; errors are Encore `APIError` codes with no custom envelopes.

## UX & Interaction Patterns

The charting frontend is deliberately utilitarian and sits **outside** the binder UX contract — no design tokens, no R3F scene, no binder metaphor applies here. Only its routes (the frontend's `charting/` world) and its data discipline are fixed. The surfaces this epic needs are plain: a Source manifest listing every page with its state and fetch timestamp, and a per-Milestone-type count of pending Proposals so the review queue is visibly taking form.

## Cross-Story Dependencies

- Ordering inside the epic is strictly linear and backward-only: 1.1 → 1.2 → 1.3 → 1.4 → 1.5.
- Story 1.1 is the foundation for every later epic. Epic 3 (catalog and the Rarity Translation Map) can proceed in parallel as soon as 1.1 lands.
- Epic 2 (review, Verdicts, export) consumes this epic's output exclusively; 1.4's revision id and content hash are the groundwork for Epic 2's sticky-Verdict change flagging.
- Retiring `SEED_LINES` in 1.1 removes the only dev roster data. Frontend binder work in Epic 4 will need a fixture strategy (a dev-only roster fixture or importing the exported roster JSON); nothing forecloses it, but it is currently unplanned — worth deciding while drafting 1.1.
- Known gap to close when drafting Story 1.5: it has idempotent re-run criteria but no stated behavior for a drafting batch that fails partway through a type.
