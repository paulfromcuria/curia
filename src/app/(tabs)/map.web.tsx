import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { LayoutChangeEvent } from 'react-native';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import mapboxgl from 'mapbox-gl';
import { Button, Card, ContextStrip, EmblemButton, Kicker, Tag, TopPicksRail } from '../../components/curia';
import type { TopPickItem } from '../../components/curia';
import { TOP_PICKS_RAIL_ENABLED } from '../../lib/config/features';
import { haversineMiles, rankVenues, resolveContext } from '../../lib/scoring/rank-venues';
import { buildMatchmakingInputFromSession } from '../../lib/scoring/session-input';
import {
  DISTRICTS,
  isMetroLoaded,
  loadVenuesForMetro,
  METRO_WHOLE_SET_LABEL,
  RATING_STATS,
  useContentVersion,
  VENUES,
} from '../../lib/data/seed';
import {
  ALL_VENUES_ZOOM_THRESHOLD,
  DEFAULT_ZOOM_LEVEL,
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
import { iconForVenueType, iconSvgMarkup } from '../../lib/map/venue-icons';
import { moodTileOptionsForCategory } from '../../lib/map/mood-tiles';
import { UCHICAGO_CAMPUS_BOUNDARY, UCHICAGO_CAMPUS_LABEL_POINT } from '../../lib/map/uchicago-campus';
import { useSession } from '../../lib/state/session';
import { fetchWeather } from '../../lib/weather/forecast';
import { color, font, radius, spacing } from '../../theme';
import type { DayTimeBand, MetroId, TileCategory, Venue } from '../../types/models';

/** Below this zoom, more than one of Curia's metros could plausibly be in
 * frame at once — "the country level" (2026-09, at explicit user request)
 * — so a single "switch to X" guess stops making sense and the region
 * prompt below offers a full picker instead. MIN_ZOOM_LEVEL is 3 (the
 * whole world); this sits roughly at "you can see more than one city," well
 * below DEFAULT_ZOOM_LEVEL (12). */
const REGION_PICKER_ZOOM_THRESHOLD = 8;

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
 * mapbox-gl-js has no constructor option to disable the logo control (unlike
 * @rnmapbox/maps' native `logoEnabled` prop, used the same way in map.tsx) —
 * the documented workaround is hiding `.mapboxgl-ctrl-logo` via CSS. Kept
 * separate from `attributionControl` (left on): 2026-09, at explicit user
 * request, this hides only the wordmark graphic — Mapbox's terms require
 * attribution to remain visible somewhere (the small "© Mapbox ©
 * OpenStreetMap" text link), so that control stays.
 */
function hideMapboxLogo() {
  if (typeof document === 'undefined') return;
  if (document.querySelector('style[data-curia-hide-logo]')) return;
  const style = document.createElement('style');
  style.setAttribute('data-curia-hide-logo', 'true');
  style.textContent = `.mapboxgl-ctrl-logo { display: none !important; }`;
  document.head.appendChild(style);
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
  style.textContent = `
    @keyframes curia-me-pulse { 0% { transform: scale(1); opacity: .55; } 100% { transform: scale(2.8); opacity: 0; } }
    @keyframes curia-match-pulse { 0% { transform: scale(1); opacity: .5; } 100% { transform: scale(2.2); opacity: 0; } }
  `;
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

/** The full possible set — filtered per-render to `categories` below, since
 * 'Holiday' should only appear near real Holiday coverage (see
 * isNearHolidayCoverage's own doc comment in lib/map/geo.ts). */
const ALL_CATEGORIES: TileCategory[] = ['Do', 'Drink', 'Eat', 'Holiday'];

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
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

// Top-match marker (2026-09, at explicit user request: "we dont need
// numbers for the map view... instead... use their icon but bright and
// pulsing so they stand out"). Same ring-pulse language as buildMeElement
// below, applied to the venue's own type icon instead of a plain dot —
// bright gold (color.goldLight) against the dim color.textTertiary used
// for every other venue at this zoom. The numbered ordering isn't gone —
// it's still real, just shown in the sheet below the map / the List tab,
// not printed on the pin itself. Mirrors map.tsx's PulsingMatchIcon
// exactly (same VENUE_ICON_PRIMITIVES).
// `saved` badge (2026-09, at explicit user request: "i just saved smoke
// wilmslow, but noticed it gets no special treatment on the app... it
// should get a subtle star or something when being appended to the map" —
// List already had this via its own save star, the map pins never did).
// Small gold-outlined star, top-right corner, overlaid on whichever pin
// variant the venue is currently rendered as — deliberately not its own
// third marker type, a saved venue is still either a top match or a
// background pin first. `wrap`/`el` already resolve to `position: absolute`
// via ensureMarkerPositioningFallback()'s injected rule (they become the
// `.mapboxgl-marker` root itself), so an absolutely-positioned child here
// anchors correctly without needing an inline `position` override on the
// root — the same constraint buildMeElement's own comment documents.
function buildSavedBadge(size: number, fontSize: number): HTMLDivElement {
  const badge = document.createElement('div');
  badge.style.cssText = `position:absolute;top:-3px;right:-3px;width:${size}px;height:${size}px;border-radius:${size / 2}px;background:rgba(19,17,16,.92);border:1px solid ${color.gold};display:flex;align-items:center;justify-content:center;font-size:${fontSize}px;line-height:1;color:${color.goldLight};pointer-events:none;`;
  badge.textContent = '★';
  return badge;
}

function buildMatchPinElement(venue: Venue, saved: boolean, onTap: () => void): HTMLDivElement {
  ensurePulseKeyframes();
  const wrap = document.createElement('div');
  // No `position` set here — see buildMeElement's own comment on why the
  // marker root can't carry an inline `position` override.
  wrap.style.cssText = 'width:34px;height:34px;display:flex;align-items:center;justify-content:center;cursor:pointer;';
  const ring = document.createElement('div');
  ring.style.cssText = `position:absolute;width:28px;height:28px;border-radius:14px;background:${color.gold};animation:curia-match-pulse 1.4s ease-out infinite;`;
  const dot = document.createElement('div');
  dot.style.cssText = `position:relative;width:28px;height:28px;border-radius:14px;border:1px solid rgba(231,214,176,.8);background:rgba(18,16,14,.9);display:flex;align-items:center;justify-content:center;`;
  dot.innerHTML = iconSvgMarkup(iconForVenueType(venue.type), 16, color.goldLight);
  wrap.appendChild(ring);
  wrap.appendChild(dot);
  if (saved) wrap.appendChild(buildSavedBadge(14, 8));
  // stopPropagation is required, not decorative: a marker's click event
  // bubbles up to the map container, where openPopupFor's own
  // `closeOnClick: true` Popup is listening for exactly that — without
  // this, opening the popup and mapbox-gl-js closing it again happen in
  // the same click, so it never actually appears. Found live (2026-09)
  // while wiring up the venue pin popup.
  wrap.addEventListener('click', (e) => {
    e.stopPropagation();
    onTap();
  });
  return wrap;
}

// Quiet on purpose (2026-09): every real venue at this zoom, so it has to
// stay clearly secondary to buildMatchPinElement's bright pulsing match
// pins — no border, a faint low-opacity fill, a muted icon color rather
// than the gold used everywhere a match is highlighted. Mirrors map.tsx's
// `backgroundPin` style + VenueTypeIcon exactly (same VENUE_ICON_PRIMITIVES,
// see src/lib/map/venue-icons.ts's own top comment for why there are two
// renderers). Size/color bumped 2026-09-18, at explicit user report against
// a real Chicago screenshot ("chicago is still a sea of dots") — the icon
// audit that same night gave every venue type a real distinct shape, but
// color.textTertiary (#6F6558) at 13px was rendering as an indistinguishable
// blur regardless of shape; color.textSecondary reads clearly while staying
// visibly quieter than a gold match pin.
function buildBackgroundPinElement(venue: Venue, saved: boolean, onTap: () => void): HTMLDivElement {
  const el = document.createElement('div');
  el.style.cssText = `width:22px;height:22px;border-radius:11px;background:rgba(18,16,14,.55);display:flex;align-items:center;justify-content:center;cursor:pointer;`;
  el.innerHTML = iconSvgMarkup(iconForVenueType(venue.type), 15, color.textSecondary);
  if (saved) el.appendChild(buildSavedBadge(11, 6.5));
  // See buildMatchPinElement's identical stopPropagation comment.
  el.addEventListener('click', (e) => {
    e.stopPropagation();
    onTap();
  });
  return el;
}

/**
 * mapbox-gl-js's default Popup renders a white box with a black arrow —
 * matches nothing about Curia's dark theme. Same injected-`<style>` pattern
 * as ensureMarkerPositioningFallback/ensurePulseKeyframes above; scoped to
 * `.curia-venue-popup` (the Popup's own `className` option below) so it
 * can't affect any other mapbox-gl-js consumer on the page.
 */
function ensureVenuePopupStyles() {
  if (typeof document === 'undefined') return;
  if (document.querySelector('style[data-curia-venue-popup]')) return;
  const style = document.createElement('style');
  style.setAttribute('data-curia-venue-popup', 'true');
  style.textContent = `
    .curia-venue-popup .mapboxgl-popup-content { background: rgba(19,17,16,.96); border: 1px solid rgba(192,160,98,.4); border-radius: 12px; box-shadow: 0 8px 24px rgba(0,0,0,.4); padding: 0; }
    .curia-venue-popup .mapboxgl-popup-tip { border-top-color: rgba(19,17,16,.96) !important; border-bottom-color: rgba(19,17,16,.96) !important; }
    .curia-venue-popup .mapboxgl-popup-close-button { display: none; }
  `;
  document.head.appendChild(style);
}

/**
 * Venue pin popup content (2026-09, at explicit user request: "instead of
 * going straight to the venue page, on first tap lets have a pop up showing
 * key business info... another tap takes you through to venue page"). Tap
 * behaviour lives in the two callers below (openPopupFor/onVenuePinTap) —
 * this only builds what's shown once a popup is already open. `rank` is the
 * venue's real position in the current ranked results (undefined if it
 * falls outside them, e.g. a background pin the hard filters excluded) —
 * not just the top-4 shown as pulsing match pins.
 */
function buildVenuePopupElement(venue: Venue, rank: number | undefined, onTap: () => void): HTMLDivElement {
  const el = document.createElement('div');
  el.style.cssText = 'display:flex;flex-direction:column;gap:5px;padding:13px 15px;min-width:150px;max-width:220px;cursor:pointer;';
  if (rank) {
    const rankEl = document.createElement('div');
    rankEl.textContent = `NO. ${rank}`;
    rankEl.style.cssText = `font-family:${font.sansRegular};font-size:9px;letter-spacing:1.8px;color:${color.gold};`;
    el.appendChild(rankEl);
  }
  const nameEl = document.createElement('div');
  nameEl.textContent = venue.name;
  nameEl.style.cssText = `font-family:${font.serifRegular};font-size:16px;color:${color.textPrimaryBright};`;
  el.appendChild(nameEl);
  const typeEl = document.createElement('div');
  typeEl.textContent = venue.type;
  typeEl.style.cssText = `font-family:${font.sans};font-size:10px;letter-spacing:1.2px;color:rgba(200,188,170,.75);`;
  el.appendChild(typeEl);
  const hintEl = document.createElement('div');
  hintEl.textContent = 'TAP FOR MORE';
  hintEl.style.cssText = `font-family:${font.sansMedium};font-size:8px;letter-spacing:1.4px;color:${color.goldLight};margin-top:3px;`;
  el.appendChild(hintEl);
  el.addEventListener('click', onTap);
  return el;
}

/** The real-location marker (2026-08, at explicit user request: "it should
 * pulse to show it is live"; restyled 2026-09 to a premium dark-framed dot;
 * briefly tried as an abstract standing figure the same day, reverted right
 * back at explicit user request — "i dont like our new location pin human
 * figure, could we revert to the white pulsing circle" — this dark-framed
 * dot with the amethyst fill is that reverted-to state, not the original
 * plain pale dot from before either restyle). A soft ambient glow, a
 * dark-framed centre dot (same frame language as buildMatchPinElement's
 * venue pins below), and a thin stroked ring that loops scale+fade
 * outward, rather than a flat filled circle. `color.locationPin` fills it —
 * see that token's doc comment (theme/tokens.ts) for why it's a dedicated
 * token and why gold was ruled out. Mirrors map.tsx's identical revert. */
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
  wrap.style.cssText = 'width:44px;height:44px;display:flex;align-items:center;justify-content:center;';
  const glow = document.createElement('div');
  glow.style.cssText = `position:absolute;width:30px;height:30px;border-radius:15px;background:${color.locationPin};opacity:.22;filter:blur(5px);`;
  const ring = document.createElement('div');
  ring.style.cssText = `position:absolute;width:16px;height:16px;border-radius:8px;border:1.5px solid ${color.locationPin};animation:curia-me-pulse 1.8s ease-out infinite;`;
  const frame = document.createElement('div');
  frame.style.cssText = `position:relative;width:18px;height:18px;border-radius:9px;background:rgba(18,16,14,.92);border:1px solid rgba(240,233,223,.16);display:flex;align-items:center;justify-content:center;`;
  const dot = document.createElement('div');
  dot.style.cssText = `width:9px;height:9px;border-radius:4.5px;background:${color.locationPin};box-shadow:0 0 4px ${color.locationPin};`;
  frame.appendChild(dot);
  wrap.appendChild(glow);
  wrap.appendChild(ring);
  wrap.appendChild(frame);
  return wrap;
}

export default function Map() {
  const router = useRouter();
  const session = useSession();
  const { context, mood } = session;
  const { focusDistrict } = useLocalSearchParams<{ focusDistrict?: string }>();

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const labelMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const pinMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const backgroundPinMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const meMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const campusLabelMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const venuePopupRef = useRef<mapboxgl.Popup | null>(null);
  const activePopupVenueIdRef = useRef<string | null>(null);
  const autoLocatedRef = useRef(false);
  const focusDistrictAppliedRef = useRef<string | null>(null);
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

  // Region-scoped venue loading (2026-09, at explicit user request: "only
  // fetch current region data on load, and go fetch another region's data
  // if the user starts to navigate between regions" — "essentially then
  // only the venue data of the region you are in will be loaded, so we can
  // handle lots of venues"). `focusedMetro` is whichever metro's venues are
  // actually being shown/ranked right now. `regionPromptReason` drives the
  // popup below (rendered near the return statement) — three cases funnel
  // into the same picker, all of them meaning "we don't know which one
  // region you want, ask": 'lost' (the camera is outside every metro's
  // coverage — real "no man's land" between markets), 'zoomed-out' (below
  // REGION_PICKER_ZOOM_THRESHOLD, more than one region could plausibly be
  // in frame), or a specific MetroId (the camera IS sitting inside one real
  // metro, it's just not loaded yet). Revised 2026-09, at explicit user
  // request, replacing an earlier quiet bottom-bar-swap version: "a pop up
  // over the map... when a user navigates out into no mans land, or zooms
  // out way bigger than a region... upon selection it navigates into that
  // region... and loads in the region's data."
  const contentVersion = useContentVersion();
  const [focusedMetro, setFocusedMetro] = useState<MetroId | null>(() => metroForPoint(center));
  // Read inside the detection effect below instead of listing focusedMetro
  // as a dependency — deliberately. Setting focusedMetro (from either
  // branch that does it below) must never itself re-trigger a fresh
  // detection pass: the effect would then re-derive the prompt from
  // whatever center/zoomLevel currently hold, which — if the camera's
  // fly-to animation is still mid-flight, slow, or (rarely) never fires
  // its moveend at all — can still be the *old* position, flashing the
  // popup straight back on for a choice the user just explicitly made.
  // With focusedMetro out of the dependency array, this effect only ever
  // re-runs on a genuine camera move, which is the only thing it should
  // actually be reacting to.
  const focusedMetroRef = useRef(focusedMetro);
  focusedMetroRef.current = focusedMetro;
  const [regionPromptReason, setRegionPromptReason] = useState<'lost' | 'zoomed-out' | MetroId | null>(null);
  const [promptDismissed, setPromptDismissed] = useState(false);
  const [switchingRegion, setSwitchingRegion] = useState(false);

  useEffect(() => {
    // Any real camera move gets a fresh chance to prompt — dismissing the
    // popup only ever hides it for the current, unmoving camera position.
    setPromptDismissed(false);

    // Sample the whole visible viewport, not just the exact center point —
    // found live 2026-09-18, still too aggressive after the first fix
    // ("increase the radius... until a user can't see any live region on
    // their screen"): the true camera center can sit in a real empty gap
    // while plenty of a loaded region is still visible elsewhere on
    // screen, especially on a narrow phone viewport where the visible map
    // area is a tall sliver rather than a square around the center. Bounds
    // corners + center is a cheap, good-enough stand-in for a full
    // polygon-intersection check: if a loaded metro shows up at any of
    // these five points, something real is genuinely on screen.
    const samplePoints = bounds
      ? [
          center,
          bounds.ne,
          bounds.sw,
          { lat: bounds.ne.lat, lon: bounds.sw.lon },
          { lat: bounds.sw.lat, lon: bounds.ne.lon },
        ]
      : [center];
    const visibleLoadedMetro = samplePoints
      .map((p) => metroForPoint(p))
      .find((m): m is MetroId => !!m && isMetroLoaded(m));

    // Inside any already-loaded metro (the one we're focused on, or a
    // loaded sibling like Manchester <-> Cheshire) — always just follow the
    // camera, never prompt, regardless of zoom level.
    if (visibleLoadedMetro) {
      if (visibleLoadedMetro !== focusedMetroRef.current) setFocusedMetro(visibleLoadedMetro);
      setRegionPromptReason(null);
      return;
    }

    // Nothing loaded is visible anywhere on screen — now it's worth asking.
    if (zoomLevel < REGION_PICKER_ZOOM_THRESHOLD) {
      setRegionPromptReason('zoomed-out');
      return;
    }
    const detected = metroForPoint(center);
    if (!detected) {
      setRegionPromptReason('lost');
      return;
    }
    setRegionPromptReason(detected);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center, zoomLevel, bounds]);

  // Every real metro currently offered by the app, for the picker —
  // DISTRICTS is already Santorini-filtered when the Holiday feature is
  // off (see seed.ts), so that stays out of this list too without needing
  // its own check here.
  const availableMetros = useMemo(
    () => Array.from(new Set(DISTRICTS.map((d) => d.metro))) as MetroId[],
    []
  );

  /** Simple average of a metro's own district coordinates — good enough to
   * fly the camera somewhere sensible inside it; the district glow/labels
   * that render once there are what actually orient the user, not this
   * exact point. */
  function metroCentroid(metro: MetroId): GeoPoint | null {
    const inMetro = DISTRICTS.filter((d) => d.metro === metro);
    if (inMetro.length === 0) return null;
    return {
      lat: inMetro.reduce((sum, d) => sum + d.lat, 0) / inMetro.length,
      lon: inMetro.reduce((sum, d) => sum + d.lon, 0) / inMetro.length,
    };
  }

  async function handleSelectRegion(metro: MetroId) {
    setSwitchingRegion(true);
    try {
      await loadVenuesForMetro(metro);
      const target = metroCentroid(metro);
      const map = mapRef.current;
      if (target && map) {
        map.flyTo({ center: [target.lon, target.lat], zoom: DEFAULT_ZOOM_LEVEL, duration: 800 });
        // Wait for the fly-to's own moveend before touching focusedMetro —
        // the detection effect above reacts to center/zoomLevel, which only
        // update once syncFromCamera's moveend handler runs. Setting
        // focusedMetro first (before the camera's actually arrived) made
        // that effect re-run against the *old*, pre-flight center/zoom,
        // briefly flashing the popup back on for whatever the old reading
        // was (e.g. still-zoomed-out) before the real position caught up a
        // moment later. A short timeout fallback guards against 'moveend'
        // never firing for some reason, so this can't hang forever.
        await Promise.race([
          new Promise<void>((resolve) => map.once('moveend', () => resolve())),
          new Promise<void>((resolve) => setTimeout(resolve, 2000)),
        ]);
      }
      setFocusedMetro(metro);
      setRegionPromptReason(null);
    } finally {
      setSwitchingRegion(false);
    }
  }

  const onContainerLayout = useCallback((e: LayoutChangeEvent) => {
    setContainerWidth(e.nativeEvent.layout.width);
  }, []);

  // Mount the real Mapbox GL JS map once.
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    ensureMapboxCss();
    ensureMarkerPositioningFallback();
    hideMapboxLogo();
    ensureVenuePopupStyles();
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

    // 2026-09, real bug report: navigating to a venue and back left half the
    // map rendered black. Map is a tab screen — venue detail is a stack
    // *push* on top of it (CLAUDE.md's Navigation shell), so this component
    // never unmounts and the mapboxgl.Map instance above is created exactly
    // once for the whole session (guarded by the mapRef.current check
    // above). Whatever hides this screen while venue detail covers it
    // (display:none or similar) collapses the container's measured size;
    // mapbox-gl-js doesn't repaint its internal canvas buffer to match a
    // container resize on its own; ResizeObserver both catches genuine
    // resizes (rotation, browser chrome show/hide) and the display:none
    // round trip, since that also changes the observed content box (down to
    // 0x0 and back) — map.resize() re-syncs the canvas to match every time.
    const resizeObserver = new ResizeObserver(() => {
      map.resize();
    });
    resizeObserver.observe(mapContainerRef.current);

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
      map.addSource('coverage-mask-source', { type: 'geojson', data: getCoverageMask() });
      map.addLayer({
        id: 'coverage-mask-fill',
        type: 'fill',
        source: 'coverage-mask-source',
        paint: { 'fill-color': color.baseVariants.b, 'fill-opacity': 0.94 },
      });
      map.addSource('coverage-outline-source', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: getCoveragePolygons() },
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
            filter: ['within', getDistrictLocalAreas()[d.id]] as unknown as mapboxgl.ExpressionSpecification,
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
    // University of Chicago campus outline + label (2026-09-18, at explicit
    // user request: "can we highlight his campus in some way, maybe with a
    // subtle boundary and a label?") — a personal touch for the specific
    // member this metro was built for, not a general per-metro mechanism
    // (see src/lib/map/uchicago-campus.ts's own top comment). Deliberately
    // thin/low-opacity, nothing like the bold coverage-edge glow above —
    // "subtle" was the explicit ask. The label is a plain always-present
    // marker (not routed through the labels/groupVisibleDistricts system
    // above, which exists for district clustering this single fixed point
    // doesn't need) positioned at Nominatim's own representative point for
    // the campus relation.
    const addCampusLayers = () => {
      if (map.getSource('uchicago-campus-source')) return;
      map.addSource('uchicago-campus-source', {
        type: 'geojson',
        data: UCHICAGO_CAMPUS_BOUNDARY,
      });
      map.addLayer({
        id: 'uchicago-campus-line',
        type: 'line',
        source: 'uchicago-campus-source',
        paint: { 'line-color': color.gold, 'line-width': 1.4, 'line-opacity': 0.4 },
      });
      const el = document.createElement('div');
      el.style.cssText =
        `font-family:${font.sansMedium};font-size:9px;letter-spacing:1.8px;text-transform:uppercase;` +
        `color:${color.gold};opacity:.75;white-space:nowrap;pointer-events:none;`;
      el.textContent = 'University of Chicago';
      campusLabelMarkerRef.current = new mapboxgl.Marker({ element: el, anchor: 'center' })
        .setLngLat([UCHICAGO_CAMPUS_LABEL_POINT.lon, UCHICAGO_CAMPUS_LABEL_POINT.lat])
        .addTo(map);
    };
    const hideCompetingLabels = () => hideCompetingMapLabels(map);
    map.on('load', syncFromCamera);
    map.on('load', addCoverageLayers);
    map.on('load', addDistrictGlowLayers);
    map.on('load', addCampusLayers);
    map.on('load', hideCompetingLabels);
    map.on('moveend', syncFromCamera);

    return () => {
      resizeObserver.disconnect();
      map.off('load', syncFromCamera);
      map.off('load', addCoverageLayers);
      map.off('load', addDistrictGlowLayers);
      map.off('load', addCampusLayers);
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
  // map at its plain default. Mirrors map.tsx's identical addition.
  const focusDistrictTarget = focusDistrict ? DISTRICTS.find((d) => d.id === focusDistrict) : undefined;
  useEffect(() => {
    if (focusDistrictTarget && focusDistrictAppliedRef.current !== focusDistrictTarget.id && mapRef.current) {
      focusDistrictAppliedRef.current = focusDistrictTarget.id;
      autoLocatedRef.current = true; // suppress the auto-locate-to-me effect below
      mapRef.current.flyTo({
        center: [focusDistrictTarget.lon, focusDistrictTarget.lat],
        zoom: radiusMilesToZoomLevel(SEVEN_MINUTE_WALK_RADIUS_MILES, focusDistrictTarget.lat, containerWidth),
        duration: 500,
      });
    }
  }, [focusDistrictTarget, containerWidth]);

  // Fly to the real device location the first time it resolves, once only.
  useEffect(() => {
    if (session.location && !autoLocatedRef.current && !focusDistrictTarget && mapRef.current) {
      autoLocatedRef.current = true;
      mapRef.current.flyTo({ center: [session.location.lon, session.location.lat], duration: 500 });
    }
  }, [session.location, focusDistrictTarget]);

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

  const result = useMemo(
    () => rankVenues(matchInput, VENUES, DISTRICTS, RATING_STATS),
    // contentVersion: recompute once loadVenuesForMetro() adds a newly
    // switched-to region's venues — see this file's own region-switch note
    // above.
    [matchInput, contentVersion]
  );

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
        .filter((v): v is { rank: number; venue: Venue } => !!v),
    [topRanked]
  );

  const labels = useMemo<MapLabel[]>(() => {
    if (!bounds) return [];
    const width = mapContainerRef.current?.clientWidth || containerWidth;
    return groupVisibleDistricts(districtsInBounds(bounds), zoomLevel, width);
  }, [bounds, zoomLevel, containerWidth]);

  // "If zoomed in enough, all venues on our DB are visible... subtly, so
  // the recommended matches are much more visible" (2026-09, at explicit
  // user request). Every real venue in view once past
  // ALL_VENUES_ZOOM_THRESHOLD, minus whichever ones are already showing as
  // a bright pulsing top-match pin — never render the same venue twice.
  const backgroundVenues = useMemo(() => {
    if (!bounds || zoomLevel < ALL_VENUES_ZOOM_THRESHOLD) return [];
    const topIds = new Set(topRankedVenues.map(({ venue }) => venue.id));
    return venuesInBounds(bounds).filter((v) => !topIds.has(v.id));
  }, [bounds, zoomLevel, topRankedVenues, contentVersion]);

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

  // Rebuild venue pin markers whenever the ranked top set changes. Always
  // at each venue's true coordinate — 2026-09, at explicit user request,
  // after trying (and being asked to revert) a screen-space declutter pass
  // through several iterations: "lets have the icons stay in their true
  // location always. no moving around when changing zoom." A pin sitting
  // on top of another is accepted as accurate rather than corrected for.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    pinMarkersRef.current.forEach((m) => m.remove());
    pinMarkersRef.current = topRankedVenues.map(({ venue }) => {
      const el = buildMatchPinElement(venue, session.isVenueSaved(venue.id), () => onVenuePinTap(venue));
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

  // Rebuild the subtle "every real venue" markers whenever the visible set
  // changes (pans, zooms across the threshold, or the top-match set shifts).
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    backgroundPinMarkersRef.current.forEach((m) => m.remove());
    backgroundPinMarkersRef.current = backgroundVenues.map((venue) => {
      const el = buildBackgroundPinElement(venue, session.isVenueSaved(venue.id), () => onVenuePinTap(venue));
      return new mapboxgl.Marker({ element: el, anchor: 'center' })
        .setLngLat([venue.lon, venue.lat])
        .addTo(map);
    });
    return () => {
      backgroundPinMarkersRef.current.forEach((m) => m.remove());
      backgroundPinMarkersRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backgroundVenues]);

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
    // flyToDistrict below already uses, rather than inventing a second
    // meaning for a new number. session.radiusMiles updates for free
    // through the same moveend/syncFromCamera pipeline every other camera
    // move already goes through — no separate call needed here. Mirrors
    // map.tsx's identical change.
    const target = session.location ?? MAP_HOME;
    mapRef.current?.flyTo({ center: [target.lon, target.lat], zoom: DISTRICT_DETAIL_ZOOM_THRESHOLD, duration: 400 });
  };

  // District quick-nav (2026-09, at explicit user request: "incorporate
  // [Moments' district navigation] on the map view... so users can quickly
  // pop around districts and have a look"). Unlike Moments (which filters
  // its own in-page content) or List (which navigates away to District
  // Guide), the map's own camera IS the "have a look" surface — flying it
  // to a district's centre at DISTRICT_DETAIL_ZOOM_THRESHOLD reuses the
  // exact same moveend/syncFromCamera pipeline `locate()` already does, so
  // the ranked candidate set re-centres on that district for free, no
  // separate fetch or special-cased state. Nearest-to-the-user first, same
  // haversineMiles-against-searchOrigin ordering List's district-browse
  // mode and Moments' pill row both already use. Filtered to districts
  // with at least one real venue, so no pill is a dead end. Mirrors
  // map.tsx's identical addition.
  //
  // Scoped to `focusedMetro` (2026-09-18, at explicit user report, real bug
  // — "when in chicago i shouldnt be able to quick nav to wilmslow, i
  // shouldnt see that option"): this used to sort every district in every
  // metro by raw haversine distance with no metro filter at all. That's
  // fine *within* a metro (a few miles apart), but once a metro's own
  // handful of districts are exhausted, the next-nearest by pure geography
  // is whatever real-world metro happens to be least far away — and
  // Cheshire genuinely is closer to Chicago (~3700mi) than Riyadh
  // (~6400mi), so Chester/Tarporley were filling the rest of the chip row
  // for a Chicago member. No metro to filter to (the region-prompt's
  // 'lost'/'zoomed-out' states) now shows no chips rather than a
  // cross-continent guess.
  const nearbyDistricts = useMemo(
    () =>
      DISTRICTS.filter((d) => d.metro === focusedMetro && VENUES.some((v) => v.districtId === d.id)).sort(
        (a, b) => haversineMiles(session.searchOrigin, a) - haversineMiles(session.searchOrigin, b)
      ),
    [session.searchOrigin, contentVersion, focusedMetro]
  );

  const closeVenuePopup = useCallback(() => {
    venuePopupRef.current?.remove();
    venuePopupRef.current = null;
    activePopupVenueIdRef.current = null;
  }, []);

  const flyToDistrict = (d: (typeof DISTRICTS)[number]) => {
    closeVenuePopup();
    mapRef.current?.flyTo({ center: [d.lon, d.lat], zoom: DISTRICT_DETAIL_ZOOM_THRESHOLD, duration: 450 });
  };

  // Venue pin tap behaviour (2026-09, at explicit user request: "instead of
  // going straight to the venue page, on first tap lets have a pop up
  // showing key business info... another tap takes you through to venue
  // page"). First tap on a pin opens a mapboxgl.Popup at its coordinate
  // (openPopupFor); tapping that popup navigates straight to venue detail.
  // Tapping the SAME pin again (activePopupVenueIdRef already equals its
  // id) also navigates — the second half of the "first tap: preview,
  // second tap: open" contract, for anyone who taps the pin again instead
  // of the popup itself. `rank` is the venue's real position in the full
  // ranked candidate set (not just the top-4 shown as pulsing match pins),
  // computed once here rather than threading a lookup through every caller.
  const openPopupFor = useCallback(
    (venue: Venue, rank: number | undefined) => {
      const map = mapRef.current;
      if (!map) return;
      closeVenuePopup();
      const el = buildVenuePopupElement(venue, rank, () => {
        closeVenuePopup();
        router.push(`/venue/${venue.id}`);
      });
      const popup = new mapboxgl.Popup({ closeButton: false, closeOnClick: true, offset: 20, className: 'curia-venue-popup' })
        .setLngLat([venue.lon, venue.lat])
        .setDOMContent(el)
        .addTo(map);
      popup.on('close', () => {
        activePopupVenueIdRef.current = null;
      });
      venuePopupRef.current = popup;
      activePopupVenueIdRef.current = venue.id;
    },
    [closeVenuePopup, router]
  );

  const onVenuePinTap = useCallback(
    (venue: Venue) => {
      if (activePopupVenueIdRef.current === venue.id) {
        closeVenuePopup();
        router.push(`/venue/${venue.id}`);
        return;
      }
      const rankIndex = ranked.findIndex((r) => r.venueId === venue.id);
      openPopupFor(venue, rankIndex >= 0 ? rankIndex + 1 : undefined);
    },
    [ranked, openPopupFor, closeVenuePopup, router]
  );

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
          takes over this same fixed strip along the bottom. */}
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

      {/* Region picker (2026-09, at explicit user request) — a real popup
          over the map rather than a quiet bottom-bar swap: shown whenever
          the camera can't be resolved to one specific loaded region (lost
          between markets, zoomed out past region-level, or sitting inside a
          real but not-yet-loaded one). Picking an option both flies the
          camera there and loads its venues — see handleSelectRegion above. */}
      {regionPromptReason && !promptDismissed && !switchingRegion && (
        <>
          <Pressable style={styles.backdrop} onPress={() => setPromptDismissed(true)} />
          <Card tone="sheet" style={styles.modalSheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Where to?</Text>
              <Pressable onPress={() => setPromptDismissed(true)}>
                <Text style={styles.doneLabel}>CLOSE</Text>
              </Pressable>
            </View>
            <Text style={styles.regionPromptBody}>
              {regionPromptReason === 'lost'
                ? "Curia hasn't arrived here yet — pick a region to jump straight there."
                : regionPromptReason === 'zoomed-out'
                  ? "Zoomed out too far to tell where you're headed — pick a region."
                  : `Load ${METRO_WHOLE_SET_LABEL[regionPromptReason] ?? regionPromptReason}'s venues to see what's actually here.`}
            </Text>
            <View style={styles.regionOptionList}>
              {availableMetros.map((m) => (
                <Pressable
                  key={m}
                  onPress={() => handleSelectRegion(m)}
                  disabled={switchingRegion}
                  style={styles.regionOptionRow}
                >
                  <Text style={styles.regionOptionLabel}>{METRO_WHOLE_SET_LABEL[m] ?? m}</Text>
                  <Text style={styles.regionOptionArrow}>{switchingRegion ? '···' : '→'}</Text>
                </Pressable>
              ))}
            </View>
          </Card>
        </>
      )}

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

  // 2026-09, at explicit user request: was two stacked rows (a full-height
  // context pill, then the mood pill below it) — collapsed to one row, both
  // pills compact/single-line, so the map starts noticeably higher.
  //
  // top was 56 (2026-09 update, same request): on mobile web there is no
  // native status bar/notch to clear — the browser's own chrome sits
  // outside the page viewport — so that much clearance just read as dead
  // space above the pills. Dropped to spacing.lg, matching the horizontal
  // inset already used on the same row.
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
  regionPromptBody: {
    fontFamily: font.sans,
    fontSize: 13,
    lineHeight: 20,
    color: color.textSecondary,
    marginTop: spacing.sm,
    maxWidth: 320,
  },
  regionOptionList: {
    marginTop: spacing.lg,
    gap: 2,
  },
  regionOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: color.hairlineMin,
  },
  regionOptionLabel: {
    fontFamily: font.serifRegular,
    fontSize: 18,
    color: color.textPrimary,
  },
  regionOptionArrow: {
    fontFamily: font.sans,
    fontSize: 15,
    color: color.gold,
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
