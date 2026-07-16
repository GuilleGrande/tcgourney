import { describe, it, expect } from 'vitest';
import {
  starsOf,
  rankForStars,
  slotsFor,
  computeLine,
  type StageInput,
} from './rank-engine';

describe('starsOf', () => {
  it('scores no Stars for a caught Pokémon that did nothing more', () => {
    // An idle Tauros — the Catch is the ⚫ base, not a Star.
    expect(starsOf(['catch'])).toBe(0);
  });

  it('counts one Star per distinct star-granting Milestone', () => {
    // Meowth — never caught, yet Encounter + Bond earn two Stars.
    expect(starsOf(['encounter', 'bond'])).toBe(2);
  });

  it('does not count the Catch toward Stars', () => {
    // Charmander — Catch + Bond + Teammate ⇒ two Stars.
    expect(starsOf(['catch', 'bond', 'teammate'])).toBe(2);
  });

  it('counts each Milestone type at most once', () => {
    expect(starsOf(['bond', 'bond', 'teammate'])).toBe(2);
  });

  it('caps at six Stars — the full set of star-granting Milestones', () => {
    expect(
      starsOf(['opponent', 'teammate', 'encounter', 'bond', 'glory', 'loyal']),
    ).toBe(6);
  });
});

describe('rankForStars', () => {
  it('maps each Star count to the ruleset ladder', () => {
    expect(rankForStars(0).name).toBe('Common/Uncommon');
    expect(rankForStars(1).name).toBe('Rare');
    expect(rankForStars(2).name).toBe('Double Rare');
    expect(rankForStars(3).name).toBe('Ultra Rare');
    expect(rankForStars(4).name).toBe('Illustration Rare');
    expect(rankForStars(5).name).toBe('Special Illustration Rare');
    expect(rankForStars(6).name).toBe('Hyper Rare');
  });

  it('rejects Star counts outside 0..6', () => {
    expect(() => rankForStars(-1)).toThrow();
    expect(() => rankForStars(7)).toThrow();
  });
});

describe('slotsFor', () => {
  it('opens the ⚫ rung plus a rung per rank up to the earned Rank when caught', () => {
    // Charmander: 2 Stars, caught ⇒ ⚫ + Rare + Double Rare.
    const slots = slotsFor({ stars: 2, caught: true });
    expect(slots.map((s) => s.rank.name)).toEqual([
      'Common/Uncommon',
      'Rare',
      'Double Rare',
    ]);
    expect(slots[0]!.isCatchSlot).toBe(true);
    expect(slots.slice(1).every((s) => !s.isCatchSlot)).toBe(true);
  });

  it('omits the ⚫ rung for a Pokémon that was never caught', () => {
    // Meowth: 2 Stars, uncaught ⇒ Rare + Double Rare, no ⚫.
    const slots = slotsFor({ stars: 2, caught: false });
    expect(slots.map((s) => s.rank.name)).toEqual(['Rare', 'Double Rare']);
    expect(slots.some((s) => s.isCatchSlot)).toBe(false);
  });

  it('gives a caught, star-less Pokémon only the ⚫ rung', () => {
    // Idle Tauros.
    expect(slotsFor({ stars: 0, caught: true }).map((s) => s.rank.name)).toEqual([
      'Common/Uncommon',
    ]);
  });

  it('gives an uncaught, star-less Pokémon no slots at all', () => {
    expect(slotsFor({ stars: 0, caught: false })).toEqual([]);
  });
});

describe('computeLine', () => {
  const charizardLine: StageInput[] = [
    { species: 'Charmander', milestones: ['catch', 'bond', 'teammate'] },
    { species: 'Charmeleon', milestones: [] },
    { species: 'Charizard', milestones: ['encounter', 'loyal', 'glory', 'opponent'] },
  ];

  it("reproduces the ruleset's Charizard worked example", () => {
    const line = computeLine(charizardLine);
    const charmander = line[0]!;
    const charmeleon = line[1]!;
    const charizard = line[2]!;

    expect(charmander.caught).toBe(true);
    expect(charmander.stars).toBe(2);
    expect(charmander.rank.name).toBe('Double Rare');
    expect(charmander.slots).toHaveLength(3);

    // Earns nothing new of its own, but inherits Catch + Bond + Teammate.
    expect(charmeleon.caught).toBe(true);
    expect(charmeleon.stars).toBe(2);
    expect(charmeleon.rank.name).toBe('Double Rare');
    expect(charmeleon.slots).toHaveLength(3);

    // Carries the whole story: six Stars, Hyper Rare, seven Slots.
    expect(charizard.caught).toBe(true);
    expect(charizard.stars).toBe(6);
    expect(charizard.rank.name).toBe('Hyper Rare');
    expect(charizard.slots).toHaveLength(7);
    expect(charizard.milestones.has('opponent')).toBe(true);
    expect(charizard.milestones.has('bond')).toBe(true);
  });

  it('never lets the climb slide back — a later form ties or outranks the one before', () => {
    const line = computeLine(charizardLine);
    for (let i = 1; i < line.length; i += 1) {
      expect(line[i]!.stars).toBeGreaterThanOrEqual(line[i - 1]!.stars);
    }
  });

  it('gives an uncaught Pokémon its Stars but no ⚫ rung', () => {
    // Meowth as a single-stage line.
    const [meowth] = computeLine([
      { species: 'Meowth', milestones: ['encounter', 'bond'] },
    ]);
    expect(meowth!.caught).toBe(false);
    expect(meowth!.stars).toBe(2);
    expect(meowth!.rank.name).toBe('Double Rare');
    expect(meowth!.slots.map((s) => s.rank.name)).toEqual(['Rare', 'Double Rare']);
  });
});
