/**
 * Pure zoom/pixel math for Map, kept in its own leaf module — deliberately
 * NOT part of geo.ts, even though geo.ts is this feature's usual home,
 * because geo.ts imports docs/data/*.json via seed.ts (Node's native ESM
 * loader needs import-attribute syntax for that, which plain `node --test`
 * doesn't have — see rank-venues.ts's own top comment for the identical
 * reasoning). This module has zero seed/data dependency, so it can be
 * unit-tested directly (projection.test.mts) the same way rank-venues.ts
 * is. geo.ts re-exports everything here so existing `from
 * '.../lib/map/geo'` imports elsewhere in the app don't need to change.
 *
 * `metersPerPixelAt`/the Web Mercator ground-resolution constants
 * (EARTH_CIRCUMFERENCE_METERS/MILES_TO_METERS/TILE_SIZE_PX) live here too,
 * not duplicated in geo.ts — geo.ts's own zoomLevelToSpanMiles/
 * spanMilesToZoomLevel import them from here instead.
 */

export interface GeoPoint {
  lat: number;
  lon: number;
}

export const EARTH_CIRCUMFERENCE_METERS = 40075016.686;
export const MILES_TO_METERS = 1609.344;
export const TILE_SIZE_PX = 256;
const EARTH_RADIUS_MILES = EARTH_CIRCUMFERENCE_METERS / (2 * Math.PI) / MILES_TO_METERS;

/** Standard Web Mercator ground resolution (meters/pixel) at a given zoom
 * and latitude — shared by zoomLevelToSpanMiles/spanMilesToZoomLevel
 * (geo.ts) and projectToPixels (below), so there's one formula, not two
 * copies that could drift apart. */
export function metersPerPixelAt(zoomLevel: number, atLat: number): number {
  return (EARTH_CIRCUMFERENCE_METERS * Math.cos((atLat * Math.PI) / 180)) / (TILE_SIZE_PX * 2 ** zoomLevel);
}

export interface PixelOffset {
  x: number;
  y: number;
}

/**
 * Approximate on-screen pixel offset of `point` from `center`, at a given
 * Mapbox `zoomLevel` — a local, flat-earth approximation (uniform
 * meters-per-pixel around `center`, no Web Mercator latitude-dependent Y
 * stretch), the same simplifying assumption zoomLevelToSpanMiles (geo.ts)
 * already makes. Accurate to a small fraction of a pixel at the few-mile
 * spans Curia's zoom range actually covers (the radius slider tops out at
 * 30mi) — would visibly drift at continent scale, which this product never
 * renders. Used only for relative pin-collision spacing
 * (selectCollisionFreePins below), never to place a real map camera or
 * marker — mapboxgl/@rnmapbox already do that correctly themselves, and
 * (unlike this) natively support real screen<->geo conversion (see geo.ts's
 * own top comment on why the old hand-rolled abstract-map projection was
 * removed) — this is a narrow, internal heuristic for "how many pins fit,"
 * not a re-introduction of that removed general-purpose projection.
 */
export function projectToPixels(point: GeoPoint, center: GeoPoint, zoomLevel: number): PixelOffset {
  const metersPerPixel = metersPerPixelAt(zoomLevel, center.lat);
  const dLonMiles =
    ((point.lon - center.lon) * Math.PI * EARTH_RADIUS_MILES * Math.cos((center.lat * Math.PI) / 180)) / 180;
  const dLatMiles = ((point.lat - center.lat) * Math.PI * EARTH_RADIUS_MILES) / 180;
  return {
    x: (dLonMiles * MILES_TO_METERS) / metersPerPixel,
    y: -(dLatMiles * MILES_TO_METERS) / metersPerPixel, // screen y grows downward; latitude grows upward
  };
}

/** Minimum on-screen gap (px) enforced between two match pins by
 * selectCollisionFreePins — comfortably more than a match pin's own 28px
 * container (map.web.tsx/map.tsx's buildMatchPinElement), so pins never
 * visually touch let alone overlap. */
export const MIN_MATCH_PIN_GAP_PX = 36;

/** Hard ceiling on how many "match" pins ever show at once, however much
 * screen space is available — CLAUDE.md Presentation layer: map chrome
 * stays quiet and secondary; a map crowded with 30 gold pins would compete
 * with curated content rather than support it. */
export const MAX_MATCH_PINS = 10;

/**
 * Picks, in rank order, as many of `candidates` as fit on screen without
 * any two landing within `minGapPx` of each other — real collision
 * avoidance rather than a hand-tuned "N pins per zoom level" table, so the
 * count naturally tracks both zoom (points spread apart in pixel space as
 * you zoom in) and real local density (a genuinely tight cluster still
 * won't overlap; a sparse area isn't padded with far-apart pins just to
 * hit a target count). The best-ranked candidate is always kept — nothing
 * can collide with an empty placed list — so this never drops to zero
 * while any real candidate exists.
 *
 * Added 2026-09-18, at explicit user request: "our number of
 * recommendations aka glowing pulses on the map view really should be
 * dependant on zoom level... but with a maximum amount as to not
 * overcrowd the map." Gated by FLEXIBLE_MATCH_PIN_COUNT_ENABLED
 * (src/lib/config/features.ts) at the call site, same revert story as
 * every other map experiment this session — flip it off, or git revert
 * the commit, to go back to the flat top-4 slice this replaces.
 */
export function selectCollisionFreePins<T>(
  candidates: T[],
  getPoint: (item: T) => GeoPoint,
  center: GeoPoint,
  zoomLevel: number,
  maxCount: number = MAX_MATCH_PINS,
  minGapPx: number = MIN_MATCH_PIN_GAP_PX
): T[] {
  const placed: PixelOffset[] = [];
  const kept: T[] = [];
  for (const candidate of candidates) {
    if (kept.length >= maxCount) break;
    const p = projectToPixels(getPoint(candidate), center, zoomLevel);
    if (placed.some((q) => Math.hypot(p.x - q.x, p.y - q.y) < minGapPx)) continue;
    placed.push(p);
    kept.push(candidate);
  }
  return kept;
}
