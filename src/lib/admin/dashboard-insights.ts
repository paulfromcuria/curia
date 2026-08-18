import { slugifyType } from '../scoring/rank-venues';
import { tileIdToVenueTypeSlugs } from '../scoring/tile-catalog-map';
import type { City, District, Tile, Venue } from '../../types/models';

/**
 * Pure, presentation-free growth/coverage stats for the admin dashboard
 * home (2026-08, admin growth-dashboard expansion). Computed live from the
 * real admin `venues`/`districts`/`tiles` state — nothing synthetic here
 * (unlike the Users screen's demo-users.ts). Lives under src/lib/admin/
 * rather than inline in the dashboard screen, mirroring how
 * src/lib/scoring/*.ts keeps scoring logic pure and separate from the
 * screens that render it.
 */

export interface MetroCoverage {
  metroId: string;
  metroName: string;
  districtCount: number;
  venueCount: number;
}

export function metroCoverage(venues: Venue[], districts: District[], cities: City[]): MetroCoverage[] {
  return cities
    .map((city) => ({
      metroId: city.id,
      metroName: city.name,
      districtCount: districts.filter((d) => d.metro === city.id).length,
      venueCount: venues.filter((v) => v.metro === city.id).length,
    }))
    .sort((a, b) => a.venueCount - b.venueCount);
}

export interface TierDistribution {
  signatureCount: number;
  textureCount: number;
  signaturePct: number;
}

export function tierDistribution(venues: Venue[]): TierDistribution {
  const signatureCount = venues.filter((v) => v.tier === 'signature').length;
  const textureCount = venues.length - signatureCount;
  const signaturePct = venues.length === 0 ? 0 : Math.round((signatureCount / venues.length) * 100);
  return { signatureCount, textureCount, signaturePct };
}

export interface TileCoverage {
  tileId: string;
  category: Tile['category'];
  name: string;
  matchingVenueCount: number;
}

/** For each real tile, how many live venues actually match it — via the
 * same slug-matching the real scoring engine (rank-venues.ts's
 * scoreTileMatch/passesMoodFilter) uses, not a re-derivation. */
export function tileCoverage(venues: Venue[], tiles: Tile[]): TileCoverage[] {
  return tiles.map((tile) => {
    const slugs = new Set(tileIdToVenueTypeSlugs(tile.id));
    const matchingVenueCount = venues.filter((v) => slugs.has(slugifyType(v.type))).length;
    return { tileId: tile.id, category: tile.category, name: tile.name, matchingVenueCount };
  });
}

export function lowCoverageTiles(coverage: TileCoverage[]): TileCoverage[] {
  return coverage.filter((c) => c.matchingVenueCount === 0);
}
