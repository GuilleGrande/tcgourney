# Bulbapedia proposes, the Collector decides

The roster — which Pokémon earned which Milestones — is several hundred subjective judgment calls that exist nowhere and cannot be derived. We ingest Bulbapedia (MediaWiki API, clean plaintext extracts) and use an LLM to turn it into **Proposals** for all seven Milestones, each carrying a Citation; the Collector accepts or rejects each one. Bulbapedia is a Source, never an oracle.

**Why not trust the derivation.** Bulbapedia's structured lists cover Catch, Teammate, Opponent, and Glory, but Bond and Encounter are our inventions and appear in no wiki field — they only exist in narrative prose. And where Bulbapedia does have structure, its categories don't match ours: its "Ash won it" list includes 25 competitions, among them a bug-catching contest and a cake-decorating challenge, none of which are Trophies under our ruleset. A source that disagrees with the ruleset this sharply cannot be applied unsupervised.

**Consequences**

- Every Milestone stores its provenance and the passage that justified it. A Proposal without a Citation cannot be judged, so this is not optional metadata.
- **Verdicts are sticky.** Re-ingestion never resurrects a rejected Proposal; it only flags Sources whose content has changed. Without this, every re-crawl would re-litigate hundreds of settled rulings.
- Tier 3 (Encounter) has no enumeration source anywhere, so candidates come from `Category:Legendary Pokémon (anime)` plus manual additions — faithful to the ruleset's own statement that Encounter exists "mainly to give Legendaries a chasable path."
