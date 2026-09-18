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
  // A venue type can genuinely belong to more than one category (a real
  // pub is both a Drink and an Eat destination — see
  // CATEGORY_BY_VENUE_TYPE's own doc comment), so this checks membership,
  // not equality.
  if (!(CATEGORY_BY_VENUE_TYPE[venue.type] ?? []).some((c) => c === moodFilter.category)) return false;
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
      // 'closed' (migration 0011, alongside the growth-engine promotion
      // cron's closure-audit flow) must never rank — 'coming-soon' still
      // does, deliberately (see Venue.status's own doc comment).
      v.status !== 'closed' &&
      passesDistanceFilter(v, input.location, input.radiusMiles) &&
      passesDietaryFilter(v, input.you.dietary) &&
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

/**
 * Pet-friendliness is a ranking boost, not a hard filter (2026-09, changed
 * at explicit user request — Hard rule 3 previously listed it alongside
 * distance and dietary requirement, but a real report showed why that's
 * wrong in practice: Santorini has zero confirmed pet-friendly venues, so
 * hard-filtering wiped every Santorini result for any traveling-with-a-pet
 * user. The underlying reasoning doesn't hold the way dietary requirement's
 * does either — having a pet doesn't mean never going anywhere without it,
 * the way a real allergy means a dish is genuinely off-limits). A
 * pet-friendly venue scores higher when the user is traveling with a pet;
 * a non-pet-friendly venue is scored neutrally either way and never
 * penalized, since leaving the pet at home is always a normal option.
 */
export function scorePetFit(venue: Venue, travelingWithPet: PetPreference): number {
  if (travelingWithPet === 'none') return 0.5;
  return venue.petFriendly ? 1 : 0.5;
}

/** Minimum real ratings before the crowd signal is trusted at full
 * strength — see scoreRatings' own doc comment. */
const MIN_RATINGS_FOR_FULL_WEIGHT = 5;

/**
 * Crowd rating signal (2026-09, at explicit user request: "how was smoke,
 * i rate it 2 stars, it remembers that, takes it on board for other
 * similar users"). `ratingStats` is the aggregate across every member —
 * supabase/migrations/0005_venue_ratings.sql's `venue_rating_stats` view,
 * never a single person's own rating (Curia doesn't do per-user
 * collaborative filtering yet; that needs real volume this app doesn't
 * have). Neutral (0.5) for a venue with no ratings at all, same
 * "no-signal-no-penalty" convention scorePetFit/scoreDayOfWeek/etc. all
 * use — an unrated venue is not the same as a poorly-rated one. Below
 * MIN_RATINGS_FOR_FULL_WEIGHT, blended toward neutral proportionally to
 * how few ratings exist, so a single 1-star rating can't tank a venue's
 * score the way a real sample size could — a simple confidence dampener,
 * not a real Bayesian model (not worth the complexity at today's data
 * volume).
 */
