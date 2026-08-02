import { describe, it, expect } from "vitest";
import {
  composeBinder,
  type BinderEntry,
  type RosterEntryRow,
  type RosterMilestoneRow,
} from "./binder-view";

/** The ruleset's worked example: the whole story rides up into Charizard. */
const CHARMANDER_LINE: RosterEntryRow[] = [
  { slug: "charmander", displayName: "Charmander", dexNumber: 4, lineSlug: "charmander", stageOrder: 0 },
  { slug: "charmeleon", displayName: "Charmeleon", dexNumber: 5, lineSlug: "charmander", stageOrder: 1 },
  { slug: "charizard", displayName: "Charizard", dexNumber: 6, lineSlug: "charmander", stageOrder: 2 },
];

/** Charmeleon earned nothing of its own; it stands on what Charmander won. */
const CHARMANDER_LINE_MILESTONES: RosterMilestoneRow[] = [
  { entrySlug: "charmander", type: "catch" },
  { entrySlug: "charmander", type: "bond" },
  { entrySlug: "charmander", type: "teammate" },
  { entrySlug: "charizard", type: "encounter" },
  { entrySlug: "charizard", type: "loyal" },
  { entrySlug: "charizard", type: "glory" },
  { entrySlug: "charizard", type: "opponent" },
];

/** Never caught, yet woven into the tale all the same — a Line of one. */
const MEOWTH: RosterEntryRow[] = [
  { slug: "meowth", displayName: "Meowth", dexNumber: 52, lineSlug: "meowth", stageOrder: 0 },
];

const MEOWTH_MILESTONES: RosterMilestoneRow[] = [
  { entrySlug: "meowth", type: "encounter" },
  { entrySlug: "meowth", type: "bond" },
];

/**
 * The whole retired seed as rows, in the order the query hands them back
 * (`ORDER BY line_slug, stage_order`). Its seven Entries and twenty-nine Slots are
 * the regression baseline the ported endpoint has to reproduce.
 */
const SEED_ROSTER: RosterEntryRow[] = [
  { slug: "bulbasaur", displayName: "Bulbasaur", dexNumber: 1, lineSlug: "bulbasaur", stageOrder: 0 },
  ...CHARMANDER_LINE,
  { slug: "meowth", displayName: "Meowth", dexNumber: 52, lineSlug: "meowth", stageOrder: 0 },
  { slug: "pikachu", displayName: "Pikachu", dexNumber: 25, lineSlug: "pikachu", stageOrder: 0 },
  { slug: "squirtle", displayName: "Squirtle", dexNumber: 7, lineSlug: "squirtle", stageOrder: 0 },
];

const SEED_MILESTONES: RosterMilestoneRow[] = [
  { entrySlug: "bulbasaur", type: "catch" },
  { entrySlug: "bulbasaur", type: "teammate" },
  { entrySlug: "bulbasaur", type: "bond" },
  { entrySlug: "bulbasaur", type: "loyal" },
  ...CHARMANDER_LINE_MILESTONES,
  ...MEOWTH_MILESTONES,
  // Ash's ever-present partner, who never evolved and earned every Star there is.
  { entrySlug: "pikachu", type: "catch" },
  { entrySlug: "pikachu", type: "opponent" },
  { entrySlug: "pikachu", type: "teammate" },
  { entrySlug: "pikachu", type: "encounter" },
  { entrySlug: "pikachu", type: "bond" },
  { entrySlug: "pikachu", type: "glory" },
  { entrySlug: "pikachu", type: "loyal" },
  { entrySlug: "squirtle", type: "catch" },
  { entrySlug: "squirtle", type: "teammate" },
  { entrySlug: "squirtle", type: "bond" },
];

function bySpecies(entries: BinderEntry[]): Map<string, BinderEntry> {
  return new Map(entries.map((entry) => [entry.species, entry]));
}

