import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import type { LayoutChangeEvent } from 'react-native';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import mapboxgl from 'mapbox-gl';
import { Button, Card, ContextStrip, EmblemButton, Kicker } from '../../components/curia';
import { rankVenues, resolveContext } from '../../lib/scoring/rank-venues';
import { buildMatchmakingInputFromSession } from '../../lib/scoring/session-input';
import { DISTRICTS, VENUES } from '../../lib/data/seed';
import {
  COVERAGE_MASK,
  COVERAGE_POLYGONS,
  DISTRICT_DETAIL_ZOOM_THRESHOLD,
  DISTRICT_LOCAL_AREAS,
  MAP_HOME,
  MAX_ZOOM_LEVEL,
  MIN_ZOOM_LEVEL,
  boundsForPoints,
  groupTapCameraTarget,
  clampZoomLevel,
  districtGlowFeatureCollection,
  districtLiveliness,
  districtsInBounds,
  groupVisibleDistricts,
  normalizeLiveliness,
  radiusMilesToZoomLevel,
  spanMilesToRadiusMiles,
  zoomLevelToSpanMiles,
} from '../../lib/map/geo';
import type { GeoBounds, GeoPoint, MapLabel } from '../../lib/map/geo';
import { moodTileOptionsForCategory } from '../../lib/map/mood-tiles';
import { useSession } from '../../lib/state/session';
import { fetchWeather } from '../../lib/weather/forecast';
import { color, font, radius, spacing } from '../../theme';
import type { DayTimeBand, TileCategory, Venue } from '../../types/models';

/**
 * Web counterpart to (tabs)/map.tsx. @rnmapbox/maps is native-only (see
 * src/lib/map/mapbox-config.web.ts), so the web build renders the real
 * basemap with mapbox-gl (the JS SDK) directly instead — same Mapbox
 * account/token, same dark style, hand-built markers instead of
 * MarkerView/PointAnnotation since mapbox-gl has its own Marker API. All the
 * business logic (ranking, mood/context, Hard rule 6 tap behaviour, the
 * BEYOND THE EDGE card) is identical to the native screen — see that file's
 * doc comment for what changed and why.
 *
 * Markers are built with plain DOM elements (mapbox-gl's Marker takes an
 * HTMLElement, not a React node) styled from the same theme tokens the
 * native screen's StyleSheet uses, so the two stay visually aligned without
 * a shared component (StyleSheet/Pressable can't cross into a raw DOM
 * marker element).
 */

const MAPBOX_GL_VERSION = '3.4.1';
const MAPBOX_CSS_URL = `https://api.mapbox.com/mapbox-gl-js/v${MAPBOX_GL_VERSION}/mapbox-gl.css`;
const DARK_STYLE_URL = 'mapbox://styles/mapbox/dark-v11';

/**
 * The zoomed-in street glow restyles the basemap's own real road data.
 * `composite`/`road` are the well-documented Mapbox Streets v8 source
 * id/source-layer name every core style (including dark-v11) uses — the
 * same assumption map.tsx makes, but here it doesn't have to stay just an
 * assumption: `resolveRoadSourceLayer` below inspects the actually-loaded
 * style for a real road layer and uses whatever it finds, falling back to
 * these only if that inspection fails. */
const ROAD_SOURCE_ID_FALLBACK = 'composite';
const ROAD_SOURCE_LAYER_FALLBACK = 'road';

function resolveRoadSourceLayer(map: mapboxgl.Map): { source: string; sourceLayer: string } {
  try {
    const layers = (map.getStyle()?.layers ?? []) as Array<{ source?: string; 'source-layer'?: string }>;
    const roadLayer = layers.find((l) => l['source-layer'] === ROAD_SOURCE_LAYER_FALLBACK);
    if (roadLayer?.source && roadLayer['source-layer']) {
      return { source: roadLayer.source, sourceLayer: roadLayer['source-layer'] };
    }
  } catch {
    // Fall through to the documented default.
  }
  return { source: ROAD_SOURCE_ID_FALLBACK, sourceLayer: ROAD_SOURCE_LAYER_FALLBACK };
}

/**
 * Mapbox's own basemap place-name labels (neighbourhood/settlement tier —
 * "Beverly Hills," "The Flats," etc.) and POI labels visually clash with
 * our own district labels and venue pins (2026-08, at explicit user
 * report: "district names and the map names... fighting against each
 * other and overlapping"). Curia's own labels already carry more (real
 * liveliness, accent colour, tap-to-navigate) than Mapbox's generic ones,
 * so this hides the basemap's competing layers rather than fighting for
 * space with them. Street name labels stay — those add realism without
 * competing with district identity. Starts from the well-documented,
 * stable Mapbox Streets v8 layer ids every core style uses, then also
 * pattern-matches any other symbol layer whose id looks like a
 * settlement/POI label, in case dark-v11's exact ids ever drift — same
 * "verify against the loaded style, don't just trust the convention"
 * approach as resolveRoadSourceLayer above. */
const COMPETING_LABEL_LAYER_IDS = [
  'settlement-major-label',
  'settlement-minor-label',
  'settlement-subdivision-label',
  'poi-label',
];

function hideCompetingMapLabels(map: mapboxgl.Map) {
  try {
    const layers = map.getStyle()?.layers ?? [];
    const idsToHide = new Set(COMPETING_LABEL_LAYER_IDS);
    layers.forEach((l) => {
      if (l.type !== 'symbol') return;
      const looksLikeCompetingLabel = /settlement|poi/i.test(l.id) && /label/i.test(l.id);
      if (idsToHide.has(l.id) || looksLikeCompetingLabel) {
        map.setLayoutProperty(l.id, 'visibility', 'none');
      }
    });
  } catch {
    // Best-effort — worst case Mapbox's own place labels stay visible.
  }
}

