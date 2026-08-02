import type { Milestone } from "@tcgourney/rank-engine";

/** How a page came to be proposed: the master listing, a Pokémon Ash owned, or a Legendary. */
export type SourceKind = "roster_listing" | "pokemon_page" | "legendary_page";

/**
 * Where a Source stands on its way through the gate. Only `proposed` is ever written
 * here; the manifest is a permanent record, so the whole lexicon ships with it.
 */
export type SourceState = "proposed" | "approved" | "declined" | "ingested" | "failed";

/**
 * A page as the wiki describes itself: what it is called, and where it lives. The
 * URL is MediaWiki's own — its encoding is authoritative and never rebuilt by hand.
 * `fragment` is the section a redirect named on the way here, if it named one.
 */
export interface WikiPage {
  pageId: number;
  title: string;
  url: string;
  fragment?: string;
}

/** A page put forward for reading, and what the journey expects to find on it. */
export interface SourceProposal {
  pageId: number;
  title: string;
  url: string;
  kind: SourceKind;
  expectedTypes: Milestone[];
}

/**
 * What each kind of page is expected to yield — an authored expectation the Collector
 * judges a page by, never a derivation. A Legendary Ash never owned cannot have been
 * caught, and a Pokémon he owned did not merely cross his path.
 */
export const EXPECTED_TYPES: Readonly<Record<SourceKind, readonly Milestone[]>> = {
  roster_listing: ["catch", "teammate", "glory", "loyal"],
  pokemon_page: ["catch", "opponent", "teammate", "bond", "glory", "loyal"],
  legendary_page: ["encounter", "bond"],
};

/** One `roster_source` row: a page on the reading list and the ruling it awaits. */
export interface RosterSourceRow {
  pageId: number;
  title: string;
  url: string;
  kind: SourceKind;
  state: SourceState;
  discoveredAt: string;
}

/** One `roster_source_expected_type` row: one thing hoped for from one page. */
export interface RosterSourceExpectedTypeRow {
  pageId: number;
  type: Milestone;
}

/** One page on the reading list, as the manifest shows it. */
export interface SourceView {
  pageId: number;
  title: string;
  url: string;
  kind: SourceKind;
  state: SourceState;
  expectedTypes: Milestone[];
  discoveredAt: string;
}

/** The reading list in full — every page proposed, in the order it is read. */
export interface SourceManifest {
  sources: SourceView[];
}

/** What the wiki offered, what was new, what was already on the list. */
export interface DiscoverResponse {
  discovered: number;
  created: number;
  alreadyKnown: number;
}

/** Titles order the reading list; the wiki hands its pages back in no order at all. */
function byTitle(a: SourceProposal, b: SourceProposal): number {
  if (a.title < b.title) return -1;
  if (a.title > b.title) return 1;
  return 0;
}

/**
 * Fold the three readings of the wiki into one reading list. Nothing is culled here —
 * proposing a page the Collector declines is the system working; dropping one quietly
 * is the system lying.
 */
export function proposeSources(
  listing: readonly WikiPage[],
  ownedPages: readonly WikiPage[],
  legendaryPages: readonly WikiPage[],
): SourceProposal[] {
  // Precedence runs the master listing, then the Pokémon Ash owned, then the Legendaries.
  const readings: readonly (readonly [SourceKind, readonly WikiPage[]])[] = [
    ["roster_listing", listing],
    ["pokemon_page", ownedPages],
    ["legendary_page", legendaryPages],
  ];

  const proposed = new Map<number, SourceProposal>();
  for (const [kind, pages] of readings) {
    for (const page of pages) {
      const known = proposed.get(page.pageId);
      if (known) {
        // One page reached two ways is one page, keeping the name the first reading
        // gave it and everything either reading hopes to find on it.
        for (const type of EXPECTED_TYPES[kind]) {
          if (!known.expectedTypes.includes(type)) known.expectedTypes.push(type);
        }
        continue;
      }

      proposed.set(page.pageId, {
        pageId: page.pageId,
        title: page.title,
        // MediaWiki's own encoding is authoritative; the section a redirect named is
        // the one thing this tool may add to it, so the Collector lands on the passage
        // actually being proposed. A section's anchor spells its spaces as underscores.
        url: page.fragment
          ? `${page.url}#${encodeURIComponent(page.fragment.replace(/ /g, "_"))}`
          : page.url,
        kind,
        expectedTypes: [...EXPECTED_TYPES[kind]],
      });
    }
  }

  // Two runs must tell the same story in the same order.
  return [...proposed.values()].sort(byTitle);
}

/**
 * Build the manifest from stored rows. A Source nothing is expected of still belongs
 * on the reading list — it is a page awaiting a ruling like any other.
 */
export function composeManifest(
  sources: readonly RosterSourceRow[],
  expectedTypes: readonly RosterSourceExpectedTypeRow[],
): SourceManifest {
  const expectedOf = new Map<number, Milestone[]>();
  for (const row of expectedTypes) {
    const own = expectedOf.get(row.pageId);
    if (own) own.push(row.type);
    else expectedOf.set(row.pageId, [row.type]);
  }

  return {
    sources: sources.map((source) => ({
      pageId: source.pageId,
      title: source.title,
      url: source.url,
      kind: source.kind,
      state: source.state,
      expectedTypes: expectedOf.get(source.pageId) ?? [],
      discoveredAt: source.discoveredAt,
    })),
  };
}
