# Personal use only — a licensing constraint, not a preference

The app runs locally for one person and is not deployed, published, or distributed. This is a legal constraint, not just a scoping choice, and it is invisible in the code.

**Why:** Bulbapedia's text is **CC BY-NC-SA 2.5** — attribution, share-alike, and **non-commercial**; a roster derived from their prose is plausibly a derivative work. Separately, Pokémon TCG card art remains © The Pokémon Company: the API's terms are silent on hotlinking and demand no attribution, but `docs/research/pokemontcg-api.md` concludes that a public-facing catalogue should treat the art as third-party copyrighted material.

**Consequences**

- Single-user by design: no accounts, no auth, no multi-tenancy. That absence is deliberate, not an unfinished feature.
- Making this public or commercial is not a deployment task. It reopens both licence questions and needs a real answer before any hosting work starts.
