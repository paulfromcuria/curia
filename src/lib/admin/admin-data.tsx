import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { DISTRICTS, VENUES } from '../data/seed';
import type { District, Venue } from '../../types/models';

/**
 * In-memory admin data store for the curation surface (M8), seeded once
 * from the same typed loader (src/lib/data/seed.ts) every other surface
 * reads from.
 *
 * IMPORTANT: this does NOT persist edits across an app restart. There is
 * no Supabase project yet (CLAUDE.md "Tech stack" / "Still genuinely open"
 * — a real credential gap, not guessable), so "CRUD" here means mutating
 * this in-memory copy only, exactly as the M8 brief describes. A real
 * backend swap replaces the bodies of the functions below with Supabase
 * calls without changing the shape consumers see (Venue/District from
 * src/types/models.ts).
 *
 * This store's arrays are independent copies of src/lib/data/seed.ts's own
 * exported VENUES/DISTRICTS — those stay the static seed snapshot the
 * member-facing app and the scoring engine (curia-matchmaking) were built
 * and tested against. Admin edits made here never mutate those exports and
 * never leak into the member app (Hard rule 8) — there is no wiring
 * between this file and any member-facing screen at all.
 */
export interface AdminDataContextValue {
  venues: Venue[];
  districts: District[];
  getVenue: (id: string) => Venue | undefined;
  getDistrict: (id: string) => District | undefined;
  /** Inserts if `venue.id` is new, otherwise replaces the existing entry. */
  upsertVenue: (venue: Venue) => void;
  deleteVenue: (id: string) => void;
  updateDistrictEditorial: (id: string, editorialDescription: string) => void;
}

const AdminDataContext = createContext<AdminDataContextValue | null>(null);

export function AdminDataProvider({ children }: { children: ReactNode }) {
  const [venues, setVenues] = useState<Venue[]>(() => VENUES.map((v) => ({ ...v })));
  const [districts, setDistricts] = useState<District[]>(() => DISTRICTS.map((d) => ({ ...d })));

  const getVenue = useCallback((id: string) => venues.find((v) => v.id === id), [venues]);
  const getDistrict = useCallback((id: string) => districts.find((d) => d.id === id), [districts]);

  const upsertVenue = useCallback((venue: Venue) => {
    setVenues((prev) => {
      const exists = prev.some((v) => v.id === venue.id);
      return exists ? prev.map((v) => (v.id === venue.id ? venue : v)) : [...prev, venue];
    });
  }, []);

  const deleteVenue = useCallback((id: string) => {
    setVenues((prev) => prev.filter((v) => v.id !== id));
  }, []);

  const updateDistrictEditorial = useCallback((id: string, editorialDescription: string) => {
    setDistricts((prev) =>
      prev.map((d) => (d.id === id ? { ...d, editorialDescription } : d))
    );
  }, []);

  const value = useMemo<AdminDataContextValue>(
    () => ({ venues, districts, getVenue, getDistrict, upsertVenue, deleteVenue, updateDistrictEditorial }),
    [venues, districts, getVenue, getDistrict, upsertVenue, deleteVenue, updateDistrictEditorial]
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
