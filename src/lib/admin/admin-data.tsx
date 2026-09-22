import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { mapVenueRow } from '../data/seed';
import { supabase } from '../data/supabase-client';
import type { City, District, Tile, Venue } from '../../types/models';

/**
 * Admin data store for the curation surface (M8, extended 2026-08 for the
 * growth-dashboard expansion, read side fixed 2026-09-18).
 *
 * READ side: fetches fresh, unscoped from Supabase on mount — every venue/
 * district/tile in every metro, always. Previously seeded from
 * src/lib/data/seed.ts's own exported VENUES/DISTRICTS/TILES, which is
 * wrong for an admin surface: those are the member app's region-scoped
 * arrays (DEFAULT_METROS = manchester+cheshire only, until a member
 * actually browses another region and triggers loadVenuesForMetro), so the
 * dashboard's own venue count and tile-coverage stats were silently
 * undercounting by whatever wasn't lazy-loaded yet — found live 2026-09-18
 * ("my admin portal is showing 219 venues total, is that correct?" — real
 * answer was 329, London/Riyadh/Santorini missing entirely).
 *
 * That 2026-09-18 fix missed `cities`, though — found live 2026-09-22
 * ("the venues by metro graph doesnt add up to 413"): src/app/admin/
 * index.tsx was still passing the member-app's own `CITIES` singleton
 * (src/lib/data/seed.ts) into GrowthInsights' "Venues by metro" chart
 * instead of an admin-scoped fetch. That singleton has Santorini's row
 * surgically removed whenever HOLIDAY_FEATURE_ENABLED is off (seed.ts's
 * own loadContentData, `if (!HOLIDAY_FEATURE_ENABLED) CITIES =
 * CITIES.filter(...)`) — correct for the member app, which is deliberately
 * hiding that market, but wrong for an internal curation tool that should
 * see every real row regardless of what's currently member-facing. The
 * chart's own bars (bucketed against that Santorini-less array) summed to
 * 413 − 52 = 361, while the adjacent "Total venues" stat tile (this
 * provider's own unscoped venues.length) correctly showed 413 — same
 * "admin should never inherit a member-facing scoping decision" bug as
 * the original venues/districts/tiles one, just one field it missed.
 * `cities` now gets the exact same unscoped-fetch treatment below.
 *
 * WRITE side is NOT fixed here — still real scope, not done: upsert/delete
 * below only mutate this in-memory copy, exactly as the original M8 brief
 * described, and don't persist across a refresh. A real write path needs
 * RLS granting admin_users direct write access to venues/districts/tiles
 * (same idiom migration 0012 already set up for the growth-engine tables),
 * plus rewriting every function below to hit Supabase — a genuinely
 * separate, larger piece of work, flagged rather than silently left for
 * someone to discover the hard way.
 *
 * Deliberately does NOT include a "users" slice — real members are a
 * separate concern (real signups via Supabase Auth, not something this
 * provider's fetch-then-mutate pattern fits) with their own read-only
 * provider, src/lib/admin/admin-members.tsx.
 */
export interface AdminDataContextValue {
  venues: Venue[];
  districts: District[];
  tiles: Tile[];
  /** Every real city/metro row, unscoped — see this file's own 2026-09-22
   * doc-comment addition above for the exact bug this exists to prevent
   * (a member-facing scoping decision, e.g. Santorini hidden behind
   * HOLIDAY_FEATURE_ENABLED, leaking into what an admin can see). */
  cities: City[];
  /** True until the initial Supabase fetch resolves — every count/coverage
   * stat computed from venues/districts/tiles is 0/empty until this flips,
   * not a real "nothing here" answer. */
  loading: boolean;
  getVenue: (id: string) => Venue | undefined;
  getDistrict: (id: string) => District | undefined;
  getTile: (id: string) => Tile | undefined;
  /** Inserts if `venue.id` is new, otherwise replaces the existing entry.
   * In-memory only — see this file's own header comment. */
  upsertVenue: (venue: Venue) => void;
  deleteVenue: (id: string) => void;
  /** Inserts if `district.id` is new, otherwise replaces the existing entry.
   * In-memory only — see this file's own header comment. */
  upsertDistrict: (district: District) => void;
  deleteDistrict: (id: string) => void;
  /** Inserts if `tile.id` is new, otherwise replaces the existing entry.
   * In-memory only — see this file's own header comment. */
  upsertTile: (tile: Tile) => void;
  deleteTile: (id: string) => void;
}

const AdminDataContext = createContext<AdminDataContextValue | null>(null);

