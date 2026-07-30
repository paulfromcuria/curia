/**
 * Pure geo/projection helpers behind Map's abstract line-and-dot render.
 * Map-only (not shared with List — List has no map view) but kept pure and
 * dependency-light so it's easy to reason about / test in isolation.
 *
 * Deliberately a simple equirectangular-ish projection centered on whatever
 * point the map is currently framing, not a pixel-perfect port of the
 * prototype's own projection constants (those were tuned to one fixed
 * 402x874 device frame and a large hand-authored road/water coordinate
 * dataset outside CLAUDE.md's data model) — see CLAUDE.md's guidance for M5:
 * "don't chase pixel-perfect prototype fidelity, the point is a real working
 * abstract map."
 */
import { haversineMiles } from '../scoring/rank-venues';
import { DEMO_LOCATION } from '../scoring/session-input';
import { DISTRICTS, METRO_WHOLE_SET_LABEL, districtGroupFor } from '../data/seed';
import type { District } from '../../types/models';

export interface GeoPoint {
  lat: number;
  lon: number;
}

export interface Viewport {
  width: number;
  height: number;
}

const MILES_PER_DEGREE_LAT = 69.0;

function milesPerDegreeLon(atLat: number): number {
  return MILES_PER_DEGREE_LAT * Math.cos((atLat * Math.PI) / 180);
}

/** Standing in for the user's real position until device geolocation exists
 * (see CLAUDE.md "Still genuinely open": Mapbox key). Also the map's default
 * "home" recenter point. */
export const MAP_HOME: GeoPoint = DEMO_LOCATION;

/** Map-view span (miles across the viewport's width), zoomed-in to
 * zoomed-out. Index 0 is the closest zoom; index length-1 is the widest.
 * This milestone's own pick (not a documented/prototype value) — a
 * low-stakes layout default in the same spirit as theme/tokens.ts's spacing
 * scale, not a product decision. */
export const ZOOM_SPAN_MILES = [3, 6, 10, 16, 26, 42] as const;

export const DEFAULT_ZOOM_INDEX = 3;

export function clampZoomIndex(index: number): number {
  return Math.max(0, Math.min(ZOOM_SPAN_MILES.length - 1, index));
}

export interface ProjectedPoint {
  x: number;
  y: number;
}

/** Forward-projects a lat/lon into viewport pixel space, centered on `center`
 * with `spanMiles` visible across the viewport's width. */
export function project(
  point: GeoPoint,
  center: GeoPoint,
  spanMiles: number,
  viewport: Viewport
): ProjectedPoint {
  const pxPerMile = viewport.width / spanMiles;
  const dLatMiles = (point.lat - center.lat) * MILES_PER_DEGREE_LAT;
  const dLonMiles = (point.lon - center.lon) * milesPerDegreeLon(center.lat);
  return {
    x: viewport.width / 2 + dLonMiles * pxPerMile,
    y: viewport.height / 2 - dLatMiles * pxPerMile,
  };
}

/** Inverse of `project` — used to sample "what lat/lon is under this pixel"
 * for the BEYOND THE EDGE coverage check. */
export function unproject(
  pixel: ProjectedPoint,
  center: GeoPoint,
  spanMiles: number,
  viewport: Viewport
): GeoPoint {
  const pxPerMile = viewport.width / spanMiles;
  const dLonMiles = (pixel.x - viewport.width / 2) / pxPerMile;
  const dLatMiles = (viewport.height / 2 - pixel.y) / pxPerMile;
  return {
    lat: center.lat + dLatMiles / MILES_PER_DEGREE_LAT,
    lon: center.lon + dLonMiles / milesPerDegreeLon(center.lat),
  };
}

export function centroid(points: GeoPoint[]): GeoPoint {
  const lat = points.reduce((sum, p) => sum + p.lat, 0) / points.length;
  const lon = points.reduce((sum, p) => sum + p.lon, 0) / points.length;
  return { lat, lon };
}

/** Smallest span (miles) that comfortably fits every point around its own
 * centroid, with headroom so labels near the edge aren't clipped. */
export function spanMilesToFit(points: GeoPoint[]): number {
  if (points.length === 0) return ZOOM_SPAN_MILES[0];
  const c = centroid(points);
  const maxDist = Math.max(...points.map((p) => haversineMiles(c, p)));
  return Math.max(ZOOM_SPAN_MILES[0], maxDist * 2.6);
}

/** The narrowest zoom step whose span is >= the required fit span, so a
 * group/region reframe always shows every member, never crops one out. */
export function fitZoomIndex(requiredSpanMiles: number): number {
  for (let i = 0; i < ZOOM_SPAN_MILES.length; i++) {
    if (ZOOM_SPAN_MILES[i] >= requiredSpanMiles) return i;
  }
  return ZOOM_SPAN_MILES.length - 1;
}

function nearestDistrictMiles(point: GeoPoint, districts: District[]): number {
  return Math.min(...districts.map((d) => haversineMiles(point, d)));
}

/** How much coverage-threshold distance from any seed district counts as
 * "beyond the edge" unexplored territory. Own reasonable pick (there's no
 * real District boundary geometry in the data model yet, per CLAUDE.md's
 * City/metro boundary note) — a display-only heuristic, not a hard filter
 * (venue distance filtering is entirely rank-venues.ts's radiusMiles, this
 * never excludes a venue). */
const BEYOND_EDGE_THRESHOLD_MILES = 5.5;

