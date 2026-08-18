/**
 * The real matchmaking/scoring engine (M3). Implements the contract in
 * CLAUDE.md "Matchmaking contract": hard filters exclude venues outright,
 * ranking weights only ever affect score. Map and List must both call
 * `rankVenues` with the same input (Hard rule 5) — see
 * src/lib/scoring/demo-input.ts for the shared input they currently pass.
 *
 * Deliberately pure and decoupled from the seed/data layer: it takes
 * `venues`/`districts` as plain arguments rather than importing
 * `src/lib/data/seed.ts` itself. Two reasons: (1) a scoring engine that
 * doesn't reach out to a specific data source is easier to test and to swap
 * onto Supabase later; (2) `seed.ts` imports the docs/data/*.json fixtures
 * via `resolveJsonModule`, which works fine under tsc/Metro but not under
 * plain `node --test` without import-attribute syntax — keeping this module
 * JSON-free means the unit tests can run with zero extra tooling.
 */
import type { District, DietaryRequirement, PetPreference, Venue } from '../../types/models';
import type {
  MatchContext,
  MatchmakingInput,
  MatchmakingResult,
  RankedVenue,
} from '../../types/matchmaking';
// Explicit `.ts` extension (matching rank-venues.test.mts's own import of this
// file) so `node --test`'s native ESM loader can resolve this at runtime —
// see that test file's header comment for why plain extensionless relative
// imports don't work under Node's loader even though tsc/Metro accept them.
import { CATEGORY_BY_VENUE_TYPE, tileIdToVenueTypeSlugs } from './tile-catalog-map.ts';

const EARTH_RADIUS_MILES = 3958.8;

