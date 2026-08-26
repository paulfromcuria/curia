/**
 * Pure geo helpers behind Map's real Mapbox render (map.tsx / map.web.tsx).
 * Kept dependency-light and platform-agnostic so both the native
 * (@rnmapbox/maps) and web (mapbox-gl) renderers share one implementation of
 * "which districts are visible," "how grouped labels/pins should read," and
 * "how much of the frame is beyond Curia's coverage" — Hard rule 5's
 * "one radius and one context" spirit applied to the map's own logic, not
 * just the ranking input.
 *
 * Previously this module also carried a hand-rolled equirectangular
 * projection (`project`/`unproject`) for the abstract SVG line-and-dot map.
 * That's gone now that a real Mapbox basemap does real screen<->geo
 * conversion itself — see CLAUDE.md's Tech stack note (Mapbox integration
 * happened 2026-08, previously a credential gap) and this module's git
 * history if the old approach is ever needed for reference.
 */
import buffer from '@turf/buffer';
import mask from '@turf/mask';
import { featureCollection, multiPoint, point } from '@turf/helpers';
import type { Feature, FeatureCollection, MultiPolygon, Point, Polygon } from 'geojson';
import { haversineMiles } from '../scoring/rank-venues';
import { DEMO_LOCATION } from '../scoring/session-input';
import { DISTRICTS, METRO_WHOLE_SET_LABEL, districtGroupFor } from '../data/seed';
import type { District, MetroId } from '../../types/models';

export interface GeoPoint {
  lat: number;
  lon: number;
}

export interface GeoBounds {
  ne: GeoPoint;
  sw: GeoPoint;
}

/** Standing in for the user's real position until a real device fix comes
 * back (src/lib/state/session.tsx's geolocation effect) — the map's default
 * "home"/recenter point when `session.location` is still null. */
export const MAP_HOME: GeoPoint = DEMO_LOCATION;

const EARTH_CIRCUMFERENCE_METERS = 40075016.686;
const MILES_TO_METERS = 1609.344;
const TILE_SIZE_PX = 256;

export const MIN_ZOOM_LEVEL = 3;
export const MAX_ZOOM_LEVEL = 17;
export const DEFAULT_ZOOM_LEVEL = 12;

export function clampZoomLevel(zoom: number): number {
  return Math.max(MIN_ZOOM_LEVEL, Math.min(MAX_ZOOM_LEVEL, zoom));
}

/** Search radius bounds — the prototype's own slider range (CLAUDE.md
 * Matchmaking contract: "¼ mi to 30 mi"). Shared with List's radius slider
 * (src/app/(tabs)/list.tsx) so Map's zoom-driven radius and List's dragged
 * radius can never disagree on what's in-bounds. */
export const MIN_RADIUS_MILES = 0.25;
export const MAX_RADIUS_MILES = 30;

export function clampRadiusMiles(miles: number): number {
  return Math.max(MIN_RADIUS_MILES, Math.min(MAX_RADIUS_MILES, miles));
}

/** Search radius implied by a map viewport's current span — half the visible
 * width, since "radius" means centre-to-edge, not edge-to-edge. Used to keep
 * Map's zoom and the shared session.radiusMiles in sync (2026-08, at
 * explicit user request): zooming the map out widens the search, zooming in
 * narrows it, the same way List's slider already does — both write the one
 * shared value (Hard rule 5), neither forks its own copy. */
export function spanMilesToRadiusMiles(spanMiles: number): number {
  return clampRadiusMiles(spanMiles / 2);
}

/** Inverse — the zoom level whose span matches a given search radius, so
 * Map can open already zoomed to reflect whatever radius List's slider (or
 * a previous Map session) last set, instead of always resetting to a fixed
 * default zoom regardless of the shared radius. */
export function radiusMilesToZoomLevel(radiusMiles: number, atLat: number, viewportWidthPx: number): number {
  return spanMilesToZoomLevel(radiusMiles * 2, atLat, viewportWidthPx);
}

/** Real-world miles spanned by the viewport's width at a given Mapbox
 * `zoomLevel`, latitude (tile scale narrows toward the poles), and viewport
 * pixel width — used only for the on-screen "N miles" scale label; camera
 * movement itself always goes through zoomLevel/fitBounds directly, never
 * through this. */
export function zoomLevelToSpanMiles(zoomLevel: number, atLat: number, viewportWidthPx: number): number {
  const metersPerPixel =
    (EARTH_CIRCUMFERENCE_METERS * Math.cos((atLat * Math.PI) / 180)) / (TILE_SIZE_PX * 2 ** zoomLevel);
  return (metersPerPixel * viewportWidthPx) / MILES_TO_METERS;
}