/** Samples a grid across the current viewport and returns the fraction of it
 * that falls outside every seed district's coverage radius — the same
 * "how much of the readable frame falls outside the region" idea the
 * prototype's buildMap() computes, simplified to a flat per-district
 * threshold rather than the prototype's hand-authored REGION boundary
 * polygon (no such polygon exists in our real data model). */
export function beyondEdgeFraction(
  center: GeoPoint,
  spanMiles: number,
  viewport: Viewport,
  districts: District[] = DISTRICTS
): number {
  const cols = 8;
  const rows = 10;
  let out = 0;
  let total = 0;
  for (let gx = 0; gx < cols; gx++) {
    for (let gy = 0; gy < rows; gy++) {
      const px = { x: (viewport.width * (gx + 0.5)) / cols, y: (viewport.height * (gy + 0.5)) / rows };
      const geo = unproject(px, center, spanMiles, viewport);
      total++;
      if (nearestDistrictMiles(geo, districts) > BEYOND_EDGE_THRESHOLD_MILES) out++;
    }
  }
  return total ? out / total : 0;
}

/** Districts whose lat/lon falls within the current viewport's bounding box
 * (in miles, matching the viewport's aspect ratio), with a little padding so
 * a label doesn't pop in/out right at the screen edge. */
export function districtsInViewport(
  center: GeoPoint,
  spanMiles: number,
  viewport: Viewport,
  districts: District[] = DISTRICTS
): District[] {
  const halfWidthMiles = (spanMiles / 2) * 1.15;
  const halfHeightMiles = halfWidthMiles * (viewport.height / viewport.width);
  return districts.filter((d) => {
    const dLatMiles = Math.abs(d.lat - center.lat) * MILES_PER_DEGREE_LAT;
    const dLonMiles = Math.abs(d.lon - center.lon) * milesPerDegreeLon(center.lat);
    return dLatMiles <= halfHeightMiles && dLonMiles <= halfWidthMiles;
  });
}

export interface MapLabel {
  key: string;
  label: string;
  kind: 'district' | 'group';
  /** Real district ids this label stands for — length 1 for a single
   * district, >1 for a group/cluster label. */
  districtIds: string[];
  center: GeoPoint;
  accentColor: string;
}

/**
 * Implements CLAUDE.md's DistrictGroup naming rule directly against real
 * seed data: a cluster takes a group's own metro-wide name only when every
 * district in that metro is currently visible; a partial subset gets the
 * subset's own group label (e.g. "Hale & Altrincham"); anything left over
 * shows its own individual district name. Hard rule 6: group labels are
 * zoom-only — callers must never route a `kind: 'group'` label to a detail
 * page, only real `kind: 'district'` entries carry a real district id to
 * push `/district/[id]` with.
 */
export function groupVisibleDistricts(visible: District[]): MapLabel[] {
  const consumed = new Set<string>();
  const labels: MapLabel[] = [];

  (['manchester', 'cheshire'] as const).forEach((metro) => {
    const metroDistricts = DISTRICTS.filter((d) => d.metro === metro);
    const visibleIds = new Set(visible.map((d) => d.id));
    if (metroDistricts.length > 0 && metroDistricts.every((d) => visibleIds.has(d.id))) {
      metroDistricts.forEach((d) => consumed.add(d.id));
      labels.push({
        key: `metro:${metro}`,
        label: METRO_WHOLE_SET_LABEL[metro] ?? metro,
        kind: 'group',
        districtIds: metroDistricts.map((d) => d.id),
        center: centroid(metroDistricts),
        accentColor: metroDistricts[0].accentColor,
      });
    }
  });

  for (;;) {
    const remaining = visible.filter((d) => !consumed.has(d.id));
    const group = districtGroupFor(remaining.map((d) => d.id));
    if (!group) break;
    const members = group.districtIds
      .map((id) => DISTRICTS.find((d) => d.id === id))
      .filter((d): d is District => !!d);
    members.forEach((d) => consumed.add(d.id));
    labels.push({
      key: `group:${group.name}`,
      label: group.name,
      kind: 'group',
      districtIds: group.districtIds,
      center: centroid(members),
      accentColor: members[0]?.accentColor ?? '#C0A062',
    });
  }

  visible
    .filter((d) => !consumed.has(d.id))
    .forEach((d) => {
      labels.push({
        key: `district:${d.id}`,
        label: d.name,
        kind: 'district',
        districtIds: [d.id],
        center: { lat: d.lat, lon: d.lon },
        accentColor: d.accentColor,
      });
    });

  return labels;
}

/** Live/quiet score for a district right now, 8-99 — the same formula the
 * prototype's own `live(d, ctx)` uses (base attractiveness scaled by
 * day-of-week and time-of-band multipliers), against real
 * dayMultiplier/bandMultiplier values (docs/data/districts.json). */
export function districtLiveliness(district: District, day: string, band: string): number {
  const dayMult = district.dayMultiplier?.[day] ?? 1;
  const bandMult = district.bandMultiplier?.[band] ?? 1;
  return Math.max(8, Math.min(99, Math.round(district.base * dayMult * bandMult)));
}

export function labelLiveliness(label: MapLabel, day: string, band: string): number {
  const members = label.districtIds
    .map((id) => DISTRICTS.find((d) => d.id === id))
    .filter((d): d is District => !!d);
  return Math.max(...members.map((d) => districtLiveliness(d, day, band)), 8);
}
