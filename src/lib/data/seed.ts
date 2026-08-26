/**
 * Typed loader over the seed data transcribed from the Claude Design handoff
 * bundle (docs/data/districts.json, docs/data/venues.json). This is a local
 * mock data layer — Supabase wiring replaces this once a project exists, per
 * CLAUDE.md's tech stack section. Every consumer should go through this
 * module rather than requiring the JSON directly, so the swap is one place.
 */
import districtsRaw from '../../../docs/data/districts.json';
import venuesRaw from '../../../docs/data/venues.json';
import tilesRaw from '../../../docs/data/tiles.json';
import destinationsRaw from '../../../docs/data/destinations.json';
import type {
  City,
  Destination,
  District,
  DistrictGroup,
  Journey,
  JourneyStop,
  Moment,
  MomentType,
  Tile,
  TileCategory,
  Venue,
} from '../../types/models';

const MOMENT_TYPE_BY_TITLE: Record<string, MomentType> = {
  'Best for Date Night': 'date-night',
  'Entertaining a Client': 'entertaining-a-client',
  'Big Group of Friends': 'big-group-of-friends',
  'Solo Reset': 'solo-reset',
};

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export const CITIES: City[] = districtsRaw.metros.map((m) => ({ id: m.id as City['id'], name: m.name }));

export const DISTRICTS: District[] = districtsRaw.districts.map((d) => ({
  id: d.id,
  name: d.name,
  metro: d.metro as District['metro'],
  lat: d.lat,
  lon: d.lon,
  base: d.base,
  kind: d.kind as District['kind'],
  accentColor: d.accentColor,
  editorialDescription: d.editorialDescription,
  // The prototype's DAY_MULT/BAND_MULT tables are global, not per-district —
  // applied identically here so src/lib/scoring/rank-venues.ts's
  // scoreDayOfWeek signal (previously a no-op against real seed data, see M3
  // report) has real values to read. bandMultiplier defaults to the
  // district's kind (city/county), but a district can carry its own
  // override directly in the JSON when sharing the generic kind curve would
  // flatten real differences in character — see districts.json's own
  // _bandMultiplierSource note for the mechanism and its history.
  dayMultiplier: districtsRaw.dayMultiplier,
  bandMultiplier:
    (d as { bandMultiplier?: Record<string, number> }).bandMultiplier ??
    districtsRaw.bandMultiplier[d.kind as 'city' | 'county'],
}));

export const DISTRICT_GROUPS: DistrictGroup[] = districtsRaw.districtGroups.map((g) => ({
  name: g.name,
  districtIds: g.of,
}));

export const METRO_WHOLE_SET_LABEL: Record<string, string> = districtsRaw.metroWholeSetLabel;

function districtIdByName(name: string): string {
  const match = DISTRICTS.find((d) => d.name === name);
  if (!match) throw new Error(`Seed data references unknown district "${name}"`);
  return match.id;
}

/**
 * Seed venues only carry the fields the prototype's UI actually renders.
 * Internal-only fields (tier/sourceConfidence/notes — Hard rule 8) and
 * dietary/pet flags aren't in the design bundle's illustrative data, so they
 * default conservatively here rather than being invented per-venue. Real
 * curation (M8, curia-admin) replaces these defaults with real values.
 */
export const VENUES: Venue[] = venuesRaw.venues.map((v, i) => ({
  id: slugify(v.name),
  name: v.name,
  type: v.type,
  subPreferenceTags: [],
  spendLevel: v.spend.length as Venue['spendLevel'],
  districtId: districtIdByName(
    DISTRICTS.find((d) => d.id === v.district)?.name ?? v.district
  ),
  metro: DISTRICTS.find((d) => d.id === v.district)?.metro ?? 'manchester',
  lat: v.lat,
  lon: v.lon,
  petFriendly: false,
  dietaryOptions: ['none'],
  photos: [],
  description: v.reason,
  bands: v.bands as Venue['bands'],
  base: v.base,
  tier: i < 8 ? 'signature' : 'texture',
  sourceConfidence: 1,
  notes: undefined,
}));

