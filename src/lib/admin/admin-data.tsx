import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { DISTRICTS, TILES, VENUES } from '../data/seed';
import type { District, Tile, Venue } from '../../types/models';

/**
 * In-memory admin data store for the curation surface (M8, extended 2026-08
 * for the growth-dashboard expansion), seeded once from the same typed
 * loader (src/lib/data/seed.ts) every other surface reads from.
 *
 * IMPORTANT: this does NOT persist edits across an app restart. There is
 * no Supabase project yet (CLAUDE.md "Tech stack" / "Still genuinely open"
 * — a real credential gap, not guessable), so "CRUD" here means mutating
 * this in-memory copy only, exactly as the M8 brief describes. A real
 * backend swap replaces the bodies of the functions below with Supabase
 * calls without changing the shape consumers see (Venue/District/Tile from
 * src/types/models.ts).
 *
 * This store's arrays are independent copies of src/lib/data/seed.ts's own
 * exported VENUES/DISTRICTS/TILES — those stay the static seed snapshot the
 * member-facing app and the scoring engine (curia-matchmaking) were built
 * and tested against. Admin edits made here never mutate those exports and
 * never leak into the member app (Hard rule 8) — there is no wiring
 * between this file and any member-facing screen at all.
 *
 * Deliberately does NOT include a "users" slice — there is no real backend
 * and no source of real member records to CRUD (session.tsx tracks exactly
 * one ephemeral, unpersisted current member per browser session, not a
 * registry of everyone who's signed up). See src/lib/admin/demo-users.ts
 * for the Users admin screen's separate, explicitly-fabricated data source
 * — kept out of this provider on purpose, since there's nothing real here
 * to mutate.
 */
export interface AdminDataContextValue {
  venues: Venue[];
  districts: District[];
  tiles: Tile[];
  getVenue: (id: string) => Venue | undefined;
  getDistrict: (id: string) => District | undefined;
  getTile: (id: string) => Tile | undefined;
  /** Inserts if `venue.id` is new, otherwise replaces the existing entry. */
  upsertVenue: (venue: Venue) => void;
  deleteVenue: (id: string) => void;
  /** Inserts if `district.id` is new, otherwise replaces the existing entry. */
  upsertDistrict: (district: District) => void;
  deleteDistrict: (id: string) => void;
  /** Inserts if `tile.id` is new, otherwise replaces the existing entry. */
  upsertTile: (tile: Tile) => void;
  deleteTile: (id: string) => void;
}

const AdminDataContext = createContext<AdminDataContextValue | null>(null);

export function AdminDataProvider({ children }: { children: ReactNode }) {
  const [venues, setVenues] = useState<Venue[]>(() => VENUES.map((v) => ({ ...v })));
  const [districts, setDistricts] = useState<District[]>(() => DISTRICTS.map((d) => ({ ...d })));
  // Clones the nested subPreferences array too, not just the top-level
  // object — Tile is the first seeded type here with a nested array field,
  // and a shallow `{...t}` clone alone would still share that array by
  // reference with seed.ts's own exported TILES, letting an in-place edit
  // (e.g. sorting or pushing) mutate the real seed data out from under it.
  const [tiles, setTiles] = useState<Tile[]>(() => TILES.map((t) => ({ ...t, subPreferences: [...t.subPreferences] })));

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
