import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import type { LayoutChangeEvent } from 'react-native';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Mapbox, {
  Camera,
  CircleLayer,
  FillLayer,
  LineLayer,
  MapView,
  MarkerView,
  ShapeSource,
  SymbolLayer,
  type MapState,
} from '@rnmapbox/maps';
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
import type { DayTimeBand, TileCategory } from '../../types/models';

/**
 * Real Map screen. Renders the M3 scoring engine's actual output
 * (`rankVenues`) against a real `MatchmakingInput` built from live onboarding
 * state (`useSession()`, via `buildMatchmakingInputFromSession` — see
 * src/lib/scoring/session-input.ts).
 *
 * Map rendering: a real Mapbox `MapView` (2026-08, at explicit user request —
 * previously a credential gap per CLAUDE.md "Still genuinely open", now
 * unblocked with a real access token in .env). Replaces the earlier abstract
 * SVG line-and-dot render entirely — see src/lib/map/geo.ts's doc comment.
 * District/group label logic, Hard rule 6 tap behaviour, the ranked-venue
 * pins, and the BEYOND THE EDGE card all carry over unchanged; only *how*
 * they're drawn changed (real MarkerViews anchored to real coordinates,
 * instead of hand-projected pixels on a canvas). One deliberate drop: the
 * abstract map's decorative "glow" circles and dashed me-to-label connector
 * lines don't have a real-map equivalent worth building (a real basemap
 * already reads as visually rich on its own) — not replaced, not an
 * oversight.
 *
 * Device location: real (`session.location`, src/lib/state/session.tsx's
 * geolocation effect), falling back to the fixed `DEMO_LOCATION` demo point
 * while permission/fix is pending or denied — see that module's doc comment.
 * Weather: real (`session.weather`, src/lib/state/session.tsx's forecast
 * effect, backed by Open-Meteo — see src/lib/weather/forecast.ts), fetched
 * live for whatever day/band the context sheet resolves to. This band-keyed
 * table is now only the fallback shown while that fetch is pending or if it
 * fails (offline, date beyond Open-Meteo's forecast window).
 */

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

/** Dark style, one rung newer than the enum @rnmapbox/maps ships
 * (`Mapbox.StyleURL.Dark` = dark-v10) — passed as a plain style URL string
 * since `styleURL` accepts any string, not just the enum's members. */
const DARK_STYLE_URL = 'mapbox://styles/mapbox/dark-v11';

/**
 * The zoomed-in street glow restyles the *basemap's own* real road data
 * rather than drawing synthetic lines, so the glow actually sits on real
 * streets instead of floating disconnected from them. `composite`/`road`
 * are the source id/source-layer name every core Mapbox style (including
 * dark-v11) uses for its Mapbox Streets v8 road data — a well-documented,
 * stable public schema, but one this file can't verify live against a
 * running map (no way to introspect the loaded style from this API
 * surface the way map.web.tsx can via `map.getStyle()`). If this ever
 * turns out wrong, the failure mode is purely cosmetic — those specific
 * layers just render nothing, nothing else on the map breaks.
 */
const ROAD_SOURCE_ID = 'composite';
const ROAD_SOURCE_LAYER = 'road';

/**
 * Mapbox's own basemap place-name labels (neighbourhood/settlement tier —
 * "Beverly Hills," "The Flats," etc.) and POI labels visually clash with
 * our own district labels and venue pins (2026-08, at explicit user
 * report: "district names and the map names... fighting against each
 * other and overlapping"). Curia's own labels already carry more (real
 * liveliness, accent colour, tap-to-navigate) than Mapbox's generic ones,
 * so this hides the basemap's competing layers rather than fighting for
 * space with them. Street name labels stay — those add realism without
 * competing with district identity. Well-documented, stable Mapbox
 * Streets v8 layer ids used across every core style including dark-v11;
 * `existing` + `visibility:'none'` targets a layer already baked into the
 * style rather than creating a new one — if a name doesn't match (style
 * schema drift), that one hide is just a no-op, nothing else breaks.
 */
