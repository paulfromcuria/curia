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
  BASE_WEIGHTS,
  haversineMiles,
  passesDietaryFilter,
  passesDistanceFilter,
  passesMoodFilter,
  rankVenues,
  reasonFor,
  resolveContext,
  scoreBaseQuality,
  scoreDayOfWeek,
  scoreLiveliness,
  scorePetFit,
  scoreProximity,
  scoreRatings,
  scoreSpendFit,
  scoreSubPreferenceMatch,
  scoreTileMatch,
  scoreTimeOfDay,
  scoreWeather,
  slugifyType,
  weightsFor,
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
    status: 'live',
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
// Soft weight: pet fit (a ranking boost, not a hard filter — 2026-09,
// changed at explicit user request; see scorePetFit's own doc comment)
// ---------------------------------------------------------------------------

test('pet fit: neutral for every venue when the user is not traveling with a pet', () => {
  assert.equal(scorePetFit(venue({ petFriendly: false }), 'none'), 0.5);
  assert.equal(scorePetFit(venue({ petFriendly: true }), 'none'), 0.5);
});

test('pet fit: a pet-friendly venue scores higher when the user is traveling with a pet', () => {
  assert.equal(scorePetFit(venue({ petFriendly: true }), 'small-dog'), 1);
});

test('pet fit: a non-pet-friendly venue stays neutral, not penalized, when the user is traveling with a pet', () => {
  assert.equal(scorePetFit(venue({ petFriendly: false }), 'large-dog'), 0.5);
});