function mapDistrictRow(d: Record<string, unknown>): District {
  return {
    id: d.id as string,
    name: d.name as string,
    metro: d.metro as District['metro'],
    lat: d.lat as number,
    lon: d.lon as number,
    base: d.base as number,
    kind: d.kind as District['kind'],
    accentColor: d.accent_color as string,
    editorialDescription: (d.editorial_description as string | null) ?? undefined,
    dayMultiplier: (d.day_multiplier as Record<string, number> | null) ?? undefined,
    bandMultiplier: (d.band_multiplier as Record<string, number> | null) ?? undefined,
    groupId: (d.group_id as string | null) ?? undefined,
  };
}

function mapTileRow(t: Record<string, unknown>): Tile {
  return {
    id: t.id as string,
    category: t.category as Tile['category'],
    name: t.name as string,
    subPreferences: (t.sub_preferences as string[]) ?? [],
    region: (t.region as Tile['region']) ?? undefined,
  };
}

export function AdminDataProvider({ children }: { children: ReactNode }) {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [venuesRes, districtsRes, tilesRes, citiesRes] = await Promise.all([
        supabase.from('venues').select('*'),
        supabase.from('districts').select('*'),
        supabase.from('tiles').select('*'),
        supabase.from('cities').select('*'),
      ]);
      if (cancelled) return;
      setVenues((venuesRes.data ?? []).map(mapVenueRow));
      setDistricts((districtsRes.data ?? []).map(mapDistrictRow));
      setTiles((tilesRes.data ?? []).map(mapTileRow));
      setCities((citiesRes.data ?? []).map((c) => ({ id: c.id as City['id'], name: c.name as string })));
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const getVenue = useCallback((id: string) => venues.find((v) => v.id === id), [venues]);
  const getDistrict = useCallback((id: string) => districts.find((d) => d.id === id), [districts]);
  const getTile = useCallback((id: string) => tiles.find((t) => t.id === id), [tiles]);

  const upsertVenue = useCallback((venue: Venue) => {
    setVenues((prev) => {
      const exists = prev.some((v) => v.id === venue.id);
      return exists ? prev.map((v) => (v.id === venue.id ? venue : v)) : [...prev, venue];
    });
  }, []);

  const deleteVenue = useCallback((id: string) => {
    setVenues((prev) => prev.filter((v) => v.id !== id));
  }, []);

  const upsertDistrict = useCallback((district: District) => {
    setDistricts((prev) => {
      const exists = prev.some((d) => d.id === district.id);
      return exists ? prev.map((d) => (d.id === district.id ? district : d)) : [...prev, district];
    });
  }, []);

  const deleteDistrict = useCallback((id: string) => {
    setDistricts((prev) => prev.filter((d) => d.id !== id));
  }, []);

  const upsertTile = useCallback((tile: Tile) => {
    setTiles((prev) => {
      const exists = prev.some((t) => t.id === tile.id);
      return exists ? prev.map((t) => (t.id === tile.id ? tile : t)) : [...prev, tile];
    });
  }, []);

  const deleteTile = useCallback((id: string) => {
    setTiles((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const value = useMemo<AdminDataContextValue>(
    () => ({
      venues,
      districts,
      tiles,
      cities,
      loading,
      getVenue,
      getDistrict,
      getTile,
      upsertVenue,
      deleteVenue,
      upsertDistrict,
      deleteDistrict,
      upsertTile,
      deleteTile,
    }),
    [
      venues,
      districts,
      tiles,
      cities,
      loading,
      getVenue,
      getDistrict,
      getTile,
      upsertVenue,
      deleteVenue,
      upsertDistrict,
      deleteDistrict,
      upsertTile,
      deleteTile,
    ]
  );

  return <AdminDataContext.Provider value={value}>{children}</AdminDataContext.Provider>;
}

export function useAdminData(): AdminDataContextValue {
  const ctx = useContext(AdminDataContext);
  if (!ctx) throw new Error('useAdminData must be used within an AdminDataProvider');
  return ctx;
}

/** Slugifies a venue name into a stable id, disambiguating against any
 * existing id by appending `-2`, `-3`, etc. Mirrors src/lib/data/seed.ts's
 * own (private) slugify convention so ids look the same either way. */
export function slugifyVenueName(name: string, existingIds: readonly string[]): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'venue';
  if (!existingIds.includes(base)) return base;
  let suffix = 2;
  while (existingIds.includes(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
}

/** Same algorithm as slugifyVenueName, for District ids. */
export function slugifyDistrictName(name: string, existingIds: readonly string[]): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'district';
  if (!existingIds.includes(base)) return base;
  let suffix = 2;
  while (existingIds.includes(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
}
