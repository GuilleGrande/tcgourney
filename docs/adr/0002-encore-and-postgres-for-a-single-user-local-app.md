# Encore.ts + Postgres for a single-user local app

This is a personal tool: one user, running on one laptop, never deployed. The obvious stack for that is SQLite (or plain files) — Encore.ts supports **PostgreSQL only** and provisions it via Docker, so opening the binder means starting Docker Desktop first, every time. We are keeping Encore and Postgres anyway.

**Why**, in the face of that: the Encore scaffold, the typed client generation, and the source-cited research in `docs/research/encore-ts-setup.md` already exist and work, and the Docker tax is a known, accepted cost rather than an oversight.

**Consequences**

- Docker Desktop is a hard prerequisite for local development from the moment the first `SQLDatabase` is declared. It is not one today only because no database exists yet.
- The roster is hand-made judgment data accumulated over weeks and impossible to regenerate, and Postgres gives it no version history. An **export command dumps the roster to JSON committed in the repo** so those rulings still get git history and a portable backup.
- Do not "fix" this by migrating to SQLite without revisiting the decision — the mismatch is deliberate.