describe("composeBinder", () => {
  it("carries the story forward up an Evolution Line", () => {
    const { entries } = composeBinder(CHARMANDER_LINE, CHARMANDER_LINE_MILESTONES);
    const found = bySpecies(entries);

    // Catch + Bond + Teammate ⇒ two Stars, and the ⚫ rung on top of them.
    const charmander = found.get("Charmander")!;
    expect(charmander.caught).toBe(true);
    expect(charmander.stars).toBe(2);
    expect(charmander.rank.name).toBe("Double Rare");
    expect(charmander.slots).toHaveLength(3);

    // Earns nothing of its own, and still stands where Charmander stood.
    const charmeleon = found.get("Charmeleon")!;
    expect(charmeleon.stars).toBe(2);
    expect(charmeleon.slots).toHaveLength(3);

    // Carries the whole story: six Stars, Hyper Rare, seven Slots.
    const charizard = found.get("Charizard")!;
    expect(charizard.stars).toBe(6);
    expect(charizard.rank.name).toBe("Hyper Rare");
    expect(charizard.slots).toHaveLength(7);
  });

  it("gives a place only to the stages that were caught or won a Star", () => {
    // Ash never caught a Pidgey; the Line begins for him at Pidgeotto. The base
    // stage is charted so the Line reads whole, but it earned no place of its own.
    const pidgeyLine: RosterEntryRow[] = [
      { slug: "pidgey", displayName: "Pidgey", dexNumber: 16, lineSlug: "pidgey", stageOrder: 0 },
      { slug: "pidgeotto", displayName: "Pidgeotto", dexNumber: 17, lineSlug: "pidgey", stageOrder: 1 },
      { slug: "pidgeot", displayName: "Pidgeot", dexNumber: 18, lineSlug: "pidgey", stageOrder: 2 },
    ];
    const pidgeyLineMilestones: RosterMilestoneRow[] = [
      { entrySlug: "pidgeotto", type: "catch" },
      { entrySlug: "pidgeotto", type: "teammate" },
      { entrySlug: "pidgeot", type: "loyal" },
    ];

    const { entries } = composeBinder(pidgeyLine, pidgeyLineMilestones);

    expect(entries.map((entry) => entry.species)).toEqual(["Pidgeotto", "Pidgeot"]);
    expect(entries[0]!.stars).toBe(1);
    expect(entries[1]!.stars).toBe(2);
    // Left out of the Binder, never out of the Line.
    expect(entries[0]!.line).toEqual(["Pidgey", "Pidgeotto", "Pidgeot"]);
  });

  it("keeps an uncaught Pokémon that earned Stars, without a ⚫ Catch Slot", () => {
    // Meowth — never caught, yet Encounter + Bond earn two Stars.
    const { entries } = composeBinder(MEOWTH, MEOWTH_MILESTONES);

    expect(entries).toHaveLength(1);
    const meowth = entries[0]!;
    expect(meowth.caught).toBe(false);
    expect(meowth.stars).toBe(2);
    expect(meowth.rank.name).toBe("Double Rare");
    expect(meowth.slots.map((slot) => slot.rank.name)).toEqual(["Rare", "Double Rare"]);
    expect(meowth.slots.some((slot) => slot.isCatchSlot)).toBe(false);
  });

  it("shows an empty Binder when nothing has been charted yet", () => {
    // A journey not yet written down is an empty Binder, not an error.
    expect(composeBinder([], [])).toEqual({ entries: [] });
  });

  it("hands the wire plain values — arrays, not Sets, and no Slot owned yet", () => {
    const response = composeBinder(CHARMANDER_LINE, CHARMANDER_LINE_MILESTONES);
    const charizard = bySpecies(response.entries).get("Charizard")!;

    // The engine's ReadonlySet must never reach the wire: it breaks both JSON and
    // the generated client.
    expect(Array.isArray(charizard.milestones)).toBe(true);
    expect([...charizard.milestones].sort()).toEqual([
      "bond",
      "catch",
      "encounter",
      "glory",
      "loyal",
      "opponent",
      "teammate",
    ]);

    // No card is owned until the Collector's shelves are modelled.
    expect(charizard.slots.every((slot) => slot.owned === false)).toBe(true);

    // The Line reads in stage order, by display name.
    expect(charizard.line).toEqual(["Charmander", "Charmeleon", "Charizard"]);

    // And the whole thing survives a round trip through JSON unchanged.
    expect(JSON.parse(JSON.stringify(response))).toEqual(response);
  });

  it("counts a Milestone type once however many times it was recorded", () => {
    // AD-10 keeps every record of a type; the Star count still counts the type once.
    const { entries } = composeBinder(MEOWTH, [
      { entrySlug: "meowth", type: "encounter" },
      { entrySlug: "meowth", type: "bond" },
      { entrySlug: "meowth", type: "bond" },
    ]);

    const meowth = entries[0]!;
    expect(meowth.stars).toBe(2);
    expect(meowth.rank.name).toBe("Double Rare");
    expect(meowth.slots).toHaveLength(2);
    // The wire carries each type once, however many records stand behind it.
    expect(meowth.milestones).toEqual(["encounter", "bond"]);
    expect(meowth.line).toEqual(["Meowth"]);
  });

  it("keeps every Evolution Line apart when the whole roster is read at once", () => {
    // The retired seed, restored as rows: seven Entries earning twenty-nine Slots.
    // Reading one Line at a time would never catch a Line bleeding into its neighbour.
    const { entries } = composeBinder(SEED_ROSTER, SEED_MILESTONES);

    expect(entries.map((entry) => entry.species)).toEqual([
      "Bulbasaur",
      "Charmander",
      "Charmeleon",
      "Charizard",
      "Meowth",
      "Pikachu",
      "Squirtle",
    ]);
    expect(entries).toHaveLength(7);
    expect(entries.reduce((total, entry) => total + entry.slots.length, 0)).toBe(29);

    const found = bySpecies(entries);
    expect(found.get("Pikachu")!.stars).toBe(6);
    expect(found.get("Pikachu")!.slots).toHaveLength(7);
    expect(found.get("Bulbasaur")!.stars).toBe(3);
    expect(found.get("Bulbasaur")!.rank.name).toBe("Ultra Rare");
    expect(found.get("Squirtle")!.stars).toBe(2);

    // Ash's partner never evolved, so his Line names him alone.
    expect(found.get("Pikachu")!.line).toEqual(["Pikachu"]);
    // And Charmander's story stays Charmander's.
    expect(found.get("Charizard")!.line).toEqual([
      "Charmander",
      "Charmeleon",
      "Charizard",
    ]);
  });

  it("climbs the Line in stage order however the rows arrive", () => {
    // The SQL orders by stage_order, but the climb must not depend on it —
    // reversed rows still make Charmander the base and Charizard the summit.
    const { entries } = composeBinder(
      [...CHARMANDER_LINE].reverse(),
      CHARMANDER_LINE_MILESTONES,
    );

    expect(entries.map((entry) => entry.species)).toEqual([
      "Charmander",
      "Charmeleon",
      "Charizard",
    ]);
    expect(bySpecies(entries).get("Charizard")!.stars).toBe(6);
  });

  it("gives a caught Pokémon that won nothing more its ⚫ rung alone", () => {
    // An idle Tauros — the Catch is the base of the ladder, never a Star.
    const { entries } = composeBinder(
      [{ slug: "tauros", displayName: "Tauros", dexNumber: 128, lineSlug: "tauros", stageOrder: 0 }],
      [{ entrySlug: "tauros", type: "catch" }],
    );

    const tauros = entries[0]!;
    expect(tauros.caught).toBe(true);
    expect(tauros.stars).toBe(0);
    expect(tauros.rank.name).toBe("Common/Uncommon");
    expect(tauros.slots).toEqual([
      {
        rank: { stars: 0, name: "Common/Uncommon", token: "⚫" },
        isCatchSlot: true,
        owned: false,
      },
    ]);
  });

  it("opens the ⚫ rung first for a Pokémon that was caught", () => {
    const { entries } = composeBinder(CHARMANDER_LINE, CHARMANDER_LINE_MILESTONES);
    const charmander = bySpecies(entries).get("Charmander")!;

    expect(charmander.slots[0]!.isCatchSlot).toBe(true);
    expect(charmander.slots[0]!.rank.name).toBe("Common/Uncommon");
    expect(charmander.slots.slice(1).some((slot) => slot.isCatchSlot)).toBe(false);
    expect(charmander.slots.map((slot) => slot.rank.name)).toEqual([
      "Common/Uncommon",
      "Rare",
      "Double Rare",
    ]);
  });
});
