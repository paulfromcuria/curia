/**
 * READ-ONLY access to the real `districts`/`venues`/`cities` tables —
 * every function in this file calls `.select(...)` and nothing else.
 * This is deliberately the one place the worker is allowed to look at
 * live content, kept structurally separate from supabase.ts (the only
 * file allowed to WRITE, and only ever to the four growth-engine tables)
 * so "never writes to venues/districts directly" is visible from the
 * file boundary itself, not just a comment someone could miss.
 */
import { createClient } from '@supabase/supabase-js';
import { config } from './config.js';
import type { DistrictBrief } from './types.js';

function client() {
  return createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** Every venue `type` currently in real, live use — Discover's real type
 * vocabulary. Sourced from the live table rather than importing
 * src/lib/scoring/tile-catalog-map.ts directly: this worker is a
 * separately deployed package with its own dependency tree, and the live
 * table is the more accurate source anyway (it reflects what's actually
 * in use today, not a static file that could drift from it). Any
 * candidate whose proposed type isn't in this set is exactly the
 * `needs_new_type` case the Curate stage flags rather than inventing a
 * type unilaterally. */
export async function fetchKnownVenueTypes(): Promise<Set<string>> {
  const { data, error } = await client().from('venues').select('type');
  if (error) throw new Error(`fetchKnownVenueTypes: ${error.message}`);
  return new Set((data ?? []).map((v) => v.type as string));
}

export interface DistrictVenueCount {
  districtId: string;
  metro: string;
  venueCount: number;
}

/** Every district in the given metros, with its current live venue count
 * — Plan uses this against markets.yaml's minVenueFloor to pick targets. */
export async function fetchDistrictVenueCounts(metros: string[]): Promise<DistrictVenueCount[]> {
  const { data: districts, error: districtsError } = await client()
    .from('districts')
    .select('id, metro')
    .in('metro', metros);
  if (districtsError) throw new Error(`fetchDistrictVenueCounts (districts): ${districtsError.message}`);

  const { data: venues, error: venuesError } = await client()
    .from('venues')
    .select('district_id')
    .in('metro', metros);
  if (venuesError) throw new Error(`fetchDistrictVenueCounts (venues): ${venuesError.message}`);

  const counts = new Map<string, number>();
  for (const v of venues ?? []) {
    counts.set(v.district_id, (counts.get(v.district_id) ?? 0) + 1);
  }
  return (districts ?? []).map((d) => ({
    districtId: d.id,
    metro: d.metro,
    venueCount: counts.get(d.id) ?? 0,
  }));
}

export interface VenueSliceEntry {
  id: string;
  name: string;
  type: string;
  districtId: string;
  metro: string;
}

/** A stable, rotating slice of `count` live venues — Audit checks a
 * different slice each day rather than every venue every run. Deterministic
 * on days-since-epoch so it advances on its own with no separate persisted
 * cursor, same "rotating slice" idea the real daily-review pipeline already
 * uses by hand (see docs/data/venues.json's own closure-audit notes). */
export async function fetchVenueAuditSlice(count: number): Promise<VenueSliceEntry[]> {
  const { data, error } = await client()
    .from('venues')
    .select('id, name, type, district_id, metro')
    .eq('status', 'live')
    .order('id', { ascending: true });
  if (error) throw new Error(`fetchVenueAuditSlice: ${error.message}`);
  const all = data ?? [];
  if (all.length === 0) return [];

  const daysSinceEpoch = Math.floor(Date.now() / 86_400_000);
  const offset = (daysSinceEpoch * count) % all.length;
  const slice: typeof all = [];
  for (let i = 0; i < Math.min(count, all.length); i++) {
    slice.push(all[(offset + i) % all.length]);
  }
  return slice.map((v) => ({
    id: v.id,
    name: v.name,
    type: v.type,
    districtId: v.district_id,
    metro: v.metro,
  }));
}

/** Full briefing for one district — real character copy, coordinates, and
 * every existing venue name for dedupe. Feeds Discover's prompt directly. */
export async function fetchDistrictBrief(districtId: string): Promise<DistrictBrief | null> {
  const { data: district, error: districtError } = await client()
    .from('districts')
    .select('id, name, metro, lat, lon, editorial_description')
    .eq('id', districtId)
    .maybeSingle();
  if (districtError) throw new Error(`fetchDistrictBrief (district): ${districtError.message}`);
  if (!district) return null;

  const { data: venues, error: venuesError } = await client()
    .from('venues')
    .select('name')
    .eq('district_id', districtId);
  if (venuesError) throw new Error(`fetchDistrictBrief (venues): ${venuesError.message}`);

  return {
    id: district.id,
    name: district.name,
    metro: district.metro,
    lat: district.lat,
    lon: district.lon,
    character: district.editorial_description ?? undefined,
    existingVenueNames: (venues ?? []).map((v) => v.name),
  };
}