/** Inverse of the above — the zoom level whose span (at this viewport width)
 * comfortably fits `spanMiles` across the screen. Used once, for the initial
 * camera position; ongoing zoom/fit interactions go through fitBounds or the
 * +/- buttons instead. */
export function spanMilesToZoomLevel(spanMiles: number, atLat: number, viewportWidthPx: number): number {
  const metersPerPixel = (spanMiles * MILES_TO_METERS) / viewportWidthPx;
  const zoom = Math.log2(
    (EARTH_CIRCUMFERENCE_METERS * Math.cos((atLat * Math.PI) / 180)) / (metersPerPixel * TILE_SIZE_PX)
  );
  return clampZoomLevel(zoom);
}

export function centroid(points: GeoPoint[]): GeoPoint {
  const lat = points.reduce((sum, p) => sum + p.lat, 0) / points.length;
  const lon = points.reduce((sum, p) => sum + p.lon, 0) / points.length;
  return { lat, lon };
}

/** A real lat/lon bounding box around `points`, with headroom so a
 * fitBounds camera move doesn't crop a point right at the frame edge. Feeds
 * directly into both @rnmapbox/maps's `Camera.fitBounds` and mapbox-gl's
 * `map.fitBounds` — no manual zoom-level math needed for "fit this group,"
 * unlike the old abstract-canvas approach. */
export function boundsForPoints(points: GeoPoint[], paddingRatio = 0.35): GeoBounds {
  if (points.length === 0) {
    return { ne: MAP_HOME, sw: MAP_HOME };
  }
  const lats = points.map((p) => p.lat);
  const lons = points.map((p) => p.lon);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);
  const latPad = Math.max((maxLat - minLat) * paddingRatio, 0.01);
  const lonPad = Math.max((maxLon - minLon) * paddingRatio, 0.01);
  return {
    ne: { lat: maxLat + latPad, lon: maxLon + lonPad },
    sw: { lat: minLat - latPad, lon: minLon - lonPad },
  };
}

/** Smallest span (miles) that comfortably fits every point around its own
 * centroid, with headroom so nothing sits right at the edge. */
function spanMilesToFitPoints(points: GeoPoint[], paddingMultiple = 1.3): number {
  if (points.length === 0) return 1;
  const c = centroid(points);
  const maxDist = Math.max(...points.map((p) => haversineMiles(c, p)));
  return Math.max(0.5, maxDist * 2 * paddingMultiple);
}

/**
 * Where the camera should land after tapping a group label (2026-08, fixing
 * a real user report: tapping "The Cheshire Set" didn't visibly zoom in).
 * The bug: a whole-metro group label only ever appears once every member
 * district is *already* comfortably on screen — so naively fitting bounds
 * to exactly those members computes a span barely different from (sometimes
 * wider than) the one already showing, and the tap reads as doing nothing.
 * This guarantees a real zoom-in: whichever is *tighter* of (a) a bounds-fit
 * around the group's members, or (b) half the current visible span — so a
 * small, genuinely local group (two adjacent districts) still gets a clean
 * "fit everyone" zoom, while a wide whole-metro group is guaranteed to
 * visibly zoom in even if that means its most outlying member ends up just
 * outside the immediate frame (a pan away, not a re-tap away).
 */
export function groupTapCameraTarget(
  members: District[],
  currentZoomLevel: number,
  viewportWidthPx: number
): { center: GeoPoint; zoomLevel: number } {
  const points = members.map((d) => ({ lat: d.lat, lon: d.lon }));
  const center = centroid(points);
  const requiredSpan = spanMilesToFitPoints(points);
  const currentSpan = zoomLevelToSpanMiles(currentZoomLevel, center.lat, viewportWidthPx);
  const targetSpan = Math.min(requiredSpan, currentSpan * 0.5);
  return { center, zoomLevel: spanMilesToZoomLevel(targetSpan, center.lat, viewportWidthPx) };
}

function inBounds(point: GeoPoint, bounds: GeoBounds): boolean {
  return (
    point.lat <= bounds.ne.lat &&
    point.lat >= bounds.sw.lat &&
    point.lon <= bounds.ne.lon &&
    point.lon >= bounds.sw.lon
  );
}

/** Districts whose lat/lon falls within the map's current real visible
 * bounds (from the SDK's own `getVisibleBounds`/`getBounds`) — same idea as
 * the old viewport-projection version, just fed a real bbox instead of a
 * hand-projected one. */
export function districtsInBounds(bounds: GeoBounds, districts: District[] = DISTRICTS): District[] {
  return districts.filter((d) => inBounds({ lat: d.lat, lon: d.lon }, bounds));
}

