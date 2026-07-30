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
import type { City, District, DistrictGroup, Journey, Moment, MomentType, Tile, TileCategory, Venue } from '../../types/models';

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
  // The prototype's DAY_MULT/BAND_MULT tables are global, not per-district —
  // applied identically here so src/lib/scoring/rank-venues.ts's
  // scoreDayOfWeek signal (previously a no-op against real seed data, see M3
  // report) has real values to read. bandMultiplier is keyed by district
  // kind since BAND_MULT itself varies by city/county.
  dayMultiplier: districtsRaw.dayMultiplier,
  bandMultiplier: districtsRaw.bandMultiplier[d.kind as 'city' | 'county'],
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

export const JOURNEYS: Journey[] = venuesRaw.journeys.map((j) => ({
  id: slugify(j.title),
  momentType: MOMENTS.find((m) => m.title.toLowerCase().includes('date'))?.type ?? 'date-night',
  title: j.title,
  stops: [],
}));

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

export function venuesByDistrict(districtId: string): Venue[] {
  return VENUES.filter((v) => v.districtId === districtId);
}

export function districtGroupFor(districtIds: string[]): DistrictGroup | undefined {
  const idSet = new Set(districtIds);
  return DISTRICT_GROUPS.find((g) => g.districtIds.every((id) => idSet.has(id)));
}
