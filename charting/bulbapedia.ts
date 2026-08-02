import { APIError } from "encore.dev/api";
import type { WikiPage } from "./source-view";

/**
 * Bulbapedia's MediaWiki endpoint. It is asked which pages exist and where they live —
 * never a word of what any of them says. Reading a page is the Collector's to allow,
 * and only after a Source has been approved.
 */
const API_URL = "https://bulbapedia.bulbagarden.net/w/api.php";

/**
 * Wiki etiquette: an anonymous caller behind a generic agent is throttled or refused
 * outright, so the tool says plainly who is asking and why.
 */
const USER_AGENT = "tcgourney/0.1 (Ash's Journey charting tool; personal use)";

/** A wiki that keeps the Collector waiting has not answered. */
const TIMEOUT_MS = 15_000;

/** The title the master listing hides behind — a redirect into a section of Ash's page. */
const ROSTER_LISTING_TITLE = "Ash's Pokémon";

/** The Pokémon the wiki gathers as Ash's own. */
const OWNED_CATEGORY = "Category:Ash's Pokémon";

/** The Legendaries of the anime — ADR-0001's only road to Encounter. */
const LEGENDARY_CATEGORY = "Category:Legendary Pokémon (anime)";

/** As much of a MediaWiki answer as enumeration ever needs to read. */
interface WikiAnswer {
  error?: { code?: string; info?: string };
  continue?: { gcmcontinue?: string };
  query?: {
    redirects?: { from?: string; to?: string; tofragment?: string }[];
    pages?: {
      pageid?: number;
      title?: string;
      fullurl?: string;
      missing?: boolean;
    }[];
  };
}

/**
 * Ask the wiki one question. Every question is built here from a fixed set of
 * parameters, so what this tool asks for is a matter of record rather than of trust:
 * titles, page ids, and links. `formatversion=2` is what makes `query.pages` a plain
 * array and makes an absent page say so.
 */
async function askWiki(params: Record<string, string>, asked: string): Promise<WikiAnswer> {
  const question = new URLSearchParams({
    ...params,
    // Fixed last so no caller can widen what is asked for. `info` and `url` are the
    // whole of it: what a page is called and where it lives. Reading a page is a
    // different question, and not this story's to ask.
    action: "query",
    format: "json",
    formatversion: "2",
    prop: "info",
    inprop: "url",
  });

  let response: Response;
  try {
    response = await fetch(`${API_URL}?${question}`, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (cause) {
    throw APIError.unavailable(
      `Bulbapedia did not answer for ${asked}`,
      cause instanceof Error ? cause : undefined,
    );
  }

  if (!response.ok) {
    throw APIError.unavailable(`Bulbapedia answered ${response.status} for ${asked}`);
  }

  let answer: WikiAnswer;
  try {
    answer = (await response.json()) as WikiAnswer;
  } catch (cause) {
    throw APIError.unavailable(
      `Bulbapedia answered for ${asked} in something other than JSON`,
      cause instanceof Error ? cause : undefined,
    );
  }

  if (answer.error) {
    throw APIError.unavailable(
      `Bulbapedia refused ${asked}: ${answer.error.code ?? "no reason given"}`,
    );
  }

  return answer;
}

/**
 * Read the pages out of an answer, refusing any the wiki cannot fully name. A page
 * the wiki reports as missing means it moved beneath us, and a reading list quietly
 * short of a page is worse than no reading list at all.
 */
function readPages(answer: WikiAnswer, asked: string): WikiPage[] {
  const pages = answer.query?.pages ?? [];
  return pages.map((page) => {
    // Everything the reading list needs of a page, checked before it is trusted: a
    // page the wiki cannot fully name is a page nobody can go and read.
    const named =
      !page.missing &&
      Number.isInteger(page.pageid) &&
      (page.pageid ?? 0) > 0 &&
      !!page.title?.trim() &&
      !!page.fullurl?.startsWith("https://");
    if (!named) {
      throw APIError.unavailable(
        `Bulbapedia gave ${asked} a page it cannot name: ` +
          `${JSON.stringify(page.title ?? page.pageid ?? null)}`,
      );
    }
    // The wiki's own link, verbatim — its spelling is authoritative and non-obvious.
    return { pageId: page.pageid!, title: page.title!, url: page.fullurl! };
  });
}

/**
 * Ask where the master listing lives. `Ash's Pokémon` is a redirect, not an article,
 * so the answer is Ash's own page and the section the roll call sits in. The redirect
 * is resolved every run rather than remembered, because a page id written down once is
 * a page id that will be wrong one day.
 */
export async function fetchRosterListing(): Promise<WikiPage[]> {
  const answer = await askWiki(
    {
      titles: ROSTER_LISTING_TITLE,
      redirects: "1",
    },
    ROSTER_LISTING_TITLE,
  );

  const pages = readPages(answer, ROSTER_LISTING_TITLE);
  if (pages.length !== 1) {
    throw APIError.unavailable(
      `Bulbapedia no longer settles ${ROSTER_LISTING_TITLE} on a single page`,
    );
  }

  // Follow the hop to where it actually landed rather than the one that set off, so a
  // chain of redirects still names the section at the end of it.
  const hops = answer.query?.redirects ?? [];
  const hop = hops.find((step) => step.to === pages[0].title) ?? hops.at(-1);
  return [{ ...pages[0], fragment: hop?.tofragment }];
}

/**
 * Ask who belongs to a category. The wiki hands back its members in whatever order
 * suits it, and hands back a `continue` when there are more than it cared to send.
 */
async function fetchCategoryMembers(category: string): Promise<WikiPage[]> {
  const members: WikiPage[] = [];
  const followed = new Set<string>();
  let gcmcontinue: string | undefined;

  do {
    const answer = await askWiki(
      {
        generator: "categorymembers",
        gcmtitle: category,
        gcmtype: "page",
        gcmlimit: "500",
        ...(gcmcontinue ? { gcmcontinue } : {}),
      },
      category,
    );

    members.push(...readPages(answer, category));

    // Both categories fit in one answer today. They will not always, and a path that
    // only wakes up once the wiki has grown is a fault with a timer on it.
    gcmcontinue = answer.continue?.gcmcontinue;
    if (answer.continue && !gcmcontinue) {
      // The wiki has more to say and is saying it in a way this tool cannot follow.
      // Stopping here would hand back a category that only looks whole.
      throw APIError.unavailable(`Bulbapedia continued ${category} in a way this tool cannot follow`);
    }
    if (gcmcontinue) {
      if (followed.has(gcmcontinue)) {
        throw APIError.unavailable(`Bulbapedia will not stop continuing ${category}`);
      }
      followed.add(gcmcontinue);
    }
  } while (gcmcontinue);

  // A category the wiki has renamed or deleted answers exactly like a category nobody
  // belongs to — no error, no pages. Neither of these two ever empties on its own, so
  // an empty answer means the wiki moved beneath us. A reading list quietly short of
  // sixty pages is worse than no reading list at all.
  if (members.length === 0) {
    throw APIError.unavailable(`Bulbapedia lists nobody in ${category}`);
  }

  return members;
}

/** Every Pokémon the wiki records as Ash's — the awkward members included. */
export async function fetchOwnedPages(): Promise<WikiPage[]> {
  return fetchCategoryMembers(OWNED_CATEGORY);
}

/** Every Legendary of the anime, whether Ash owned one or only ever met it. */
export async function fetchLegendaryPages(): Promise<WikiPage[]> {
  return fetchCategoryMembers(LEGENDARY_CATEGORY);
}
