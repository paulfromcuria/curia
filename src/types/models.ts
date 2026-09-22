/**
 * Core Curia data model. See CLAUDE.md "Data model" for the authoritative
 * shape and reasoning — refine there first if this changes, not ad hoc here.
 */

export type SpendLevel = 1 | 2 | 3 | 4 | 5; // £ .. £££££

export type DietaryRequirement =
  | 'none'
  | 'vegetarian'
  | 'vegan'
  | 'pescatarian'
  | 'gluten-free'
  | 'dairy-free'
  | 'nut-allergy';

export type PetPreference = 'none' | 'small-dog' | 'large-dog';

export type ReligiousObservance =
  | 'none'
  | 'halal'
  | 'kosher'
  | 'alcohol-free'
  | 'prayer-space-nearby'
  | 'friday-observance';

export type Gender = 'woman' | 'man' | 'non-binary' | 'prefer-not-to-say';

export type AgeRange = '18-24' | '25-34' | '35-44' | '45-54' | '55-64' | '65+';

export type RelationshipStatus =
  | 'single'
  | 'seeing-someone'
  | 'partnered'
  | 'married'
  | 'prefer-not-to-say';

/**
 * The tile-grid onboarding categories. "You" is a separate step but isn't
 * tile-gated. 'Holiday' added 2026-09, at explicit user request: a member
 * travelling somewhere Curia doesn't have Do/Drink/Eat coverage for yet
 * (e.g. a first Santorini pass) still needs a way to express real,
 * holiday-specific taste — beach clubs and the like — that the
 * Manchester/Cheshire-flavoured Do/Drink/Eat tile catalog was never built to
 * capture. Unlike Do/Drink/Eat, Holiday is optional and never gates
 * onboarding completion (src/app/onboarding.tsx) — most members aren't
 * travelling, and it should cost them nothing.
 */
export type TileCategory = 'Do' | 'Drink' | 'Eat' | 'Holiday';

/**
 * A member's home base, for the one onboarding category that genuinely
 * can't share a single global catalog: Drink. Added 2026-09, at explicit
 * user request, onboarding Riyadh — alcohol is prohibited nationwide in
 * Saudi Arabia, so Manchester/Cheshire's Drink catalog (cocktail bars, wine
 * bars, pubs) has zero real applicability there, and the reverse is true
 * of a Riyadh-flavoured catalog (specialty coffee, mocktail lounges, tea
 * houses, shisha) for a UK member. Every other category (Do/Eat/You) and
 * the entire rest of the app — Map/List/Moments/Journeys/the scoring
 * engine/the venue data model — stays fully shared; this is deliberately
 * narrow, not a fork of the product. Asked once, early in onboarding (see
 * src/app/onboarding.tsx's 'Region' step), before Drink tiles are shown.
 * 'uk' covers Manchester and Cheshire both — they already share one Drink
 * catalog today, so this doesn't split them further. Also covers London
 * (2026-09-15) — same reasoning, a second UK metro sharing the identical
 * catalog.
 *
 * 'usa' added 2026-09-18 alongside Chicago (Curia's first US metro) — at
 * explicit user request, the onboarding Region picker splits into three
 * real options (UK / USA / Middle East) rather than silently folding a US
 * member into the 'UK' bucket. There is no separate US Drink catalog today
 * — alcohol is legal and normal in the US, same as the UK, so 'usa' is a
 * distinct value purely so the Region picker can highlight the right
 * button (two options can't share one value without both lighting up as
 * "selected" — see onboarding.tsx's REGION_OPTS), not because the Drink
 * tiles actually differ. tilesByCategory() (src/lib/data/seed.ts) treats a
 * `region: 'uk'` tile as visible to 'usa' members too, so no existing
 * Drink tile needed re-tagging. If US taste ever genuinely diverges from
 * UK Drink culture, that's the seam to build a real 'usa'-tagged catalog
 * against, the same way Riyadh's was.
 */
export type HomeRegion = 'uk' | 'riyadh' | 'usa';

export interface Tile {
  id: string;
  category: TileCategory;
  name: string;
  /** Sub-preferences default ON ("I want this"). Never invert this. */
  subPreferences: string[];
  /** Restricts which HomeRegion sees this tile during onboarding — absent
   * means universal (shown to everyone, e.g. every Do/Eat tile today).
   * Only Drink tiles use this so far; see HomeRegion's own doc comment for
   * why. Scoring/matching (rank-venues.ts, tile-catalog-map.ts) is
   * unaffected — a tile a member has already selected still matches
   * venues normally regardless of region, this only gates what's *offered*
   * during onboarding. */
  region?: HomeRegion;
}

