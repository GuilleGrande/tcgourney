# Adversarial Review — construct two units that obey every AD yet build incompatibly

**Verdict:** The seam holds against the big attacks (write authority, derived-never-stored, card-agnosticism), but five joints let compliant units diverge — all closable with tightened rules, none requiring a new decision from the user.

## Findings

### A1 (high) — Species slug authorship is unpinned
AD-4 keys chase state by `(species, rung)` and the conventions name the species slug as the cross-domain natural key, but nothing says **who mints the slug from what**. Charting (authoring "Mr. Mime", "Farfetch'd" from Bulbapedia) and collection (referencing the entry) could each apply their own slugging and never join. **Close:** the slug is authored exactly once by the charting service on `roster_entry` (rule: lowercase ASCII letters, digits, hyphens — `mr-mime`, `farfetchd`); every other domain copies it verbatim and never re-derives it from a display name.

### A2 (high) — The slug→dex join has no owner
FR-027 and the shortlist need engine output (keyed by species) joined to catalog eligibility (keyed by dex number, AD-6). No table owns the slug→dex mapping; catalog inventing a species table and charting inventing a dex column would both "comply". **Close:** `roster_entry` carries the species' National Dex number, authored during charting. This is species identity data, not card knowledge — card-agnosticism (PRD §1) is intact.

### A3 (medium) — One Entry per species is implied, never stated
The ruleset aggregates Milestones across appearances (thirty Tauros = one Entry), and `(species, rung)` is only a valid address if that holds. A charting build that allowed two `roster_entry` rows for one species would comply with every AD and break the App. **Close:** the species slug is the primary key of `roster_entry`.

### A4 (medium) — "Binder digest" is ambiguous in AD-9
A scalar hash satisfies AD-9 as written but cannot produce "N entries changed + what moved". Writer and reader are the same service, but a future builder could ship the hash version first and strand the errata slip. **Close:** the acknowledged state is a per-entry snapshot (species → rank, slots, milestone types) sufficient to name what moved — never a scalar hash.

### A5 (medium) — "Earliest record" in AD-10 is undefined
Earliest by `created_at` (accidental, review-order-dependent) and earliest by episode (domain-true) give different badge Regions. **Close:** earliest = first by canonical episode order, which every Milestone already records (FR-006); insertion order breaks ties.

### A6 (low) — Which Map version do queries read?
FR-028 makes the Map versioned; AD-5 doesn't say whether eligibility reads "current" or a pinned version. **Close:** eligibility always reads the current Map; versions are audit history only.

### A7 (low) — AD-3's mechanism could be invented two ways
Encore isolates databases per service by default; sharing requires an explicit shared `SQLDatabase` reference (encore.dev/docs/how-to/share-db-between-services). Without naming that, one builder might expose read APIs service-to-service (violating the "not through charting endpoints" intent) while another shares the DB object. **Close:** state the mechanism — one `SQLDatabase` declared in a shared module, imported by all three services; writes only in the owning service.

Not findings: frontend optimistic-update policy (feature-level, both worlds already forced through one TanStack Query layer); image-cache eviction (personal use, unbounded disk acceptable); roster export shape (single writer, single reader — the committed artifact self-documents).
