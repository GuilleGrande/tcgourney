# Rarity Translation Map — Rules

The Map is a second ruleset, not a lookup table. It lives in the database, editable and versioned (CAP-12); no canonical version exists anywhere — not commercial, not community — which makes it the project's real long pole. The actual rarity-to-tier assignments are Collector authoring work with this ruleset, not spec work.

## Base classification

The Scarlet & Violet (2023+) rarity structure is canonical. Its eight names align 1:1 with the seven Ranks and are the reference every other era is translated against.

## Admission rule

A Card may fill a Slot if its printed Rarity maps **cleanly** onto one of the seven tiers, regardless of era. Rarities that do not map cleanly are **excluded outright** — no review bucket, no `UNKNOWN` fallback into the Binder.

Named exclusions:

- `Promo` — a distribution channel, not a tier.
- `MEGA_ATTACK_RARE` — an un-normalized raw enum.

This narrows the ruleset's original *"any card, from any era, may fill a slot"*, which the Collector judged too wide. The standing promise: **any era, so long as the printed Rarity maps cleanly onto the seven standard tiers.**

## Grouping

Tiers are defined as **groups** of source Rarities, never single strings. The source data carries roughly 38 free-form rarity strings.

Grouping matters most at rungs 4 and 5 (Illustration Rare, Special Illustration Rare): printed rarity symbols were only circle/diamond/star from 1999 until 2023 — everything above Rare shared one symbol — and the source data folds card *mechanic* into the rarity string, so a Sword & Shield alternate-art VMAX and a standard VMAX are indistinguishable. The Collector chose to **group upward** rather than restrict rungs 4 and 5 to 2023+ cards.

Working shortlist of groupable pre-2023 premium-art rarities (distinct strings, therefore groupable): `Trainer Gallery Rare Holo`, `Amazing Rare`, `Rare Holo Star`. Each assignment is a judgment call the data does not settle — the same class of ruling as a Milestone Verdict.

## Unknowns

Source Rarity values absent from the Map are reported at ingestion and their Cards held out of eligibility until the Map is updated (CAP-11). Nothing defaults silently into the Binder.

## Versioning

Eligibility queries run against the **current** Map only; Map versions are audit history, never a query target (AD-5). Changing the Map re-derives eligible Cards without touching any Verdict.