export const MOMENTS: Moment[] = venuesRaw.moments.map((m) => ({
  id: slugify(m.title),
  type: MOMENT_TYPE_BY_TITLE[m.title] ?? slugify(m.title) as MomentType,
  title: m.title === 'Best for Date Night' ? 'Date Night' : m.title,
  curator: m.curator,
  blurb: m.blurb,
  venueIds: m.picks.map(slugify).filter((id) => VENUES.some((v) => v.id === id)),
}));

/**
 * Real ordered stops (venue ids, order, walk-time-to-next), transcribed from
 * the design source's own JOURNEYS constant (Curia.dc.html) — see
 * docs/data/venues.json's `_source` note for exactly what's transcribed vs.
 * newly filled in. `momentType` previously always resolved to 'date-night'
 * for every journey (a placeholder bug: it searched for any moment titled
 * with "date" regardless of which journey was being mapped) — each journey
 * now carries its own real `moment` slug in the JSON instead.
 */
export const JOURNEYS: Journey[] = venuesRaw.journeys.map((j) => ({
  id: slugify(j.title),
  momentType: j.moment as MomentType,
  title: j.title,
  blurb: j.blurb,
  meta: j.meta,
  stops: j.stops
    .map((s, i): JourneyStop => ({
      venueId: slugify(s.venue),
      order: i + 1,
      walkTimeToNextMinutes: (s as { walkToNextMinutes?: number }).walkToNextMinutes,
    }))
    .filter((s) => VENUES.some((v) => v.id === s.venueId)),
}));

/** The set of districts a journey's stops touch (CLAUDE.md: a Journey "can
 * span multiple districts — a Journey's displayed location is the set of
 * districts its stops touch"). Derived, not stored. */
export function journeyDistricts(journey: Journey): District[] {
  const districtIds = new Set(
    journey.stops
      .map((s) => VENUES.find((v) => v.id === s.venueId)?.districtId)
      .filter((id): id is string => !!id)
  );
  return DISTRICTS.filter((d) => districtIds.has(d.id));
}

/** Journeys with at least one stop in the given district. */
export function journeysByDistrict(districtId: string): Journey[] {
  return JOURNEYS.filter((j) => journeyDistricts(j).some((d) => d.id === districtId));
}

/** Moments with at least one pick in the given district. */
export function momentsByDistrict(districtId: string): Moment[] {
  return MOMENTS.filter((m) =>
    m.venueIds.some((id) => VENUES.find((v) => v.id === id)?.districtId === districtId)
  );
}

/**
 * Onboarding tile catalog (Do/Drink/Eat), transcribed from the Claude Design
 * handoff bundle's `CATS` constant — see docs/data/tiles.json. Tile ids are
 * derived as `category|name` so they're stable and human-readable in
 * UserPreference.selectedTileIds.
 */
export const TILES: Tile[] = (Object.entries(tilesRaw.categories) as [TileCategory, { name: string; subPreferences: string[] }[]][])
  .flatMap(([category, tiles]) =>
    tiles.map((t) => ({
      id: `${category}|${t.name}`,
      category,
      name: t.name,
      subPreferences: t.subPreferences,
    }))
  );

export function tilesByCategory(category: TileCategory): Tile[] {
  return TILES.filter((t) => t.category === category);
}

/**
 * Holiday destinations for the Travel feature (2026-08, at explicit user
 * request) — see docs/data/destinations.json's own `_source` note and
 * src/types/models.ts's Destination doc comment. Loaded the same way every
 * other seed collection here is, so it swaps out cleanly whenever Supabase
 * wiring replaces this whole file.
 */
export const DESTINATIONS: Destination[] = destinationsRaw.destinations;

export function venuesByDistrict(districtId: string): Venue[] {
  return VENUES.filter((v) => v.districtId === districtId);
}

export function districtGroupFor(districtIds: string[]): DistrictGroup | undefined {
  const idSet = new Set(districtIds);
  return DISTRICT_GROUPS.find((g) => g.districtIds.every((id) => idSet.has(id)));
}
