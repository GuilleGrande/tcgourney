# Pokémon TCG API (pokemontcg.io) — Research Notes

**Purpose:** build a card catalog + a rarity→rank mapping.
**Researched:** 2026-07-16. **Live API calls** made against `https://api.pokemontcg.io/v2` on that date; **doc facts** from the official GitBook docs.
**Primary sources only:** [docs.pokemontcg.io](https://docs.pokemontcg.io/) · [dev.pokemontcg.io](https://dev.pokemontcg.io/) · [pokemontcg.io](https://pokemontcg.io/) · the live API itself.

> Heads-up (freshness/ownership): the main site now states **"Pokémon TCG API is now part of Scrydex"** ([pokemontcg.io](https://pokemontcg.io/)). This is already visible in the data — the newest set's images are served from `images.scrydex.com` rather than `images.pokemontcg.io` (see §7/§8). The v2 REST API, docs, and Developer Portal described here are all still live and unchanged as of the research date.

---

## 1. Base URL, version, endpoints

- **Base URL / version:** `https://api.pokemontcg.io/v2` (current version is **v2**; **v1 is deprecated as of 2021-08-01**, last set "Chilling Reign", and receives no data updates — [docs overview](https://docs.pokemontcg.io/)). REST, JSON in/out, standard HTTP verbs & status codes ([docs overview](https://docs.pokemontcg.io/)).
- The HTTP request line is shown explicitly as `GET https://api.pokemontcg.io/v2/cards` ([search cards](https://docs.pokemontcg.io/api-reference/cards/search-cards/)). All requests must be over **HTTPS** (plain HTTP redirects to HTTPS) ([authentication](https://docs.pokemontcg.io/getting-started/authentication/)).

| Endpoint | Returns | Notes |
|---|---|---|
| `GET /v2/cards` | list of cards, paginated | search/filter via `q` ([search cards](https://docs.pokemontcg.io/api-reference/cards/search-cards/)) |
| `GET /v2/cards/{id}` | single card as `{ "data": {…} }` | verified live: `GET /v2/cards/sv3-223` → top-level key `data` only ([get a card](https://docs.pokemontcg.io/api-reference/cards/get-card/)) |
| `GET /v2/sets` | list of sets, paginated | same query grammar as cards ([search sets](https://docs.pokemontcg.io/api-reference/sets/search-sets/)) |
| `GET /v2/sets/{id}` | single set | |
| `GET /v2/rarities` | `{ "data": ["Common", …] }` — flat string array | full list in §5 |
| `GET /v2/types` | flat string array (11 values) | see below |
| `GET /v2/subtypes` | flat string array (41 values) | see below |
| `GET /v2/supertypes` | flat string array (3 values) | `Energy`, `Pokémon`, `Trainer` |

Live reference-data results (from `/v2/types`, `/v2/subtypes`, `/v2/supertypes`, 2026-07-16):

- **supertypes (3):** `Energy`, `Pokémon`, `Trainer`
- **types (11):** `Colorless`, `Darkness`, `Dragon`, `Fairy`, `Fighting`, `Fire`, `Grass`, `Lightning`, `Metal`, `Psychic`, `Water`
- **subtypes (41):** `ACE SPEC`, `Ancient`, `BREAK`, `Baby`, `Basic`, `EX`, `Eternamax`, `Fusion Strike`, `Future`, `GX`, `Goldenrod Game Corner`, `Item`, `LEGEND`, `Level-Up`, `MEGA`, `Pokémon Tool`, `Pokémon Tool F`, `Prime`, `Prism Star`, `Radiant`, `Rapid Strike`, `Restored`, `Rocket's Secret Machine`, `SP`, `Single Strike`, `Special`, `Stadium`, `Stage 1`, `Stage 2`, `Star`, `Supporter`, `TAG TEAM`, `Team Plasma`, `Technical Machine`, `Tera`, `Ultra Beast`, `V`, `V-UNION`, `VMAX`, `VSTAR`, `ex`

---

## 2. Query syntax (`q`, pagination, ordering, field selection)

All query parameters are **optional**. Source: [search cards](https://docs.pokemontcg.io/api-reference/cards/search-cards/).

| Param | Meaning | Default | Max |
|---|---|---|---|
| `q` | Lucene-style search/filter query | — | — |
| `page` | page of data to access | `1` | — |
| `pageSize` | cards returned per page | `250` | **250** |
| `orderBy` | field(s) to order by | — | — |
| `select` | comma-delimited fields to return (e.g. `?select=id,name`); all fields returned if omitted | all | — |

Response envelope includes pagination metadata alongside `data`: `page`, `pageSize`, `count` (items on this page), `totalCount` (total matches). Verified live, e.g. `…?pageSize=1` returned `page=1 pageSize=1 count=1 totalCount=4`.

**`q` grammar (Lucene-like)** — every field in the response is searchable ([search cards](https://docs.pokemontcg.io/api-reference/cards/search-cards/)):

- **Keyword:** `name:charizard` · phrase `name:"venusaur v"`
- **Boolean / negation:** `name:charizard subtypes:mega` (implicit AND) · `name:charizard (subtypes:mega OR subtypes:vmax)` · `subtypes:mega -types:water` (NOT)
- **Wildcard:** `name:char*` · `name:char*der`
- **Exact field match:** `!name:charizard` (only that word appears in the field)
- **Range:** `nationalPokedexNumbers:[1 TO 151]` (inclusive `[ ]`, exclusive `{ }`); open-ended with `*`, e.g. `hp:[* TO 100]`, `hp:[150 TO *]`
- **Nested fields:** dot separator — `set.id:sm1`, `attacks.name:Spelunk`, `legalities.standard:banned`
- **Ordering:** `?orderBy=number`, multi-field with `-` for descending: `?orderBy=name,-number`, and nested: `orderBy=-set.releaseDate`

**Practical for catalog build:** page through `/v2/cards` with `pageSize=250`, `orderBy=-set.releaseDate` (or `set.id`), and `select` only the fields you store to cut payload. Filter by set with `q=set.id:sv3`.

---

## 3. Authentication & rate limits

- **API key required? No — but strongly recommended.** "You can use the Pokémon TCG API without registering for an API key, although your limits are far less" ([docs overview](https://docs.pokemontcg.io/)). "API requests without authentication won't fail, but your rate limits are drastically reduced" ([authentication](https://docs.pokemontcg.io/getting-started/authentication/)).
- **How to get one:** sign up **free** at the **Pokémon TCG Developer Portal**, [dev.pokemontcg.io](https://dev.pokemontcg.io/), which lets you "Manage your API Key and Subscription" ([authentication](https://docs.pokemontcg.io/getting-started/authentication/)).
- **Exact header:** **`X-Api-Key`** — "Authentication to the API is performed via the `X-Api-Key` header. Provide your API key in the headers of all requests" ([authentication](https://docs.pokemontcg.io/getting-started/authentication/)).

**Rate limits** ([rate limits](https://docs.pokemontcg.io/getting-started/rate-limits/)):

| Condition | Per day | Shorter interval |
|---|---|---|
| **With** an API key (v2 default) | **20,000 / day** | not published (contact them to raise) |
| **Without** an API key | **1,000 / day** | **max 30 / minute** |

- Higher limits available on request (via Discord/email). One API key per person, one per team/company ([terms](https://dev.pokemontcg.io/terms)).

---

## 4. Card object schema

Full field list from [the card object](https://docs.pokemontcg.io/api-reference/cards/card-object/), cross-checked against a live `GET /v2/cards/sv3-223` (Charizard ex, Obsidian Flames).

| Field | Type | Notes |
|---|---|---|
| `id` | string | unique id, e.g. `sv3-223`, `swsh4-25` (pattern `{set.id}-{number}`) |
| `name` | string | card name, e.g. `Charizard ex` |
| `supertype` | string | `Pokémon`, `Trainer`, or `Energy` |
| `subtypes` | string[] | e.g. `["Stage 2","ex","Tera"]`, `["Basic","EX"]` |
| `level` | string | older Pokémon cards only |
| `hp` | string | hit points (string, not int) |
| `types` | string[] | energy types, e.g. `["Darkness"]` |
| `evolvesFrom` | string | e.g. `Charmeleon` |
| `evolvesTo` | string[] | can be multiple |
| `rules` | string[] | rule-box text (ex/V/VMAX/Tera/Trainer rules) |
| `ancientTrait` | object | `{ name, text }` |
| `abilities` | object[] | each `{ name, text, type }` |
| `attacks` | object[] | each `{ name, cost[], convertedEnergyCost, damage, text }` |
| `weaknesses` | object[] | each `{ type, value }` |
| `resistances` | object[] | each `{ type, value }` |
| `retreatCost` | string[] | list of energy types |
| `convertedRetreatCost` | integer | count of `retreatCost` |
| `set` | object | **full embedded set object** (see §6) |
| `number` | string | collector number within set, e.g. `"223"` |
| `artist` | string | illustrator |
| `rarity` | string | see §5 — **may be absent** on some cards (e.g. many promos) |
| `flavorText` | string | italic flavor text |
| `nationalPokedexNumbers` | integer[] | e.g. `[6]` |
| `legalities` | object | keys `standard`/`expanded`/`unlimited` → `Legal`/`Banned`; key **absent if not legal** |
| `regulationMark` | string | letter (e.g. `G`); introduced in Sword & Shield series |
| `images` | object | `small` (low-res URL) + `large` (hi-res URL) — see §7 |
| `tcgplayer` | object | `{ url, updatedAt, prices{…} }`, USD; price-type keys: `normal`, `holofoil`, `reverseHolofoil`, `1stEditionHolofoil`, `1stEditionNormal` |
| `cardmarket` | object | `{ url, updatedAt, prices{…} }`, EUR |

For the catalog, the load-bearing fields are: `id`, `name`, `supertype`, `subtypes`, `images.small`/`images.large`, `set` (esp. `set.id`, `set.name`, `set.series`, `set.releaseDate`), `number`, `rarity`, `nationalPokedexNumbers`.

---

## 5. Rarities — **complete list, verbatim** (MOST IMPORTANT)

Live `GET https://api.pokemontcg.io/v2/rarities`, 2026-07-16 — **38 values**, pasted exactly as returned (alphabetical, as the API returns them):

```
ACE SPEC Rare
Amazing Rare
Black White Rare
Classic Collection
Common
Double Rare
Hyper Rare
Illustration Rare
LEGEND
MEGA_ATTACK_RARE
Mega Hyper Rare
Promo
Radiant Rare
Rare
Rare ACE
Rare BREAK
Rare Holo
Rare Holo EX
Rare Holo GX
Rare Holo LV.X
Rare Holo Star
Rare Holo V
Rare Holo VMAX
Rare Holo VSTAR
Rare Prime
Rare Prism Star
Rare Rainbow
Rare Secret
Rare Shining
Rare Shiny
Rare Shiny GX
Rare Ultra
Shiny Rare
Shiny Ultra Rare
Special Illustration Rare
Trainer Gallery Rare Holo
Ultra Rare
Uncommon
```

> Note: `rarity` is a free-form string per card, and `/rarities` is just the distinct set of values currently present in the data. New sets can introduce **new, un-normalized values** (see `MEGA_ATTACK_RARE`), so treat this list as a snapshot, not a fixed enum. Re-fetch `/rarities` before each catalog rebuild.

### Modern vs vintage naming

- **Modern (Scarlet & Violet era, 2023+)** uses short, catalog-friendly names that line up 1:1 with the seven target ranks: `Common`, `Uncommon`, `Rare`, `Double Rare`, `Ultra Rare`, `Illustration Rare`, `Special Illustration Rare`, `Hyper Rare`. Sword & Shield (2020+) added `Rare Rainbow`, `Rare Secret`, `Rare Ultra`, `Amazing Rare`, `Radiant Rare`, and the `Rare Holo V/VMAX/VSTAR` family.
- **Vintage / older** uses a `Rare <mechanic>` pattern: `Rare Holo`, `Rare Holo EX/GX/LV.X/Star`, `Rare Prime`, `Rare Shining`, `Rare Prism Star`, `Rare ACE`, `Rare BREAK`, `LEGEND`, plus base `Rare`/`Uncommon`/`Common`.
- **Watch for near-duplicate strings** for the same concept across eras that you must normalize: `Ultra Rare` **vs** `Rare Ultra`; `Rare Shiny` **vs** `Shiny Rare`; `ACE SPEC Rare` **vs** `Rare ACE`.

### Proposed mapping onto the seven ranks

Rank buckets: **Common/Uncommon · Rare · Double Rare · Ultra Rare · Illustration Rare · Special Illustration Rare · Hyper Rare.** The eight modern SV names map cleanly; everything else is engineering judgment (this mapping is *my* recommendation, not something the API asserts). "⚠︎" = ambiguous, review before trusting.

| API `rarity` value | Proposed rank | ⚠︎ | Rationale |
|---|---|:--:|---|
| `Common` | Common/Uncommon | | clean |
| `Uncommon` | Common/Uncommon | | clean |
| `Rare` | Rare | | base non-holo rare |
| `Rare Holo` | Rare | | holo of a Rare; same rank |
| `Double Rare` | Double Rare | | SV `ex` two-prizers (★★) |
| `Ultra Rare` | Ultra Rare | | SV full-art ex/Trainer |
| `Illustration Rare` | Illustration Rare | | SV "AR" |
| `Special Illustration Rare` | Special Illustration Rare | | SV "SAR/SIR" |
| `Hyper Rare` | Hyper Rare | | SV gold |
| `Rare Secret` | Hyper Rare | | secret/gold cards |
| `Rare Rainbow` | Hyper Rare | | SWSH rainbow secret |
| `Mega Hyper Rare` | Hyper Rare | | 2026 Mega Evolution gold |
| `Rare Ultra` | Ultra Rare | | SWSH full-arts (dup of `Ultra Rare`) |
| `Rare Holo EX` | Ultra Rare | | ex/EX full-power |
| `Rare Holo GX` | Ultra Rare | | Sun & Moon GX |
| `Rare Holo VMAX` | Ultra Rare | | SWSH |
| `Rare Holo VSTAR` | Ultra Rare | | SWSH |
| `Rare Holo LV.X` | Ultra Rare | | DP Lv.X |
| `Rare Prime` | Ultra Rare | | HGSS Prime |
| `Rare Prism Star` | Ultra Rare | | SM Prism Star |
| `Rare Shining` | Ultra Rare | | Neo Shining |
| `Rare Shiny` | Ultra Rare | | shiny (dup of `Shiny Rare`) |
| `Shiny Rare` | Ultra Rare | | shiny (dup of `Rare Shiny`) |
| `Rare Shiny GX` | Ultra Rare | | SM shiny-vault GX |
| `ACE SPEC Rare` | Ultra Rare | | SV ACE SPEC |
| `Rare ACE` | Ultra Rare | | BW ACE SPEC (dup concept) |
| `Rare Holo V` | Ultra Rare | ⚠︎ | plain V is closer to **Double Rare** tier; full-art V are Ultra — same string covers both |
| `Rare Holo Star` | Ultra Rare | ⚠︎ | Gold Star — arguably **Hyper Rare** scarcity |
| `Rare BREAK` | Ultra Rare | ⚠︎ | XY BREAK, own tier |
| `Amazing Rare` | Ultra Rare | ⚠︎ | SWSH "Amazing", own tier |
| `Shiny Ultra Rare` | Ultra Rare | ⚠︎ | SV shiny "SSR" (Paldean Fates); some treat as near-SIR |
| `LEGEND` | Ultra Rare | ⚠︎ | HGSS two-part LEGEND cards |
| `Radiant Rare` | Ultra Rare | ⚠︎ | SWSH Radiant shiny — could sit at **Double Rare** |
| `MEGA_ATTACK_RARE` | Unknown / review | ⚠︎ | **un-normalized raw enum** (all-caps + underscores) from the 2026 Mega era; likely a Double/Ultra tier but format shows it isn't cleaned |
| `Trainer Gallery Rare Holo` | Unknown / review | ⚠︎ | subset label (SWSH "TG"), not a true rarity — spans holo→alt-art |
| `Classic Collection` | Unknown / review | ⚠︎ | Crown Zenith "CLK" subset label, mixed rarities |
| `Black White Rare` | Unknown / review | ⚠︎ | odd/rare value; verify against actual cards before mapping |
| `Promo` | Exclude / own bucket | ⚠︎ | a distribution channel, **not** a visual rarity — promos span every tier |

**Recommendation:** implement the mapping as an explicit lookup table with a default `UNKNOWN`/needs-review fallback, log any `rarity` string not in the table, and re-pull `/rarities` on each ingest so new values (like `MEGA_ATTACK_RARE`) surface loudly instead of silently defaulting.

---

## 6. Set object schema

The set object is returned both standalone (`/v2/sets`) and **embedded inside each card's `set` field**. Source: [the set object](https://docs.pokemontcg.io/api-reference/sets/set-object/); cross-checked live.

| Field | Type | Notes |
|---|---|---|
| `id` | string | e.g. `sv3`, `swsh1` |
| `name` | string | e.g. `Obsidian Flames` |
| `series` | string | e.g. `Scarlet & Violet`, `Sword & Shield`, `Base` |
| `printedTotal` | integer | number printed on the card — **excludes** secret rares |
| `total` | integer | true total **including** secret rares / alt-arts (≥ `printedTotal`) |
| `legalities` | object | `standard`/`expanded`/`unlimited` → `Legal`; key absent if not legal |
| `ptcgoCode` | string | PTCG Online set code, e.g. `SSH`, `VIV` (not always present) |
| `releaseDate` | string | `YYYY/MM/DD` (US release) |
| `updatedAt` | string | `YYYY/MM/DD HH:MM:SS` |
| `images` | object | `symbol` + `logo` URLs |

Live example (`GET /v2/sets?pageSize=1&orderBy=-releaseDate`, 2026-07-16) returned the newest set: `id=me4`, `name=Chaos Rising`, `series=Mega Evolution`, `printedTotal=86`, `total=122`, `releaseDate=2026/05/22` — with `images.logo = https://images.scrydex.com/pokemon/me4-logo/logo` (note the Scrydex host; older sets use `images.pokemontcg.io`).

---

## 7. Image hotlinking, terms & attribution

- **URLs are stable and CDN-hosted with a predictable pattern.** Card images live at `https://images.pokemontcg.io/{set.id}/{number}.png` (`small`) and `…/{number}_hires.png` (`large`) — e.g. `https://images.pokemontcg.io/sv3/223.png` and `…/223_hires.png`. Set images: `…/{set.id}/symbol.png` and `…/logo.png`. Docs' own examples hotlink these URLs directly ([card object](https://docs.pokemontcg.io/api-reference/cards/card-object/), [set object](https://docs.pokemontcg.io/api-reference/sets/set-object/)).
- **New host as of the Scrydex era:** the newest data serves images from `https://images.scrydex.com/pokemon/…` instead (observed live on set `me4`, released 2026/05). So the host is **not** uniformly `images.pokemontcg.io` anymore — always use the `images.*` URLs returned in the response rather than hardcoding a host.
- **Terms of Use:** the official ToS ([dev.pokemontcg.io/terms](https://dev.pokemontcg.io/terms)) covers acceptable use (don't disrupt the service, one key per person/team, key non-transferable), an **AS-IS / AS-AVAILABLE** liability disclaimer, and notes that price and legality data are informational only. **The ToS is silent on image hotlinking and imposes no explicit attribution string** for the images/data themselves.
- **Attribution / IP:** the project itself displays the disclaimer *"This website is not produced, endorsed, supported, or affiliated with Nintendo or The Pokémon Company"* ([docs](https://docs.pokemontcg.io/) footer, [dev.pokemontcg.io/terms](https://dev.pokemontcg.io/terms)). The underlying card names/artwork remain **© The Pokémon Company / Nintendo** — the API grants no rights to that IP, so for any public-facing catalog treat card art as third-party copyrighted material (self-host/cache and consider your own usage risk rather than assuming a redistribution license). A courtesy credit to the Pokémon TCG API is customary though not contractually required.

---

## 8. Gotchas

1. **Data freshness / Scrydex migration.** The service is "now part of Scrydex" ([pokemontcg.io](https://pokemontcg.io/)). New sets *do* land (set `me4`, 2026/05, is present as of 2026-07-16), but new-era records can carry a different image host (`images.scrydex.com`) and un-normalized rarity strings. Don't assume a single static image host or a frozen rarity enum.
2. **Inconsistent `rarity` values.** Near-duplicate strings for one concept (`Ultra Rare`/`Rare Ultra`, `Rare Shiny`/`Shiny Rare`, `ACE SPEC Rare`/`Rare ACE`); a raw un-normalized value (`MEGA_ATTACK_RARE`, all-caps/underscored); subset labels masquerading as rarities (`Trainer Gallery Rare Holo`, `Classic Collection`); and `Promo`, which is a channel, not a tier. Some cards have **no** `rarity` field at all. → Normalize via a lookup table with an explicit review/fallback bucket (see §5).
3. **Types are strings, not numbers.** `hp`, `number`, `level` are **strings**; `number` can be non-numeric (e.g. `TG12`, `SV107`) so don't cast blindly. `nationalPokedexNumbers` is a list (multi-Pokémon cards).
4. **`pageSize` hard-caps at 250** — you *must* page through `count`/`totalCount` for a full catalog ([search cards](https://docs.pokemontcg.io/api-reference/cards/search-cards/)).
5. **Official SDKs exist**, listed under "Developer SDKs" in the docs: **Python, Ruby, Javascript, C#, Kotlin, Typescript, PHP, Go, Dart, Elixir** ([docs nav](https://docs.pokemontcg.io/)). So there **is** an official JavaScript (and separate TypeScript) SDK — though for a modern TS/Node catalog, calling the REST endpoints directly (with `X-Api-Key`) is simple and avoids stale wrapper dependencies. Confirm the specific SDK's maintenance status before adopting it.
6. **Rate-limit without a key is only 1,000/day + 30/min** — enough to prototype, not to bulk-ingest the whole catalog. Get a free key before a full crawl.

---

## Summary (rarity + auth/rate-limit facts)

- **Base:** `https://api.pokemontcg.io/v2`; endpoints `/cards`, `/cards/{id}`, `/sets`, `/sets/{id}`, `/rarities`, `/types`, `/subtypes`, `/supertypes`. Lucene `q=`, `page`/`pageSize` (**max 250**), `orderBy`, `select`.
- **Auth:** header **`X-Api-Key`**; key is **free** from **dev.pokemontcg.io**; optional but recommended.
- **Rate limits:** **with key = 20,000/day**; **without key = 1,000/day and 30/minute**.
- **`/rarities` returns 38 free-form strings** (full list in §5). Modern SV names map 1:1 to the seven ranks; older data uses `Rare <mechanic>` names.
- **Map with a lookup + fallback:** watch near-duplicates (`Ultra Rare`/`Rare Ultra`, `Rare Shiny`/`Shiny Rare`), a raw value `MEGA_ATTACK_RARE`, subset labels (`Trainer Gallery Rare Holo`, `Classic Collection`), and `Promo` (not a tier).
- **Images:** stable CDN URLs from the response's `images.*` fields — now `images.pokemontcg.io` **or** `images.scrydex.com` (Scrydex migration). ToS is silent on hotlinking/attribution; art remains © The Pokémon Company.
