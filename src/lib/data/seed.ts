/**
 * Real backend data loader. Supabase (supabase/migrations/0001_init.sql,
 * populated via scripts/seed-supabase.mjs / scripts/generate-seed-sql.mjs
 * from docs/data/*.json) replaces the local-JSON mock this module used to
 * be — every export below keeps the exact same name/shape the mock version
 * had, so the ~20 screens that already import DISTRICTS/VENUES/TILES/etc.
 * don't need to change at all. The one new piece is `loadContentData()`,
 * called once at app boot (src/app/_layout.tsx) before anything else
 * renders — the same "block until ready" pattern already used there for
 * font loading. Until it resolves, every array below is empty; nothing
 * should read them before that point (the root layout gate enforces this).
 */
import { supabase } from './supabase-client';
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

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export let CITIES: City[] = [];
export let DISTRICTS: District[] = [];
export let DISTRICT_GROUPS: DistrictGroup[] = [];
export let METRO_WHOLE_SET_LABEL: Record<string, string> = {
  manchester: 'Central Manchester',
  cheshire: 'The Cheshire Set',
};
export let VENUES: Venue[] = [];
export let MOMENTS: Moment[] = [];
export let JOURNEYS: Journey[] = [];
export let TILES: Tile[] = [];
export let DESTINATIONS: Destination[] = [];

let loaded = false;
let loadPromise: Promise<void> | null = null;

export function isContentDataLoaded(): boolean {
  return loaded;
}

/** Fetches every content table once and populates the exports above.
 * Safe to call more than once — later callers just await the same promise. */
export function loadContentData(): Promise<void> {
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    const [
      citiesRes,
      districtsRes,
      groupsRes,
      groupMembersRes,
      tilesRes,
      venuesRes,
      momentsRes,
      momentVenuesRes,
      journeysRes,
      journeyStopsRes,
      destinationsRes,
    ] = await Promise.all([
      supabase.from('cities').select('*'),
      supabase.from('districts').select('*'),
      supabase.from('district_groups').select('*'),
      supabase.from('district_group_members').select('*'),
      supabase.from('tiles').select('*'),
      supabase.from('venues').select('*'),
      supabase.from('moments').select('*'),
      supabase.from('moment_venues').select('*').order('position'),
      supabase.from('journeys').select('*'),
      supabase.from('journey_stops').select('*').order('stop_order'),
      supabase.from('destinations').select('*'),
    ]);

    const firstError = [
      citiesRes,
      districtsRes,
      groupsRes,
      groupMembersRes,
      tilesRes,
      venuesRes,
      momentsRes,
      momentVenuesRes,
      journeysRes,
      journeyStopsRes,
      destinationsRes,
    ].find((r) => r.error)?.error;
    if (firstError) throw new Error(`Failed to load content data: ${firstError.message}`);

    CITIES = (citiesRes.data ?? []).map((c) => ({ id: c.id as City['id'], name: c.name }));

    DISTRICTS = (districtsRes.data ?? []).map((d) => ({
      id: d.id,
      name: d.name,
      metro: d.metro as District['metro'],
      lat: d.lat,
      lon: d.lon,
      base: d.base,
      kind: d.kind as District['kind'],
      accentColor: d.accent_color,
      editorialDescription: d.editorial_description ?? undefined,
      dayMultiplier: (d.day_multiplier as Record<string, number> | null) ?? undefined,
      bandMultiplier: (d.band_multiplier as Record<string, number> | null) ?? undefined,
      groupId: d.group_id ?? undefined,
    }));

    const districtIdsByGroup = new Map<string, string[]>();
    for (const m of groupMembersRes.data ?? []) {
      const list = districtIdsByGroup.get(m.group_name) ?? [];
      list.push(m.district_id);
      districtIdsByGroup.set(m.group_name, list);
    }
    DISTRICT_GROUPS = (groupsRes.data ?? []).map((g) => ({
      name: g.name,
      districtIds: districtIdsByGroup.get(g.name) ?? [],
    }));

    VENUES = (venuesRes.data ?? []).map((v) => ({
      id: v.id,
      name: v.name,
      type: v.type,
      subPreferenceTags: v.sub_preference_tags ?? [],
      spendLevel: v.spend_level as Venue['spendLevel'],
      districtId: v.district_id,
      metro: v.metro as Venue['metro'],
      lat: v.lat,
      lon: v.lon,
      petFriendly: v.pet_friendly,
      dietaryOptions: v.dietary_options as Venue['dietaryOptions'],
      status: v.status as Venue['status'],
      photos: v.photos ?? [],
      description: v.description,
      bands: v.bands as Venue['bands'],
      base: v.base,
      tier: v.tier as Venue['tier'],
      sourceConfidence: v.source_confidence,
      notes: v.notes ?? undefined,
    }));

    const venueIdsByMoment = new Map<string, string[]>();
    for (const mv of momentVenuesRes.data ?? []) {
      const list = venueIdsByMoment.get(mv.moment_id) ?? [];
      list.push(mv.venue_id);
      venueIdsByMoment.set(mv.moment_id, list);
    }
    // `id` is slugify(title) (matches every other content id's convention);
    // `type` is the DB row's own id (already the MomentType value — see
    // 0001_init.sql's moments table). "Best for Date Night" is shortened to
    // "Date Night" for display, same special-case the JSON mock always had.
    MOMENTS = (momentsRes.data ?? []).map((m) => ({
      id: slugify(m.title),
      type: m.id as MomentType,
      title: m.title === 'Best for Date Night' ? 'Date Night' : m.title,
      curator: m.curator,
      blurb: m.blurb,
      venueIds: venueIdsByMoment.get(m.id) ?? [],
    }));

    const stopsByJourney = new Map<string, JourneyStop[]>();
    for (const s of journeyStopsRes.data ?? []) {
      const list = stopsByJourney.get(s.journey_id) ?? [];
      list.push({
        venueId: s.venue_id,
        order: list.length + 1,
        walkTimeToNextMinutes: s.walk_time_to_next_minutes ?? undefined,
      });
      stopsByJourney.set(s.journey_id, list);
    }
    JOURNEYS = (journeysRes.data ?? []).map((j) => ({
      id: j.id,
      momentType: j.moment_id as MomentType,
      title: j.title,
      blurb: j.blurb ?? undefined,
      meta: j.meta ?? undefined,
      stops: stopsByJourney.get(j.id) ?? [],
    }));

    TILES = (tilesRes.data ?? []).map((t) => ({
      id: t.id,
      category: t.category as TileCategory,
      name: t.name,
      subPreferences: t.sub_preferences ?? [],
    }));

    DESTINATIONS = (destinationsRes.data ?? []).map((d) => ({
      id: d.id,
      name: d.name,
      region: d.region,
      lat: d.lat,
      lon: d.lon,
      bestMonths: d.best_months ?? [],
      bestSeasonLabel: d.best_season_label,
      tileIds: d.tile_ids ?? [],
      curator: d.curator,
      editorialDescription: d.editorial_description,
    }));

    loaded = true;
  })();

  return loadPromise;
}

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