export interface UserPreference {
  category: TileCategory;
  /** Selected tile ids — minimum 3 required per category (Hard rule 7). */
  selectedTileIds: string[];
  /** Sub-preference on/off state, keyed by sub-preference label. Default true. */
  subPreferenceState: Record<string, boolean>;
}

export interface YouProfile {
  spendLevel: SpendLevel;
  dietary: DietaryRequirement[];
  pet: PetPreference;
  religiousObservance: ReligiousObservance[];
  gender?: Gender;
  ageRange?: AgeRange;
  relationshipStatus?: RelationshipStatus;
}

export type SubscriptionStatus = 'none' | 'trialing' | 'active' | 'past_due' | 'canceled';

export interface User {
  id: string;
  name: string;
  email: string;
  subscriptionStatus: SubscriptionStatus;
  onboardingComplete: boolean;
  preferences: UserPreference[];
  you: YouProfile;
}

// 'santorini' added 2026-09, at explicit user request — Curia's first
// destination outside Manchester/Cheshire, for a real member travelling
// there right now. The app's location/radius/district architecture is
// metro-agnostic by design (see src/lib/map/geo.ts's per-metro coverage
// polygons) — this and METROS_WITH_DISTRICTS (geo.ts) were the only two
// places a metro id needed to be named explicitly.
// 'riyadh' added 2026-09, at explicit user request — Curia's first fully
// separate market (not a "holiday" bolt-on like Santorini): a real member
// base with its own onboarding Drink catalog, see HomeRegion's own doc
// comment above for why. Structurally just another MetroId — the
// location/radius/district architecture doesn't need to know why a metro
// exists, only that it does.
// 'london' added 2026-09-15, at explicit user request — a second real UK
// metro alongside Manchester/Cheshire, fully 'uk' HomeRegion (no Drink
// catalog split needed, unlike Riyadh).
// 'chicago' added 2026-09-18, at explicit user request — Curia's first US
// metro, a real pilot for a specific first member (a UChicago student, high
// disposable income, testing/showing the app to professors) rather than a
// market-sizing decision. Scoped to Hyde Park/Kenwood/Woodlawn — the
// neighbourhoods within ~2mi of the UChicago campus — not the whole city.
// Alcohol is legal and normal here, so like London this stays fully 'uk'
// HomeRegion (the shared global Drink catalog, not a UK-specific one despite
// the label — see HomeRegion's own doc comment). Same two-gate curation
// rules as everywhere else; the member's own age doesn't change what gets
// curated.
export type MetroId = 'manchester' | 'cheshire' | 'santorini' | 'riyadh' | 'london' | 'chicago';

export interface City {
  id: MetroId;
  name: string;
}

export type DistrictKind = 'city' | 'county';

export interface District {
  id: string;
  name: string;
  metro: MetroId;
  lat: number;
  lon: number;
  /** Base attractiveness/liveliness score the map render scales from. */
  base: number;
  kind: DistrictKind;
  /** Map-pin accent color, distinct per district (see theme/tokens.ts districtAccent). */
  accentColor: string;
  editorialDescription?: string;
  /** Day-of-week x time-of-day liveliness multipliers. */
  dayMultiplier?: Record<string, number>;
  bandMultiplier?: Record<string, number>;
  groupId?: string;
}

export interface DistrictGroup {
  name: string;
  /** Member district ids. Naming rule: a partial subset of a metro's districts
   * gets a subset label (e.g. "Hale & Altrincham"); only the complete set of a
   * metro's districts may carry the metro's own name (see CLAUDE.md). */
  districtIds: string[];
}

export type DayTimeBand = 'morning' | 'afternoon' | 'evening' | 'late';

export type DayName = 'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday';

/** One open/close window on a single day. `close` may be numerically
 * earlier than `open` (e.g. open "22:00", close "02:00") — that means the
 * venue stays open into the following calendar day, not that it's closed;
 * see src/lib/data/opening-hours.ts's isOpenNow for how that's resolved. */
export interface OpeningHoursRange {
  /** 24h "HH:MM". */
  open: string;
  /** 24h "HH:MM". */
  close: string;
}

/**
 * Real, sourced per-day opening hours (2026-09-18, at explicit user
 * request: a red closed-indicator on Map's local-zoom venue icons, which
 * needs real hours to be honest rather than an approximation). A day key
 * absent from the record, or present with an empty array, means closed
 * that day — not "unknown for that day." See src/lib/data/opening-hours.ts
 * for the actual "is this open right now" logic (including the overnight
 * case above).
 *
 * This is genuinely a large sourcing effort across the whole catalog (no
 * existing field approximates it — `Venue.bands` is a coarse 4-bucket
 * ranking signal, not real hours), so most venues will have this
 * `undefined` for a long while. `undefined` on the venue means "not
 * researched yet," and must never be treated as closed — only a real,
 * confirmed range says that. Sourced venue-by-venue via the same
 * WebSearch-and-verify discipline as every other real-data pass this
 * session (golf clubs, campus venues, etc.), never invented.
 */
