import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
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
import { Button, Card, ContextStrip, EmblemButton, Kicker, Tag, TopPicksRail, VenueTypeIcon } from '../../components/curia';
import type { TopPickItem } from '../../components/curia';
import { TOP_PICKS_RAIL_ENABLED } from '../../lib/config/features';
import { haversineMiles, rankVenues, resolveContext } from '../../lib/scoring/rank-venues';
import { buildMatchmakingInputFromSession } from '../../lib/scoring/session-input';
import { DISTRICTS, RATING_STATS, VENUES } from '../../lib/data/seed';
import {
  ALL_VENUES_ZOOM_THRESHOLD,
  DISTRICT_DETAIL_ZOOM_THRESHOLD,
  MAP_HOME,
  MAX_ZOOM_LEVEL,
  MIN_ZOOM_LEVEL,
  groupTapCameraTarget,
  districtGlowFeatureCollection,
  districtLiveliness,
  districtsInBounds,
  getCoverageMask,
  getCoveragePolygons,
  getDistrictLocalAreas,
  groupVisibleDistricts,
  isNearHolidayCoverage,
  metroForPoint,
  normalizeLiveliness,
  radiusMilesToZoomLevel,
  SEVEN_MINUTE_WALK_RADIUS_MILES,
  spanMilesToRadiusMiles,
  venuesInBounds,
  zoomLevelToSpanMiles,
} from '../../lib/map/geo';
import type { GeoBounds, GeoPoint, MapLabel } from '../../lib/map/geo';
import { iconForVenueType, type VenueIconKey } from '../../lib/map/venue-icons';
import { moodTileOptionsForCategory } from '../../lib/map/mood-tiles';
import { UCHICAGO_CAMPUS_BOUNDARY, UCHICAGO_CAMPUS_LABEL_POINT } from '../../lib/map/uchicago-campus';
import { useSession } from '../../lib/state/session';
import { fetchWeather } from '../../lib/weather/forecast';
import { color, font, radius, spacing } from '../../theme';
import type { DayTimeBand, TileCategory, Venue } from '../../types/models';

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

/** The full possible set — filtered per-render to `categories` below, since
 * 'Holiday' should only appear near real Holiday coverage (see
 * isNearHolidayCoverage's own doc comment in lib/map/geo.ts). */
const ALL_CATEGORIES: TileCategory[] = ['Do', 'Drink', 'Eat', 'Holiday'];

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

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/** The real-location marker (2026-08, at explicit user request: "it should
 * pulse to show it is live"; restyled 2026-09 to a premium dark-framed dot;
 * briefly tried as an abstract standing figure the same day, reverted right
 * back at explicit user request — "i dont like our new location pin human
 * figure, could we revert to the white pulsing circle" — this dark-framed
 * dot with the amethyst fill is that reverted-to state, not the original
 * plain pale dot from before either restyle). A soft ambient glow, a
 * dark-framed centre dot (same frame language as the venue match pins —
 * see buildMatchPinElement's web equivalent), and a thin stroked ring that
 * loops scale+fade outward, rather than a flat filled circle.
 * `color.locationPin` fills it — see that token's doc comment
 * (theme/tokens.ts) for why it's a dedicated token and why gold was ruled
 * out. Only ever rendered when `session.location` is real (never for the
 * DEMO_LOCATION fallback) — see that field's doc comment in session.tsx. */
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
  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] });

  return (
    <View style={styles.meWrap} pointerEvents="none">
      <View style={styles.meGlow} />
      <Animated.View style={[styles.mePulseRing, { transform: [{ scale }], opacity }]} />
      <View style={styles.meFrame}>
        <View style={styles.meDot} />
      </View>
    </View>
  );
}

