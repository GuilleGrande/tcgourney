import { describe, it, expect } from "vitest";
import {
  composeManifest,
  proposeSources,
  type RosterSourceExpectedTypeRow,
  type RosterSourceRow,
  type SourceProposal,
  type WikiPage,
} from "./source-view";

/**
 * `Ash's Pokémon` is a redirect, not an article — the master listing is a section of
 * Ash's own page, and the wiki says so by naming the fragment.
 */
const ASH_KETCHUM: WikiPage = {
  pageId: 60644,
  title: "Ash Ketchum",
  url: "https://bulbapedia.bulbagarden.net/wiki/Ash_Ketchum",
  fragment: "Pokémon",
};

/**
 * Members of `Category:Ash's Pokémon`, the awkward ones included. A list page and
 * another trainer's Beedrill are proposed like anything else — culling is the
 * approval gate's work, not discovery's.
 */
const OWNED_PAGES: WikiPage[] = [
  {
    pageId: 827,
    title: "Ash's Pikachu",
    url: "https://bulbapedia.bulbagarden.net/wiki/Ash%27s_Pikachu",
  },
  {
    pageId: 5741,
    title: "Ash's Bulbasaur",
    url: "https://bulbapedia.bulbagarden.net/wiki/Ash%27s_Bulbasaur",
  },
  {
    pageId: 8654,
    title: "Casey's Beedrill",
    url: "https://bulbapedia.bulbagarden.net/wiki/Casey%27s_Beedrill",
  },
  {
    pageId: 249837,
    title: "List of Pokémon temporarily owned by Ash Ketchum",
    url: "https://bulbapedia.bulbagarden.net/wiki/List_of_Pok%C3%A9mon_temporarily_owned_by_Ash_Ketchum",
  },
];

/** Members of `Category:Legendary Pokémon (anime)` — ADR-0001's road to Encounter. */
const LEGENDARY_PAGES: WikiPage[] = [
  {
    pageId: 47956,
    title: "Noland's Articuno",
    url: "https://bulbapedia.bulbagarden.net/wiki/Noland%27s_Articuno",
  },
  {
    pageId: 255130,
    title: "Articuno (Johto)",
    url: "https://bulbapedia.bulbagarden.net/wiki/Articuno_(Johto)",
  },
];

/** A Legendary Ash actually owned — the one page both categories claim. */
const ASHS_SOLGALEO: WikiPage = {
  pageId: 277962,
  title: "Ash's Solgaleo",
  url: "https://bulbapedia.bulbagarden.net/wiki/Ash%27s_Solgaleo",
};

/** The reading list these fixtures draw up, in the order it must always read. */
const READING_LIST = [
  "Articuno (Johto)",
  "Ash Ketchum",
  "Ash's Bulbasaur",
  "Ash's Pikachu",
  "Casey's Beedrill",
  "List of Pokémon temporarily owned by Ash Ketchum",
  "Noland's Articuno",
];

/** The manifest as the query hands it back: `ORDER BY page_title`. */
const STORED_SOURCES: RosterSourceRow[] = [
  {
    pageId: 255130,
    title: "Articuno (Johto)",
    url: "https://bulbapedia.bulbagarden.net/wiki/Articuno_(Johto)",
    kind: "legendary_page",
    state: "proposed",
    discoveredAt: "2026-08-02T09:14:22.481Z",
  },
  {
    pageId: 60644,
    title: "Ash Ketchum",
    url: "https://bulbapedia.bulbagarden.net/wiki/Ash_Ketchum#Pok%C3%A9mon",
    kind: "roster_listing",
    state: "approved",
    discoveredAt: "2026-08-02T09:14:22.481Z",
  },
  {
    pageId: 827,
    title: "Ash's Pikachu",
    url: "https://bulbapedia.bulbagarden.net/wiki/Ash%27s_Pikachu",
    kind: "pokemon_page",
    state: "proposed",
    discoveredAt: "2026-08-02T09:14:22.481Z",
  },
  {
    pageId: 47956,
    title: "Noland's Articuno",
    url: "https://bulbapedia.bulbagarden.net/wiki/Noland%27s_Articuno",
    kind: "legendary_page",
    state: "declined",
    discoveredAt: "2026-08-02T09:14:22.481Z",
  },
];

/**
 * The join table as the query hands it back: `ORDER BY page_id, type`. Nothing is
 * expected of `Articuno (Johto)` yet — the Collector still has to rule on it.
 */
