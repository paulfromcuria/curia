import { slugifyType } from '../scoring/rank-venues';
import { tileIdToVenueTypeSlugs } from '../scoring/tile-catalog-map';
import type { City, District, Tile, Venue } from '../../types/models';
import type { AdminMember } from './admin-members';

/**
 * Pure, presentation-free growth/coverage stats for the admin dashboard
 * home (2026-08, admin growth-dashboard expansion). Computed live from the
 * real admin `venues`/`districts`/`tiles` state. Lives under src/lib/admin/
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

// --- Growth & engagement (2026-09-18, at explicit user request: "some
// skpi's and metrics and BA stuff... metrics tracking development
// progress and database depth etc with some targets") ---

export interface MemberGrowthMetrics {
  total: number;
  new7d: number;
  new30d: number;
  /** % of members with onboarding_complete = true. */
  onboardingCompletionPct: number;
  /** % who have saved or rated at least one venue — the closest real
   * "aha moment" signal available without a dedicated event log. */
  activatedPct: number;
  /** % whose last_sign_in_at is a real, later date than their join date —
   * i.e. they've actually come back at least once, not just signed up. */
  returnedPct: number;
  subscriptionCounts: Record<string, number>;
}

export function memberGrowthMetrics(members: AdminMember[]): MemberGrowthMetrics {
  const total = members.length;
  const now = Date.now();
  const days = (iso: string) => (now - new Date(iso).getTime()) / 86400000;
  const pct = (n: number) => (total === 0 ? 0 : Math.round((n / total) * 100));

  const new7d = members.filter((m) => days(m.joinDate) <= 7).length;
  const new30d = members.filter((m) => days(m.joinDate) <= 30).length;
  const onboardingCompletionPct = pct(members.filter((m) => m.onboardingComplete).length);
  const activatedPct = pct(members.filter((m) => m.savedVenueCount > 0 || m.ratedVenueCount > 0).length);
  const returnedPct = pct(
    members.filter((m) => {
      if (!m.lastSignInAt) return false;
      // More than a day past their join date — same-day sign-in on
      // signup itself shouldn't count as "came back".
      return new Date(m.lastSignInAt).getTime() - new Date(m.joinDate).getTime() > 86400000;
    }).length
  );
  const subscriptionCounts: Record<string, number> = {};
  for (const m of members) subscriptionCounts[m.subscriptionStatus] = (subscriptionCounts[m.subscriptionStatus] ?? 0) + 1;

  return { total, new7d, new30d, onboardingCompletionPct, activatedPct, returnedPct, subscriptionCounts };
}

export interface ChartBar {
  label: string;
  value: number;
}

/** Real signups per day, oldest first — the one genuinely time-series
 * chart this app can honestly draw, since joinDate is the only per-member
 * event with a real timestamp history (everything else, like save/rate
 * counts, is a current snapshot with no "when" behind it). */
export function signupsByDay(members: AdminMember[], windowDays = 14): ChartBar[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const counts = new Map<string, number>();
  for (let i = windowDays - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    counts.set(d.toISOString().slice(0, 10), 0);
  }
  for (const m of members) {
    const key = m.joinDate;
    if (counts.has(key)) counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Array.from(counts.entries()).map(([date, value]) => ({
    label: `${date.slice(8, 10)}/${date.slice(5, 7)}`,
    value,
  }));
}

/** The real onboarding→engagement funnel, each stage a strict subset of
 * the one before it — signed up, then completed onboarding, then actually
 * activated (saved or rated something), then came back a second time. */
export function engagementFunnel(members: AdminMember[]): ChartBar[] {
  const total = members.length;
  const onboarded = members.filter((m) => m.onboardingComplete).length;
  const activated = members.filter((m) => m.savedVenueCount > 0 || m.ratedVenueCount > 0).length;
  const returned = members.filter((m) => {
    if (!m.lastSignInAt) return false;
    return new Date(m.lastSignInAt).getTime() - new Date(m.joinDate).getTime() > 86400000;
  }).length;
  return [
    { label: 'Signed up', value: total },
    { label: 'Onboarded', value: onboarded },
    { label: 'Activated', value: activated },
    { label: 'Returned', value: returned },
  ];
}

export function venuesByMetroChart(venues: Venue[], cities: City[]): ChartBar[] {
  return cities.map((c) => ({ label: c.name, value: venues.filter((v) => v.metro === c.id).length }));
}

export function subscriptionBreakdownChart(subscriptionCounts: Record<string, number>): ChartBar[] {
  return Object.entries(subscriptionCounts).map(([label, value]) => ({ label, value }));
}

export interface ContentQualityMetrics {
  totalVenues: number;
  totalDistricts: number;
  /** Venues whose distinctiveness/ownership have been individually
   * researched, not left at migration 0009's blanket default — signalled
   * by ownership_notes being set, since the default backfill never wrote
   * one (see migration 0014's own header for why this is a clean, real
   * signal rather than a guess). */
  individuallyScoredVenues: number;
  /** Real onboarding tiles with at least one matching live venue. */
  tilesCovered: number;
  totalTiles: number;
  /** Districts with fewer than 3 real matches — the same
   * MIN_MATCHES_TO_RANK threshold the Districts view itself uses
   * (src/app/(tabs)/list.tsx) — below this, a district is invisible
   * there regardless of how many venues nominally exist. */
  districtsBelowRankThreshold: number;
}

const CONTENT_MIN_MATCHES_TO_RANK = 3;

export function contentQualityMetrics(
  venues: Venue[],
  districts: District[],
  tiles: Tile[]
): ContentQualityMetrics {
  const individuallyScoredVenues = venues.filter((v) => !!v.ownershipNotes).length;
  const coverage = tileCoverage(venues, tiles);
  const tilesCovered = coverage.filter((c) => c.matchingVenueCount > 0).length;
  const venuesPerDistrict = new Map<string, number>();
  for (const v of venues) venuesPerDistrict.set(v.districtId, (venuesPerDistrict.get(v.districtId) ?? 0) + 1);
  const districtsBelowRankThreshold = districts.filter(
    (d) => (venuesPerDistrict.get(d.id) ?? 0) < CONTENT_MIN_MATCHES_TO_RANK
  ).length;

  return {
    totalVenues: venues.length,
    totalDistricts: districts.length,
    individuallyScoredVenues,
    tilesCovered,
    totalTiles: tiles.length,
    districtsBelowRankThreshold,
  };
}
