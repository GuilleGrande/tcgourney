import { api } from "encore.dev/api";
import { db } from "../shared/db";
import { fetchLegendaryPages, fetchOwnedPages, fetchRosterListing } from "./bulbapedia";
import {
  composeManifest,
  proposeSources,
  type DiscoverResponse,
  type RosterSourceExpectedTypeRow,
  type RosterSourceRow,
  type SourceManifest,
} from "./source-view";

/** How many pages are on the reading list right now. */
async function countSources(): Promise<number> {
  const row = await db.queryRow<{ sources: number }>`
    SELECT count(*)::int AS "sources"
      FROM roster_source`;
  return row?.sources ?? 0;
}

/**
 * Ask Bulbapedia which pages exist and put every one of them forward to be read.
 * Nothing is read here and nothing is settled here — a Source can propose; it can
 * never decide.
 */
export const discoverSources = api(
  { method: "POST", path: "/charting/sources/discover", expose: true },
  async (): Promise<DiscoverResponse> => {
    // Hear the wiki out in full before writing a single row. A half-drawn reading list
    // that looks complete would corrupt the very ruling it exists to inform. The
    // questions are asked one at a time: a guest asks politely and waits to be answered.
    const listing = await fetchRosterListing();
    const ownedPages = await fetchOwnedPages();
    const legendaryPages = await fetchLegendaryPages();

    const proposals = proposeSources(listing, ownedPages, legendaryPages);
    const before = await countSources();

    for (const proposal of proposals) {
      // A page already on the list keeps whatever the Collector has since said about
      // it. Writing over it would quietly undo every ruling ever made. The conflict is
      // left unnamed so that a page arriving under a title some other page already
      // holds is passed over too, rather than failing the whole run from then on.
      await db.exec`
        INSERT INTO roster_source (page_id, page_title, url, kind)
        VALUES (${proposal.pageId}, ${proposal.title}, ${proposal.url}, ${proposal.kind})
        ON CONFLICT DO NOTHING`;

      // Written on every run, not only for pages newly put forward: a run that died
      // between the two would otherwise leave a Source nothing is ever hoped of, and
      // the next run would step straight past it.
      for (const type of proposal.expectedTypes) {
        await db.exec`
          INSERT INTO roster_source_expected_type (page_id, type)
          VALUES (${proposal.pageId}, ${type})
          ON CONFLICT DO NOTHING`;
      }
    }

    const created = (await countSources()) - before;
    return {
      discovered: proposals.length,
      created,
      alreadyKnown: proposals.length - created,
    };
  },
);

/** The reading list in full: every page proposed, and where each one stands. */
export const listSources = api(
  { method: "GET", path: "/charting/sources", expose: true },
  async (): Promise<SourceManifest> => {
    // The ordering is load-bearing: without it two identical calls hand back the same
    // reading list in a different order.
    const sourceRows = await db.queryAll<RosterSourceRow>`
      SELECT page_id    AS "pageId",
             page_title AS "title",
             url,
             kind,
             state,
             to_char(discovered_at AT TIME ZONE 'UTC',
                     'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "discoveredAt"
        FROM roster_source
       ORDER BY page_title`;

    const expectedTypeRows = await db.queryAll<RosterSourceExpectedTypeRow>`
      SELECT page_id AS "pageId", type
        FROM roster_source_expected_type
       ORDER BY page_id, type`;

    // Nothing discovered yet is a reading list waiting to be drawn up, not an error.
    return composeManifest(sourceRows, expectedTypeRows);
  },
);