const STORED_EXPECTED_TYPES: RosterSourceExpectedTypeRow[] = [
  { pageId: 827, type: "bond" },
  { pageId: 827, type: "catch" },
  { pageId: 827, type: "glory" },
  { pageId: 827, type: "loyal" },
  { pageId: 827, type: "opponent" },
  { pageId: 827, type: "teammate" },
  { pageId: 47956, type: "bond" },
  { pageId: 47956, type: "encounter" },
  { pageId: 60644, type: "catch" },
  { pageId: 60644, type: "glory" },
  { pageId: 60644, type: "loyal" },
  { pageId: 60644, type: "teammate" },
];

function byPageId(proposals: SourceProposal[]): Map<number, SourceProposal> {
  return new Map(proposals.map((proposal) => [proposal.pageId, proposal]));
}

describe("proposeSources", () => {
  it("hopes of each page only what that kind of page can hold", () => {
    const found = byPageId(proposeSources([ASH_KETCHUM], OWNED_PAGES, LEGENDARY_PAGES));

    // The master listing is the roll of who was caught, who fought beside him, and
    // how far they went together.
    const listing = found.get(60644)!;
    expect(listing.kind).toBe("roster_listing");
    expect(listing.expectedTypes).toEqual(["catch", "teammate", "glory", "loyal"]);

    // A Pokémon Ash owned did not merely cross his path.
    const pikachu = found.get(827)!;
    expect(pikachu.kind).toBe("pokemon_page");
    expect(pikachu.expectedTypes).toEqual([
      "catch",
      "opponent",
      "teammate",
      "bond",
      "glory",
      "loyal",
    ]);
    expect(pikachu.expectedTypes).not.toContain("encounter");

    // A Legendary he never owned cannot have been caught — the whole reason ADR-0001
    // routes Encounter through this category.
    const articuno = found.get(255130)!;
    expect(articuno.kind).toBe("legendary_page");
    expect(articuno.expectedTypes).toEqual(["encounter", "bond"]);
    expect(articuno.expectedTypes).not.toContain("catch");
  });

  it("gives every proposed Source a title, a link, and something to hope for", () => {
    const proposals = proposeSources([ASH_KETCHUM], OWNED_PAGES, LEGENDARY_PAGES);

    expect(proposals).toHaveLength(7);
    for (const proposal of proposals) {
      expect(proposal.pageId).toBeGreaterThan(0);
      expect(proposal.title).not.toBe("");
      expect(proposal.url.startsWith("https://bulbapedia.bulbagarden.net/wiki/")).toBe(true);
      expect(proposal.expectedTypes.length).toBeGreaterThan(0);
    }
  });

  it("keeps the wiki's own spelling of a link, apostrophe escaped and parentheses bare", () => {
    const found = byPageId(proposeSources([ASH_KETCHUM], OWNED_PAGES, LEGENDARY_PAGES));

    // MediaWiki escapes the apostrophe and leaves the parentheses alone. A link built
    // by hand gets one of these wrong in either direction.
    expect(found.get(47956)!.url).toBe(
      "https://bulbapedia.bulbagarden.net/wiki/Noland%27s_Articuno",
    );
    expect(found.get(255130)!.url).toBe(
      "https://bulbapedia.bulbagarden.net/wiki/Articuno_(Johto)",
    );
    expect(found.get(255130)!.url).not.toContain("%28");
    expect(found.get(249837)!.url).toBe(
      "https://bulbapedia.bulbagarden.net/wiki/List_of_Pok%C3%A9mon_temporarily_owned_by_Ash_Ketchum",
    );
  });

  it("points the master listing at the section the redirect named", () => {
    const [named] = proposeSources([ASH_KETCHUM], [], []);
    expect(named!.url).toBe(
      "https://bulbapedia.bulbagarden.net/wiki/Ash_Ketchum#Pok%C3%A9mon",
    );

    // Reached without a redirect naming a section, the page is left exactly as given.
    const [unnamed] = proposeSources(
      [{ pageId: 60644, title: "Ash Ketchum", url: ASH_KETCHUM.url }],
      [],
      [],
    );
    expect(unnamed!.url).toBe("https://bulbapedia.bulbagarden.net/wiki/Ash_Ketchum");

    // A section of more than one word spells its spaces as underscores in the anchor,
    // the way the wiki writes the id itself. `%20` would land nowhere.
    const [multiWord] = proposeSources(
      [{ ...ASH_KETCHUM, fragment: "In the anime" }],
      [],
      [],
    );
    expect(multiWord!.url).toBe(
      "https://bulbapedia.bulbagarden.net/wiki/Ash_Ketchum#In_the_anime",
    );
  });

  it("proposes a page found twice once, under the name that found it first", () => {
    // Ash's Solgaleo belongs to both categories: a Legendary he actually owned. One
    // page, one Source, and everything either reading hopes to find on it.
    const found = byPageId(
      proposeSources(
        [ASH_KETCHUM],
        [...OWNED_PAGES, ASHS_SOLGALEO],
        [...LEGENDARY_PAGES, ASHS_SOLGALEO],
      ),
    );

    const solgaleo = found.get(277962)!;
    expect(solgaleo.kind).toBe("pokemon_page");
    expect([...solgaleo.expectedTypes].sort()).toEqual([
      "bond",
      "catch",
      "encounter",
      "glory",
      "loyal",
      "opponent",
      "teammate",
    ]);
    expect(found.size).toBe(8);
  });

  it("tells the same story in the same order however the pages arrive", () => {
    // `generator=` promises no order at all, so the reading list must impose its own.
    const asRead = proposeSources([ASH_KETCHUM], OWNED_PAGES, LEGENDARY_PAGES);
    const backwards = proposeSources(
      [ASH_KETCHUM],
      [...OWNED_PAGES].reverse(),
      [...LEGENDARY_PAGES].reverse(),
    );

    expect(asRead.map((proposal) => proposal.title)).toEqual(READING_LIST);
    expect(backwards).toEqual(asRead);
  });

  it("proposes even the pages the Collector will almost certainly decline", () => {
    const found = byPageId(proposeSources([ASH_KETCHUM], OWNED_PAGES, LEGENDARY_PAGES));

    // A list page and another trainer's Beedrill sit in `Category:Ash's Pokémon`.
    // Proposing one the Collector declines is the system working; dropping it quietly
    // is the system lying.
    expect(found.get(249837)!.kind).toBe("pokemon_page");
    expect(found.get(8654)!.title).toBe("Casey's Beedrill");
  });

  it("draws up an empty reading list when the wiki offers nothing", () => {
    // Nothing to read is not a failure — it is a reading list waiting to be drawn up.
    expect(proposeSources([], [], [])).toEqual([]);
  });

  it("leaves the pages the wiki handed it exactly as they came", () => {
    const listing: WikiPage[] = [{ ...ASH_KETCHUM }];
    const owned = OWNED_PAGES.map((page) => ({ ...page }));
    const legendary = LEGENDARY_PAGES.map((page) => ({ ...page }));
    const asHanded = JSON.stringify([listing, owned, legendary]);

    proposeSources(listing, owned, legendary);

    expect(JSON.stringify([listing, owned, legendary])).toBe(asHanded);
  });
});

