import { SQLDatabase } from "encore.dev/storage/sqldb";

/**
 * The one database, declared here because charting is the roster's author and so
 * anchors its migrations. Every service — charting included — takes its handle
 * from `shared/db.ts`; nobody imports this module.
 */
export const db = new SQLDatabase("tcgourney", { migrations: "./migrations" });
