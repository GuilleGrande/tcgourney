# API Contracts — `backend`

**Part:** `backend` (Encore.ts application, repo root)
**Generated:** 2026-07-25 · exhaustive scan
**Source of truth:** [`roster/binder.ts`](../roster/binder.ts)

---

## Overview

The backend currently exposes **one public endpoint**, defined with Encore.ts's
`api()` helper. There is no authentication, no auth handler, and no gateway
configuration — `encore.app` declares only the app id and Docker build settings.

| Method | Path      | Service  | Exposed | Auth | Handler                             |
| ------ | --------- | -------- | :-----: | :--: | ----------------------------------- |
| `GET`  | `/binder` | `roster` |   ✅    | none | `getBinder` in `roster/binder.ts:57` |

Local base URL: `http://localhost:4000` (Encore dev server; dashboard on `:9400`).

---

## `GET /binder`

> _"The binder: every Pokémon that earned a place, with its Rank and Slots."_

Returns the entire Binder in a single response. There is no pagination, no
filtering, and no query/path/header parameters — the endpoint takes no request
payload at all.

### Request

```http
GET /binder HTTP/1.1
Host: localhost:4000
```

No parameters. The handler signature is `async (): Promise<BinderResponse>`.

### Response — `200 OK`

```jsonc
{
  "entries": [
    {
      "species": "Charmander",
      "line": ["Charmander", "Charmeleon", "Charizard"],
      "caught": true,
      "stars": 2,
      "rank": { "stars": 2, "name": "Double Rare", "token": "⭐⭐" },
      "milestones": ["catch", "bond", "teammate"],
      "slots": [
        { "rank": { "stars": 0, "name": "Common/Uncommon", "token": "⚫" }, "isCatchSlot": true,  "owned": false },
        { "rank": { "stars": 1, "name": "Rare",            "token": "⭐" },  "isCatchSlot": false, "owned": false },
        { "rank": { "stars": 2, "name": "Double Rare",     "token": "⭐⭐" }, "isCatchSlot": false, "owned": false }
      ]
    }
    // … more entries
  ]
}
```

### Response schema

**`BinderResponse`**

| Field     | Type            | Notes                                       |
| --------- | --------------- | ------------------------------------------- |
| `entries` | `BinderEntry[]` | One per Pokémon (per evolution stage) that earned a place. |

**`BinderEntry`**

| Field        | Type         | Notes                                                                     |
| ------------ | ------------ | ------------------------------------------------------------------------- |
| `species`    | `string`     | The Pokémon at this evolution stage, e.g. `"Charmeleon"`.                  |
| `line`       | `string[]`   | The full Evolution Line this Entry belongs to, base → final.               |
| `caught`     | `boolean`    | Whether the Catch Milestone is held (cumulative up the line).              |
| `stars`      | `number`     | `0..6` — count of distinct star-granting Milestones.                       |
| `rank`       | `RankView`   | The Rank this Entry reached.                                              |
| `milestones` | `Milestone[]` | Cumulative Milestones, own ∪ every earlier stage's. Serialized from a `Set`, so order follows insertion, not the ruleset ladder. |
| `slots`      | `SlotView[]` | Fillable places, low → high.                                              |

**`RankView`**

| Field   | Type     | Notes                                                              |
| ------- | -------- | ------------------------------------------------------------------ |
| `stars` | `number` | `0..6`; the canonical ordering key.                                |
| `name`  | `string` | One of the seven `RankName` values (see [Data Models](./data-models-backend.md)). |
| `token` | `string` | Display token, `⚫` through `⭐⭐⭐⭐⭐⭐`.                          |

**`SlotView`**

| Field         | Type       | Notes                                                                  |
| ------------- | ---------- | ---------------------------------------------------------------------- |
| `rank`        | `RankView` | The Rank this Slot demands.                                            |
| `isCatchSlot` | `boolean`  | `true` only for the `⚫` rung, which only a Catch unlocks.             |
| `owned`       | `boolean`  | **Currently hardcoded `false`** — ownership is not yet persisted anywhere. |

**`Milestone`** — string union: `"catch"`, `"opponent"`, `"teammate"`,
`"encounter"`, `"bond"`, `"glory"`, `"loyal"`.

### Errors

None are raised by the handler. `rankForStars` and `slotsFor` in the rank engine
throw `RangeError` on out-of-range Star counts, but the seed data cannot reach
those branches, so in practice this endpoint always returns `200`.

### Response is deterministic

The endpoint has no I/O and no state — it recomputes from the compile-time
`SEED_LINES` constant on every call, so the response is byte-identical across
requests. The current seed yields **7 entries** and **29 slots** in total:

| Entry      | Line               | Caught | Stars | Rank        | Slots |
| ---------- | ------------------ | :----: | :---: | ----------- | :---: |
| Charmander | Charizard line     |   ✅   |   2   | Double Rare |   3   |
| Charmeleon | Charizard line     |   ✅   |   2   | Double Rare |   3   |
| Charizard  | Charizard line     |   ✅   |   6   | Hyper Rare  |   7   |
| Pikachu    | (single stage)     |   ✅   |   6   | Hyper Rare  |   7   |
| Bulbasaur  | (single stage)     |   ✅   |   3   | Ultra Rare  |   4   |
| Squirtle   | (single stage)     |   ✅   |   2   | Double Rare |   3   |
| Meowth     | (single stage)     |   ❌   |   2   | Double Rare |   2   |

Meowth is the case that proves the rule: never caught, yet Encounter + Bond earn
two Stars — and its Slot list omits the `⚫` rung entirely.

---

## Filtering rule

Not every computed stage becomes an Entry. `roster/binder.ts:65` drops any stage
that was neither caught nor earned a Star:

```ts
if (!stage.caught && stage.stars === 0) continue;
```

With the current seed no stage is filtered out, but the rule matters for the real
roster: an intermediate evolution stage that inherits nothing has no place in the
Binder.

---

## Client generation

The response types are plain TypeScript interfaces, which is what lets Encore
generate a typed client:

```powershell
npm run gen:client   # encore gen client tcgourney-46xi --output=./frontend/src/client.ts --env=local
```

⚠️ The script writes to `./frontend/src/client.ts`, but **no `frontend/` directory
exists yet** — the script will fail until the planned Vite + React frontend is
scaffolded. See [Integration Architecture](./integration-architecture.md).

---

## Gaps / planned

- **No write endpoints.** Marking a Slot as owned, editing the roster, and
  recording Milestones all still need endpoints.
- **No card catalog endpoints.** The Pokémon TCG API integration (and the
  rarity → rank translation map) is researched but not implemented — see
  [`docs/research/pokemontcg-api.md`](./research/pokemontcg-api.md).
- **No auth.** `expose: true` with no `auth` option means `/binder` is fully public.