function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Great-circle distance between two lat/lon points, in miles. */
export function haversineMiles(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number }
): number {
  const dLat = toRadians(b.lat - a.lat);
  const dLon = toRadians(b.lon - a.lon);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return EARTH_RADIUS_MILES * 2 * Math.asin(Math.min(1, Math.sqrt(h)));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * There's no onboarding tile catalog seeded yet (M4 hasn't landed, and
 * docs/data/*.json carries no Tile records) — the only per-venue "tile"
 * signal that exists today is `Venue.type` (e.g. "COCKTAIL BAR"). Until a
 * real Tile catalog exists to map `selectedTileIds` -> venue types, tile
 * matching compares a slugified `venue.type` against the selected tile ids
 * directly (mirroring the slug convention `src/lib/data/seed.ts` already
 * uses for venue/moment ids). Flagging this as a decision, not a spec: when
 * curia-onboarding's real Tile catalog exists, tile ids should be defined to
 * line up with this slug (or this function updated to take a catalog).
 */
export function slugifyType(type: string): string {
  return type
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// ---------------------------------------------------------------------------
// Hard filters — CLAUDE.md: "a failing venue must never appear at all,
// regardless of match quality elsewhere." Each is independently testable.
// ---------------------------------------------------------------------------

export function passesDistanceFilter(
  venue: Venue,
  location: { lat: number; lon: number },
  radiusMiles: number
): boolean {
  return haversineMiles(location, venue) <= radiusMiles;
}

/** Venue must satisfy every dietary requirement the user selected (`none` is a no-op). */
export function passesDietaryFilter(venue: Venue, dietary: DietaryRequirement[]): boolean {
  const required = dietary.filter((d) => d !== 'none');
  if (required.length === 0) return true;
  return required.every((r) => venue.dietaryOptions.includes(r));
}

/** Venue-side pet-friendly flag vs. user-side "traveling with a pet" (CLAUDE.md contract). */
export function passesPetFilter(venue: Venue, travelingWithPet: PetPreference): boolean {
  if (travelingWithPet === 'none') return true;
  return venue.petFriendly;
}

/**
 * Active "mood" quick filter narrows the candidate pool before ranking runs.
 *
 * `moodFilter.category` is a real, always-set restriction, not just context
 * for `tileIds` — picking a mood category with no specific tiles narrowed
 * (e.g. just "Do") is a valid, intentionally "unnarrowed" selection
 * (session.tsx's MoodSelection doc comment: "a category with an empty
 * tileIds means 'this category, unnarrowed'"), and must still exclude the
 * other two categories. This used to only check `tileIds`/`subPreferences`
 * (both empty in the category-only case), so a category-only mood filter
 * silently filtered nothing at all — found 2026-08 via a real user report
 * (filtered to "Do", still saw a rooftop bar, a fine-dining restaurant, and
 * a bakery at the top of the list).
 */
export function passesMoodFilter(
  venue: Venue,
  moodFilter: MatchmakingInput['moodFilter']
): boolean {
  if (!moodFilter) return true;
  if (CATEGORY_BY_VENUE_TYPE[venue.type] !== moodFilter.category) return false;
  if (moodFilter.tileIds.length > 0) {
    const matchingSlugs = new Set(moodFilter.tileIds.flatMap(tileIdToVenueTypeSlugs));
    if (!matchingSlugs.has(slugifyType(venue.type))) return false;
  }
  if (
    moodFilter.subPreferences.length > 0 &&
    !moodFilter.subPreferences.some((sp) => venue.subPreferenceTags.includes(sp))
  ) {
    return false;
  }
  return true;
}

export function applyHardFilters(venues: Venue[], input: MatchmakingInput): Venue[] {
  return venues.filter(
    (v) =>
      passesDistanceFilter(v, input.location, input.radiusMiles) &&
      passesDietaryFilter(v, input.you.dietary) &&
      passesPetFilter(v, input.you.pet) &&
      passesMoodFilter(v, input.moodFilter)
  );
}

// ---------------------------------------------------------------------------
// Weighted signals — CLAUDE.md: "affect score, never exclude." Each returns
// a 0..1 component; `rankVenues` combines them via SCORE_WEIGHTS.
// ---------------------------------------------------------------------------

/** The venue's own curated base score (docs/data/venues.json `base`), 0..1. */
export function scoreBaseQuality(venue: Venue): number {
  return clamp(venue.base / 100, 0, 1);
}

/**
 * 1 if any selected tile matches this venue's type, else a neutral 0.5 with
 * no selection at all. Selected ids may be real onboarding Tile catalog ids
 * (`"Drink|Cocktail bars"`) or bare type-slugs (`"cocktail-bar"`, this
 * project's demo-input/test convention) — `tileIdToVenueTypeSlugs` resolves
 * either form to the venue-type-slug space this function compares in.
 */
export function scoreTileMatch(venue: Venue, preferences: MatchmakingInput['preferences']): number {
  const selectedIds = preferences.flatMap((p) => p.selectedTileIds);
  if (selectedIds.length === 0) return 0.5;
  const matchingSlugs = new Set(selectedIds.flatMap(tileIdToVenueTypeSlugs));
  return matchingSlugs.has(slugifyType(venue.type)) ? 1 : 0;
}

/**
 * Fraction of the venue's sub-preference tags the user currently wants.
 * Sub-preferences default ON (Hard rule 2) — a tag absent from
 * `subPreferenceState` still counts as wanted. Venues without any tags
 * (true of all current seed venues — see seed.ts) score a neutral 0.5, since
 * there's no signal either way.
 */
export function scoreSubPreferenceMatch(
  venue: Venue,
  preferences: MatchmakingInput['preferences']
): number {
  if (venue.subPreferenceTags.length === 0) return 0.5;
  const state: Record<string, boolean> = {};
  for (const p of preferences) Object.assign(state, p.subPreferenceState);
  const wanted = venue.subPreferenceTags.filter((tag) => state[tag] !== false).length;
  return wanted / venue.subPreferenceTags.length;
}

/** Closer spend levels score higher; 5-tier scale, so max possible gap is 4. */
export function scoreSpendFit(venue: Venue, userSpendLevel: number): number {
  return clamp(1 - Math.abs(venue.spendLevel - userSpendLevel) / 4, 0, 1);
}

/** 1 if the current context band is one the venue actually runs during, else a low-but-nonzero base. */
export function scoreTimeOfDay(venue: Venue, band: MatchContext['band']): number {
  if (!band) return 0.5;
  return venue.bands.includes(band) ? 1 : 0.3;
}

/**
 * `District.dayMultiplier` is the modeled home for the prototype's `DAY_MULT`
 * liveliness-by-day-of-week table (see CLAUDE.md "Data model" / models.ts).
 * That table isn't present in docs/data/districts.json today — the JSON only
 * carries `base`, not per-day multipliers — so this defaults to a neutral
 * 0.5 for every current seed district. The signal is implemented and unit
 * tested against synthetic District fixtures so it's ready the moment real
 * DAY_MULT data is added; flagged in the M3 report rather than guessed.
 * Multiplier values are assumed centered on 1.0 (neutral) and are clamped to
 * a 0..2 range before being normalized into the 0..1 score space.
 */
export function scoreDayOfWeek(district: District | undefined, day: string | undefined): number {
  if (!district || !day || !district.dayMultiplier) return 0.5;
  const mult = district.dayMultiplier[day];
  if (mult === undefined) return 0.5;
  return clamp(mult, 0, 2) / 2;
}

const OUTDOOR_TYPE_HINTS = ['rooftop', 'garden', 'terrace', 'outdoor', 'country pub'];

function isOutdoorLeaning(venue: Venue): boolean {
  const type = venue.type.toLowerCase();
  return OUTDOOR_TYPE_HINTS.some((hint) => type.includes(hint));
}

const WET_OR_COLD = ['rain', 'snow', 'sleet', 'storm', 'cold', 'freezing'];
const WARM_OR_CLEAR = ['sun', 'clear', 'warm', 'hot'];

/**
 * Weather isn't given a precise formula anywhere in CLAUDE.md, just listed as
 * a weighted signal — this is a documented, deliberately simple heuristic:
 * favor indoor/cozy venues (small plates, cocktail bars, tasting menus...)
 * when it's wet or cold, favor rooftop/terrace/beer-garden venues when it's
 * warm and clear, and stay neutral otherwise or when weather is unknown.
 */
export function scoreWeather(venue: Venue, weather: string | undefined): number {
  if (!weather) return 0.5;
  const w = weather.toLowerCase();
  const outdoor = isOutdoorLeaning(venue);
  if (WET_OR_COLD.some((k) => w.includes(k))) return outdoor ? 0.2 : 0.8;
  if (WARM_OR_CLEAR.some((k) => w.includes(k))) return outdoor ? 1 : 0.5;
  return 0.5;
}

/**
 * Documented weight tuning — CLAUDE.md pins down *which* signals matter but
 * not their relative weight, so this is this engine's own choice, not a
 * product decision to guess at silently. Tile match and the venue's own
 * curated base score are weighted heaviest since they're the strongest,
 * most concrete signals available today; day-of-week and weather are
 * weighted lightest since their underlying data is currently thin (see
 * scoreDayOfWeek). Weights sum to 1 so the final score lands in 0..100.
 */
export const SCORE_WEIGHTS = {
  base: 0.2,
  tile: 0.25,
  subPreference: 0.2,
  spend: 0.15,
  timeOfDay: 0.1,
  dayOfWeek: 0.05,
  weather: 0.05,
} as const;

const DAY_NAMES = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
] as const;

function bandForHour(hour: number): NonNullable<MatchContext['band']> {
  if (hour >= 6 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 23) return 'evening';
  return 'late';
}

/** Resolves "now" (or an explicit day/band) into a concrete day + band pair. */
export function resolveContext(
  context: MatchContext,
  clock: () => Date = () => new Date()
): { day: string; band: NonNullable<MatchContext['band']> } {
  if (context.now) {
    const now = clock();
    return { day: DAY_NAMES[now.getDay()], band: bandForHour(now.getHours()) };
  }
  return {
    day: context.day ?? DAY_NAMES[0],
    band: context.band ?? 'evening',
  };
}

/**
 * The seed venues already carry curated, brand-voice copy transcribed
 * verbatim from the prototype (docs/data/venues.json `reason` ->
 * `Venue.description`, e.g. Erst's "Natural wine and communal tables both
 * on, and the kitchen runs to 11pm."). That copy already reads as a
 * specific, earned observation per CLAUDE.md's Brand voice section, so it is
 * the reason string whenever a venue has one — synthesizing new copy on top
 * of curated copy would risk genericizing it. The fallback below only
 * fires for venues without curated copy (e.g. future admin-added venues,
 * M8), and sticks to concrete matched facts rather than score-talk, per
 * Hard rule 8 (never surface raw scores) and Brand voice.
 */
export function reasonFor(
  venue: Venue,
  input: MatchmakingInput,
  resolved: { day: string; band: NonNullable<MatchContext['band']> }
): string {
  if (venue.description) return venue.description;
  const spendMark = '£'.repeat(venue.spendLevel);
  const bandNote = venue.bands.includes(resolved.band)
    ? `open through ${resolved.band}`
    : `a ${venue.bands[0] ?? 'daytime'} room`;
  return `${venue.type[0]}${venue.type.slice(1).toLowerCase()}, ${spendMark} spend, ${bandNote}.`;
}

/**
 * Ranks `venues` for `input`, applying hard filters first (distance, dietary,
 * pet, mood) and then scoring the survivors on the weighted signals. Pure:
 * same inputs always produce the same output, no I/O, no seed import (see
 * module doc comment). `districts` is optional lookup context for the
 * day-of-week signal only (scoreDayOfWeek degrades gracefully without it).
 */
export function rankVenues(
  input: MatchmakingInput,
  venues: Venue[],
  districts: District[] = []
): MatchmakingResult {
  const resolved = resolveContext(input.context);
  const districtById = new Map(districts.map((d) => [d.id, d]));

  const candidates = applyHardFilters(venues, input);

  const ranked: RankedVenue[] = candidates.map((venue) => {
    const district = districtById.get(venue.districtId);
    const weighted =
      scoreBaseQuality(venue) * SCORE_WEIGHTS.base +
      scoreTileMatch(venue, input.preferences) * SCORE_WEIGHTS.tile +
      scoreSubPreferenceMatch(venue, input.preferences) * SCORE_WEIGHTS.subPreference +
      scoreSpendFit(venue, input.you.spendLevel) * SCORE_WEIGHTS.spend +
      scoreTimeOfDay(venue, resolved.band) * SCORE_WEIGHTS.timeOfDay +
      scoreDayOfWeek(district, resolved.day) * SCORE_WEIGHTS.dayOfWeek +
      scoreWeather(venue, input.context.weather) * SCORE_WEIGHTS.weather;

    return {
      venueId: venue.id,
      score: Math.round(clamp(weighted, 0, 1) * 100),
      reason: reasonFor(venue, input, resolved),
    };
  });

  ranked.sort((a, b) => b.score - a.score);

  return { ranked, empty: ranked.length === 0 };
}