test('rankVenues still includes a non-pet-friendly venue when traveling with a pet, but ranks the pet-friendly one first', () => {
  const noPets = venue({ id: 'v1', base: 80, petFriendly: false });
  const petsOk = venue({ id: 'v2', base: 80, petFriendly: true });
  const input = baseInput({ you: { spendLevel: 3, dietary: ['none'], pet: 'small-dog' } });
  const result = rankVenues(input, [noPets, petsOk], []);
  assert.deepEqual(
    result.ranked.map((r) => r.venueId),
    ['v2', 'v1']
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
// Weighted signal: liveliness (District.bandMultiplier — how alive the
// district is right now, distinct from scoreTimeOfDay's venue-own-hours check)
// ---------------------------------------------------------------------------

const livelyLateDistrict: District = {
  id: 'test-district-2',
  name: 'Test District 2',
  metro: 'manchester',
  lat: 0,
  lon: 0,
  base: 50,
  kind: 'city',
  accentColor: '#000000',
  bandMultiplier: { late: 1.8, morning: 0.3 },
};

test('liveliness: a district livelier in the given band scores higher', () => {
  const late = scoreLiveliness(livelyLateDistrict, 'late');
  const morning = scoreLiveliness(livelyLateDistrict, 'morning');
  assert.ok(late > morning, `expected late (${late}) > morning (${morning})`);
});

test('liveliness: missing multiplier data is neutral, not a penalty', () => {
  assert.equal(scoreLiveliness(undefined, 'late'), 0.5);
  assert.equal(scoreLiveliness(livelyLateDistrict, 'evening'), 0.5);
  assert.equal(scoreLiveliness(livelyLateDistrict, undefined), 0.5);
});

// ---------------------------------------------------------------------------
// Weighted signal: proximity (a soft tiebreaker inside the hard radius —
// distance itself stays a hard cutoff, see the distance filter tests above)
// ---------------------------------------------------------------------------

test('proximity: scores 1 at zero distance and approaches 0 at the radius edge', () => {
  const here = scoreProximity(venue({ lat: manchesterCityCentre.lat, lon: manchesterCityCentre.lon }), manchesterCityCentre, 10);
  assert.equal(here, 1);
  const edge = scoreProximity(schofields, manchesterCityCentre, 0.01);
  assert.ok(edge < 0.5, `expected a venue well outside a tiny radius to score low, got ${edge}`);
});

test('proximity: closer venues always score higher than farther ones inside the same radius', () => {
  const near = scoreProximity(schofields, manchesterCityCentre, 10);
  const far = scoreProximity(theWizard, manchesterCityCentre, 30);
  assert.ok(near > far, `expected near (${near}) > far (${far})`);
});

test('rankVenues never lets proximity override a genuine quality gap, but breaks near-ties toward the closer venue', () => {
  const near = venue({ id: 'near', base: 80, lat: manchesterCityCentre.lat, lon: manchesterCityCentre.lon });
  const far = venue({ id: 'far', base: 80, lat: manchesterCityCentre.lat + 0.05, lon: manchesterCityCentre.lon });
  const result = rankVenues(baseInput({ radiusMiles: 10 }), [far, near], []);
  assert.deepEqual(
    result.ranked.map((r) => r.venueId),
    ['near', 'far']
  );
});

// ---------------------------------------------------------------------------
// Crowd rating signal (scoreRatings) — 2026-09, at explicit user request:
// "how was smoke, i rate it 2 stars, it remembers that, takes it on board
// for other similar users."
// ---------------------------------------------------------------------------

test('ratings: neutral for a venue with no ratings at all', () => {
  assert.equal(scoreRatings(venue({}), {}), 0.5);
});

test('ratings: a well-rated venue with a real sample size scores near 1, a poorly-rated one near 0', () => {
  const stats = {
    erst: { avg: 5, count: 10 },
    schofields: { avg: 1, count: 10 },
  };
  assert.ok(scoreRatings(venue({ id: 'erst' }), stats) > 0.9);
  assert.ok(scoreRatings(venue({ id: 'schofields' }), stats) < 0.1);
});

test('ratings: a single bad rating cannot tank a score the way a real sample of bad ratings can', () => {
  const thin = scoreRatings(venue({ id: 'erst' }), { erst: { avg: 1, count: 1 } });
  const real = scoreRatings(venue({ id: 'erst' }), { erst: { avg: 1, count: 10 } });
  assert.ok(thin > real, `expected a thin sample (${thin}) to stay closer to neutral than a real one (${real})`);
  assert.ok(thin > 0.3, `expected a single 1-star rating to still land well above 0, got ${thin}`);
});

test('rankVenues: a highly-rated venue outranks an otherwise-identical unrated one', () => {
  const rated = venue({ id: 'rated', base: 70 });
  const unrated = venue({ id: 'unrated', base: 70 });
  const result = rankVenues(baseInput(), [rated, unrated], [], { rated: { avg: 5, count: 20 } });
  assert.deepEqual(
    result.ranked.map((r) => r.venueId),
    ['rated', 'unrated']
  );
});

// ---------------------------------------------------------------------------
// Context-dependent weights (weightsFor) — 2026-09 matchmaking-smartness
// pass, at explicit user request: "pet weighting is more important in the
// day time than late night," generalized into a real rule.
// ---------------------------------------------------------------------------

test('weightsFor always sums to 1, regardless of which contextual rules fire', () => {
  const cases: [MatchmakingInput['context']['band'], string | undefined][] = [
    ['morning', undefined],
    ['afternoon', 'Heavy storm'],
    ['evening', 'Clear, 18°'],
    ['late', undefined],
    [undefined, undefined],
  ];
  for (const [band, weather] of cases) {
    const w = weightsFor(band, weather);
    const sum = Object.values(w).reduce((a, b) => a + b, 0);
    assert.ok(Math.abs(sum - 1) < 1e-9, `weightsFor(${band}, ${weather}) summed to ${sum}, not 1`);
  }
});

test('weightsFor: pet fit is weighted more in the daytime than late at night', () => {
  const day = weightsFor('afternoon', undefined);
  const late = weightsFor('late', undefined);
  assert.ok(day.pet > late.pet, `expected daytime pet weight (${day.pet}) > late-night (${late.pet})`);
});

test('weightsFor: weather is weighted more heavily when conditions are actually extreme', () => {
  const mild = weightsFor('evening', 'Partly cloudy, 15°');
  const extreme = weightsFor('evening', 'Heavy thunderstorm');
  assert.ok(extreme.weather > mild.weather, `expected extreme (${extreme.weather}) > mild (${mild.weather})`);
});

test('weightsFor: spend fit matters more for an evening/late decision than daytime', () => {
  const morning = weightsFor('morning', undefined);
  const evening = weightsFor('evening', undefined);
  assert.ok(evening.spend > morning.spend, `expected evening spend weight (${evening.spend}) > morning (${morning.spend})`);
});

test('weightsFor: with no band and no weather, no contextual rule fires — matches BASE_WEIGHTS exactly', () => {
  // Every real band triggers at least one rule (pet keys off
  // morning/afternoon/late, spend off evening/late — together that's all
  // four), so `undefined` is the only genuine passthrough case, useful as a
  // sanity check that BASE_WEIGHTS itself is already normalized (sums to 1).
  const w = weightsFor(undefined, undefined);
  for (const key of Object.keys(BASE_WEIGHTS) as (keyof typeof BASE_WEIGHTS)[]) {
    assert.ok(
      Math.abs(w[key] - BASE_WEIGHTS[key]) < 1e-9,
      `expected weightsFor(undefined, undefined).${key} (${w[key]}) to match BASE_WEIGHTS.${key} (${BASE_WEIGHTS[key]})`
    );
  }
});

test('rankVenues: a pet-friendly venue outranks an otherwise-identical non-pet-friendly one more decisively in the daytime than late at night', () => {
  const petsOk = venue({ id: 'pets-ok', base: 80, petFriendly: true });
  const noPets = venue({ id: 'no-pets', base: 80, petFriendly: false });
  const you: MatchmakingInput['you'] = { spendLevel: 3, dietary: ['none'], pet: 'small-dog' };

  const afternoonResult = rankVenues(
    baseInput({ you, context: { now: false, day: 'tuesday', band: 'afternoon' } }),
    [petsOk, noPets],
    []
  );
  const lateResult = rankVenues(
    baseInput({ you, context: { now: false, day: 'tuesday', band: 'late' } }),
    [petsOk, noPets],
    []
  );

  const afternoonGap =
    afternoonResult.ranked.find((r) => r.venueId === 'pets-ok')!.score -
    afternoonResult.ranked.find((r) => r.venueId === 'no-pets')!.score;
  const lateGap =
    lateResult.ranked.find((r) => r.venueId === 'pets-ok')!.score -
    lateResult.ranked.find((r) => r.venueId === 'no-pets')!.score;

  assert.ok(
    afternoonGap > lateGap,
    `expected the pet-friendly score gap to be bigger in the afternoon (${afternoonGap}) than late at night (${lateGap})`
  );
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

test('applyHardFilters composes distance, dietary and mood together (AND, not OR)', () => {
  const good = venue({ id: 'good', type: 'COCKTAIL BAR', dietaryOptions: ['vegan'] });
  const failsDiet = venue({ id: 'fails-diet', type: 'COCKTAIL BAR', dietaryOptions: ['none'] });
  const failsMood = venue({ id: 'fails-mood', type: 'SMALL PLATES', dietaryOptions: ['vegan'] });
  const input = baseInput({
    you: { spendLevel: 3, dietary: ['vegan'], pet: 'none' },
    moodFilter: { category: 'Drink', tileIds: [], subPreferences: [] },
  });
  const survivors = applyHardFilters([good, failsDiet, failsMood], input);
  assert.deepEqual(
    survivors.map((v) => v.id),
    ['good']
  );
});