/**
 * Top-match marker (2026-09, at explicit user request: "we dont need
 * numbers for the map view... instead... use their icon but bright and
 * pulsing so they stand out"). Same ring-pulse language as
 * PulsingLocationDot above, applied to the venue's own type icon instead
 * of a plain dot — bright gold (color.goldLight) against the dim
 * color.textTertiary used for every other venue at this zoom, so it reads
 * as "the recommendation" without a number. The numbered ordering isn't
 * gone — it's still real, just shown in the venue popup (VenuePopupCard
 * below, opened on first tap) and on the List tab, not printed on the pin
 * itself.
 */
// `saved` badge (2026-09, at explicit user request: "i just saved smoke
// wilmslow, but noticed it gets no special treatment on the app... it
// should get a subtle star or something when being appended to the map" —
// List already had this via its own save star, the map pins never did).
// Small gold-outlined star, top-right corner, overlaid on whichever pin
// variant the venue is currently rendered as — not its own third marker
// type, a saved venue is still either a top match or a background pin
// first. RN Views default to `position: 'relative'`, so this anchors
// correctly against matchWrap/backgroundPin without either needing an
// explicit position style of their own. Mirrors map.web.tsx's
// buildSavedBadge (a plain DOM node there; a View/Text pair here).
function SavedBadge({ size, fontSize }: { size: number; fontSize: number }) {
  return (
    <View
      style={[
        styles.savedBadge,
        { width: size, height: size, borderRadius: size / 2, top: -3, right: -3 },
      ]}
      pointerEvents="none"
    >
      <Text style={{ fontSize, lineHeight: fontSize, color: color.goldLight }}>★</Text>
    </View>
  );
}

function PulsingMatchIcon({
  icon,
  saved,
  onPress,
}: {
  icon: VenueIconKey;
  saved: boolean;
  onPress: () => void;
}) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(pulse, {
        toValue: 1,
        duration: 1400,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 2.2] });
  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] });

  return (
    <Pressable onPress={onPress} style={styles.matchWrap}>
      <Animated.View style={[styles.matchPulseRing, { transform: [{ scale }], opacity }]} />
      <View style={styles.matchDot}>
        <VenueTypeIcon icon={icon} size={16} color={color.goldLight} />
      </View>
      {saved && <SavedBadge size={14} fontSize={8} />}
    </Pressable>
  );
}

/**
 * Venue pin popup content (2026-09, at explicit user request: "instead of
 * going straight to the venue page, on first tap lets have a pop up showing
 * key business info... another tap takes you through to venue page"). Tap
 * behaviour lives with the caller (onVenuePinTap below) — this only renders
 * what's shown once a popup is already open, as its own MarkerView anchored
 * at the same coordinate as the pin it belongs to. `rank` is the venue's
 * real position in the current ranked results (undefined if it falls
 * outside them, e.g. a background pin the hard filters excluded), not just
 * the top-4 shown as pulsing match pins. Mirrors map.web.tsx's
 * buildVenuePopupElement (a plain mapboxgl.Popup there; @rnmapbox/maps has
 * no equivalent built-in, so this is a second MarkerView instead).
 */
function VenuePopupCard({ venue, rank, onPress }: { venue: Venue; rank: number | undefined; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.venuePopup}>
      {rank && <Text style={styles.venuePopupRank}>NO. {rank}</Text>}
      <Text style={styles.venuePopupName} numberOfLines={1}>
        {venue.name}
      </Text>
      <Text style={styles.venuePopupType} numberOfLines={1}>
        {venue.type}
      </Text>
      <Text style={styles.venuePopupHint}>TAP FOR MORE</Text>
    </Pressable>
  );
}