describe("composeManifest", () => {
  it("attaches what is hoped for to the page it is hoped of", () => {
    const { sources } = composeManifest(STORED_SOURCES, STORED_EXPECTED_TYPES);
    const found = new Map(sources.map((source) => [source.pageId, source]));

    expect(sources).toHaveLength(4);
    expect(found.get(827)!.expectedTypes).toEqual([
      "bond",
      "catch",
      "glory",
      "loyal",
      "opponent",
      "teammate",
    ]);
    expect(found.get(47956)!.expectedTypes).toEqual(["bond", "encounter"]);
    expect(found.get(60644)!.expectedTypes).toEqual(["catch", "glory", "loyal", "teammate"]);

    // Nothing is expected of Articuno (Johto) yet, and it stays on the reading list
    // all the same.
    expect(found.get(255130)!.expectedTypes).toEqual([]);

    // Every Source carries the ruling it has been given.
    expect(found.get(60644)!.state).toBe("approved");
    expect(found.get(47956)!.state).toBe("declined");
    expect(found.get(255130)!.state).toBe("proposed");
  });

  it("shows an empty manifest when nothing has been discovered yet", () => {
    expect(composeManifest([], [])).toEqual({ sources: [] });
  });

  it("keeps the order the query read them in", () => {
    const manifest = composeManifest(STORED_SOURCES, STORED_EXPECTED_TYPES);

    expect(manifest.sources.map((source) => source.title)).toEqual([
      "Articuno (Johto)",
      "Ash Ketchum",
      "Ash's Pikachu",
      "Noland's Articuno",
    ]);
    // The listing keeps the section the redirect named, straight through to the wire.
    expect(manifest.sources[1]!.url).toBe(
      "https://bulbapedia.bulbagarden.net/wiki/Ash_Ketchum#Pok%C3%A9mon",
    );
    // And the whole manifest survives a round trip through JSON unchanged.
    expect(JSON.parse(JSON.stringify(manifest))).toEqual(manifest);
  });
});