export type OpeningHours = Partial<Record<DayName, OpeningHoursRange[]>>;

export interface Venue {
  id: string;
  name: string;
  /** Category/tile this venue matches, e.g. "COCKTAIL BAR". */
  type: string;
  subPreferenceTags: string[];
  spendLevel: SpendLevel;
  districtId: string;
  metro: MetroId;
  lat: number;
  lon: number;
  petFriendly: boolean;
  dietaryOptions: DietaryRequirement[];
  photos: string[];
  description: string;
  bands: DayTimeBand[];
  /** Base attractiveness score before ranking weights are applied. */
  base: number;
  /**
   * True only for a venue that doesn't run on a normal daily/weekly
   * schedule at all — a monthly street market, a pop-up, a seasonal event
   * space — where `bands`/`openingHours` structurally cannot express the
   * real constraint (there's no "which Saturday" concept anywhere in this
   * model). Found live 2026-09-22, direct user report: Wilmslow Artisan
   * Market ("close to traffic once a month... check the date before
   * building an evening around it" — the venue's own curated copy already
   * said this) was being confidently recommended on an ordinary Tuesday
   * because `bands: ["afternoon"]` only encodes time-of-day, nothing about
   * which day, let alone which Saturday of which month. A hard filter
   * (`passesRegularScheduleFilter`, rank-venues.ts) excludes an occasional
   * venue from ranked results entirely — recommending it with false
   * day-to-day confidence is the same "genuine impossibility" class of
   * error passesOpenNowFilter/scoreBandFitFactor already exist to prevent,
   * not a tuning problem. Optional/defaults to `false` (a normal venue) —
   * same "absent means normal" convention as distinctiveness/copyStatus
   * above; only ever set `true` by deliberate curation, never inferred.
   */
  occasional?: boolean;
  /**
   * True only for a venue you genuinely cannot walk into without arranging
   * it first — a pre-booked-only farm experience, a private class with a
   * capped group size — as distinct from `occasional` above: this venue
   * likely DOES run on a normal schedule, the problem is that showing up
   * unannounced doesn't work regardless. Found live 2026-09-22, same
   * session as `occasional`, while auditing the catalog for anything else
   * with the same "recommended as if you can just show up" problem: White
   * Peak Alpaca Farm's own copy says "pre-booked walks only" outright.
   * `passesWalkInFilter` (rank-venues.ts) hard-excludes it from ranked
   * "right now" results for the same reason as `occasional` — a real
   * concierge doesn't send someone to a door they can't get through today.
   * Optional/defaults to `false` — only ever set `true` on explicit
   * evidence in the venue's own copy, never inferred from venue type (a
   * cookery class or a farm experience isn't assumed booking-only just
   * because that's plausible; this only reflects what's actually stated).
   */
  bookingRequired?: boolean;
  /**
   * 'coming-soon' marks a venue Curia isn't fully committing to as a
   * long-term catalog pick yet (e.g. a new venue whose parent operator has
   * stated multi-site expansion plans that could later tip it into Hard
   * rule 1 chain territory) — an editorial confidence marker set by
   * curation, distinct from petFriendly/dietaryOptions (real per-venue
   * facts, and hard filters per the Matchmaking contract). It still appears
   * in normal ranked results (no dedicated "browse all venues" surface
   * exists to show it otherwise) with a "New" badge in the UI — never
   * literal "coming soon" copy, since the venue itself may already be open
   * and trading. Defaults to 'live'.
   *
   * 'closed' (migration 0011, 2026-09-16) marks a venue the growth
   * engine's closure-audit flow (worker/src/pipeline/audit.ts) found and a
   * human confirmed via /admin/review — a hard exclusion from ranking
   * (see applyHardFilters in rank-venues.ts), never surfaced anywhere,
   * unlike 'coming-soon' which still ranks normally.
   */
  status: 'live' | 'coming-soon' | 'closed';