export default function Map() {
  const router = useRouter();
  const session = useSession();
  const { context, mood } = session;
  const { focusDistrict } = useLocalSearchParams<{ focusDistrict?: string }>();

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
  const [activePopupVenueId, setActivePopupVenueId] = useState<string | null>(null);
  const autoLocatedRef = useRef(false);
  const focusDistrictAppliedRef = useRef<string | null>(null);

  const onContainerLayout = useCallback((e: LayoutChangeEvent) => {
    setContainerWidth(e.nativeEvent.layout.width);
  }, []);

  // District Guide's "MAP" button (2026-09, at explicit user request: "hop
  // back to the map view but centred on this district... at a walking
  // distance no further than 7 minutes type range"). Fires once per
  // distinct `focusDistrict` value, same "once, then don't fight the
  // user's own panning" contract as the auto-locate effect below — which
  // this deliberately takes priority over when the id actually resolves to
  // a real district, since arriving here via this button is a more
  // specific, explicit request than the passive "centre on me" default. An
  // unrecognised id (a stale/malformed link) is treated as if the param
  // were never there, so auto-locate still runs rather than stranding the
  // map at its plain default.
  const focusDistrictTarget = focusDistrict ? DISTRICTS.find((d) => d.id === focusDistrict) : undefined;
  if (focusDistrictTarget && focusDistrictAppliedRef.current !== focusDistrictTarget.id) {
    focusDistrictAppliedRef.current = focusDistrictTarget.id;
    autoLocatedRef.current = true; // suppress the auto-locate-to-me effect below
    cameraRef.current?.setCamera({
      centerCoordinate: [focusDistrictTarget.lon, focusDistrictTarget.lat],
      zoomLevel: radiusMilesToZoomLevel(SEVEN_MINUTE_WALK_RADIUS_MILES, focusDistrictTarget.lat, containerWidth),
      animationDuration: 500,
    });
  }

  // Fly to the real device location the first time it resolves (shortly
  // after mount, once expo-location's permission/fix round-trip completes) —
  // but only once, so it doesn't fight the user's own subsequent panning.
  if (session.location && !autoLocatedRef.current && !focusDistrictTarget) {
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

  const result = useMemo(() => rankVenues(matchInput, VENUES, DISTRICTS, RATING_STATS), [matchInput]);

  // Feeds the Top picks rail (TOP_PICKS_RAIL_ENABLED) — the exact same
  // `result.ranked` the pins below are built from, so the rail can never
  // show a different answer than what's actually on the map (Hard rule 5).
  const topPicks: TopPickItem[] = useMemo(
    () =>
      result.ranked.slice(0, 4).flatMap((r) => {
        const pickVenue = VENUES.find((v) => v.id === r.venueId);
        if (!pickVenue) return [];
        const pickDistrict = DISTRICTS.find((d) => d.id === pickVenue.districtId);
        return [{ venue: pickVenue, districtName: pickDistrict?.name ?? '', reason: r.reason, contextNote: r.contextNote }];
      }),
    [result]
  );

  // Only offer the 'Holiday' mood filter near real Holiday coverage
  // (Santorini today) — everywhere else it's a guaranteed-empty tap, since
  // distance is a hard filter and no UK radius reaches Santorini.
  const categories = useMemo(
    () => ALL_CATEGORIES.filter((c) => c !== 'Holiday' || isNearHolidayCoverage(session.searchOrigin)),
    [session.searchOrigin]
  );
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

  // "If zoomed in enough, all venues on our DB are visible... subtly, so
  // the recommended matches are much more visible" (2026-09, at explicit
  // user request). Every real venue in view once past
  // ALL_VENUES_ZOOM_THRESHOLD, minus whichever ones are already showing as
  // a numbered top-match pin (topRankedVenues below) — never render the
  // same venue twice.
  const backgroundVenues = useMemo(() => {
    if (!bounds || zoomLevel < ALL_VENUES_ZOOM_THRESHOLD) return [];
    const topIds = new Set(topRankedVenues.map(({ venue }) => venue.id));
    return venuesInBounds(bounds).filter((v) => !topIds.has(v.id));
  }, [bounds, zoomLevel, topRankedVenues]);

  const moodOn = !!mood?.category;
  const selectedTileIds = mood?.tileIds ?? [];
  const moodCategoryTiles = mood?.category ? moodTileOptionsForCategory(mood.category) : [];
  const selectedTileLabels = moodCategoryTiles
    .filter((t) => selectedTileIds.includes(t.tileId))
    .map((t) => t.label);
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

  const locate = () => {
    // 2026-09, at explicit user request ("it should recentre the user but
    // also zoom back in to an appropriate level for walking distance
    // venues") — supersedes the original recentre-only behaviour, which
    // deliberately left zoom untouched. Now flies to
    // DISTRICT_DETAIL_ZOOM_THRESHOLD, the same "street-level detail" zoom
    // the district quick-nav pills already fly to (see flyToDistrict
    // below) rather than inventing a second meaning for a new number.
    // session.radiusMiles updates for free through the same
    // onCameraChanged pipeline every other camera move already goes
    // through — no separate call needed here.
    const target = session.location ?? MAP_HOME;
    setCenter(target);
    cameraRef.current?.setCamera({
      centerCoordinate: [target.lon, target.lat],
      zoomLevel: DISTRICT_DETAIL_ZOOM_THRESHOLD,
      animationDuration: 400,
    });
  };

  // District quick-nav (2026-09, at explicit user request: "incorporate
  // [Moments' district navigation] on the map view... so users can quickly
  // pop around districts and have a look"). Unlike Moments (which filters
  // its own in-page content) or List (which navigates away to District
  // Guide), the map's own camera IS the "have a look" surface — flying it
  // to a district's centre at DISTRICT_DETAIL_ZOOM_THRESHOLD reuses the
  // exact same onCameraChanged/syncFromCamera pipeline `locate()` already
  // does, so the ranked candidate set re-centres on that district for free,
  // no separate fetch or special-cased state. Nearest-to-the-user first,
  // same haversineMiles-against-searchOrigin ordering List's district-browse
  // mode and Moments' pill row both already use. Filtered to districts with
  // at least one real venue, so no pill is a dead end.
  // Scoped to the search origin's own metro (2026-09-18, at explicit user
  // report, real bug — "when in chicago i shouldnt be able to quick nav to
  // wilmslow, i shouldnt see that option"): this used to sort every
  // district in every metro by raw haversine distance with no metro filter
  // at all, so once a metro's own handful of districts ran out, the
  // next-nearest by pure geography was whatever real-world metro happened
  // to be least far away (Cheshire genuinely is closer to Chicago than
  // Riyadh is). Same fix as map.web.tsx's identical `nearbyDistricts`,
  // adapted for this file not having that one's `focusedMetro` state —
  // metroForPoint(searchOrigin) directly instead. No metro (camera in
  // "no man's land" between markets) now shows no chips rather than a
  // cross-continent guess.
  const nearbyDistricts = useMemo(() => {
    const metro = metroForPoint(session.searchOrigin);
    return DISTRICTS.filter((d) => d.metro === metro && VENUES.some((v) => v.districtId === d.id)).sort(
      (a, b) => haversineMiles(session.searchOrigin, a) - haversineMiles(session.searchOrigin, b)
    );
  }, [session.searchOrigin]);

  // Venue pin tap behaviour (2026-09, at explicit user request: "instead of
  // going straight to the venue page, on first tap lets have a pop up
  // showing key business info... another tap takes you through to venue
  // page"). First tap on a pin opens VenuePopupCard at its coordinate;
  // tapping that popup navigates straight to venue detail. Tapping the SAME
  // pin again (activePopupVenueId already equals its id) also navigates —
  // the second half of the "first tap: preview, second tap: open" contract,
  // for anyone who taps the pin again instead of the popup itself. `rank`
  // is the venue's real position in the full ranked candidate set (not just
  // the top-4 shown as pulsing match pins). Mirrors map.web.tsx's
  // openPopupFor/onVenuePinTap (a mapboxgl.Popup there; a second MarkerView
  // here — see VenuePopupCard's own doc comment for why).
  const onVenuePinTap = (venue: Venue) => {
    if (activePopupVenueId === venue.id) {
      setActivePopupVenueId(null);
      router.push(`/venue/${venue.id}`);
      return;
    }
    setActivePopupVenueId(venue.id);
  };

  const activePopupVenue = useMemo(() => {
    if (!activePopupVenueId) return null;
    const venue = VENUES.find((v) => v.id === activePopupVenueId);
    if (!venue) return null;
    const rankIndex = ranked.findIndex((r) => r.venueId === venue.id);
    return { venue, rank: rankIndex >= 0 ? rankIndex + 1 : undefined };
  }, [activePopupVenueId, ranked]);


  const flyToDistrict = (d: (typeof DISTRICTS)[number]) => {
    setActivePopupVenueId(null);
    cameraRef.current?.setCamera({
      centerCoordinate: [d.lon, d.lat],
      zoomLevel: DISTRICT_DETAIL_ZOOM_THRESHOLD,
      animationDuration: 450,
    });
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
        logoEnabled={false}
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
        <ShapeSource id="coverage-mask-source" shape={getCoverageMask()}>
          <FillLayer id="coverage-mask-fill" style={{ fillColor: color.baseVariants.b, fillOpacity: 0.94 }} />
        </ShapeSource>
        <ShapeSource
          id="coverage-outline-source"
          shape={{ type: 'FeatureCollection', features: getCoveragePolygons() }}
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

        {/* University of Chicago campus outline (2026-09-18, at explicit
            user request: "can we highlight his campus in some way, maybe
            with a subtle boundary and a label?") — a personal touch for the
            specific member this metro was built for, not a general
            per-metro mechanism. See src/lib/map/uchicago-campus.ts's own
            top comment for the real OSM-sourced boundary data. Deliberately
            thin/low-opacity, nothing like the bold coverage-edge glow above
            — "subtle" was the explicit ask. */}
        <ShapeSource id="uchicago-campus-source" shape={UCHICAGO_CAMPUS_BOUNDARY}>
          <LineLayer id="uchicago-campus-line" style={{ lineColor: color.gold, lineWidth: 1.4, lineOpacity: 0.4 }} />
        </ShapeSource>
        <MarkerView
          coordinate={[UCHICAGO_CAMPUS_LABEL_POINT.lon, UCHICAGO_CAMPUS_LABEL_POINT.lat]}
          anchor={{ x: 0.5, y: 0.5 }}
        >
          <Text style={styles.campusLabel}>University of Chicago</Text>
        </MarkerView>

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
            filter={['within', getDistrictLocalAreas()[d.id]] as unknown as ['within', never]}
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

        {backgroundVenues.map((venue) => (
          <MarkerView key={venue.id} coordinate={[venue.lon, venue.lat]} anchor={{ x: 0.5, y: 0.5 }}>
            <Pressable onPress={() => onVenuePinTap(venue)} style={styles.backgroundPin} hitSlop={6}>
              <VenueTypeIcon icon={iconForVenueType(venue.type)} size={15} color={color.textSecondary} />
              {session.isVenueSaved(venue.id) && <SavedBadge size={11} fontSize={6.5} />}
            </Pressable>
          </MarkerView>
        ))}

        {topRankedVenues.map(({ venue }) => (
          <MarkerView key={venue.id} coordinate={[venue.lon, venue.lat]} anchor={{ x: 0.5, y: 0.5 }}>
            <PulsingMatchIcon
              icon={iconForVenueType(venue.type)}
              saved={session.isVenueSaved(venue.id)}
              onPress={() => onVenuePinTap(venue)}
            />
          </MarkerView>
        ))}

        {activePopupVenue && (
          <MarkerView
            key={`popup-${activePopupVenue.venue.id}`}
            coordinate={[activePopupVenue.venue.lon, activePopupVenue.venue.lat]}
            anchor={{ x: 0.5, y: 1.3 }}
          >
            <VenuePopupCard
              venue={activePopupVenue.venue}
              rank={activePopupVenue.rank}
              onPress={() => {
                setActivePopupVenueId(null);
                router.push(`/venue/${activePopupVenue.venue.id}`);
              }}
            />
          </MarkerView>
        )}

        {session.location && (
          <MarkerView coordinate={[session.location.lon, session.location.lat]} anchor={{ x: 0.5, y: 0.5 }}>
            <PulsingLocationDot />
          </MarkerView>
        )}
      </MapView>

      {/* 2026-09, at explicit user request: this used to be two stacked
          rows (context pill full-width, mood pill below it) eating enough
          vertical space over the map that it read as a toolbar, not a map.
          Both pills now render compact/single-line so they fit in one row
          alongside a smaller profile emblem — same information, tap-through
          behaviour and active/mood-on states, just far less height. */}
      <View style={styles.topStack}>
        <View style={styles.headerRow}>
          <ContextStrip
            kicker={ctxKicker}
            label={ctxLabel}
            onPress={openCtx}
            compact
            compactText={context.now ? 'LIVE NOW' : ctxLabel}
          />
          <Pressable onPress={openMood} style={[styles.moodPill, moodOn && styles.moodPillActive]}>
            <Text style={[styles.moodLabel, moodOn && styles.moodLabelActive]} numberOfLines={1}>
              {moodLabel}
            </Text>
            {moodOn ? (
              <Pressable onPress={clearMood} hitSlop={8}>
                <Text style={styles.moodClear}>×</Text>
              </Pressable>
            ) : (
              <Text style={styles.moodChevron}>⌄</Text>
            )}
          </Pressable>
          <EmblemButton initials={initials} onPress={() => router.push('/profile')} compact />
        </View>
      </View>

      {/* 2026-09, at explicit user request: this is a mobile-first
          experience — pinch/scroll zoom is the primary (and now only) way to
          zoom, so the +/- buttons and the "fit to region" button were
          dropped. The locate button stays; it does something a gesture
          can't (jump back to the user's real location). */}
      <View style={styles.zoomCol}>
        <Pressable onPress={locate} style={styles.zoomBtn}>
          <Text style={styles.locateBtnText}>◎</Text>
        </Pressable>
      </View>

      {TOP_PICKS_RAIL_ENABLED && (
        <TopPicksRail picks={topPicks} onSelectVenue={(venueId) => router.push(`/venue/${venueId}`)} />
      )}

      {/* 2026-09, at explicit user request: this used to be a collapsible
          sheet with a numbered venue list — dropped entirely (that's what
          the List tab is for) so the map itself is always fully visible,
          never partially covered by an expanded card. District quick-nav
          takes over this same fixed strip along the bottom. Mirrors
          map.web.tsx's identical change. */}
      <Card tone="sheet" style={styles.navBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.districtNavRow}
        >
          {nearbyDistricts.map((d) => (
            <Tag key={d.id} label={d.name} onPress={() => flyToDistrict(d)} />
          ))}
        </ScrollView>
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
                {categories.map((c) => {
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

  // University of Chicago campus label — see uchicago-campus-source's own
  // comment above. Mirrors map.web.tsx's identical inline style.
  campusLabel: {
    fontFamily: font.sansMedium,
    fontSize: 9,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    color: color.gold,
    opacity: 0.75,
  },

  // Quiet on purpose (2026-09): every real venue at this zoom, so it has
  // to stay clearly secondary to the bright pulsing `matchDot` style below
  // — no border, a faint low-opacity fill, a muted icon color rather than
  // the gold used everywhere a match is being highlighted. Size bumped
  // 2026-09-18 alongside map.web.tsx's identical fix, at explicit user
  // report ("chicago is still a sea of dots") — color.textTertiary at 13px
  // read as an indistinguishable blur regardless of the venue's real icon
  // shape; see the VenueTypeIcon call site below for the matching color bump.
  backgroundPin: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(18,16,14,.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // See SavedBadge's own doc comment above.
  savedBadge: {
    position: 'absolute',
    backgroundColor: 'rgba(19,17,16,.92)',
    borderWidth: 1,
    borderColor: color.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Top-match marker (2026-09) — bright + pulsing, not numbered (the real
  // ordering lives in the sheet below the map / the List tab instead, see
  // PulsingMatchIcon's own doc comment).
  matchWrap: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  matchPulseRing: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: color.gold,
  },
  matchDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(231,214,176,.8)',
    backgroundColor: 'rgba(18,16,14,.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  meWrap: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  meGlow: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: color.locationPin,
    opacity: 0.22,
  },
  mePulseRing: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: color.locationPin,
  },
  meFrame: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(18,16,14,.92)',
    borderWidth: 1,
    borderColor: 'rgba(240,233,223,.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  meDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: color.locationPin,
    shadowColor: color.locationPin,
    shadowOpacity: 0.9,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 0 },
  },

  // 2026-09, at explicit user request: was two stacked rows (a full-height
  // context pill, then the mood pill below it) — collapsed to one row, both
  // pills compact/single-line, so the map starts noticeably higher.
  //
  // top was 56 (2026-09 update, same request): mirrors map.web.tsx's
  // identical change — see that file's doc comment. Kept equal between the
  // two screens rather than reintroducing a native-only safe-area offset
  // this codebase has never actually measured against a real device.
  topStack: {
    position: 'absolute',
    top: spacing.lg,
    left: spacing.lg,
    right: spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  moodPill: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.hairlineMax,
    backgroundColor: 'rgba(19,17,16,.78)',
  },
  moodPillActive: {
    borderColor: 'rgba(192,160,98,.55)',
    backgroundColor: 'rgba(192,160,98,.14)',
  },
  moodLabel: {
    flexShrink: 1,
    fontFamily: font.serifRegular,
    fontSize: 13,
    color: color.textSecondaryAlt,
  },
  moodLabelActive: {
    color: color.textPrimary,
  },
  moodChevron: {
    fontFamily: font.sans,
    fontSize: 12,
    color: color.gold,
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
    // Was 168, then 116 — calibrated for topStack.top, which moved from 56
    // to spacing.lg in the same 2026-09 mobile-spacing pass. Keeps the same
    // ~60px gap below the header row so this button never overlaps it.
    top: spacing.lg + 60,
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
  locateBtnText: {
    fontFamily: font.sans,
    fontSize: 14,
    color: color.locationPin,
  },
  navBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    paddingBottom: spacing.lg,
  },
  districtNavRow: {
    gap: spacing.sm - 2,
    paddingBottom: 2,
  },
  // Still used by the mood/context modal sheets below.
  sheetHandle: {
    width: 36,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(240,233,223,.2)',
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  venuePopup: {
    gap: 5,
    paddingVertical: 13,
    paddingHorizontal: 15,
    minWidth: 150,
    maxWidth: 220,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(192,160,98,.4)',
    backgroundColor: 'rgba(19,17,16,.96)',
  },
  venuePopupRank: {
    fontFamily: font.sansRegular,
    fontSize: 9,
    letterSpacing: 1.8,
    color: color.gold,
  },
  venuePopupName: {
    fontFamily: font.serifRegular,
    fontSize: 16,
    color: color.textPrimaryBright,
  },
  venuePopupType: {
    fontFamily: font.sans,
    fontSize: 10,
    letterSpacing: 1.2,
    color: 'rgba(200,188,170,.75)',
  },
  venuePopupHint: {
    fontFamily: font.sansMedium,
    fontSize: 8,
    letterSpacing: 1.4,
    color: color.goldLight,
    marginTop: 3,
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
