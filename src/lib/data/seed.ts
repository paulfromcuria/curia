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
import { useEffect, useReducer } from 'react';
import { supabase } from './supabase-client';
import { HOLIDAY_FEATURE_ENABLED } from '../config/features';
import { isVenueClosed } from '../scoring/rank-venues';
import type {
  City,
  Destination,
  District,
  DistrictGroup,
  HomeRegion,
  Journey,
  JourneyStop,
  MetroId,
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
  santorini: 'Santorini',
  riyadh: 'Riyadh',
  london: 'London',
  chicago: 'Chicago',
};
export let VENUES: Venue[] = [];
export let MOMENTS: Moment[] = [];
export let JOURNEYS: Journey[] = [];
export let TILES: Tile[] = [];
export let DESTINATIONS: Destination[] = [];
/** Aggregate crowd rating per venue, from the `venue_rating_stats` view
 * (supabase/migrations/0005_venue_ratings.sql) — never per-user data, see
 * that migration's own doc comment on why. Keyed by venue id; a venue with
 * no ratings yet simply has no entry (not a zeroed one), matching every
 * other seed export's "empty means nothing loaded yet" convention. Read by
 * src/lib/scoring/rank-venues.ts's scoreRatings() and rendered directly on
 * venue/[id].tsx. */
export let RATING_STATS: Record<string, { avg: number; count: number }> = {};

let loaded = false;
let loadPromise: Promise<void> | null = null;

export function isContentDataLoaded(): boolean {
  return loaded;
}

/** Metros whose venues load eagerly, before the app's initial render gate
 * opens (src/app/_layout.tsx) — Curia's founding market, and where a
 * signed-in member almost certainly is if we don't know anything else yet
 * (DEMO_LOCATION, src/lib/scoring/session-input.ts, sits inside Manchester).
 * Every other metro's venues load on demand via loadVenuesForMetro() below
 * — 2026-09, at explicit user request ("only fetch current region data on
 * load, and go fetch another region's data if the user starts to navigate
 * between regions"), the fix for a real scaling problem: loadContentData()
 * used to fetch every venue in every metro unconditionally, which was fine
 * at a few hundred rows but would mean every user's cold load paying for
 * every market's data regardless of which one they'd ever actually use.
 * Districts/cities/tiles/moments/journeys/destinations stay eager and
 * global — all small, and needed everywhere (the map's coverage boundary,
 * the district filter rows on Moments/List, etc. — see src/lib/map/geo.ts's
 * metroForPoint doc comment for the boundary-detection side of this). */
export const DEFAULT_METROS: MetroId[] = ['manchester', 'cheshire'];

const loadedMetros = new Set<MetroId>();

/** Whether a metro's venues have already been fetched — src/app/(tabs)/
 * map.web.tsx checks this before offering a "switch region" prompt (no
 * point prompting for a metro that's already loaded). */
export function isMetroLoaded(metro: MetroId): boolean {
  return loadedMetros.has(metro);
}

// Minimal pub/sub so screens that read VENUES directly (Map/List/Moments —
// none of them go through React state or context for it, same "module-level
// array" contract this whole file's doc comment describes) can react when
// loadVenuesForMetro() mutates it after the initial load. Before this
// feature, VENUES was populated exactly once, before anything ever
// rendered, so no consumer needed a way to notice a later change — now that
// a region switch can add rows mid-session, they do.
type ContentListener = () => void;
const contentListeners = new Set<ContentListener>();
function notifyContentChanged() {
  contentListeners.forEach((fn) => fn());
}

/** Bumps whenever loadVenuesForMetro() adds a newly-loaded region's venues
 * — include the return value in a `useMemo`/`useCallback` dependency array
 * alongside VENUES-derived work (rankVenues and friends) so it recomputes
 * after a region switch instead of silently missing the new rows. Before
 * this feature, VENUES was populated exactly once, before anything ever
 * rendered, so nothing needed a way to notice a later change. */
export function useContentVersion(): number {
  const [version, forceUpdate] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    contentListeners.add(forceUpdate);
    return () => {
      contentListeners.delete(forceUpdate);
    };
  }, []);
  return version;
}