const COMPETING_LABEL_LAYER_IDS = [
  'settlement-major-label',
  'settlement-minor-label',
  'settlement-subdivision-label',
  'poi-label',
];

const ALL_DISTRICT_POINTS: GeoPoint[] = DISTRICTS.map((d) => ({ lat: d.lat, lon: d.lon }));

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/** Same register the prototype's own `miles()` helper uses (e.g. "15 miles",
 * "1 mile"). */
function formatMiles(value: number): string {
  const n = value % 1 === 0 ? String(value) : value.toFixed(2).replace(/0$/, '');
  return `${n} ${value === 1 ? 'mile' : 'miles'}`;
}

/** The real-location marker (2026-08, at explicit user request: "it should
 * pulse to show it is live") — a solid centre dot plus a translucent ring
 * that loops scale+fade outward, the same visual language most map apps use
 * for "this is a live GPS fix," not a static pin. Only ever rendered when
 * `session.location` is real (never for the DEMO_LOCATION fallback) — see
 * that field's doc comment in session.tsx. */
function PulsingLocationDot() {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(pulse, {
        toValue: 1,
        duration: 1800,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 2.8] });
  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0] });

  return (
    <View style={styles.meWrap} pointerEvents="none">
      <Animated.View style={[styles.mePulseRing, { transform: [{ scale }], opacity }]} />
      <View style={styles.meDot} />
    </View>
  );
}

