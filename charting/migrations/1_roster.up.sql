CREATE TABLE roster_entry (
  slug         TEXT PRIMARY KEY CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  display_name TEXT NOT NULL,
  dex_number   INTEGER NOT NULL CHECK (dex_number > 0),
  line_slug    TEXT NOT NULL CHECK (line_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  stage_order  INTEGER NOT NULL CHECK (stage_order >= 0),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (line_slug, stage_order)
);

CREATE TABLE roster_milestone (
  id         BIGSERIAL PRIMARY KEY,
  entry_slug TEXT NOT NULL REFERENCES roster_entry (slug) ON DELETE CASCADE,
  type       TEXT NOT NULL CHECK (type IN
               ('catch','opponent','teammate','encounter','bond','glory','loyal')),
  region     TEXT NOT NULL,
  episode    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX roster_milestone_entry ON roster_milestone (entry_slug);