export function mapVenueRow(v: Record<string, unknown>): Venue {
  return {
    id: v.id as string,
    name: v.name as string,
    type: v.type as string,
    subPreferenceTags: (v.sub_preference_tags as string[]) ?? [],
    spendLevel: v.spend_level as Venue['spendLevel'],
    districtId: v.district_id as string,
    metro: v.metro as Venue['metro'],
    lat: v.lat as number,
    lon: v.lon as number,
    petFriendly: v.pet_friendly as boolean,
    dietaryOptions: v.dietary_options as Venue['dietaryOptions'],
    status: v.status as Venue['status'],
    photos: (v.photos as string[]) ?? [],
    description: v.description as string,
    bands: v.bands as Venue['bands'],
    base: v.base as number,
    // Found 2026-09-18, building admin dashboard metrics that needed to
    // count real scored venues: this row mapper never actually read these
    // three columns, despite migration 0009 adding them and the Venue
    // type's own doc comment (models.ts) explicitly flagging "pending...
    // the seed-loader wiring that reads it from Supabase" as a known TODO.
    // Every venue loaded through the real app has had distinctiveness/
    // ownership silently undefined this whole time regardless of what's
    // actually in the database — meaning rank-venues.ts's Gate 2
    // distinctiveness discount (scoreDistinctivenessFactor) has always
    // fallen back to the neutral default for every real venue, even ones
    // with a real, individually-researched score (Piccolino Grande, Cibo,
    // the 25-venue ownership backfill, the tile-coverage-gap additions).
    distinctiveness: (v.distinctiveness as number | null) ?? undefined,
    ownership: (v.ownership as Venue['ownership']) ?? undefined,
    ownershipNotes: (v.ownership_notes as string | null) ?? undefined,
    copyStatus: (v.copy_status as Venue['copyStatus']) ?? undefined,
    openingHours: (v.opening_hours as Venue['openingHours']) ?? undefined,
    // occasional (2026-09-22): defaults to false/undefined, both meaning
    // "runs on a normal schedule" — deliberately wired here in the SAME
    // change that adds the column and the hard filter that reads it (see
    // models.ts's own doc comment on this field for why: this exact row
    // mapper already has one documented incident of a migration landing a
    // new column that nothing here read for months).
    occasional: (v.occasional as boolean | null) ?? false,
    bookingRequired: (v.booking_required as boolean | null) ?? false,
    tier: v.tier as Venue['tier'],
    sourceConfidence: v.source_confidence as number,
    notes: (v.notes as string | null) ?? undefined,
  };
}

/** Fetches one metro's venues and merges them into VENUES — the on-demand
 * counterpart to loadContentData()'s eager DEFAULT_METROS fetch. Safe to
 * call for an already-loaded metro (no-ops) or before loadContentData()
 * has resolved (queues behind it, same as loadContentData() itself). */
