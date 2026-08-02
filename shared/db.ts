import { SQLDatabase } from "encore.dev/storage/sqldb";

/**
 * The shared handle on the one `tcgourney` database, declared in `charting/db.ts`.
 * This folder is a plain module — deliberately not a service — so that every
 * service can reach the database without any service importing another.
 */
export const db = SQLDatabase.named("tcgourney");