  /**
   * Gate 2 of the two-gate model (CLAUDE.md Hard rule 1, amended
   * 2026-09-16) — a 1-5 editorial "would a local tell a visiting friend
   * about this specific place" score. Feeds `rank-venues.ts` as a
   * discount-only multiplier (see Matchmaking contract), never a
   * presentation-layer badge (Presentation layer section — no raw scores
   * in user-facing UI). Optional here pending migration 0009 and the
   * seed-loader wiring that reads it from Supabase (see docs/data
   * pipeline) — every real row is NOT NULL with a default of 4 once that
   * lands; absent only means "not yet wired up for this Venue instance"
   * (e.g. an older test fixture), never "genuinely unscored."
   */
  distinctiveness?: number;
  /** Ownership research that feeds the distinctiveness score above — an
   * input, not a veto, under the amended Hard rule 1. Same optionality
   * note as distinctiveness. */
  ownership?: 'independent' | 'small_group' | 'group' | 'high_street';
  ownershipNotes?: string;
  /** Editorial copy pipeline state for venues arriving via the Curator
   * worker (see the growth-engine plan) — existing hand-curated venues are
   * 'live' by definition. Same optionality note as distinctiveness. */
  copyStatus?: 'draft' | 'voice_qa_passed' | 'live';
  /** Real per-day hours, sourced venue-by-venue — see OpeningHours' own doc
   * comment. `undefined` means not yet researched, never "closed." */
  openingHours?: OpeningHours;

  // Internal-only fields — Hard rule 8: must NEVER surface in user-facing UI,
  // API responses to the member app, or copy. Admin/back-office only.
  tier: 'signature' | 'texture';
  sourceConfidence: number;
  notes?: string;
}

/** Exactly 4 moment types per CLAUDE.md — do not add more without a product decision. */
export type MomentType =
  | 'date-night'
  | 'entertaining-a-client'
  | 'big-group-of-friends'
  | 'solo-reset';

export interface Moment {
  id: string;
  type: MomentType;
  title: string;
  curator: string;
  blurb: string;
  venueIds: string[];
}

export interface JourneyStop {
  venueId: string;
  order: number;
  walkTimeToNextMinutes?: number;
}

export interface Journey {
  id: string;
  momentType: MomentType;
  title: string;
  /** Real editorial copy from the design source, shown italic under the hero on Journey detail. */
  blurb?: string;
  /** Real "DISTRICT · N STOPS · N HOURS" line from the design source, shown as the hero kicker. */
  meta?: string;
  stops: JourneyStop[];
  /** Derived: the set of districts this journey's stops touch — not stored,
   * computed from stop venues' districtIds. See src/lib/data/seed.ts's
   * journeyDistricts() helper. */
}

export interface SavedCollection {
  id: string;
  userId: string;
  name: string;
  venueIds: string[];
}

export interface SavedJourney {
  userId: string;
  journeyId: string;
}

/**
 * A holiday destination Curia can point a member toward — added 2026-08 at
 * explicit user request for a subtle, Profile-only travel feature ("more
 * Raya than Tinder, more Michelin Guide than TripAdvisor" extended past
 * nights out to holidays: "which cities/island would be a good place for
 * YOU to go, and when"). Not in the design prototype at all (nothing to
 * transcribe), so this shape is original, not extracted — see
 * docs/data/destinations.json's own `_source` note.
 *
 * Deliberately NOT a `District`: Curia doesn't operate here (no curated
 * venues, no matchmaking hard filters). Closer in shape to a `Moment` —
 * curated, editorial, reasoned — than to the venue ranking engine. See
 * src/lib/scoring/rank-destinations.ts for the (intentionally much lighter
 * than rank-venues.ts) matching logic.
 */
export interface Destination {
  id: string;
  name: string;
  /** e.g. "Balearic Islands, Spain" — shown as the location line. */
  region: string;
  lat: number;
  lon: number;
  /** Months (1-12) this destination is genuinely at its best — the same
   * "when, not just where" idea as District's dayMultiplier/bandMultiplier,
   * one level up (season instead of day-part). */
  bestMonths: number[];
  /** Hand-written display form of bestMonths (e.g. "Late April – June,
   * September – October") — kept separate from the numeric months rather
   * than auto-formatted, so the copy can read like brand voice instead of
   * a date-range widget. */
  bestSeasonLabel: string;
  /** Real onboarding Tile ids (src/lib/data/seed.ts TILES, `${category}|${name}`)
   * this destination genuinely suits — the same taste vocabulary a user's
   * own preferences are stored in, not a parallel vocabulary. Note: the real
   * tile catalog has no "Golf" or ski-specific tile, so activity-led
   * destinations (Sotogrande, Chamonix) are tagged against the closest real
   * tiles (e.g. `Do|Spectator sport`'s "Polo/tennis" sub-preference) rather
   * than an invented one — the activity itself still lives in the prose.
   */
  tileIds: string[];
  curator: string;
  editorialDescription: string;
}

export type AdminRole = 'admin'; // single role at launch, no multi-role distinction yet

export interface AdminUser {
  id: string;
  email: string;
  role: AdminRole;
}
