import { api } from "encore.dev/api";
import { db } from "../shared/db";
import {
  composeBinder,
  type BinderResponse,
  type RosterEntryRow,
  type RosterMilestoneRow,
} from "./binder-view";

/** The Binder: every Pokémon that earned a place, with its Rank and Slots. */
export const getBinder = api(
  { method: "GET", path: "/binder", expose: true },
  async (): Promise<BinderResponse> => {
    // The roster is charting's to write; the Binder only ever reads it.
    // Both orderings are load-bearing: without them two identical calls can
    // hand back the same story told in a different order.
    const entryRows = await db.queryAll<RosterEntryRow>`
      SELECT slug,
             display_name AS "displayName",
             dex_number   AS "dexNumber",
             line_slug    AS "lineSlug",
             stage_order  AS "stageOrder"
        FROM roster_entry
       ORDER BY line_slug, stage_order`;

    const milestoneRows = await db.queryAll<RosterMilestoneRow>`
      SELECT entry_slug AS "entrySlug", type
        FROM roster_milestone
       ORDER BY entry_slug, id`;

    // Nothing charted yet is a Binder waiting to be filled, not an error.
    return composeBinder(entryRows, milestoneRows);
  },
);
