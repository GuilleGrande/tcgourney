import { api } from "encore.dev/api";
import { computeLine, type Milestone, type StageInput } from "@tcgourney/rank-engine";

/**
 * Seed roster — a handful of illustrative evolution lines so the binder has
 * something to show. The Milestones here are hand-set for demonstration; the
 * real roster will be edited through the app and persisted in Postgres.
 * See ashs-journey-ruleset.md.
 */
const SEED_LINES: StageInput[][] = [
  // The ruleset's worked example: the whole story rides up into Charizard.
  [
    { species: "Charmander", milestones: ["catch", "bond", "teammate"] },
    { species: "Charmeleon", milestones: [] },
    { species: "Charizard", milestones: ["encounter", "loyal", "glory", "opponent"] },
  ],
  // Ash's ever-present partner, who never evolved.
  [
    {
      species: "Pikachu",
      milestones: ["catch", "opponent", "teammate", "encounter", "bond", "glory", "loyal"],
    },
  ],
  [{ species: "Bulbasaur", milestones: ["catch", "teammate", "bond", "loyal"] }],
  [{ species: "Squirtle", milestones: ["catch", "teammate", "bond"] }],
  // Never caught, yet woven into the tale all the same.
  [{ species: "Meowth", milestones: ["encounter", "bond"] }],
];

interface RankView {
  stars: number;
  name: string;
  token: string;
}

interface SlotView {
  rank: RankView;
  isCatchSlot: boolean;
  owned: boolean;
}

interface BinderEntry {
  species: string;
  line: string[];
  caught: boolean;
  stars: number;
  rank: RankView;
  milestones: Milestone[];
  slots: SlotView[];
}

interface BinderResponse {
  entries: BinderEntry[];
}

/** The binder: every Pokémon that earned a place, with its Rank and Slots. */
export const getBinder = api(
  { method: "GET", path: "/binder", expose: true },
  async (): Promise<BinderResponse> => {
    const entries: BinderEntry[] = [];
    for (const line of SEED_LINES) {
      const lineNames = line.map((stage) => stage.species);
      for (const stage of computeLine(line)) {
        // A Pokémon earns a place only if it was caught or won at least one Star.
        if (!stage.caught && stage.stars === 0) continue;
        entries.push({
          species: stage.species,
          line: lineNames,
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
    return { entries };
  },
);
