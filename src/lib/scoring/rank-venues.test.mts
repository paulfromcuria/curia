/**
 * Unit tests for the M3 scoring engine (src/lib/scoring/rank-venues.ts).
 * Run with `node --test` (see package.json "test" script) — Node 22+'s
 * built-in TypeScript type-stripping runs these directly, no extra test
 * dependency needed. Written as `.test.mts` (unambiguous ESM) so it can
 * `import` the `.ts` source with an explicit extension; see rank-venues.ts's
 * top comment for why this module intentionally never imports the
 * docs/data/*.json seed files (Node's native ESM loader requires import
 * attributes for JSON that this project's tsc/Metro toolchain doesn't need,
 * so importing seed.ts directly from a plain-node test would break).
 *
 * Fixtures below are transcribed by hand from the real seed
 * (docs/data/venues.json / docs/data/districts.json) rather than invented,
 * per CLAUDE.md Hard rule 1 (never invent chain/fast-food venues) and the
 * task's instruction to use the real seed as the test fixture shape.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import type { District, Venue } from '../../types/models';
import type { MatchmakingInput } from '../../types/matchmaking';
import {
  applyHardFilters,
  haversineMiles,
  passesDietaryFilter,
  passesDistanceFilter,
  passesMoodFilter,
  passesPetFilter,
  rankVenues,
  reasonFor,
  resolveContext,
  scoreBaseQuality,
  scoreDayOfWeek,
  scoreSpendFit,
  scoreSubPreferenceMatch,
  scoreTileMatch,
  scoreTimeOfDay,
  scoreWeather,
  slugifyType,
} from './rank-venues.ts';

// ---------------------------------------------------------------------------
// Fixtures — real venues transcribed from docs/data/venues.json, with
// subPreferenceTags/petFriendly/dietaryOptions filled in only where a test
// needs them (the live seed.ts loader currently defaults all of these, see
// seed.ts's own comment on why — real curation lands in M8).
// ---------------------------------------------------------------------------

function venue(overrides: Partial<Venue>): Venue {
  return {
    id: 'erst',
    name: 'Erst',
    type: 'SMALL PLATES',
    subPreferenceTags: [],
    spendLevel: 4,
    districtId: 'ancoats',
    metro: 'manchester',
    lat: 53.4849,
    lon: -2.2276,
    petFriendly: false,
    dietaryOptions: ['none'],
    photos: [],
    description: 'Natural wine and communal tables both on, and the kitchen runs to 11pm.',
    bands: ['evening', 'late'],
    base: 96,
    tier: 'signature',
    sourceConfidence: 1,
    ...overrides,
  };
}

// Real seed venue: Schofield's, Northern Quarter cocktail bar.
const schofields = venue({
  id: 'schofields',
  name: "Schofield's",
  type: 'COCKTAIL BAR',
  spendLevel: 3,
  districtId: 'northern-quarter',
  lat: 53.4831,
  lon: -2.2372,
  description:
    "Award-winning list, mixology at the table — the fullest version of your cocktail tile.",
  bands: ['evening', 'late'],
  base: 95,
});

// Real seed venue: The Wizard, Alderley Edge country pub — ~20mi from central
// Manchester, useful for the distance hard filter.
const theWizard = venue({
  id: 'the-wizard',
  name: 'The Wizard',
  type: 'COUNTRY PUB',
  spendLevel: 3,
  districtId: 'alderley-edge',
  lat: 53.3021,
  lon: -2.2244,
  description: 'Fires lit from October, and the Edge walk finishes at the door.',
  bands: ['afternoon', 'evening'],
  base: 78,
});

const manchesterCityCentre = { lat: 53.4808, lon: -2.2426 };

function baseInput(overrides: Partial<MatchmakingInput> = {}): MatchmakingInput {
  return {
    preferences: [
      { category: 'Drink', selectedTileIds: ['cocktail-bar'], subPreferenceState: {} },
    ],
    you: { spendLevel: 3, dietary: ['none'], pet: 'none' },
    location: manchesterCityCentre,
    radiusMiles: 10,
    context: { now: false, day: 'tuesday', band: 'evening' },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Hard filter: distance/radius
// ---------------------------------------------------------------------------

test('distance filter: venue within radius passes', () => {
  assert.equal(passesDistanceFilter(schofields, manchesterCityCentre, 10), true);
});

test('distance filter: venue outside radius is excluded regardless of score', () => {
  // The Wizard is ~13mi from central Manchester — outside a 5mi radius even
  // though it has a strong base score (78).
  const distance = haversineMiles(manchesterCityCentre, theWizard);
  assert.ok(distance > 5, `expected fixture distance > 5mi, got ${distance}`);
  assert.equal(passesDistanceFilter(theWizard, manchesterCityCentre, 5), false);
});

test('rankVenues never returns a venue outside the radius, however well it would otherwise score', () => {
  const input = baseInput({ radiusMiles: 5, you: { spendLevel: 3, dietary: ['none'], pet: 'none' } });
  const result = rankVenues(input, [schofields, theWizard], []);
  assert.deepEqual(
    result.ranked.map((r) => r.venueId),
    ['schofields']
  );
});

// ---------------------------------------------------------------------------
// Hard filter: dietary requirement
// ---------------------------------------------------------------------------

test('dietary filter: passes when user has no requirement', () => {
  assert.equal(passesDietaryFilter(venue({ dietaryOptions: ['none'] }), ['none']), true);
});

test('dietary filter: excludes a venue with no suitable option', () => {
  assert.equal(passesDietaryFilter(venue({ dietaryOptions: ['none'] }), ['vegan']), false);
});

test('dietary filter: passes once the venue explicitly supports the requirement', () => {
  assert.equal(passesDietaryFilter(venue({ dietaryOptions: ['vegan', 'gluten-free'] }), ['vegan']), true);
});

test('dietary filter: a venue must satisfy every selected requirement, not just one', () => {
  const v = venue({ dietaryOptions: ['vegan'] });
  assert.equal(passesDietaryFilter(v, ['vegan', 'gluten-free']), false);
});

test('rankVenues excludes a high-scoring venue that cannot meet a dietary requirement', () => {
  const veganUnfriendly = venue({ id: 'v1', base: 99, dietaryOptions: ['none'] });
  const veganFriendly = venue({ id: 'v2', base: 10, dietaryOptions: ['vegan'] });
  const input = baseInput({ you: { spendLevel: 3, dietary: ['vegan'], pet: 'none' } });
  const result = rankVenues(input, [veganUnfriendly, veganFriendly], []);
  assert.deepEqual(
    result.ranked.map((r) => r.venueId),
    ['v2']
  );
});

// ---------------------------------------------------------------------------
// Hard filter: pet-friendliness (venue-side flag vs. user traveling-with-pet)
// ---------------------------------------------------------------------------

test('pet filter: passes when the user is not traveling with a pet, regardless of venue flag', () => {
  assert.equal(passesPetFilter(venue({ petFriendly: false }), 'none'), true);
});

test('pet filter: excludes a pet-unfriendly venue when the user is traveling with a pet', () => {
  assert.equal(passesPetFilter(venue({ petFriendly: false }), 'small-dog'), false);
});

test('pet filter: a pet-friendly venue passes when the user is traveling with a pet', () => {
  assert.equal(passesPetFilter(venue({ petFriendly: true }), 'large-dog'), true);
});

test('rankVenues excludes a high-scoring pet-unfriendly venue when traveling with a pet', () => {
  const noPets = venue({ id: 'v1', base: 99, petFriendly: false });
  const petsOk = venue({ id: 'v2', base: 5, petFriendly: true });
  const input = baseInput({ you: { spendLevel: 3, dietary: ['none'], pet: 'small-dog' } });
  const result = rankVenues(input, [noPets, petsOk], []);
  assert.deepEqual(
    result.ranked.map((r) => r.venueId),
    ['v2']
  );
});

// ---------------------------------------------------------------------------
// Hard filter: active "mood" quick filter narrows the candidate pool
// ---------------------------------------------------------------------------

test('mood filter: no active filter passes everything through', () => {
  assert.equal(passesMoodFilter(schofields, undefined), true);
});

test('mood filter: tileIds narrow the pool to matching venue types', () => {
  const moodFilter = { category: 'Drink', tileIds: ['cocktail-bar'], subPreferences: [] };
  assert.equal(passesMoodFilter(schofields, moodFilter), true);
  assert.equal(passesMoodFilter(venue({ type: 'COUNTRY PUB' }), moodFilter), false);
});

test('mood filter: category alone, with no tiles narrowed, still restricts to that category (regression — this used to be a silent no-op)', () => {
  const moodFilter = { category: 'Do', tileIds: [], subPreferences: [] };
  assert.equal(passesMoodFilter(venue({ type: 'MARKET HALL' }), moodFilter), true);
  assert.equal(passesMoodFilter(schofields, moodFilter), false, 'COCKTAIL BAR is Drink, not Do');
  assert.equal(passesMoodFilter(venue({ type: 'SMALL PLATES' }), moodFilter), false, 'SMALL PLATES is Eat, not Do');
});

test('mood filter: also accepts real Tile catalog ids, not just bare type-slugs', () => {
  const moodFilter = { category: 'Drink', tileIds: ['Drink|Upmarket pubs'], subPreferences: [] };
  assert.equal(passesMoodFilter(venue({ type: 'COUNTRY PUB' }), moodFilter), true);
  assert.equal(passesMoodFilter(schofields, moodFilter), false);
});

test('mood filter: subPreferences narrow the pool to matching tags even within an allowed tile', () => {
  const moodFilter = { category: 'Drink', tileIds: ['cocktail-bar'], subPreferences: ['speakeasy-style'] };
  const tagged = venue({ type: 'COCKTAIL BAR', subPreferenceTags: ['speakeasy-style'] });
  const untagged = venue({ type: 'COCKTAIL BAR', subPreferenceTags: ['live-music'] });
  assert.equal(passesMoodFilter(tagged, moodFilter), true);
  assert.equal(passesMoodFilter(untagged, moodFilter), false);
});

test('rankVenues excludes a high-scoring venue outside the active mood filter', () => {
  const wrongTile = venue({ id: 'v1', base: 99, type: 'COUNTRY PUB' });
  const rightTile = venue({ id: 'v2', base: 5, type: 'COCKTAIL BAR' });
  const input = baseInput({
    moodFilter: { category: 'Drink', tileIds: ['cocktail-bar'], subPreferences: [] },
  });
  const result = rankVenues(input, [wrongTile, rightTile], []);
  assert.deepEqual(
    result.ranked.map((r) => r.venueId),
    ['v2']
  );
});

test('rankVenues.empty is true once hard filters eliminate the entire candidate pool', () => {
  const input = baseInput({ radiusMiles: 0.1 });
  const result = rankVenues(input, [theWizard], []);
  assert.equal(result.empty, true);
  assert.deepEqual(result.ranked, []);
});

// ---------------------------------------------------------------------------
// Weighted signal: tile / sub-preference match
// ---------------------------------------------------------------------------

test('tile match: scores 1 when the venue type is a selected tile', () => {
  const prefs: MatchmakingInput['preferences'] = [
    { category: 'Drink', selectedTileIds: ['cocktail-bar'], subPreferenceState: {} },
  ];
  assert.equal(scoreTileMatch(schofields, prefs), 1);
});

test('tile match: scores 0 when the venue type is not among any selected tile', () => {
  const prefs: MatchmakingInput['preferences'] = [
    { category: 'Eat', selectedTileIds: ['tasting-menu'], subPreferenceState: {} },
  ];
  assert.equal(scoreTileMatch(schofields, prefs), 0);
});

test('tile match: resolves a real onboarding Tile catalog id ("category|name"), not just a bare type-slug', () => {
  const prefs: MatchmakingInput['preferences'] = [
    { category: 'Drink', selectedTileIds: ['Drink|Cocktail bars'], subPreferenceState: {} },
  ];
  assert.equal(scoreTileMatch(schofields, prefs), 1);
  // Speakeasy is one of "Cocktail bars"'s matched venue types too.
  assert.equal(scoreTileMatch(venue({ type: 'SPEAKEASY' }), prefs), 1);
  // A tile with no corresponding venue type in today's seed data matches nothing.
  const noVenueYet: MatchmakingInput['preferences'] = [
    { category: 'Do', selectedTileIds: ['Do|Theatre'], subPreferenceState: {} },
  ];
  assert.equal(scoreTileMatch(schofields, noVenueYet), 0);
});

test('sub-preference match: a tag left at its default ON counts as wanted', () => {
  const tagged = venue({ subPreferenceTags: ['speakeasy-style'] });
  const prefs: MatchmakingInput['preferences'] = [
    { category: 'Drink', selectedTileIds: [], subPreferenceState: {} }, // no explicit off-toggle
  ];
  assert.equal(scoreSubPreferenceMatch(tagged, prefs), 1);
});

test('sub-preference match: explicitly toggling a tag off lowers the score', () => {
  const tagged = venue({ subPreferenceTags: ['speakeasy-style', 'live-music'] });
  const prefs: MatchmakingInput['preferences'] = [
    { category: 'Drink', selectedTileIds: [], subPreferenceState: { 'speakeasy-style': false } },
  ];
  assert.equal(scoreSubPreferenceMatch(tagged, prefs), 0.5);
});

test('sub-preference match: a venue with no tags at all is neutral, not penalized', () => {
  assert.equal(scoreSubPreferenceMatch(venue({ subPreferenceTags: [] }), []), 0.5);
});

// ---------------------------------------------------------------------------
// Weighted signal: spend level
// ---------------------------------------------------------------------------

test('spend fit: an exact spend-level match scores 1', () => {
  assert.equal(scoreSpendFit(venue({ spendLevel: 3 }), 3), 1);
});

test('spend fit: the maximum possible gap (1 vs 5) scores 0', () => {
  assert.equal(scoreSpendFit(venue({ spendLevel: 1 }), 5), 0);
});

test('spend fit: closer spend levels always score higher than further ones', () => {
  const near = scoreSpendFit(venue({ spendLevel: 3 }), 4);
  const far = scoreSpendFit(venue({ spendLevel: 1 }), 4);
  assert.ok(near > far, `expected near (${near}) > far (${far})`);
});

// ---------------------------------------------------------------------------
// Weighted signal: time of day (band)
// ---------------------------------------------------------------------------

test('time of day: scores higher when the context band is one the venue runs', () => {
  const morningOnly = venue({ bands: ['morning'] });
  assert.ok(scoreTimeOfDay(morningOnly, 'morning') > scoreTimeOfDay(morningOnly, 'late'));
});

test('time of day: with no band context, score is neutral', () => {
  assert.equal(scoreTimeOfDay(venue({ bands: ['morning'] }), undefined), 0.5);
});

// ---------------------------------------------------------------------------
// Weighted signal: day of week
// ---------------------------------------------------------------------------
// docs/data/districts.json does not currently carry the prototype's real
// DAY_MULT table (see rank-venues.ts's scoreDayOfWeek doc comment) — these
// tests exercise the signal against a synthetic District fixture so the code
// path is proven even though it's a no-op against today's real seed data.

const livelyOnFriday: District = {
  id: 'test-district',
  name: 'Test District',
  metro: 'manchester',
  lat: 0,
  lon: 0,
  base: 50,
  kind: 'city',
  accentColor: '#000000',
  dayMultiplier: { friday: 1.8, tuesday: 0.4 },
};

test('day of week: a district livelier on the given day scores higher', () => {
  const friday = scoreDayOfWeek(livelyOnFriday, 'friday');
  const tuesday = scoreDayOfWeek(livelyOnFriday, 'tuesday');
  assert.ok(friday > tuesday, `expected friday (${friday}) > tuesday (${tuesday})`);
});

test('day of week: missing multiplier data is neutral, not a penalty', () => {
  assert.equal(scoreDayOfWeek(undefined, 'friday'), 0.5);
  assert.equal(scoreDayOfWeek(livelyOnFriday, 'sunday'), 0.5);
});

test('rankVenues threads day-of-week through to the final score using district lookup', () => {
  const friFixture = { ...livelyOnFriday, id: 'fri-district' };
  const v = venue({ districtId: 'fri-district' });
  const fridayInput = baseInput({ context: { now: false, day: 'friday', band: 'evening' } });
  const tuesdayInput = baseInput({ context: { now: false, day: 'tuesday', band: 'evening' } });
  const fridayResult = rankVenues(fridayInput, [v], [friFixture]);
  const tuesdayResult = rankVenues(tuesdayInput, [v], [friFixture]);
  assert.ok(fridayResult.ranked[0].score > tuesdayResult.ranked[0].score);
});

// ---------------------------------------------------------------------------
// Weighted signal: weather
// ---------------------------------------------------------------------------

test('weather: an indoor venue is favored over a rooftop venue in the rain', () => {
  const indoor = scoreWeather(venue({ type: 'SMALL PLATES' }), 'Light rain');
  const rooftop = scoreWeather(venue({ type: 'ROOFTOP' }), 'Light rain');
  assert.ok(indoor > rooftop, `expected indoor (${indoor}) > rooftop (${rooftop})`);
});

test('weather: a rooftop venue is favored over an indoor venue in clear/warm weather', () => {
  const indoor = scoreWeather(venue({ type: 'SMALL PLATES' }), 'Clear, 22°');
  const rooftop = scoreWeather(venue({ type: 'ROOFTOP' }), 'Clear, 22°');
  assert.ok(rooftop > indoor, `expected rooftop (${rooftop}) > indoor (${indoor})`);
});

test('weather: unknown/absent weather is neutral', () => {
  assert.equal(scoreWeather(venue({}), undefined), 0.5);
});

// ---------------------------------------------------------------------------
// Overall ranking behaviour
// ---------------------------------------------------------------------------

test('rankVenues sorts candidates by descending score', () => {
  const strong = venue({ id: 'strong', base: 95, type: 'COCKTAIL BAR', spendLevel: 3 });
  const weak = venue({ id: 'weak', base: 40, type: 'COUNTRY PUB', spendLevel: 1 });
  const result = rankVenues(baseInput(), [weak, strong], []);
  assert.deepEqual(
    result.ranked.map((r) => r.venueId),
    ['strong', 'weak']
  );
  assert.ok(result.ranked[0].score >= result.ranked[1].score);
});

test('rankVenues scores land in 0..100', () => {
  const result = rankVenues(baseInput(), [schofields, theWizard, venue({ id: 'v3' })], []);
  for (const r of result.ranked) {
    assert.ok(r.score >= 0 && r.score <= 100, `score ${r.score} out of range`);
  }
});

test('reason strings use curated seed copy verbatim and never leak internal-only fields', () => {
  const resolved = resolveContext({ now: false, day: 'tuesday', band: 'evening' });
  const reason = reasonFor(schofields, baseInput(), resolved);
  assert.equal(reason, schofields.description);
  assert.ok(!reason.includes('signature'), 'reason must not leak Venue.tier');
  assert.ok(!/\d+\s*(score|match)/i.test(reason), 'reason must not read as a raw score justification');
});

test('reason strings fall back to a concrete, non-generic line when a venue has no curated copy', () => {
  const undescribed = venue({ description: '' });
  const resolved = resolveContext({ now: false, day: 'tuesday', band: 'evening' });
  const reason = reasonFor(undescribed, baseInput(), resolved);
  assert.ok(reason.length > 0);
  assert.ok(!reason.toLowerCase().includes('great spot'), 'must avoid generic directory-speak');
});

// ---------------------------------------------------------------------------
// Misc helpers
// ---------------------------------------------------------------------------

test('slugifyType matches the seed loader convention (lowercase, hyphenated)', () => {
  assert.equal(slugifyType('COCKTAIL BAR'), 'cocktail-bar');
  assert.equal(slugifyType('Small Plates'), 'small-plates');
});

test('applyHardFilters composes all four filters (AND, not OR)', () => {
  const good = venue({ id: 'good', petFriendly: true, dietaryOptions: ['vegan'] });
  const failsDiet = venue({ id: 'fails-diet', petFriendly: true, dietaryOptions: ['none'] });
  const failsPet = venue({ id: 'fails-pet', petFriendly: false, dietaryOptions: ['vegan'] });
  const input = baseInput({ you: { spendLevel: 3, dietary: ['vegan'], pet: 'small-dog' } });
  const survivors = applyHardFilters([good, failsDiet, failsPet], input);
  assert.deepEqual(
    survivors.map((v) => v.id),
    ['good']
  );
});