/**
 * Real "BEYOND THE EDGE" coverage boundary (2026-08, at explicit user
 * request, replacing the old floating text card triggered by a sampled
 * viewport-fraction heuristic). Same coverage distance the old heuristic
 * used (5.5mi from the nearest seed district), but now a real geometry:
 * one buffered coverage shape per metro (buffering a MultiPoint of that
 * metro's district coordinates unions each district's own circle
 * automatically — no separate convex-hull-then-buffer or manual union
 * step needed), rendered as an actual glowing perimeter line, with a
 * `mask()`'d fill hiding the map everywhere outside it. No real District
 * boundary polygon exists in the data model yet, so this is still a
 * distance-buffer approximation, not hand-drawn geometry — just a real
 * polygon now instead of a per-frame sampled fraction.
 */
export const COVERAGE_RADIUS_MILES = 5.5;

function computeCoveragePolygons(): Feature<Polygon | MultiPolygon>[] {
  const metros = Array.from(new Set(DISTRICTS.map((d) => d.metro))) as MetroId[];
  return metros
    .map((metro) => {
      const points = DISTRICTS.filter((d) => d.metro === metro).map((d) => [d.lon, d.lat]);
      return buffer(multiPoint(points), COVERAGE_RADIUS_MILES, { units: 'miles' });
    })
    .filter((f): f is Feature<Polygon | MultiPolygon> => !!f);
}

/** One coverage polygon per metro — the source for the glowing perimeter
 * `LineLayer` (its outline) on both map.tsx and map.web.tsx. */
export const COVERAGE_POLYGONS: Feature<Polygon | MultiPolygon>[] = computeCoveragePolygons();

/** The world exterior with every metro's coverage polygon punched out as a
 * hole — the source for the mask `FillLayer` that hides the basemap
 * everywhere outside Curia's coverage. Filled with the app's own background
 * color at render time so "outside" reads as empty, not just dimmed. */
export const COVERAGE_MASK: Feature<Polygon> = mask(featureCollection(COVERAGE_POLYGONS));

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

const METROS_WITH_DISTRICTS = ['manchester', 'cheshire'] as const;

/**
 * On-screen diameter (px) below which a cluster of district points reads as
 * one tight blob — grouping is only worth doing below this; above it there's
 * real room to label each district on its own (2026-08, at explicit user
 * report against a real Manchester screenshot: "it is being too strict on
 * when it will show a district name instead of just clumping them
 * together... at this level of zoom there is enough room to label the
 * districts individually"). Previously grouping was driven purely by
 * whether every point in a cluster fell inside the current viewport bounds
 * — true even when zoomed in far enough that the points were already
 * visibly spread across most of the screen, which is exactly the bug
 * reported. ~140px is comfortably under a short district-name label's own
 * rendered width, so a cluster this tight really would overlap if labelled
 * individually; verified against the reported screenshot's own numbers
 * (Manchester's 5 districts span roughly 1.3mi; at that screenshot's ~6.7mi
 * visible span they render ~250px apart — well above this threshold, so
 * they now correctly ungroup, while the same cluster at a whole-region
 * ~80mi span renders ~20px apart and still correctly collapses).
 */
const LABEL_GROUP_COLLAPSE_PX = 140;

/** Real on-screen diameter of a set of district points at the current
 * zoom/viewport — twice the farthest point's distance from the centroid,
 * converted from miles to pixels via the same span math the rest of this
 * module uses for zoom<->distance conversion. */
function pixelDiameter(points: GeoPoint[], zoomLevel: number, viewportWidthPx: number): number {
  if (points.length < 2) return 0;
  const c = centroid(points);
  const radiusMiles = Math.max(...points.map((p) => haversineMiles(c, p)));
  const spanMiles = zoomLevelToSpanMiles(zoomLevel, c.lat, viewportWidthPx);
  if (spanMiles <= 0) return Infinity;
  return ((radiusMiles * 2) / spanMiles) * viewportWidthPx;
}

function districtLabel(d: District): MapLabel {
  return {
    key: `district:${d.id}`,
    label: d.name,
    kind: 'district',
    districtIds: [d.id],
    center: { lat: d.lat, lon: d.lon },
    accentColor: d.accentColor,
  };
}

/**
 * Implements CLAUDE.md's DistrictGroup naming rule directly against real
 * seed data: a cluster takes a group's own metro-wide name only when every
 * district in that metro is currently visible AND the cluster is still
 * visually tight at the current zoom (see LABEL_GROUP_COLLAPSE_PX above); a
 * partial subset (or a metro-wide set that's spread out enough to not need
 * collapsing) gets the subset's own group label (e.g. "Hale & Altrincham")
 * if that subset is itself still tight, otherwise every district in it gets
 * its own label; anything left over shows its own individual district
 * name. Hard rule 6: group labels are zoom-only — callers must never route
 * a `kind: 'group'` label to a detail page, only real `kind: 'district'`
 * entries carry a real district id to push `/district/[id]` with.
 */