export function scoreRatings(venue: Venue, ratingStats: Record<string, { avg: number; count: number }>): number {
  const stats = ratingStats[venue.id];
  if (!stats || stats.count === 0) return 0.5;
  const normalized = clamp((stats.avg - 1) / 4, 0, 1); // 1★ -> 0, 5★ -> 1
  const confidence = clamp(stats.count / MIN_RATINGS_FOR_FULL_WEIGHT, 0, 1);
  return 0.5 + (normalized - 0.5) * confidence;
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

/**
 * How alive the district itself is right now — `District.bandMultiplier`,
 * the same day×time liveliness curve that already drives the map's visual
 * "how alive is this district" glow (src/lib/map/geo.ts's
 * districtLiveliness), but was never fed into venue ranking itself until
 * now (2026-09, part of the matchmaking-smartness pass). Distinct from
 * scoreTimeOfDay, which asks whether THIS venue runs during this band —
 * this asks whether the district around it is generally busy at this hour.
 * Same neutral-0.5-when-unknown and 0..2-clamped-then-halved shape as
 * scoreDayOfWeek, for the same reason (values are centered on 1.0).
 */
export function scoreLiveliness(district: District | undefined, band: MatchContext['band']): number {
  if (!district || !band || !district.bandMultiplier) return 0.5;
  const mult = district.bandMultiplier[band];
  if (mult === undefined) return 0.5;
  return clamp(mult, 0, 2) / 2;
}

/**
 * Slight boost for being closer within the radius, all else equal — CLAUDE.md's
 * Matchmaking contract only ever documented distance as a hard cutoff, not a
 * ranking weight, but a venue 0.2mi away and one 4.9mi away (both inside a
 * 5mi radius) scoring identically doesn't match how people actually choose.
 * 1 at zero distance, 0 at the radius edge, linear between — deliberately
 * simple, this is a light tiebreaker, not a proximity-dominated re-ranking
 * (see SCORE_WEIGHTS/weightsFor's own comment on its weight).
 */
export function scoreProximity(
  venue: Venue,
  location: { lat: number; lon: number },
  radiusMiles: number
): number {
  if (radiusMiles <= 0) return 1;
  return clamp(1 - haversineMiles(location, venue) / radiusMiles, 0, 1);
}

/**
 * Gate 2 of the two-gate model (CLAUDE.md Hard rule 1, amended
 * 2026-09-16) — a discount-only multiplier on the venue's final weighted
 * score, not an additive weighted signal like the others in this file (see
 * rankVenues below for where it's actually applied). Linear from
 * distinctiveness 5 -> 1.0 (no discount) down to 1 -> 0.45 (a meaningful
 * discount, but never a zero-out): 5 -> 1.0, 4 -> 0.8625, 3 -> 0.725,
 * 2 -> 0.5875, 1 -> 0.45. A distinctiveness-1 venue can still win a narrow
 * filter when it's the only real match. Defaults to 4 (matching migration
 * 0009's column default) when unset, e.g. an older test fixture built
 * before this field existed.
 */
export function scoreDistinctivenessFactor(venue: Venue): number {
  const distinctiveness = clamp(venue.distinctiveness ?? 4, 1, 5);
  return 0.3125 + 0.1375 * distinctiveness;
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

const BAND_PHRASE: Record<NonNullable<MatchContext['band']>, string> = {
  morning: 'this morning',
  afternoon: 'this afternoon',
  evening: 'this evening',
  late: 'tonight',
};

function weatherLabel(weatherLower: string): string {
  if (weatherLower.includes('snow')) return 'Snowing';
  if (weatherLower.includes('storm')) return 'Stormy';
  if (weatherLower.includes('sleet')) return 'Sleeting';
  if (weatherLower.includes('freez')) return 'Freezing';
  if (weatherLower.includes('rain')) return 'Raining';
  if (weatherLower.includes('cold')) return 'Cold';
  return 'Poor weather';
}

/** District liveliness this notable above neutral (1.0) is worth naming —
 * same bar as "genuinely lively," not just "slightly above average." */
const NOTABLE_LIVELINESS_MULTIPLIER = 1.15;

/**
 * A short, human "why this works right now" line — real-time weather and
 * district liveliness are the two ranking signals (scoreWeather,
 * scoreLiveliness) that are genuinely time-sensitive rather than fixed venue
 * character, so they're the only two this draws on. Added 2026-09-18 at
 * explicit user request, prompted by a real example: Rex Cinema surfacing in
 * Wilmslow on a rainy Friday evening was a genuinely excellent match, but
 * nothing told the member why.
 *
 * Deliberately NOT a repeat of `reasonFor` (the venue's own fixed,
 * always-true description) and not the "Why it's ranked here" score
 * breakdown CLAUDE.md's Presentation layer section removed in 2026-08 — no
 * labelled category, no number, just one plain observation about right now,
 * same "a fact the member can act on" standard the venue detail screen's
 * "GOOD TO KNOW" row already holds itself to. Weather takes priority over
 * liveliness when both would qualify (matches the more concrete, more
 * urgent example this was built from), and returns undefined — never a
 * forced generic line — when neither signal is actually notable right now,
 * same "silence is fine" discipline scorePetFit/scoreDayOfWeek/etc. already
 * use for "no real signal."
 */
export function contextNoteFor(
  venue: Venue,
  district: District | undefined,
  resolved: { day: string; band: NonNullable<MatchContext['band']> },
  weather: string | undefined
): string | undefined {
  const weatherLower = (weather ?? '').toLowerCase();
  const outdoor = isOutdoorLeaning(venue);
  const bandPhrase = BAND_PHRASE[resolved.band];

  if (WET_OR_COLD.some((k) => weatherLower.includes(k)) && !outdoor) {
    return `${weatherLabel(weatherLower)} ${bandPhrase} — this one's indoors, start to finish.`;
  }
  if (WARM_OR_CLEAR.some((k) => weatherLower.includes(k)) && outdoor) {
    return `Clear and warm ${bandPhrase} — good call for the outdoor space.`;
  }

  const liveliness = district?.bandMultiplier?.[resolved.band];
  if (district && liveliness !== undefined && liveliness >= NOTABLE_LIVELINESS_MULTIPLIER) {
    return `${district.name} tends to be genuinely lively ${bandPhrase} — good timing.`;
  }

  return undefined;
}

/**
 * Documented weight tuning — CLAUDE.md pins down *which* signals matter but
 * not their relative weight, so this is this engine's own choice, not a
 * product decision to guess at silently. Tile match and the venue's own
 * curated base score are weighted heaviest since they're the strongest,
 * most concrete signals available today; day-of-week, liveliness, weather,
 * pet fit and proximity are weighted lightest — day-of-week/liveliness
 * because their underlying data is currently thin (real per-district
 * curves don't exist yet, see scoreDayOfWeek), weather because it only
 * matters some of the time (see weightsFor below), pet fit and proximity
 * because both are deliberately light tiebreaker-style boosts, not
 * dominant factors. `subPreference` gave up 0.05 (0.2 -> 0.15) to make
 * room for liveliness and proximity when they were added, same pattern as
 * `spend` did for `pet` earlier; `base` gave up 0.05 (0.2 -> 0.15) the same
 * way to make room for `ratings` (2026-09) — real crowd feedback is at
 * least as trustworthy a quality signal as the venue's own curated base
 * score once enough of it exists (scoreRatings' own confidence dampener is
 * what keeps a thin sample from dominating before then). Sums to 1 so the
 * final score lands in 0..100 — `weightsFor` below must preserve that (it
 * does, via normalizeWeights), not just this base set.
 */
export const BASE_WEIGHTS = {
  base: 0.15,
  tile: 0.2,
  subPreference: 0.15,
  spend: 0.1,
  timeOfDay: 0.1,
  dayOfWeek: 0.05,
  liveliness: 0.05,
  weather: 0.05,
  pet: 0.05,
  proximity: 0.05,
  ratings: 0.05,
} as const;

export type ScoreWeights = typeof BASE_WEIGHTS;

function normalizeWeights(w: ScoreWeights): ScoreWeights {
  const sum = Object.values(w).reduce((a, b) => a + b, 0);
  const out = {} as Record<keyof ScoreWeights, number>;
  for (const key of Object.keys(w) as (keyof ScoreWeights)[]) out[key] = w[key] / sum;
  return out as ScoreWeights;
}

const EXTREME_WEATHER_KEYWORDS = ['storm', 'rain', 'downpour', 'snow', 'gale', 'thunder', 'sleet'];

/**
 * Context-dependent weight schedule (2026-09, at explicit user request:
 * "pet weighting is more important in the day time than late night" —
 * generalized into a real principle, that a signal's IMPORTANCE should
 * flex with context, not just its value. Each rule below is an
 * independent, documented multiplier off BASE_WEIGHTS; normalizeWeights
 * rescales the result back to sum-to-1 afterward, so the 0..100 score
 * range invariant holds automatically no matter which rules fire together
 * — no manual rebalancing needed when a new rule is added here, unlike
 * the one-off hand-rebalance BASE_WEIGHTS itself needed when pet first
 * moved from a hard filter to a weighted signal.
 */
export function weightsFor(band: MatchContext['band'], weather: string | undefined): ScoreWeights {
  const w = { ...BASE_WEIGHTS };

  // Pet fit: people are out with a dog on a walk, at brunch, running
  // daytime errands — not usually bringing it to a 1am cocktail bar.
  if (band === 'morning' || band === 'afternoon') w.pet *= 1.6;
  else if (band === 'late') w.pet *= 0.3;

  // Weather: a mild afternoon shouldn't weight indoor-vs-outdoor as
  // heavily as genuinely bad weather does — the choice matters more when
  // conditions are actually extreme, not just "a bit cold."
  const weatherLower = (weather ?? '').toLowerCase();
  if (EXTREME_WEATHER_KEYWORDS.some((k) => weatherLower.includes(k))) w.weather *= 3;

  // Spend fit: evening/late is usually "the" meal or night out for the
  // day — getting the price point right matters more than for a casual
  // daytime coffee stop.
  if (band === 'evening' || band === 'late') w.spend *= 1.3;

  return normalizeWeights(w);
}

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
 * mood) and then scoring the survivors on the weighted signals — including
 * pet fit (scorePetFit), district liveliness (scoreLiveliness), proximity
 * (scoreProximity) and the crowd rating signal (scoreRatings), all weighted
 * contextually by `weightsFor` rather than a fixed set (see that function's
 * own comment) — then discounted by Gate 2 distinctiveness
 * (scoreDistinctivenessFactor), a multiplier rather than another additive
 * weighted term. Pure: same inputs always produce the same output, no I/O,
 * no seed import (see module doc comment). `districts` is optional lookup
 * context for the day-of-week/liveliness signals only; `ratingStats`
 * likewise for scoreRatings — both degrade gracefully (neutral scoring)
 * without it, same as calling this before either has loaded. Each result
 * also carries `contextNote` (contextNoteFor) — a real-time weather/
 * liveliness aside, separate from `reason`'s fixed venue character; callers
 * must pass `input.context.weather` for this to ever fire (see
 * buildMatchmakingInputFromSession's doc comment on why that isn't
 * automatic).
 */
export function rankVenues(
  input: MatchmakingInput,
  venues: Venue[],
  districts: District[] = [],
  ratingStats: Record<string, { avg: number; count: number }> = {}
): MatchmakingResult {
  const resolved = resolveContext(input.context);
  const districtById = new Map(districts.map((d) => [d.id, d]));
  const weights = weightsFor(resolved.band, input.context.weather);

  const candidates = applyHardFilters(venues, input);

  const ranked: RankedVenue[] = candidates.map((venue) => {
    const district = districtById.get(venue.districtId);
    const weighted =
      scoreBaseQuality(venue) * weights.base +
      scoreTileMatch(venue, input.preferences) * weights.tile +
      scoreSubPreferenceMatch(venue, input.preferences) * weights.subPreference +
      scoreSpendFit(venue, input.you.spendLevel) * weights.spend +
      scoreTimeOfDay(venue, resolved.band) * weights.timeOfDay +
      scoreDayOfWeek(district, resolved.day) * weights.dayOfWeek +
      scoreLiveliness(district, resolved.band) * weights.liveliness +
      scoreWeather(venue, input.context.weather) * weights.weather +
      scorePetFit(venue, input.you.pet) * weights.pet +
      scoreProximity(venue, input.location, input.radiusMiles) * weights.proximity +
      scoreRatings(venue, ratingStats) * weights.ratings;

    // Gate 2 (distinctiveness) is a discount multiplier on the summed
    // score, not another additive weighted term — see
    // scoreDistinctivenessFactor's own comment for why.
    const distinctivenessAdjusted = weighted * scoreDistinctivenessFactor(venue);

    return {
      venueId: venue.id,
      score: Math.round(clamp(distinctivenessAdjusted, 0, 1) * 100),
      reason: reasonFor(venue, input, resolved),
      contextNote: contextNoteFor(venue, district, resolved, input.context.weather),
    };
  });

  ranked.sort((a, b) => b.score - a.score);

  return { ranked, empty: ranked.length === 0 };
}
