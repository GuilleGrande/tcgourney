/**
 * Ash's Journey — the rank engine.
 *
 * Pure, dependency-free domain logic: given the Milestones an Entry earned, work
 * out its Stars, its Rank, and the binder Slots it opens. See CONTEXT.md for the
 * vocabulary and ashs-journey-ruleset.md for the rules this encodes.
 */

/** A story milestone. `catch` is the ⚫ base; the other six each grant one Star. */
export type Milestone =
  | 'catch'
  | 'opponent'
  | 'teammate'
  | 'encounter'
  | 'bond'
  | 'glory'
  | 'loyal';

/** The six star-granting Milestones, in ruleset order (excludes `catch`). */
export const STAR_MILESTONES = [
  'opponent',
  'teammate',
  'encounter',
  'bond',
  'glory',
  'loyal',
] as const satisfies readonly Milestone[];

/** The maximum Stars an Entry can hold — one per star-granting Milestone. */
export const MAX_STARS = STAR_MILESTONES.length;

/** Fast membership test for the star-granting Milestones. */
const STAR_MILESTONE_SET = new Set<Milestone>(STAR_MILESTONES);

/** The name of a Rank on the ladder. */
export type RankName =
  | 'Common/Uncommon'
  | 'Rare'
  | 'Double Rare'
  | 'Ultra Rare'
  | 'Illustration Rare'
  | 'Special Illustration Rare'
  | 'Hyper Rare';

/** A Rank on the ladder. `stars` (0..6) is the canonical ordering key. */
export interface Rank {
  readonly stars: number;
  readonly name: RankName;
  readonly token: string;
}

/** The rank ladder, ordered low → high. `RANKS[n]` is the Rank for n Stars. */
export const RANKS: readonly Rank[] = [
  { stars: 0, name: 'Common/Uncommon', token: '⚫' },
  { stars: 1, name: 'Rare', token: '⭐' },
  { stars: 2, name: 'Double Rare', token: '⭐⭐' },
  { stars: 3, name: 'Ultra Rare', token: '⭐⭐⭐' },
  { stars: 4, name: 'Illustration Rare', token: '⭐⭐⭐⭐' },
  { stars: 5, name: 'Special Illustration Rare', token: '⭐⭐⭐⭐⭐' },
  { stars: 6, name: 'Hyper Rare', token: '⭐⭐⭐⭐⭐⭐' },
];

/** A single fillable place in the Binder: one rank rung of one Entry. */
export interface Slot {
  readonly rank: Rank;
  /** The ⚫ Common/Uncommon rung, which only a Catch unlocks. */
  readonly isCatchSlot: boolean;
}

/**
 * One evolution stage as authored. `milestones` are those earned directly at this
 * stage, already unioned across all of its Appearances (Ash's, rivals', wild).
 */
export interface StageInput {
  readonly species: string;
  readonly milestones: readonly Milestone[];
}

/** The computed standing of one stage in an Evolution Line. */
export interface StageResult {
  readonly species: string;
  /** Cumulative Milestones: this stage's own ∪ every earlier stage's. */
  readonly milestones: ReadonlySet<Milestone>;
  readonly caught: boolean;
  readonly stars: number;
  readonly rank: Rank;
  /** Slots low → high: the ⚫ rung (if caught) then one rung per rank 1..stars. */
  readonly slots: readonly Slot[];
}

/**
 * Count the distinct star-granting Milestones in `milestones` (ignores `catch`),
 * capped at {@link MAX_STARS}.
 */
export function starsOf(milestones: Iterable<Milestone>): number {
  const earned = new Set<Milestone>();
  for (const milestone of milestones) {
    if (STAR_MILESTONE_SET.has(milestone)) earned.add(milestone);
  }
  return Math.min(earned.size, MAX_STARS);
}

/** The Rank for a given Star count (0..{@link MAX_STARS}). */
export function rankForStars(stars: number): Rank {
  const rank = RANKS[stars];
  if (!rank) {
    throw new RangeError(`stars must be an integer in 0..${MAX_STARS}, got ${stars}`);
  }
  return rank;
}

/**
 * The binder Slots for an Entry: the ⚫ rung only if `caught`, then one rung per
 * rank from 1 to `stars`.
 */
export function slotsFor(args: { stars: number; caught: boolean }): Slot[] {
  const { stars, caught } = args;
  if (!Number.isInteger(stars) || stars < 0 || stars > MAX_STARS) {
    throw new RangeError(`stars must be an integer in 0..${MAX_STARS}, got ${stars}`);
  }
  const slots: Slot[] = [];
  if (caught) slots.push({ rank: rankForStars(0), isCatchSlot: true });
  for (let star = 1; star <= stars; star += 1) {
    slots.push({ rank: rankForStars(star), isCatchSlot: false });
  }
  return slots;
}

/**
 * Resolve a whole Evolution Line (base → final), applying up-the-line inheritance
 * — "the climb never slides back" — and returning each stage's standing.
 */
export function computeLine(stages: readonly StageInput[]): StageResult[] {
  const accumulated = new Set<Milestone>();
  const results: StageResult[] = [];
  for (const stage of stages) {
    for (const milestone of stage.milestones) accumulated.add(milestone);
    const milestones = new Set(accumulated);
    const caught = milestones.has('catch');
    const stars = starsOf(milestones);
    results.push({
      species: stage.species,
      milestones,
      caught,
      stars,
      rank: rankForStars(stars),
      slots: slotsFor({ stars, caught }),
    });
  }
  return results;
}
