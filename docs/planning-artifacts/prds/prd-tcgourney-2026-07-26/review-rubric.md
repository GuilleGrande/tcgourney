# PRD Quality Review — Ash's Journey

## Overall verdict

The PRD has a real thesis — the seam — and it earns it: every requirement lands on
one side or the other, and §13's honest accounting of six `final` documents it
contradicts is the kind of thing most PRDs dodge. Scope honesty and strategic
coherence are the strongest dimensions. **Done-ness clarity is the weak one**, and
it is the dimension downstream story creation will lean on hardest: three FRs carry
language no engineer could test against, and one FR cannot be built at all until an
Open Item resolves.

---

## Decision-readiness — strong

Decisions read as decisions, not considerations. §6's rarity narrowing, §3's loose
reading of the charting gate, and §9's "Loyal stays ruled" are each stated with the
alternative that was rejected and why. §12 carries six genuinely open items, none
of them rhetorical — #1 defers a mechanism while settling the invariant, which is
the honest way to defer.

The document is unusually good at saying what it gave up. §6 states outright that
grouping "accepts that some grouping is Collector judgment the data does not back."
That is the sentence a weaker PRD would have smoothed away.

### Findings
- **medium** Slot-first exclusion states no cost (§11) — Card-first lookup is listed
  as out of scope with no note of what it forfeits: the app becomes unusable at the
  point of purchase, in a shop, with a card in hand. The decision is right for a
  desk tool but the reader can't weigh it. *Fix:* one clause naming the forfeit.

---

## Substance over theater — strong

Two personas, one explicitly deferred — no persona theater. No differentiation
section, correctly, because that is the brief's job and duplicating it would be
exactly the furniture this dimension warns about. The NFRs are mostly
product-specific with real numbers (700+ paragraphs, several hundred Entries)
rather than "must be scalable."

### Findings
- **low** One boilerplate NFR (§10) — *"Correctness over convenience in the domain"*
  restates ADR-0003 without adding a bound or a consequence. It is the only NFR in
  the list that would survive being pasted into an unrelated PRD. *Fix:* cut it, or
  give it a testable edge.

---

## Strategic coherence — strong

The thesis is the seam, stated in §1 before any requirement, and the feature
ordering follows it rather than following what is easy. Success criteria in §3 each
carry a counter-metric, and the counter-metrics are the interesting half — "does
not become so common that Rank stops meaning anything" is a real failure mode, not
a formality.

Feature prioritisation follows the thesis: the Charting Tool comes first because
it is the gate, and §7 defers the Map until the roster it serves exists.

No findings.

---

## Done-ness clarity — thin

The weakest dimension, and the one that matters most downstream. Most FRs carry a
testable consequence — FR-005's "at most one paragraph", FR-013's "position and
progress persist", FR-039's "physically sleeved" are all verifiable. Three are not,
and one is unbuildable.

### Findings
- **high** FR-001 is untestable — *"with enough context for the Collector to judge
  each"* names no context. Page title? Section headings? An extract? An engineer
  cannot build to this and a reviewer cannot check it. *Fix:* state the minimum a
  proposed page must present.
- **high** FR-026 is untestable — *"surfaced loudly"* has no defined behaviour.
  Logged? Blocking? A report? "Loudly" is an intention, not a requirement. *Fix:*
  name where unmapped values appear and whether they block ingestion.
- **high** FR-031 is open-ended — *"and by further categories as they prove useful"*
  makes the requirement unbounded and unclosable. *Fix:* fix the required set
  (Region, Milestone, Rank) and move the rest to Open Items or a non-goal.
- **medium** FR-011 cannot be built yet — bulk-accept operates "within a Milestone
  type", but *which* types qualify is Open Item #2. As written, the FR is a
  placeholder wearing an FR number. *Fix:* mark it explicitly blocked on #2 so it
  is not scheduled into a sprint that cannot complete it.
- **low** FR-042 straddles the line — marked *"desirable, not required"* while
  carrying an FR number. Either it is a requirement or it belongs in §12. *Fix:*
  move to Open Items alongside #4, which already covers the same gate.

---

## Scope honesty — strong

§11 is a real Out of Scope section doing real work — every entry there was an
actual decision made during discovery, not a defensive list. §13 is the standout:
naming six `final` documents this PRD contradicts, with what changes in each, is
more honesty than most PRDs manage about one.

Open-items density is six against a solo hobby project with public-sharing
intent — appropriate, and each is genuinely deferred rather than forgotten.

### Findings
- **low** Assumption not tagged inline (§12.5) — the persistence assumption exists
  only as a table row. Nothing in §1 or the addendum, where the claim actually
  operates, marks it as unconfirmed. A reader of §1 alone would take it as settled.
  *Fix:* inline `[ASSUMPTION]` at the point of use.

---

## Downstream usability — adequate

FR IDs are contiguous and unique — FR-001 to FR-042 across four sections with no
gaps or duplicates. Cross-references resolve. Sections stand alone reasonably well.

### Findings
- **low** No glossary in the document — §0 points at CONTEXT.md and declares it
  authoritative, which is right for this repo but means the PRD cannot be read
  standalone by anyone who does not have it. Acceptable for a solo project; worth
  knowing if the roster is ever published to Travelers. *Fix:* none needed now.
- **low** Casing drift on one domain term — CONTEXT.md defines **Rarity** as a
  Card's printed attribute, capitalised. The PRD writes "printed Rarity" (FR-025)
  but "source rarities" (FR-024) and "rarity strings" (FR-026). *Fix:* normalise.

---

## Shape fit — strong

Correctly shaped as a capability spec with a single supporting User Journey. A
single-operator tool does not warrant UJ density, and one journey covering the
Saturday session is exactly enough to carry the experiential requirement that the
FRs cannot.

Brownfield references are accurate: rank-engine, `SlotView`, and all four ADRs are
cited as they actually exist.

### Findings
- **low** UJ-1's protagonist is a role, not a name — "The Collector" rather than a
  personal name. Considered and judged correct here: Collector is a defined term in
  CONTEXT.md and refers to exactly one real person. Noted so the deviation is
  deliberate rather than accidental.

---

## Mechanical notes

- **ID continuity:** clean. FR-001–FR-042, contiguous, unique, all cross-references
  resolve.
- **Glossary drift:** one term (Rarity/rarity), noted above.
- **Assumptions roundtrip:** one assumption, present in the index, absent inline.
- **UJ protagonist:** present, role-named by deliberate choice.
- **Required sections:** all present for the agreed stakes and product type.