function ensureMapboxCss() {
  if (typeof document === 'undefined') return;
  if (document.querySelector(`link[data-curia-mapbox-css]`)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = MAPBOX_CSS_URL;
  link.setAttribute('data-curia-mapbox-css', 'true');
  document.head.appendChild(link);
}

/**
 * `mapboxgl.Marker` requires its element to be `position: absolute` (that's
 * how it applies the transform that puts a marker at its real map
 * coordinate) — normally supplied by mapbox-gl.css's own
 * `.mapboxgl-marker { position: absolute; top: 0; left: 0; }` rule. Found
 * via a real user report (2026-08): the CDN stylesheet link loading is not
 * reliable enough to depend on for this — when it's slow/blocked, markers
 * render in normal document flow instead of absolutely positioned, throwing
 * every marker (venue pins, district labels, the location dot) wildly off
 * from its real coordinate. `!important` here guarantees this rule wins
 * over both the CDN stylesheet (whether or not it loads) and any inline
 * style either mapbox-gl-js or this file's own buildXElement() functions
 * set on the marker root — positioning must never depend on network
 * conditions to a third-party CDN. */
function ensureMarkerPositioningFallback() {
  if (typeof document === 'undefined') return;
  if (document.querySelector('style[data-curia-marker-fix]')) return;
  const style = document.createElement('style');
  style.setAttribute('data-curia-marker-fix', 'true');
  style.textContent = `.mapboxgl-marker { position: absolute !important; top: 0 !important; left: 0 !important; }`;
  document.head.appendChild(style);
}

/** Keyframes for the real-location marker's live pulse (2026-08, at
 * explicit user request) — injected once, reused by every buildMeElement()
 * call, since mapbox-gl markers are plain DOM (no access to RN's Animated
 * or a shared stylesheet). Mirrors map.tsx's PulsingLocationDot. */
function ensurePulseKeyframes() {
  if (typeof document === 'undefined') return;
  if (document.querySelector('style[data-curia-pulse]')) return;
  const style = document.createElement('style');
  style.setAttribute('data-curia-pulse', 'true');
  style.textContent = `@keyframes curia-me-pulse { 0% { transform: scale(1); opacity: .55; } 100% { transform: scale(2.8); opacity: 0; } }`;
  document.head.appendChild(style);
}

// Real weather now comes from session.weather (Open-Meteo, via
// src/lib/weather/forecast.ts) — this band-keyed table is only the fallback
// shown while that fetch is pending or if it fails. Mirrors map.tsx.
const WEATHER_BY_BAND: Record<DayTimeBand, string> = {
  morning: '8° Overcast',
  afternoon: '14° Bright spells',
  evening: '11° Light rain',
  late: '9° Clear',
};

const BAND_META: { key: DayTimeBand; label: string; hours: string }[] = [
  { key: 'morning', label: 'Morning', hours: '7 – 12' },
  { key: 'afternoon', label: 'Afternoon', hours: '12 – 5' },
  { key: 'evening', label: 'Early evening', hours: '5 – 10' },
  { key: 'late', label: 'Late night', hours: '10 – 4' },
];

const WEEK_DAYS: { key: string; label: string }[] = [
  { key: 'monday', label: 'MON' },
  { key: 'tuesday', label: 'TUE' },
  { key: 'wednesday', label: 'WED' },
  { key: 'thursday', label: 'THU' },
  { key: 'friday', label: 'FRI' },
  { key: 'saturday', label: 'SAT' },
  { key: 'sunday', label: 'SUN' },
];

const CATEGORIES: TileCategory[] = ['Do', 'Drink', 'Eat'];

const ALL_DISTRICT_POINTS: GeoPoint[] = DISTRICTS.map((d) => ({ lat: d.lat, lon: d.lon }));

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatMiles(value: number): string {
  const n = value % 1 === 0 ? String(value) : value.toFixed(2).replace(/0$/, '');
  return `${n} ${value === 1 ? 'mile' : 'miles'}`;
}

function buildLabelElement(label: MapLabel, subText: string, onTap: () => void): HTMLDivElement {
  const el = document.createElement('div');
  el.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:3px;width:140px;cursor:pointer;';
  const title = document.createElement('div');
  title.textContent = label.label;
  title.style.cssText = `font-family:${label.kind === 'group' ? font.serif : font.serifRegular};font-size:${
    label.kind === 'group' ? 15 : 16
  }px;letter-spacing:${label.kind === 'group' ? 0.9 : 0.3}px;color:${color.textPrimaryBright};text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;`;
  el.appendChild(title);
  if (subText) {
    const sub = document.createElement('div');
    sub.textContent = subText;
    sub.style.cssText = `font-family:${font.sansMedium};font-size:9px;letter-spacing:1.6px;text-transform:uppercase;color:rgba(200,188,170,.75);text-align:center;white-space:nowrap;`;
    el.appendChild(sub);
  }
  el.addEventListener('click', onTap);
  return el;
}

function buildPinElement(rank: number, onTap: () => void): HTMLDivElement {
  const el = document.createElement('div');
  el.style.cssText = `width:28px;height:28px;border-radius:14px;border:1px solid rgba(192,160,98,.55);background:rgba(18,16,14,.88);display:flex;align-items:center;justify-content:center;cursor:pointer;`;
  const text = document.createElement('span');
  text.textContent = String(rank);
  text.style.cssText = `font-family:${font.sansMedium};font-size:11px;color:${color.goldLight};`;
  el.appendChild(text);
  el.addEventListener('click', onTap);
  return el;
}

function buildMeElement(): HTMLDivElement {
  ensurePulseKeyframes();
  const wrap = document.createElement('div');
  // No `position` set here deliberately — this element becomes the
  // `.mapboxgl-marker` root itself (mapbox-gl-js adds that class directly
  // to a custom `element`, doesn't wrap it), so `position: absolute` has to
  // come from ensureMarkerPositioningFallback()'s forced rule, not an
  // inline style here — an inline `position: relative` on this exact
  // element was the real bug behind the "no location/venue pins visible"
  // report: it silently overrode mapbox-gl-js's required absolute
  // positioning, throwing every marker's screen position off by hundreds
  // of pixels.
  wrap.style.cssText = 'width:40px;height:40px;display:flex;align-items:center;justify-content:center;';
  const ring = document.createElement('div');
  ring.style.cssText = `position:absolute;width:14px;height:14px;border-radius:7px;background:${color.weather};animation:curia-me-pulse 1.8s ease-out infinite;`;
  const dot = document.createElement('div');
  dot.style.cssText = `position:relative;width:14px;height:14px;border-radius:7px;background:${color.weather};border:2px solid ${color.baseVariants.b};`;
  wrap.appendChild(ring);
  wrap.appendChild(dot);
  return wrap;
}

export default function Map() {
  const router = useRouter();
  const session = useSession();
  const { context, mood } = session;

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const labelMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const pinMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const meMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const autoLocatedRef = useRef(false);
  // Lets the mount-only map effect below always call the current session's
  // setRadiusMiles without needing `session` in its dependency array (which
  // would tear down and recreate the whole map on every session change).
  const sessionRef = useRef(session);
  sessionRef.current = session;

  const [containerWidth, setContainerWidth] = useState(375);
  const [center, setCenter] = useState<GeoPoint>(session.location ?? MAP_HOME);
  const [zoomLevel, setZoomLevel] = useState(() =>
    radiusMilesToZoomLevel(session.radiusMiles, center.lat, containerWidth)
  );
  const [bounds, setBounds] = useState<GeoBounds | null>(null);
  const [moodSheetOpen, setMoodSheetOpen] = useState(false);
  const [ctxSheetOpen, setCtxSheetOpen] = useState(false);

  const onContainerLayout = useCallback((e: LayoutChangeEvent) => {
    setContainerWidth(e.nativeEvent.layout.width);
  }, []);

  // Mount the real Mapbox GL JS map once.
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    ensureMapboxCss();
    ensureMarkerPositioningFallback();
    mapboxgl.accessToken = process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? '';
    const initial = session.location ?? MAP_HOME;
    const initialWidth = mapContainerRef.current.clientWidth || containerWidth;
    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: DARK_STYLE_URL,
      center: [initial.lon, initial.lat],
      zoom: radiusMilesToZoomLevel(sessionRef.current.radiusMiles, initial.lat, initialWidth),
      minZoom: MIN_ZOOM_LEVEL,
      maxZoom: MAX_ZOOM_LEVEL,
      attributionControl: true,
    });
    mapRef.current = map;

    const syncFromCamera = () => {
      const c = map.getCenter();
      setCenter({ lat: c.lat, lon: c.lng });
      const zoom = map.getZoom();
      setZoomLevel(zoom);
      const b = map.getBounds();
      if (b) {
        setBounds({
          ne: { lat: b.getNorth(), lon: b.getEast() },
          sw: { lat: b.getSouth(), lon: b.getWest() },
        });
      }
      // Zooming the map is another way to set the shared search radius
      // (2026-08, at explicit user request) — half the visible span, the
      // same shared value List's slider writes (Hard rule 5).
      const width = mapContainerRef.current?.clientWidth || containerWidth;
      sessionRef.current.setRadiusMiles(spanMilesToRadiusMiles(zoomLevelToSpanMiles(zoom, c.lat, width)));
      // The camera's current center is the shared search origin — see
      // session.tsx's searchOrigin doc comment. Mirrors map.tsx.
      sessionRef.current.setSearchOrigin({ lat: c.lat, lon: c.lng });
    };
    // BEYOND THE EDGE (2026-08): a real coverage boundary instead of a
    // floating text card — everywhere outside Curia's covered metros is
    // masked to the app's own background (reads as empty, not just dimmed),
    // with a glowing gold perimeter marking the edge. See
    // src/lib/map/geo.ts's COVERAGE_MASK/COVERAGE_POLYGONS doc comment.
    // Sources/layers can only be added once the style has loaded, hence its
    // own 'load' listener rather than folding into syncFromCamera (which
    // fires on every moveend too).
    const addCoverageLayers = () => {
      if (map.getSource('coverage-mask-source')) return;
      map.addSource('coverage-mask-source', { type: 'geojson', data: COVERAGE_MASK });
      map.addLayer({
        id: 'coverage-mask-fill',
        type: 'fill',
        source: 'coverage-mask-source',
        paint: { 'fill-color': color.baseVariants.b, 'fill-opacity': 0.94 },
      });
      map.addSource('coverage-outline-source', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: COVERAGE_POLYGONS },
      });
      map.addLayer({
        id: 'coverage-glow-outer',
        type: 'line',
        source: 'coverage-outline-source',
        paint: { 'line-color': color.gold, 'line-width': 14, 'line-blur': 14, 'line-opacity': 0.18 },
      });
      map.addLayer({
        id: 'coverage-glow-mid',
        type: 'line',
        source: 'coverage-outline-source',
        paint: { 'line-color': color.gold, 'line-width': 7, 'line-blur': 6, 'line-opacity': 0.35 },
      });
      map.addLayer({
        id: 'coverage-glow-core',
        type: 'line',
        source: 'coverage-outline-source',
        paint: { 'line-color': color.goldLight, 'line-width': 2, 'line-opacity': 0.9 },
      });
    };
    // "Make districts feel alive" (2026-08, at explicit user request): each
    // district's own glow, coloured by its accentColor, intensity from its
    // real current liveliness — a soft area glow zoomed out, the district's
    // own real streets glowing zoomed in. Initial liveliness comes from
    // whatever context is live at mount; the reactive effect below keeps it
    // in sync as day/band changes afterward.
    const addDistrictGlowLayers = () => {
      if (map.getSource('district-glow-source')) return;
      const initialResolved = resolveContext(sessionRef.current.context);
      map.addSource('district-glow-source', {
        type: 'geojson',
        data: districtGlowFeatureCollection(initialResolved.day, initialResolved.band),
      });
      map.addLayer({
        id: 'district-area-glow',
        type: 'circle',
        source: 'district-glow-source',
        maxzoom: DISTRICT_DETAIL_ZOOM_THRESHOLD,
        paint: {
          'circle-color': ['get', 'accentColor'],
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, 40, DISTRICT_DETAIL_ZOOM_THRESHOLD, 170],
          'circle-blur': 0.9,
          'circle-opacity': ['*', ['get', 'livelinessNorm'], 0.45],
        },
      });

      const { source: roadSource, sourceLayer: roadSourceLayer } = resolveRoadSourceLayer(map);
      DISTRICTS.forEach((d) => {
        try {
          map.addLayer({
            id: `street-glow-${d.id}`,
            type: 'line',
            source: roadSource,
            'source-layer': roadSourceLayer,
            minzoom: DISTRICT_DETAIL_ZOOM_THRESHOLD,
            filter: ['within', DISTRICT_LOCAL_AREAS[d.id]] as unknown as mapboxgl.ExpressionSpecification,
            paint: {
              'line-color': d.accentColor,
              'line-width': 2.5,
              'line-blur': 3,
              'line-opacity': normalizeLiveliness(districtLiveliness(d, initialResolved.day, initialResolved.band)) * 0.85,
            },
          });
        } catch {
          // Best-effort: if roadSource/roadSourceLayer turns out wrong for
          // this style after all, this specific district's street glow just
          // doesn't render — nothing else on the map is affected.
        }
      });
    };
    const hideCompetingLabels = () => hideCompetingMapLabels(map);
    map.on('load', syncFromCamera);
    map.on('load', addCoverageLayers);
    map.on('load', addDistrictGlowLayers);
    map.on('load', hideCompetingLabels);
    map.on('moveend', syncFromCamera);

    return () => {
      map.off('load', syncFromCamera);
      map.off('load', addCoverageLayers);
      map.off('load', addDistrictGlowLayers);
      map.off('load', hideCompetingLabels);
      map.off('moveend', syncFromCamera);
      map.remove();
      mapRef.current = null;
    };
    // Intentionally mount-only — session.location is read once for the
    // initial camera position; the effect below handles flying to it once
    // resolved, and user gestures own the camera after that.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fly to the real device location the first time it resolves, once only.
  useEffect(() => {
    if (session.location && !autoLocatedRef.current && mapRef.current) {
      autoLocatedRef.current = true;
      mapRef.current.flyTo({ center: [session.location.lon, session.location.lat], duration: 500 });
    }
  }, [session.location]);

  const resolved = resolveContext(context);

  // Keep the district glow in sync as context changes (the context sheet,
  // or "now" ticking forward on a re-render) — the layers themselves are
  // created once on mount, but their liveliness-driven color/opacity data
  // has to be pushed on every change after that.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const glowSource = map.getSource('district-glow-source') as mapboxgl.GeoJSONSource | undefined;
    glowSource?.setData(districtGlowFeatureCollection(resolved.day, resolved.band));
    DISTRICTS.forEach((d) => {
      try {
        map.setPaintProperty(
          `street-glow-${d.id}`,
          'line-opacity',
          normalizeLiveliness(districtLiveliness(d, resolved.day, resolved.band)) * 0.85
        );
      } catch {
        // Layer doesn't exist yet (style still loading) or never got
        // created (road source/layer lookup failed) — nothing to update.
      }
    });
  }, [resolved.day, resolved.band]);
  const liveNow = resolveContext({ now: true });
  // Real-time-now reference weather for the context sheet's "PLANNING FOR"
  // state (`nowSub` below) — Map-screen UI only, not a ranking input (that's
  // `session.weather`, wired into matchInput's context override below), so
  // it stays local state here rather than shared session state. Mirrors
  // map.tsx's identical effect.
  const [liveWeatherReal, setLiveWeatherReal] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const result = await fetchWeather(session.location ?? MAP_HOME, liveNow.day, liveNow.band);
      if (!cancelled) setLiveWeatherReal(result);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.location]);
  const weather = session.weather ?? WEATHER_BY_BAND[resolved.band];
  const liveWeather = liveWeatherReal ?? WEATHER_BY_BAND[liveNow.band];
  const bandMeta = BAND_META.find((b) => b.key === resolved.band) ?? BAND_META[2];
  const nowTimeLabel = useMemo(
    () => new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
    []
  );

  const moodFilter = useMemo(() => {
    if (!mood?.category) return undefined;
    return { category: mood.category, tileIds: mood.tileIds, subPreferences: [] as string[] };
  }, [mood]);

  // `context.weather` is synthesized here from the real fetched
  // `session.weather`, not persisted on session.context itself (see that
  // effect's own doc comment on why) — this is what rank-venues.ts's
  // scoreWeather() actually reads (`input.context.weather`), previously
  // always undefined. location is session.searchOrigin, not
  // session.location — ranking follows wherever the camera is centered.
  // Mirrors map.tsx.
  const matchInput = useMemo(
    () =>
      buildMatchmakingInputFromSession(session, {
        context: { ...context, weather: session.weather ?? undefined },
        moodFilter,
        radiusMiles: session.radiusMiles,
        location: session.searchOrigin,
      }),
    [session, context, moodFilter]
  );

  const result = useMemo(() => rankVenues(matchInput, VENUES, DISTRICTS), [matchInput]);
  const ranked = result.ranked;
  const topRanked = ranked.slice(0, 4);
  const topRankedVenues = useMemo(
    () =>
      topRanked
        .map((r, idx) => {
          const venue = VENUES.find((v) => v.id === r.venueId);
          return venue ? { rank: idx + 1, venue } : null;
        })
        .filter((v): v is { rank: number; venue: Venue } => !!v),
    [topRanked]
  );

  const labels = useMemo<MapLabel[]>(() => {
    if (!bounds) return [];
    const width = mapContainerRef.current?.clientWidth || containerWidth;
    return groupVisibleDistricts(districtsInBounds(bounds), zoomLevel, width);
  }, [bounds, zoomLevel, containerWidth]);

  // Rebuild district/group label markers whenever the visible set changes.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    labelMarkersRef.current.forEach((m) => m.remove());
    labelMarkersRef.current = labels.map((label) => {
      // 2026-08 concierge positioning pass: a raw "NN ALIVE" percentage on
      // every district pin read as showing the calculation, not the
      // judgment (labelLiveliness/districtLiveliness still drive the real
      // glow intensity on the map itself — see addDistrictGlowLayers/the
      // liveliness effect below, untouched). The group label's "N
      // DISTRICTS · ZOOM" stays: that's a real navigation hint (Hard rule
      // 6), not a stat.
      const subText = label.kind === 'group' ? `${label.districtIds.length} DISTRICTS · ZOOM` : '';
      const el = buildLabelElement(label, subText, () => onTapLabelRef.current(label));
      return new mapboxgl.Marker({ element: el, anchor: 'top' })
        .setLngLat([label.center.lon, label.center.lat])
        .addTo(map);
    });
    return () => {
      labelMarkersRef.current.forEach((m) => m.remove());
      labelMarkersRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [labels, resolved.day, resolved.band]);

  // Rebuild venue pin markers whenever the ranked top set changes.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    pinMarkersRef.current.forEach((m) => m.remove());
    pinMarkersRef.current = topRankedVenues.map(({ rank, venue }) => {
      const el = buildPinElement(rank, () => router.push(`/venue/${venue.id}`));
      return new mapboxgl.Marker({ element: el, anchor: 'center' })
        .setLngLat([venue.lon, venue.lat])
        .addTo(map);
    });
    return () => {
      pinMarkersRef.current.forEach((m) => m.remove());
      pinMarkersRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topRankedVenues]);

  // "me" marker — only when a real device fix exists (never the demo point).
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (meMarkerRef.current) {
      meMarkerRef.current.remove();
      meMarkerRef.current = null;
    }
    if (session.location) {
      meMarkerRef.current = new mapboxgl.Marker({ element: buildMeElement(), anchor: 'center' })
        .setLngLat([session.location.lon, session.location.lat])
        .addTo(map);
    }
  }, [session.location]);

  const moodOn = !!mood?.category;
  const selectedTileIds = mood?.tileIds ?? [];
  const moodCategoryTiles = mood?.category ? moodTileOptionsForCategory(mood.category) : [];
  const selectedTileLabels = moodCategoryTiles
    .filter((t) => selectedTileIds.includes(t.tileId))
    .map((t) => t.label);
  const moodKicker = moodOn ? 'JUST FOR TONIGHT' : 'IN THE MOOD TO';
  const moodLabel = !moodOn
    ? 'Do · Drink · Eat'
    : selectedTileLabels.length
      ? `${mood?.category} · ${selectedTileLabels[0]}${selectedTileLabels.length > 1 ? ` +${selectedTileLabels.length - 1}` : ''}`
      : (mood?.category ?? '');
  const moodNote = !mood?.category
    ? 'Pick one for tonight only. Your saved preferences stay exactly as they are.'
    : !moodCategoryTiles.length
      ? 'Nothing narrower to offer in this category yet.'
      : selectedTileIds.length
        ? 'Refine below if you know what you are after, or leave it broad.'
        : 'Add a tile or two if you want to be more particular.';

  const radiusLabel = formatMiles(matchInput.radiusMiles);
  const sheetTitle = ranked.length
    ? `RANKED WITHIN ${radiusLabel.toUpperCase()} · ${ranked.length} ${ranked.length === 1 ? 'VENUE' : 'VENUES'}`
    : `NOTHING WITHIN ${radiusLabel.toUpperCase()}`;
  const sheetMeta = context.now
    ? 'NOW'
    : `${resolved.day.slice(0, 3).toUpperCase()} ${bandMeta.label.toUpperCase()}`;
  const emptyNote = moodOn
    ? `Nothing matching this mood inside ${radiusLabel}. Widen the search, or clear the mood to see everything you normally would.`
    : 'Nothing worth your evening inside this radius. Zoom out and we will widen the search.';

  const ctxKicker = context.now ? 'LIVE NOW' : 'PLANNING FOR';
  const ctxLabel = context.now
    ? `${capitalize(resolved.day)}, ${nowTimeLabel}`
    : `${capitalize(resolved.day)} · ${bandMeta.label}`;
  const nowSub = `${capitalize(liveNow.day)}, ${nowTimeLabel} · ${liveWeather}`;
  const ctxForecast = context.now
    ? `Live conditions: ${weather}. Terraces and rooftops are ranked down while the rain holds.`
    : `Forecast for ${capitalize(resolved.day)} ${bandMeta.label.toLowerCase()}: ${weather}. Outdoor rooms weighted accordingly.`;

  const initials = (session.user?.name ?? 'You')
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const zoomIn = () => {
    const next = clampZoomLevel(zoomLevel + 1);
    mapRef.current?.zoomTo(next, { duration: 250 });
  };
  const zoomOut = () => {
    const next = clampZoomLevel(zoomLevel - 1);
    mapRef.current?.zoomTo(next, { duration: 250 });
  };
  const locate = () => {
    // Recentres only — deliberately leaves zoom (and therefore the shared
    // search radius) untouched, so tapping "locate me" can't silently change
    // how wide a search you'd set up.
    const target = session.location ?? MAP_HOME;
    mapRef.current?.flyTo({ center: [target.lon, target.lat], duration: 400 });
  };
  const fitRegion = () => {
    const b = boundsForPoints(ALL_DISTRICT_POINTS);
    mapRef.current?.fitBounds(
      [
        [b.sw.lon, b.sw.lat],
        [b.ne.lon, b.ne.lat],
      ],
      { padding: 60, duration: 500 }
    );
  };

  const onTapLabel = useCallback(
    (label: MapLabel) => {
      if (label.kind === 'district') {
        // Hard rule 6: only a real district (its own id) ever routes to a
        // detail page.
        router.push(`/district/${label.districtIds[0]}`);
        return;
      }
      // Grouped labels ("The Golden Triangle", "Central Manchester", ...)
      // are zoom-only navigation aids — reframe the view to fit every
      // member, and never push a route. Uses groupTapCameraTarget (not a
      // plain fitBounds) — see that function's doc comment for why: a
      // whole-metro group label only ever shows once every member is
      // already on screen, so naively fitting bounds to those same members
      // barely moves the camera at all.
      const members = DISTRICTS.filter((d) => label.districtIds.includes(d.id));
      const width = mapContainerRef.current?.clientWidth || containerWidth;
      const { center: groupCenter, zoomLevel: groupZoom } = groupTapCameraTarget(members, zoomLevel, width);
      mapRef.current?.flyTo({ center: [groupCenter.lon, groupCenter.lat], zoom: groupZoom, duration: 450 });
    },
    [router, zoomLevel, containerWidth]
  );
  // Marker click handlers are attached once via buildLabelElement and can't
  // see later re-renders' onTapLabel closures directly, so route through a
  // ref that always points at the latest version.
  const onTapLabelRef = useRef(onTapLabel);
  onTapLabelRef.current = onTapLabel;

  const openCtx = () => setCtxSheetOpen(true);
  const closeCtx = () => setCtxSheetOpen(false);
  const setNow = () => session.setContext({ now: true });
  const chooseDay = (day: string) => session.setContext({ now: false, day, band: resolved.band });
  const chooseBand = (band: DayTimeBand) =>
    session.setContext({ now: false, day: resolved.day, band });

  const openMood = () => setMoodSheetOpen(true);
  const closeMood = () => setMoodSheetOpen(false);
  const clearMood = () => {
    session.clearMood();
    setMoodSheetOpen(false);
  };
  const chooseMoodCategory = (c: TileCategory) => session.setMoodCategory(c);
  const toggleMoodTile = (tileId: string) => session.toggleMoodTile(tileId);

  return (
    <View style={styles.container} onLayout={onContainerLayout}>
      <div ref={mapContainerRef} style={{ position: 'absolute', inset: 0 }} />

      <View style={styles.topStack}>
        <View style={styles.headerRow}>
          <View style={styles.ctxWrap}>
            <ContextStrip kicker={ctxKicker} label={ctxLabel} onPress={openCtx} />
          </View>
          <EmblemButton initials={initials} onPress={() => router.push('/profile')} />
        </View>

        <Pressable onPress={openMood} style={[styles.moodPill, moodOn && styles.moodPillActive]}>
          <View style={styles.moodTextCol}>
            <Text style={[styles.moodKicker, moodOn && styles.moodKickerActive]}>{moodKicker}</Text>
            <Text style={[styles.moodLabel, moodOn && styles.moodLabelActive]} numberOfLines={1}>
              {moodLabel}
            </Text>
          </View>
          {moodOn && (
            <Pressable onPress={clearMood} hitSlop={8}>
              <Text style={styles.moodClear}>×</Text>
            </Pressable>
          )}
        </Pressable>
      </View>

      {/* 2026-08 concierge positioning pass: this column is real map
          navigation (native pinch/scroll-zoom exists too, so these buttons
          are a backup, not the primary way to zoom) — kept, but quieter
          (styles.zoomBtn) and without the raw mile-span readout that used
          to sit under it, so it reads as a utility in the corner rather
          than a stat next to the curated content. */}
      <View style={styles.zoomCol}>
        <Pressable onPress={zoomIn} style={styles.zoomBtn}>
          <Text style={styles.zoomBtnText}>+</Text>
        </Pressable>
        <Pressable onPress={zoomOut} style={[styles.zoomBtn, styles.zoomBtnSpaced]}>
          <Text style={styles.zoomBtnText}>−</Text>
        </Pressable>
        <Pressable onPress={locate} style={[styles.zoomBtn, styles.zoomBtnSpaced]}>
          <Text style={styles.locateBtnText}>◎</Text>
        </Pressable>
        <Pressable onPress={fitRegion} style={[styles.zoomBtn, styles.zoomBtnSpaced]}>
          <Text style={styles.fitBtnText}>⤢</Text>
        </Pressable>
      </View>

      <Card tone="sheet" style={styles.sheet}>
        <View style={styles.sheetHandle} />
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle} numberOfLines={1}>
            {sheetTitle}
          </Text>
          <Text style={styles.sheetMeta}>{sheetMeta}</Text>
        </View>
        <View style={styles.sheetList}>
          {topRanked.map((r, idx) => {
            const venue = VENUES.find((v) => v.id === r.venueId);
            if (!venue) return null;
            const district = DISTRICTS.find((d) => d.id === venue.districtId);
            return (
              <Pressable
                key={r.venueId}
                onPress={() => router.push(`/venue/${venue.id}`)}
                style={styles.sheetRow}
              >
                <View style={styles.sheetRank}>
                  <Text style={styles.sheetRankText}>{idx + 1}</Text>
                </View>
                <View style={styles.sheetRowText}>
                  <Text style={styles.sheetVenueName} numberOfLines={1}>
                    {venue.name}
                  </Text>
                  <Text style={styles.sheetVenueMeta} numberOfLines={1}>
                    {(district?.name ?? '').toUpperCase()} · {venue.type}
                  </Text>
                </View>
              </Pressable>
            );
          })}
          {ranked.length === 0 && <Text style={styles.sheetEmpty}>{emptyNote}</Text>}
        </View>
      </Card>

      {moodSheetOpen && (
        <>
          <Pressable style={styles.backdrop} onPress={closeMood} />
          <Card tone="sheet" style={styles.modalSheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>I&apos;m in the mood to…</Text>
              <Pressable onPress={closeMood}>
                <Text style={styles.doneLabel}>DONE</Text>
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.categoryRow}>
                {CATEGORIES.map((c) => {
                  const on = mood?.category === c;
                  return (
                    <Pressable
                      key={c}
                      onPress={() => chooseMoodCategory(c)}
                      style={[styles.categoryChip, on && styles.categoryChipActive]}
                    >
                      <Text style={[styles.categoryChipText, on && styles.categoryChipTextActive]}>{c}</Text>
                    </Pressable>
                  );
                })}
              </View>
              {mood?.category && (
                <>
                  <Kicker style={styles.sectionKicker}>Narrow it (optional)</Kicker>
                  <View style={styles.tileWrap}>
                    {moodCategoryTiles.map((t) => {
                      const on = selectedTileIds.includes(t.tileId);
                      return (
                        <Pressable
                          key={t.tileId}
                          onPress={() => toggleMoodTile(t.tileId)}
                          style={[styles.tileChip, on && styles.tileChipActive]}
                        >
                          <Text style={[styles.tileChipText, on && styles.tileChipTextActive]}>{t.label}</Text>
                          <Text style={styles.tileChipCount}>{t.count}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </>
              )}
              <Text style={styles.moodNote}>{moodNote}</Text>
              {moodOn && (
                <Button
                  label="Clear and use my preferences"
                  variant="secondary"
                  onPress={clearMood}
                  style={styles.clearMoodBtn}
                />
              )}
            </ScrollView>
          </Card>
        </>
      )}

      {ctxSheetOpen && (
        <>
          <Pressable style={styles.backdrop} onPress={closeCtx} />
          <Card tone="sheet" style={styles.modalSheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>When are you going out?</Text>
              <Pressable onPress={closeCtx}>
                <Text style={styles.doneLabel}>DONE</Text>
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Pressable onPress={setNow} style={[styles.nowBtn, context.now && styles.nowBtnActive]}>
                <Text style={[styles.nowLabel, context.now && styles.nowLabelActive]}>NOW</Text>
                <Text style={[styles.nowSub, context.now && styles.nowLabelActive]}>{nowSub}</Text>
              </Pressable>
              <Kicker style={styles.sectionKicker}>Day</Kicker>
              <View style={styles.dayRow}>
                {WEEK_DAYS.map((d) => {
                  const on = !context.now && resolved.day === d.key;
                  return (
                    <Pressable
                      key={d.key}
                      onPress={() => chooseDay(d.key)}
                      style={[styles.dayChip, on && styles.dayChipActive]}
                    >
                      <Text style={[styles.dayChipText, on && styles.dayChipTextActive]}>{d.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <Kicker style={styles.sectionKicker}>Time</Kicker>
              <View style={styles.bandGrid}>
                {BAND_META.map((b) => {
                  const on = !context.now && resolved.band === b.key;
                  return (
                    <Pressable
                      key={b.key}
                      onPress={() => chooseBand(b.key)}
                      style={[styles.bandCell, on && styles.bandCellActive]}
                    >
                      <Text style={[styles.bandLabel, on && styles.bandLabelActive]}>{b.label}</Text>
                      <Text style={[styles.bandHours, on && styles.bandLabelActive]}>{b.hours}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <Text style={styles.forecastNote}>{ctxForecast}</Text>
            </ScrollView>
          </Card>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: color.baseVariants.b,
    overflow: 'hidden',
  },

  // See map.tsx's identical topStack doc comment: headerRow and moodPill
  // used to be two independently `position:'absolute'`-placed rows with a
  // hardcoded 58px gap, which overlapped once real weather strings/font
  // metrics pushed the context pill's real height past that guess.
  topStack: {
    position: 'absolute',
    top: 56,
    left: spacing.lg,
    right: spacing.lg,
    gap: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  ctxWrap: {
    flex: 1,
  },
  moodPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
    paddingVertical: 9,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.hairlineMax,
    backgroundColor: 'rgba(19,17,16,.78)',
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  moodPillActive: {
    borderColor: 'rgba(192,160,98,.55)',
    backgroundColor: 'rgba(192,160,98,.14)',
  },
  moodTextCol: {
    flexShrink: 1,
    gap: 4,
  },
  moodKicker: {
    fontFamily: font.sansRegular,
    fontSize: 8.5,
    letterSpacing: 2,
    color: color.textSecondary,
  },
  moodKickerActive: {
    color: color.gold,
  },
  moodLabel: {
    fontFamily: font.serifRegular,
    fontSize: 13,
    color: color.textSecondaryAlt,
  },
  moodLabelActive: {
    color: color.textPrimary,
  },
  moodClear: {
    fontFamily: font.sans,
    fontSize: 14,
    color: color.gold,
    paddingHorizontal: 2,
  },

  zoomCol: {
    position: 'absolute',
    right: spacing.lg,
    top: 168,
    alignItems: 'center',
  },
  zoomBtn: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(240,233,223,.08)',
    backgroundColor: 'rgba(19,17,16,.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomBtnSpaced: {
    marginTop: spacing.sm,
  },
  zoomBtnText: {
    fontFamily: font.sans,
    fontSize: 18,
    color: color.textPrimary,
  },
  locateBtnText: {
    fontFamily: font.sans,
    fontSize: 14,
    color: color.weather,
  },
  fitBtnText: {
    fontFamily: font.sans,
    fontSize: 13,
    color: color.textSecondary,
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: 300,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  sheetHandle: {
    width: 36,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(240,233,223,.2)',
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: spacing.sm,
  },
  sheetTitle: {
    fontFamily: font.sansRegular,
    fontSize: 10,
    letterSpacing: 2.2,
    color: color.gold,
    flexShrink: 1,
  },
  sheetMeta: {
    fontFamily: font.sans,
    fontSize: 10.5,
    letterSpacing: 1.2,
    color: color.textTertiary,
  },
  sheetList: {
    marginTop: spacing.xs + 2,
  },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: color.hairlineMin,
  },
  sheetRank: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(192,160,98,.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetRankText: {
    fontFamily: font.serifRegular,
    fontSize: 11,
    color: color.goldLight,
  },
  sheetRowText: {
    flex: 1,
    gap: 4,
  },
  sheetVenueName: {
    fontFamily: font.serifRegular,
    fontSize: 17,
    color: color.textPrimary,
  },
  sheetVenueMeta: {
    fontFamily: font.sans,
    fontSize: 9.5,
    letterSpacing: 1.4,
    color: color.textSecondary,
  },
  sheetEmpty: {
    fontFamily: font.serifRegular,
    fontSize: 14,
    fontStyle: 'italic',
    color: color.borderNeutral,
    paddingVertical: spacing.md,
  },

  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(11,10,9,.66)',
  },
  modalSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '82%',
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontFamily: font.serif,
    fontSize: 22,
    color: color.textPrimary,
  },
  doneLabel: {
    fontFamily: font.sans,
    fontSize: 11,
    letterSpacing: 2,
    color: color.textSecondary,
  },

  categoryRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  categoryChip: {
    flex: 1,
    paddingVertical: spacing.md + 2,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.hairlineMax,
    alignItems: 'center',
  },
  categoryChipActive: {
    borderColor: 'rgba(192,160,98,.55)',
    backgroundColor: 'rgba(192,160,98,.14)',
  },
  categoryChipText: {
    fontFamily: font.serifRegular,
    fontSize: 19,
    color: color.textSecondaryAlt,
  },
  categoryChipTextActive: {
    color: color.textPrimary,
  },

  sectionKicker: {
    marginTop: spacing.lg + 4,
  },

  tileWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginTop: spacing.md,
  },
  tileChip: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 7,
    paddingVertical: 10,
    paddingHorizontal: spacing.md + 1,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.hairlineMax,
  },
  tileChipActive: {
    borderColor: 'rgba(192,160,98,.5)',
    backgroundColor: 'rgba(192,160,98,.13)',
  },
  tileChipText: {
    fontFamily: font.sans,
    fontSize: 12.5,
    color: color.textSecondary,
  },
  tileChipTextActive: {
    color: color.goldLight,
  },
  tileChipCount: {
    fontFamily: font.sans,
    fontSize: 10,
    color: color.textTertiary,
  },

  moodNote: {
    fontFamily: font.sans,
    fontSize: 11.5,
    lineHeight: 18,
    color: color.textTertiary,
    marginTop: spacing.lg,
  },
  clearMoodBtn: {
    marginTop: spacing.md + 4,
  },

  nowBtn: {
    width: '100%',
    marginTop: spacing.lg,
    padding: spacing.md + 1,
    borderRadius: radius.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: color.hairlineMax,
  },
  nowBtnActive: {
    borderColor: color.gold,
    backgroundColor: 'rgba(192,160,98,.14)',
  },
  nowLabel: {
    fontFamily: font.sansRegular,
    fontSize: 13,
    letterSpacing: 2,
    color: color.textSecondaryAlt,
  },
  nowLabelActive: {
    color: color.goldLight,
  },
  nowSub: {
    fontFamily: font.sans,
    fontSize: 12,
    color: color.textSecondaryAlt,
    opacity: 0.85,
  },

  dayRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: spacing.md,
  },
  dayChip: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: color.hairlineMax,
    alignItems: 'center',
  },
  dayChipActive: {
    borderColor: 'rgba(192,160,98,.5)',
    backgroundColor: 'rgba(192,160,98,.12)',
  },
  dayChipText: {
    fontFamily: font.sans,
    fontSize: 10.5,
    letterSpacing: 1,
    color: color.textSecondary,
  },
  dayChipTextActive: {
    color: color.goldLight,
  },

  bandGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  bandCell: {
    width: '48%',
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.hairlineMax,
    gap: spacing.sm,
  },
  bandCellActive: {
    borderColor: 'rgba(192,160,98,.5)',
    backgroundColor: 'rgba(192,160,98,.12)',
  },
  bandLabel: {
    fontFamily: font.serifRegular,
    fontSize: 14,
    color: color.textSecondaryAlt,
  },
  bandLabelActive: {
    color: color.goldLight,
  },
  bandHours: {
    fontFamily: font.sans,
    fontSize: 10.5,
    letterSpacing: 1.4,
    color: color.textSecondaryAlt,
    opacity: 0.7,
  },

  forecastNote: {
    fontFamily: font.sans,
    fontSize: 12,
    lineHeight: 19,
    color: color.textSecondary,
    marginTop: spacing.lg - 4,
  },
});