export default function Map() {
  const router = useRouter();
  const session = useSession();
  const { context, mood } = session;

  const cameraRef = useRef<React.ElementRef<typeof Camera>>(null);
  const [containerWidth, setContainerWidth] = useState(375);
  const [center, setCenter] = useState<GeoPoint>(session.location ?? MAP_HOME);
  // Opens already zoomed to reflect the shared search radius (List's slider,
  // or a previous Map session) instead of a fixed default — see
  // radiusMilesToZoomLevel's doc comment.
  const [zoomLevel, setZoomLevel] = useState(() =>
    radiusMilesToZoomLevel(session.radiusMiles, center.lat, containerWidth)
  );
  const [bounds, setBounds] = useState<GeoBounds | null>(null);
  const [moodSheetOpen, setMoodSheetOpen] = useState(false);
  const [ctxSheetOpen, setCtxSheetOpen] = useState(false);
  const autoLocatedRef = useRef(false);

  const onContainerLayout = useCallback((e: LayoutChangeEvent) => {
    setContainerWidth(e.nativeEvent.layout.width);
  }, []);

  // Fly to the real device location the first time it resolves (shortly
  // after mount, once expo-location's permission/fix round-trip completes) —
  // but only once, so it doesn't fight the user's own subsequent panning.
  if (session.location && !autoLocatedRef.current) {
    autoLocatedRef.current = true;
    cameraRef.current?.setCamera({
      centerCoordinate: [session.location.lon, session.location.lat],
      animationDuration: 500,
    });
  }

  const onCameraChanged = useCallback(
    (state: MapState) => {
      const [lon, lat] = state.properties.center;
      setCenter({ lat, lon });
      setZoomLevel(state.properties.zoom);
      const [neLon, neLat] = state.properties.bounds.ne;
      const [swLon, swLat] = state.properties.bounds.sw;
      setBounds({ ne: { lat: neLat, lon: neLon }, sw: { lat: swLat, lon: swLon } });
      // Zooming the map is another way to set the shared search radius
      // (2026-08, at explicit user request) — half the visible span, same
      // shared value List's slider writes, so switching tabs still never
      // changes the answer (Hard rule 5).
      session.setRadiusMiles(spanMilesToRadiusMiles(zoomLevelToSpanMiles(state.properties.zoom, lat, containerWidth)));
      // The camera's current center is the shared search origin (2026-08,
      // at explicit user request — see session.tsx's searchOrigin doc
      // comment for the full reasoning: panning to Manchester should rank
      // against Manchester, while a plain zoom keeps ranking against real
      // location since the center never moved).
      session.setSearchOrigin({ lat, lon });
    },
    [session, containerWidth]
  );

  const resolved = resolveContext(context);
  const liveNow = resolveContext({ now: true });
  // The context sheet's "PLANNING FOR" state shows a real-time-now reference
  // line alongside the planned-day forecast (`nowSub` below) — this isn't a
  // ranking input (only `session.weather`, wired into matchInput's context
  // override further down, is), so it stays local Map-screen UI state rather
  // than shared session state, same as `nowTimeLabel`.
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

  // "Make districts feel alive" (2026-08, at explicit user request): each
  // district's own glow, colour from its accentColor, intensity from its
  // real current liveliness — recomputed whenever the resolved day/band
  // changes (context sheet, or "now" ticking forward on a re-render).
  const districtGlow = useMemo(
    () => districtGlowFeatureCollection(resolved.day, resolved.band),
    [resolved.day, resolved.band]
  );
  const nowTimeLabel = useMemo(
    () => new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
    []
  );

  const moodFilter = useMemo(() => {
    if (!mood?.category) return undefined;
    return { category: mood.category, tileIds: mood.tileIds, subPreferences: [] as string[] };
  }, [mood]);

  // context, mood, radiusMiles, and location all come from shared session
  // state (src/lib/state/session.tsx), not local/fixed values, so Map and
  // List can never drift apart on any of them (Hard rule 5). `context.weather`
  // is populated here (not persisted on session.context itself — see that
  // effect's own doc comment on why) from the real fetched `session.weather`,
  // which is what rank-venues.ts's scoreWeather() actually reads
  // (`input.context.weather`) — previously always undefined, so the
  // Matchmaking contract's weather ranking signal never fired until now.
  // location is session.searchOrigin, not session.location — ranking follows
  // wherever the camera is centered (real location until the user pans
  // away from it), per searchOrigin's own doc comment in session.tsx.
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
        .filter((v): v is NonNullable<typeof v> => !!v),
    [topRanked]
  );

  const labels = useMemo<MapLabel[]>(() => {
    if (!bounds) return [];
    return groupVisibleDistricts(districtsInBounds(bounds), zoomLevel, containerWidth);
  }, [bounds, zoomLevel, containerWidth]);

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
    setZoomLevel(next);
    cameraRef.current?.zoomTo(next, 250);
  };
  const zoomOut = () => {
    const next = clampZoomLevel(zoomLevel - 1);
    setZoomLevel(next);
    cameraRef.current?.zoomTo(next, 250);
  };
  const locate = () => {
    // Recentres only — deliberately leaves zoom (and therefore the shared
    // search radius) untouched, so tapping "locate me" can't silently change
    // how wide a search you'd set up.
    const target = session.location ?? MAP_HOME;
    setCenter(target);
    cameraRef.current?.setCamera({
      centerCoordinate: [target.lon, target.lat],
      animationDuration: 400,
    });
  };
  const fitRegion = () => {
    const b = boundsForPoints(ALL_DISTRICT_POINTS);
    cameraRef.current?.fitBounds([b.ne.lon, b.ne.lat], [b.sw.lon, b.sw.lat], 60, 500);
  };

  const onTapLabel = (label: MapLabel) => {
    if (label.kind === 'district') {
      // Hard rule 6: only a real district (its own id) ever routes to a
      // detail page.
      router.push(`/district/${label.districtIds[0]}`);
      return;
    }
    // Grouped labels ("The Golden Triangle", "Central Manchester", ...) are
    // zoom-only navigation aids — reframe the view to fit every member, and
    // never push a route. Uses groupTapCameraTarget (not a plain
    // fitBounds) — see that function's doc comment for why: a whole-metro
    // group label only ever shows once every member is already on screen,
    // so naively fitting bounds to those same members barely moves the
    // camera at all.
    const members = DISTRICTS.filter((d) => label.districtIds.includes(d.id));
    const { center: groupCenter, zoomLevel: groupZoom } = groupTapCameraTarget(
      members,
      zoomLevel,
      containerWidth
    );
    cameraRef.current?.setCamera({
      centerCoordinate: [groupCenter.lon, groupCenter.lat],
      zoomLevel: groupZoom,
      animationDuration: 450,
    });
  };

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
      <MapView
        style={StyleSheet.absoluteFill}
        styleURL={DARK_STYLE_URL}
        onCameraChanged={onCameraChanged}
        scaleBarEnabled={false}
        compassEnabled={false}
        logoPosition={{ bottom: 8, left: 8 }}
        attributionPosition={{ bottom: 8, right: 8 }}
      >
        <Camera
          ref={cameraRef}
          defaultSettings={{ centerCoordinate: [center.lon, center.lat], zoomLevel }}
          minZoomLevel={MIN_ZOOM_LEVEL}
          maxZoomLevel={MAX_ZOOM_LEVEL}
        />

        {/* Hide the basemap's own competing place/POI labels — see
            COMPETING_LABEL_LAYER_IDS's doc comment. */}
        {COMPETING_LABEL_LAYER_IDS.map((id) => (
          <SymbolLayer key={id} id={id} existing style={{ visibility: 'none' }} />
        ))}

        {/* BEYOND THE EDGE (2026-08): a real coverage boundary instead of a
            floating text card — everywhere outside Curia's covered metros is
            masked to the app's own background (reads as empty, not just
            dimmed), with a glowing gold perimeter marking the edge. See
            src/lib/map/geo.ts's COVERAGE_MASK/COVERAGE_POLYGONS doc comment. */}
        <ShapeSource id="coverage-mask-source" shape={COVERAGE_MASK}>
          <FillLayer id="coverage-mask-fill" style={{ fillColor: color.baseVariants.b, fillOpacity: 0.94 }} />
        </ShapeSource>
        <ShapeSource
          id="coverage-outline-source"
          shape={{ type: 'FeatureCollection', features: COVERAGE_POLYGONS }}
        >
          <LineLayer
            id="coverage-glow-outer"
            style={{ lineColor: color.gold, lineWidth: 14, lineBlur: 14, lineOpacity: 0.18 }}
          />
          <LineLayer
            id="coverage-glow-mid"
            style={{ lineColor: color.gold, lineWidth: 7, lineBlur: 6, lineOpacity: 0.35 }}
          />
          <LineLayer id="coverage-glow-core" style={{ lineColor: color.goldLight, lineWidth: 2, lineOpacity: 0.9 }} />
        </ShapeSource>

        {/* "Make districts feel alive" (2026-08): zoomed-out area glow —
            one soft blurred circle per district, coloured by its own
            accentColor, brighter the livelier it is right now. */}
        <ShapeSource id="district-glow-source" shape={districtGlow}>
          <CircleLayer
            id="district-area-glow"
            maxZoomLevel={DISTRICT_DETAIL_ZOOM_THRESHOLD}
            style={{
              circleColor: ['get', 'accentColor'],
              circleRadius: ['interpolate', ['linear'], ['zoom'], 8, 40, DISTRICT_DETAIL_ZOOM_THRESHOLD, 170],
              circleBlur: 0.9,
              circleOpacity: ['*', ['get', 'livelinessNorm'], 0.45],
            }}
          />
        </ShapeSource>

        {/* Zoomed-in street glow — the same colour/liveliness signal, but
            applied to each district's own real streets instead of an area
            blob, once zoomed in enough to actually see them. */}
        {DISTRICTS.map((d) => (
          <LineLayer
            key={`street-glow-${d.id}`}
            id={`street-glow-${d.id}`}
            sourceID={ROAD_SOURCE_ID}
            sourceLayerID={ROAD_SOURCE_LAYER}
            minZoomLevel={DISTRICT_DETAIL_ZOOM_THRESHOLD}
            // @rnmapbox/maps types FilterExpression's arguments too
            // narrowly to accept a real GeoJSON Feature literal (a known
            // library type-definition gap, not a runtime issue) — `within`
            // against a Polygon/MultiPolygon feature is valid, documented
            // Mapbox GL style spec.
            filter={['within', DISTRICT_LOCAL_AREAS[d.id]] as unknown as ['within', never]}
            style={{
              lineColor: d.accentColor,
              lineWidth: 2.5,
              lineBlur: 3,
              lineOpacity: normalizeLiveliness(districtLiveliness(d, resolved.day, resolved.band)) * 0.85,
            }}
          />
        ))}

        {labels.map((label) => (
          <MarkerView key={label.key} coordinate={[label.center.lon, label.center.lat]} anchor={{ x: 0.5, y: 0 }}>
            <Pressable onPress={() => onTapLabel(label)} style={styles.labelWrap}>
              <Text
                style={label.kind === 'group' ? styles.groupLabel : styles.districtLabel}
                numberOfLines={1}
              >
                {label.label}
              </Text>
              {/* 2026-08 concierge positioning pass: a raw "NN ALIVE"
                  percentage on every district pin read as showing the
                  calculation, not the judgment (labelLiveliness/
                  districtLiveliness still drive the real glow intensity on
                  the map itself — see the district glow layers above,
                  untouched). The group label's "N DISTRICTS · ZOOM" stays:
                  that's a real navigation hint (Hard rule 6), not a stat. */}
              {label.kind === 'group' && (
                <Text style={styles.labelSub} numberOfLines={1}>
                  {label.districtIds.length} DISTRICTS · ZOOM
                </Text>
              )}
            </Pressable>
          </MarkerView>
        ))}

        {topRankedVenues.map(({ rank, venue }) => (
          <MarkerView key={venue.id} coordinate={[venue.lon, venue.lat]} anchor={{ x: 0.5, y: 0.5 }}>
            <Pressable onPress={() => router.push(`/venue/${venue.id}`)} style={styles.pin}>
              <Text style={styles.pinText}>{rank}</Text>
            </Pressable>
          </MarkerView>
        ))}

        {session.location && (
          <MarkerView coordinate={[session.location.lon, session.location.lat]} anchor={{ x: 0.5, y: 0.5 }}>
            <PulsingLocationDot />
          </MarkerView>
        )}
      </MapView>

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
          navigation (native pinch-zoom exists too, so these buttons are a
          backup, not the primary way to zoom) — kept, but quieter
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

  labelWrap: {
    width: 140,
    alignItems: 'center',
    gap: 3,
  },
  groupLabel: {
    fontFamily: font.serif,
    fontSize: 15,
    letterSpacing: 0.9,
    color: color.textPrimaryBright,
    textAlign: 'center',
  },
  districtLabel: {
    fontFamily: font.serifRegular,
    fontSize: 16,
    letterSpacing: 0.3,
    color: color.textPrimaryBright,
    textAlign: 'center',
  },
  labelSub: {
    fontFamily: font.sansMedium,
    fontSize: 9,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: 'rgba(200,188,170,.75)',
    textAlign: 'center',
  },

  pin: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(192,160,98,.55)',
    backgroundColor: 'rgba(18,16,14,.88)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinText: {
    fontFamily: font.sansMedium,
    fontSize: 11,
    color: color.goldLight,
  },

  meWrap: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mePulseRing: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: color.weather,
  },
  meDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: color.weather,
    borderWidth: 2,
    borderColor: color.baseVariants.b,
  },

  // headerRow (context pill + emblem) and the mood pill used to be two
  // independently `position:'absolute'`-placed rows with a hardcoded 58px
  // gap between them (top:56 / top:114) — fragile, since it assumed the
  // context pill's rendered height would always stay under that gap. Real
  // weather strings (2026-08) can run longer than the old static mock's,
  // and font-metric differences across devices pushed it over that budget
  // on a real device (user report: "overlap on the 'planning for' pill and
  // the 'in the mood too' pill"). `topStack` now anchors once and lets the
  // two rows flow normally underneath each other, so the mood pill's
  // position always tracks the context pill's actual height instead of a
  // guessed constant.
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
