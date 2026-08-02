import { computeLine, type Milestone, type StageInput } from "@tcgourney/rank-engine";

/**
 * The Binder as it travels on the wire. The engine speaks in `readonly` values and
 * Sets; the wire speaks in plain arrays and objects, so everything is copied at this
 * boundary rather than forwarded.
 */
export interface RankView {
  stars: number;
  name: string;
  token: string;
}

export interface SlotView {
  rank: RankView;
  isCatchSlot: boolean;
  owned: boolean;
}

export interface BinderEntry {
  species: string;
  line: string[];
  caught: boolean;
  stars: number;
  rank: RankView;
  milestones: Milestone[];
  slots: SlotView[];
}

export interface BinderResponse {
  entries: BinderEntry[];
}

/** One `roster_entry` row: a species on the roster, and its place in its Evolution Line. */
export interface RosterEntryRow {
  slug: string;
  displayName: string;
  dexNumber: number;
  lineSlug: string;
  stageOrder: number;
}

/** One `roster_milestone` row: a single moment of the story, earned at one stage. */
export interface RosterMilestoneRow {
  entrySlug: string;
  type: Milestone;
}

/**
 * Build the Binder from authored rows. Nothing here is stored — Stars, Rank and Slots
 * are worked out afresh on every read.
 */
export function composeBinder(
  entries: readonly RosterEntryRow[],
  milestones: readonly RosterMilestoneRow[],
): BinderResponse {
  const earnedAt = new Map<string, Milestone[]>();
  for (const row of milestones) {
    const own = earnedAt.get(row.entrySlug);
    if (own) own.push(row.type);
    else earnedAt.set(row.entrySlug, [row.type]);
  }

  const lines = new Map<string, RosterEntryRow[]>();
  for (const row of entries) {
    const stages = lines.get(row.lineSlug);
    if (stages) stages.push(row);
    else lines.set(row.lineSlug, [row]);
  }

  const binderEntries: BinderEntry[] = [];
  for (const stages of lines.values()) {
    stages.sort((a, b) => a.stageOrder - b.stageOrder);

    // The Line names every stage that has been charted, even the ones that never
    // earned a place of their own.
    const lineNames = stages.map((stage) => stage.displayName);

    // Each stage carries only what it earned itself; the climb up the Line is the
    // engine's to make.
    const stageInputs: StageInput[] = stages.map((stage) => ({
      species: stage.displayName,
      milestones: earnedAt.get(stage.slug) ?? [],
    }));

    for (const stage of computeLine(stageInputs)) {
      // A Pokémon earns a place only if it was caught or won at least one Star.
      if (!stage.caught && stage.stars === 0) continue;
      binderEntries.push({
        species: stage.species,
        line: [...lineNames],
        caught: stage.caught,
        stars: stage.stars,
        rank: { ...stage.rank },
        milestones: [...stage.milestones],
        slots: stage.slots.map((slot) => ({
          rank: { ...slot.rank },
          isCatchSlot: slot.isCatchSlot,
          owned: false,
        })),
      });
    }
  }

  return { entries: binderEntries };
}