export function groupVisibleDistricts(
  visible: District[],
  zoomLevel: number,
  viewportWidthPx: number
): MapLabel[] {
  const consumed = new Set<string>();
  const labels: MapLabel[] = [];
  const asPoints = (districts: District[]): GeoPoint[] => districts.map((d) => ({ lat: d.lat, lon: d.lon }));
  const isTight = (districts: District[]) =>
    pixelDiameter(asPoints(districts), zoomLevel, viewportWidthPx) < LABEL_GROUP_COLLAPSE_PX;

  METROS_WITH_DISTRICTS.forEach((metro) => {
    const metroDistricts = DISTRICTS.filter((d) => d.metro === metro);
    const visibleIds = new Set(visible.map((d) => d.id));
    const allVisible = metroDistricts.length > 0 && metroDistricts.every((d) => visibleIds.has(d.id));
    if (allVisible && isTight(metroDistricts)) {
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
    if (isTight(members)) {
      labels.push({
        key: `group:${group.name}`,
        label: group.name,
        kind: 'group',
        districtIds: group.districtIds,
        center: centroid(members),
        accentColor: members[0]?.accentColor ?? '#C0A062',
      });
    } else {
      members.forEach((d) => labels.push(districtLabel(d)));
    }
  }

  visible.filter((d) => !consumed.has(d.id)).forEach((d) => labels.push(districtLabel(d)));

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

/**
 * "Make districts feel alive" (2026-08, at explicit user request): a
 * per-district glow, colored by that district's own `accentColor` (never
 * the same colour twice — see theme/tokens.ts), intensity driven by real
 * `districtLiveliness`. Two registers, switched by zoom:
 * - Zoomed out: a soft glowing area over the district itself
 *   (`districtGlowFeatureCollection` below, rendered as a blurred
 *   CircleLayer).
 * - Zoomed in: the district's own streets glow (`districtLocalAreaPolygon`
 *   below, used as a `within` filter against the basemap's own real road
 *   data — see map.tsx/map.web.tsx's ROAD_SOURCE_ID/ROAD_SOURCE_LAYER doc
 *   comment for why those two are inferred from Mapbox's well-documented
 *   Streets v8 schema rather than verified live).
 * `DISTRICT_DETAIL_ZOOM_THRESHOLD` is the switch point between the two.
 */
export const DISTRICT_DETAIL_ZOOM_THRESHOLD = 14;

/** Small "walk around the neighbourhood" radius — deliberately much
 * tighter than COVERAGE_RADIUS_MILES (which represents Curia's whole
 * service catchment), since this is the area whose real streets should
 * glow for one specific district, not the whole metro. */
const DISTRICT_LOCAL_AREA_RADIUS_MILES = 0.7;

/** Maps a raw 8-99 liveliness score to a 0-1 range for opacity/blur
 * expressions, with a floor so a quiet district dims rather than
 * disappears — a glow that vanishes entirely reads as "broken," not
 * "quiet." */
export function normalizeLiveliness(score: number): number {
  const t = Math.max(0, Math.min(1, (score - 8) / (99 - 8)));
  return 0.22 + t * 0.78;
}

export interface DistrictGlowProperties {
  id: string;
  accentColor: string;
  livelinessNorm: number;
}

/** One Point feature per district, carrying its own colour and current
 * liveliness as properties — the data-driven source for the zoomed-out
 * area-glow CircleLayer. Rebuilt (not cached) whenever context changes;
 * callers own memoizing this against their own day/band state. */
export function districtGlowFeatureCollection(
  day: string,
  band: string,
  districts: District[] = DISTRICTS
): FeatureCollection<Point, DistrictGlowProperties> {
  return featureCollection(
    districts.map((d) =>
      point(
        [d.lon, d.lat],
        {
          id: d.id,
          accentColor: d.accentColor,
          livelinessNorm: normalizeLiveliness(districtLiveliness(d, day, band)),
        },
        { id: d.id }
      )
    )
  );
}

/** A district's own small local-area polygon — the `within` filter
 * geometry that scopes the real-road glow layer to just this district's
 * streets, not the whole metro's. */
export function districtLocalAreaPolygon(district: District): Feature<Polygon | MultiPolygon> {
  const buffered = buffer(point([district.lon, district.lat]), DISTRICT_LOCAL_AREA_RADIUS_MILES, {
    units: 'miles',
  });
  if (!buffered) {
    throw new Error(`Failed to buffer local area polygon for district "${district.id}"`);
  }
  return buffered;
}

/** Precomputed once (district geometry is static, no need to re-buffer on
 * every render) — every real district's own local-area polygon, keyed by
 * id, for the per-district street-glow layers. */
export const DISTRICT_LOCAL_AREAS: Record<string, Feature<Polygon | MultiPolygon>> = Object.fromEntries(
  DISTRICTS.map((d) => [d.id, districtLocalAreaPolygon(d)])
);