export async function loadVenuesForMetro(metro: MetroId): Promise<void> {
  if (loadPromise) await loadPromise;
  if (loadedMetros.has(metro)) return;
  // Defensive, not expected to be reachable via UI: santorini stays
  // soft-hidden regardless of which metro a caller asks for (see
  // HOLIDAY_FEATURE_ENABLED's own doc comment) — src/app/(tabs)/map.web.tsx
  // never offers it as a switch target while the flag is off.
  if (metro === 'santorini' && !HOLIDAY_FEATURE_ENABLED) return;

  const { data, error } = await supabase.from('venues').select('*').eq('metro', metro);
  if (error) throw new Error(`Failed to load venues for ${metro}: ${error.message}`);

  VENUES = [...VENUES, ...(data ?? []).map(mapVenueRow)];
  loadedMetros.add(metro);
  notifyContentChanged();
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
      ratingStatsRes,
    ] = await Promise.all([
      supabase.from('cities').select('*'),
      supabase.from('districts').select('*'),
      supabase.from('district_groups').select('*'),
      supabase.from('district_group_members').select('*'),
      supabase.from('tiles').select('*'),
      supabase.from('venues').select('*').in('metro', DEFAULT_METROS),
      supabase.from('moments').select('*'),
      supabase.from('moment_venues').select('*').order('position'),
      supabase.from('journeys').select('*'),
      supabase.from('journey_stops').select('*').order('stop_order'),
      supabase.from('destinations').select('*'),
      supabase.from('venue_rating_stats').select('*'),
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
      // ratingStatsRes deliberately excluded: it degrades gracefully (empty
      // RATING_STATS -> scoreRatings() returns neutral for everything, the
      // same as if nobody had rated anything, which is also the genuinely
      // correct real state on a fresh install) — not worth blocking the
      // entire app's load over, unlike every other table above.
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

    VENUES = (venuesRes.data ?? []).map(mapVenueRow);
    DEFAULT_METROS.forEach((m) => loadedMetros.add(m));

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
      region: (t.region as HomeRegion | null) ?? undefined,
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

    RATING_STATS = {};
    for (const r of ratingStatsRes.data ?? []) {
      RATING_STATS[r.venue_id] = { avg: Number(r.avg_rating), count: r.rating_count };
    }

    // Soft-hide Santorini + Holiday — see features.ts's doc comment. Real
    // rows stay untouched in the database; this just filters what the app
    // exposes. Order matters: VENUES is filtered before MOMENTS/JOURNEYS so
    // their dangling-reference filters below can check against it directly.
    // The VENUES line is now mostly defensive — DEFAULT_METROS never
    // includes 'santorini', so its rows aren't fetched here in the first
    // place, and loadVenuesForMetro() refuses it too — but CITIES/DISTRICTS
    // still need real filtering, they load unconditionally for every metro.
    if (!HOLIDAY_FEATURE_ENABLED) {
      CITIES = CITIES.filter((c) => c.id !== 'santorini');
      DISTRICTS = DISTRICTS.filter((d) => d.metro !== 'santorini');
      VENUES = VENUES.filter((v) => v.metro !== 'santorini');
      MOMENTS = MOMENTS.map((m) => ({
        ...m,
        venueIds: m.venueIds.filter((id) => VENUES.some((v) => v.id === id)),
      }));
      JOURNEYS = JOURNEYS.filter((j) => j.stops.every((s) => VENUES.some((v) => v.id === s.venueId)));
      TILES = TILES.filter((t) => t.category !== 'Holiday');
    }

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

/**
 * True if any of a Journey's stops resolves to a permanently-closed venue.
 * Added 2026-09-22, continuing the same audit as rank-venues.ts's
 * isVenueClosed: Journeys/Moments read venues directly by id, bypassing
 * rankVenues/applyHardFilters entirely, so a closed stop used to still
 * appear completely normally everywhere a Journey is listed or opened.
 * Excludes the whole journey rather than just dropping the closed stop —
 * a walking sequence with a stop silently removed would have wrong
 * walk-time-to-next connectors and a broken "start this journey" route,
 * worse than not listing it at all; a real fix needs an editor to rebuild
 * it without the dead venue, not a client-side patch. journey/[id].tsx
 * still handles the direct-link case (e.g. from a previously-saved
 * journey) with its own in-place CLOSED flag, since this only controls
 * whether a journey gets *listed*.
 */
export function journeyHasClosedStop(journey: Journey): boolean {
  return journey.stops.some((stop) => {
    const venue = VENUES.find((v) => v.id === stop.venueId);
    return venue ? isVenueClosed(venue) : false;
  });
}

/** Journeys with at least one stop in the given district, excluding any
 * journey with a closed stop (see journeyHasClosedStop above). */
export function journeysByDistrict(districtId: string): Journey[] {
  return JOURNEYS.filter(
    (j) => !journeyHasClosedStop(j) && journeyDistricts(j).some((d) => d.id === districtId)
  );
}

/** Moments with at least one live (non-closed) pick in the given district. */
export function momentsByDistrict(districtId: string): Moment[] {
  return MOMENTS.filter((m) =>
    m.venueIds.some((id) => {
      const v = VENUES.find((vv) => vv.id === id);
      return v && !isVenueClosed(v) && v.districtId === districtId;
    })
  );
}

/** Whether a tile tagged for `tileRegion` should show to a member whose
 * Region answer is `memberRegion`. Exact match, plus one deliberate alias:
 * 'usa' shares the 'uk' Drink catalog wholesale (see HomeRegion's own doc
 * comment, types/models.ts) — no tile in docs/data/tiles.json is actually
 * tagged 'usa' today, so without this a US member's Region picker would
 * gate them into an empty Drink category. */
function regionMatchesTile(tileRegion: HomeRegion, memberRegion: HomeRegion): boolean {
  if (tileRegion === memberRegion) return true;
  return tileRegion === 'uk' && memberRegion === 'usa';
}

/** `homeRegion` only matters for categories with region-scoped tiles
 * (currently just Drink — see HomeRegion's own doc comment,
 * types/models.ts). A tile with no `region` is universal and always
 * included; a tile with one is only included when it matches (see
 * regionMatchesTile above for the one 'uk'/'usa' alias). Passing no
 * `homeRegion` (or null, the pre-answer state) falls back to 'uk' — every
 * real member before this feature existed is UK-based, and onboarding's
 * own 'Region' step is what actually sets a real value. */
export function tilesByCategory(category: TileCategory, homeRegion?: HomeRegion | null): Tile[] {
  const effectiveRegion = homeRegion ?? 'uk';
  return TILES.filter((t) => t.category === category && (!t.region || regionMatchesTile(t.region, effectiveRegion)));
}

export function venuesByDistrict(districtId: string): Venue[] {
  return VENUES.filter((v) => v.districtId === districtId);
}

export function districtGroupFor(districtIds: string[]): DistrictGroup | undefined {
  const idSet = new Set(districtIds);
  return DISTRICT_GROUPS.find((g) => g.districtIds.every((id) => idSet.has(id)));
}
