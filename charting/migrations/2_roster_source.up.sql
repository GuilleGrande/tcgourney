CREATE TABLE roster_source (
  page_id       INTEGER PRIMARY KEY CHECK (page_id > 0),
  page_title    TEXT NOT NULL UNIQUE CHECK (btrim(page_title) <> ''),
  url           TEXT NOT NULL CHECK (url LIKE 'https://%'),
  kind          TEXT NOT NULL CHECK (kind IN
                  ('roster_listing','pokemon_page','legendary_page')),
  state         TEXT NOT NULL DEFAULT 'proposed' CHECK (state IN
                  ('proposed','approved','declined','ingested','failed')),
  discovered_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE roster_source_expected_type (
  page_id INTEGER NOT NULL REFERENCES roster_source (page_id) ON DELETE CASCADE,
  type    TEXT NOT NULL CHECK (type IN
            ('catch','opponent','teammate','encounter','bond','glory','loyal')),
  PRIMARY KEY (page_id, type)
);
