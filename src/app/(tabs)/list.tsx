import { useCallback, useMemo, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import {
  Image,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type AccessibilityActionEvent,
  type GestureResponderEvent,
} from 'react-native';
import { Card, EmblemButton, Kicker, Tag } from '../../components/curia';
import { rankVenues, haversineMiles, resolveContext, slugifyType } from '../../lib/scoring/rank-venues';
import { buildMatchmakingInputFromSession, DEMO_LOCATION } from '../../lib/scoring/session-input';
import {
  CITIES,
  DISTRICTS,
  RATING_STATS,
  useContentVersion,
  VENUES,
  tilesByCategory,
  venuesByDistrict,
} from '../../lib/data/seed';
import { placeholderPhotoFor } from '../../lib/data/placeholder-photos';
import { MAX_RADIUS_MILES, MIN_RADIUS_MILES, clampRadiusMiles } from '../../lib/map/geo';
import { useSession } from '../../lib/state/session';
import { color, font, radius, spacing } from '../../theme';
import type { TileCategory } from '../../types/models';
import type { MatchmakingInput } from '../../types/matchmaking';

/** How many matches to show in the RANKED tab, and how many of a district's
 * own top matches feed its "Districts" browse-mode ranking. 2026-09-17: the
 * Districts view briefly showed every hard-filter-passing venue in a
 * district, sorted by distinctiveness alone — with dense coverage that
 * meant unbounded per-district lists. Reverted to a real ranked list
 * (sorted by the venue's actual match score, which already folds in the
 * Gate 2 distinctiveness discount — see rank-venues.ts and CLAUDE.md's
 * Matchmaking contract) capped at a fixed size. 2026-09-18, at explicit
 * user request: the RANKED tab itself was never actually capped — a prior
 * comment here claimed it already was, which was wrong (found live, "33
 * venues" rendering uncapped) — now both views share this one cap. */
const LIST_CAP = 20;

/** 2026-09-18, at explicit user request ("rank the districts the user would
 * enjoy right now" instead of listing venues under each one): a district's
 * rank score is the average of its own top DISTRICT_SCORE_WINDOW venue
 * scores — the same rankVenues output already used everywhere else, just
 * aggregated up one level, so "which district" stays honestly derived from
 * "which venues," never a separate opaque formula. A district needs at
 * least this many real matches to be ranked at all (see
 * MIN_MATCHES_TO_RANK below) — both constants share this value on purpose,
 * since a 1-venue "average" isn't a meaningful signal either way. */
const DISTRICT_SCORE_WINDOW = 3;
const MIN_MATCHES_TO_RANK = DISTRICT_SCORE_WINDOW;

const BAND_LABEL: Record<string, string> = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  evening: 'Early evening',
  late: 'Late night',
};

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/**
 * Real List screen (M5). Renders the shared M3 `rankVenues` engine (see
 * src/lib/scoring/rank-venues.ts) against a real `MatchmakingInput` built
 * from `useSession()`'s real tile/sub-preference/You state, plus a search
 * radius and mood quick-filter this screen owns locally (Hard rule 5: Map
 * and List must render the same ranked set, but neither M4 nor a shared
 * session store yet tracks radius or mood — see the module-level comments
 * below for what's real vs. flagged).
 */

// ---------------------------------------------------------------------------
// Genuinely mocked/flagged pieces — see CLAUDE.md "Still genuinely open" and
// "Tech stack" (Mapbox key gap). None of these are silently invented as
// product decisions; they're the smallest honest stand-in for a real signal
// that doesn't exist yet.
// ---------------------------------------------------------------------------

// Location is real now (session.searchOrigin, itself backed by real device
// geolocation via session.location — see session.tsx). DEMO_LOCATION
// (src/lib/scoring/session-input.ts) survives only as the fallback of last
// resort before either has resolved, not the everyday value it used to be.

/**
 * Save/star toggle here is local component state only — there is no
 * SavedCollection model wired up yet (that's `curia-profile`'s M7 work, see
 * src/app/saved.tsx's own placeholder comment). Toggling a star on this
 * screen does not persist anywhere and resets on navigation away.
 */

// Radius bounds (MIN_RADIUS_MILES/MAX_RADIUS_MILES) now live in
// src/lib/map/geo.ts, shared with Map's zoom-driven radius sync (2026-08) so
// the two screens can never disagree on the range.
const RADIUS_STEP = 0.25;
// Default initial radius (0.9mi, the prototype's own `state.radius`) now
// lives in src/lib/state/session.tsx, since it's shared with Map.

function clampRadius(value: number): number {
  const clamped = Math.min(MAX_RADIUS_MILES, Math.max(MIN_RADIUS_MILES, value));
  return Math.round(clamped / RADIUS_STEP) * RADIUS_STEP;
}

/** Mirrors the prototype's own `miles()` formatter exactly (Curia.dc.html). */
function formatMiles(value: number): string {
  const n = value % 1 === 0 ? String(value) : value.toFixed(2).replace(/0$/, '');
  return `${n} ${value === 1 ? 'mile' : 'miles'}`;
}

/** 2026-09-18, at explicit user report: the radius always measures from
 * session.searchOrigin, which follows wherever Map's camera was last left
 * (see session.tsx's own doc comment) — not necessarily where the member
 * physically is. Nothing on this screen said so, so "within 2 miles"
 * showing Didsbury/Heaton Moor read as a bug ("wait, Didsbury is further
 * than 2 miles?") rather than the deliberate "you're browsing wherever you
 * last looked on the map" behaviour it actually is. `nearLabel` (nearest
 * district's name to searchOrigin) makes the center point visible instead
 * of implicit. */
function radiusLabelFor(value: number, nearLabel?: string): string {
  if (value >= MAX_RADIUS_MILES) return 'Anywhere in the region';
  const base = `Within ${formatMiles(value)}`;
  return nearLabel ? `${base} of ${nearLabel}` : base;
}

function radiusHintFor(value: number): string {
  if (value <= 2) return 'WALKABLE';
  if (value <= 8) return 'SHORT CAB';
  return 'WORTH THE DRIVE';
}

function radiusNoteFor(value: number): string {
  if (value <= 2) return 'Close to home. We let proximity break ties between good matches.';
  if (value <= 10) return 'You will travel a little, so we weigh the walk lightly.';
  return 'You have told us distance is no object. Ranked on fit alone.';
}

/** Same radius, same thresholds, different meaning: on the Districts view
 * this is a hard filter on which districts even appear (see
 * districtsByMetro's own comment), not a tie-breaker on an already-ranked
 * list — the copy says so rather than reusing radiusNoteFor's RANKED-tab
 * wording, which would misdescribe what the slider actually does here. */
function districtRadiusNoteFor(value: number): string {
  if (value <= 2) return 'Only the closest districts make the cut.';
  if (value <= 10) return 'A comfortable trip out — nothing further shows up.';
  return 'You have told us distance is no object. Every district in range, ranked on fit.';
}

/** Distance + walk/drive estimate, matching the prototype's own listRows formatting exactly. */
function formatDistance(distanceMiles: number): string {
  const meters = distanceMiles * 1609;
  const estimate =
    meters < 805
      ? `${Math.max(2, Math.round(meters / 80))} MIN WALK`
      : `${Math.max(4, Math.round((meters * 1.28) / 420))} MIN DRIVE`;
  return `${distanceMiles.toFixed(1)} MI · ${estimate}`;
}

/**
 * Which tile catalog entries (src/lib/data/seed.ts TILES) can actually
 * restrict today's 15-venue seed set. There is no admin-curated Tile↔Venue
 * mapping yet, so "covered" is approximated by slug equality between the
 * tile's own name and a seed venue's `type` (both run through the same
 * `slugifyType` M3 already uses for its own tile-match scoring) — the same
 * spirit as the prototype's own `covered` map, just derived from `type`
 * instead of a `TRAITS` table this repo doesn't have. See the M5 report for
 * why this only surfaces a handful of tiles today (a real, cross-milestone
 * gap between M3's slug convention and M4's real tile names, not something
 * to silently paper over here).
 */
function coveredTiles(category: TileCategory) {
  // Computed fresh on every call, not a module-level const: VENUES
  // (src/lib/data/seed.ts) is empty until loadContentData() resolves, well
  // after this module is first imported — see src/lib/map/geo.ts's
  // getCoveragePolygons/getCoverageMask doc comment for the same bug caught
  // there. Cheap enough (134 venues) to just recompute rather than cache.
  const venueTypeSlugs = new Set(VENUES.map((v) => slugifyType(v.type)));
  return tilesByCategory(category)
    .map((tile) => ({ tile, slug: slugifyType(tile.name) }))
    .filter(({ slug }) => venueTypeSlugs.has(slug));
}

const MOOD_CATEGORIES: TileCategory[] = ['Do', 'Drink', 'Eat'];

function RadiusSlider({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  const trackRef = useRef<View>(null);
  const [layout, setLayout] = useState({ pageX: 0, width: 1 });

  const measure = useCallback(() => {
    const node = trackRef.current;
    node?.measure((_x, _y, width, _height, pageX) => {
      setLayout({ pageX, width: Math.max(1, width) });
    });
  }, []);

  const valueFromPageX = useCallback(
    (pageX: number) => {
      const ratio = Math.min(1, Math.max(0, (pageX - layout.pageX) / layout.width));
      return clampRadius(MIN_RADIUS_MILES + ratio * (MAX_RADIUS_MILES - MIN_RADIUS_MILES));
    },
    [layout]
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (evt: GestureResponderEvent) => onChange(valueFromPageX(evt.nativeEvent.pageX)),
        onPanResponderMove: (evt: GestureResponderEvent) => onChange(valueFromPageX(evt.nativeEvent.pageX)),
      }),
    [onChange, valueFromPageX]
  );

  const ratio = (value - MIN_RADIUS_MILES) / (MAX_RADIUS_MILES - MIN_RADIUS_MILES);

  const onAccessibilityAction = useCallback(
    (event: AccessibilityActionEvent) => {
      if (event.nativeEvent.actionName === 'increment') onChange(clampRadius(value + RADIUS_STEP));
      if (event.nativeEvent.actionName === 'decrement') onChange(clampRadius(value - RADIUS_STEP));
    },
    [onChange, value]
  );

  return (
    <View
      ref={trackRef}
      onLayout={measure}
      {...panResponder.panHandlers}
      style={styles.sliderTrack}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel="Search radius"
      accessibilityValue={{ min: MIN_RADIUS_MILES, max: MAX_RADIUS_MILES, now: value, text: formatMiles(value) }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={onAccessibilityAction}
    >
      <View style={styles.sliderRail} />
      <View style={[styles.sliderFill, { width: `${ratio * 100}%` }]} />
      <View style={[styles.sliderThumb, { left: `${ratio * 100}%` }]} />
    </View>
  );
}

export default function List() {
  const router = useRouter();
  const session = useSession();
  // Re-renders once a region switch (triggered on Map) adds a newly-loaded
  // metro's venues to VENUES — see src/lib/data/seed.ts's own doc comment.
  const contentVersion = useContentVersion();

  // Shared with Map via session state, not local — Hard rule 5 ("Map and
  // List share one radius and one context, so switching tabs never changes
  // the answer"). radiusMiles, context, and mood all lived as separate
  // per-screen state at various points; all three now come from
  // src/lib/state/session.tsx so List and Map can never drift apart.
  const { radiusMiles, setRadiusMiles, setSearchOrigin, context, mood, isVenueSaved, toggleSavedVenue } = session;
  // `context.weather` is synthesized here from the real fetched
  // `session.weather`, the same fix map.tsx/map.web.tsx already carry (see
  // their own doc comments) — List never had it, so scoreWeather (and the
  // new contextNoteFor "why this works right now" note) silently never
  // fired here even though session.weather was always real. Found while
  // building contextNoteFor, 2026-09-18.
  const contextWithWeather = useMemo(
    () => ({ ...context, weather: session.weather ?? undefined }),
    [context, session.weather]
  );
  const [moodOpen, setMoodOpen] = useState(false);

  const clearMood = useCallback(() => {
    session.clearMood();
  }, [session]);

  const selectMoodCategory = useCallback(
    (category: TileCategory) => {
      session.setMoodCategory(category);
    },
    [session]
  );

  const toggleMoodTile = useCallback(
    (slug: string) => {
      session.toggleMoodTile(slug);
    },
    [session]
  );

  const moodCategory = mood?.category ?? null;
  const moodSlugs = mood?.tileIds ?? [];
  const moodOn = moodCategory !== null;
  const moodCoveredTiles = useMemo(
    () => (moodCategory ? coveredTiles(moodCategory) : []),
    [moodCategory]
  );
  const moodSelectedNames = useMemo(
    () => moodCoveredTiles.filter(({ slug }) => moodSlugs.includes(slug)).map(({ tile }) => tile.name),
    [moodCoveredTiles, moodSlugs]
  );

  const moodKickerText = moodOn ? 'JUST FOR TONIGHT' : 'IN THE MOOD TO';
  const moodLabelText = !moodOn
    ? 'Do · Drink · Eat'
    : moodSelectedNames.length
      ? `${moodCategory} · ${moodSelectedNames[0]}${
          moodSelectedNames.length > 1 ? ` +${moodSelectedNames.length - 1}` : ''
        }`
      : moodCategory;
  const moodNoteText = !moodCategory
    ? 'Pick one for tonight only. Your saved preferences stay exactly as they are.'
    : moodCoveredTiles.length === 0
      ? 'Nothing narrower to offer in this category yet.'
      : moodSlugs.length
        ? 'Refine below if you know what you are after, or leave it broad.'
        : 'Add a tile or two if you want to be more particular.';

  const moodFilter = useMemo<MatchmakingInput['moodFilter']>(() => {
    if (!moodCategory) return undefined;
    return { category: moodCategory, tileIds: moodSlugs, subPreferences: [] };
  }, [moodCategory, moodSlugs]);

  // Built via the same helper Map uses (src/lib/scoring/session-input.ts),
  // not a hand-rolled copy — an M9 QA pass found this screen's own
  // hand-built input used a slightly different DEMO_LOCATION than Map's
  // (~0.2mi apart), which could let a venue near the radius boundary pass
  // the hard filter on one tab and fail it on the other for the same
  // nominal radius. Sharing the one builder closes that for good, the same
  // way session.radiusMiles closed the earlier radius-drift gap.
  //
  // context now comes from shared session state too (see session.tsx) —
  // List has no day/time picker UI of its own (that stays Map's surface,
  // per curia-list's brief), but reads whatever Map last set so a manual
  // "planning for Friday evening" selection on Map still applies here
  // instead of silently reverting to "now".
  //
  // location is session.searchOrigin, not session.location (2026-08, at
  // explicit user request) — List has no map of its own to pan, but must
  // rank against the same origin Map currently does (Hard rule 5): if the
  // user panned Map to Manchester, List should show Manchester's best
  // matches too, not silently fall back to real location. See session.tsx's
  // searchOrigin doc comment.
  const matchmakingInput = useMemo<MatchmakingInput>(
    () =>
      buildMatchmakingInputFromSession(session, {
        radiusMiles,
        context: contextWithWeather,
        moodFilter,
        location: session.searchOrigin,
      }),
    [session, radiusMiles, contextWithWeather, moodFilter]
  );

  const result = useMemo(
    () => rankVenues(matchmakingInput, VENUES, DISTRICTS, RATING_STATS),
    [matchmakingInput, contentVersion]
  );

  // Capped to LIST_CAP (2026-09-18) — with dense coverage, result.ranked can
  // run into the hundreds; the RANKED tab is "best matches," not "every
  // hard-filter-passing venue," so only the top LIST_CAP are ever rendered.
  const rankedVisible = useMemo(() => result.ranked.slice(0, LIST_CAP), [result]);

  const listHeadline = rankedVisible.length
    ? `${rankedVisible.length} ${rankedVisible.length === 1 ? 'venue' : 'venues'}`
    : 'Nothing in range';

  // Mirrors the prototype's own `listMeta` (Curia.dc.html): "RANKED FOR NOW"
  // when context.now, otherwise the specific day/band being planned for.
  const resolvedContext = resolveContext(context);
  const listMeta = context.now
    ? 'RANKED FOR NOW'
    : `${capitalize(resolvedContext.day)} · ${BAND_LABEL[resolvedContext.band]}`.toUpperCase();

  // "Districts" browse mode (2026-08, at explicit user request: "a way to
  // more easily explore districts... shows top matches in each district").
  // Reuses District Guide's own established pattern
  // (src/app/district/[id].tsx) for exactly this: a district-centered
  // matchInput with radiusMiles effectively unlimited, ranking only that
  // district's own venues — so browsing isn't accidentally constrained by
  // whatever radius the RANKED tab's slider happens to be set to right now
  // (the whole point is looking beyond it). Mood still applies (Hard rule
  // 5's "mood restricts the candidate pool" contract), so switching tabs
  // here never disagrees with what the RANKED tab would show for the same
  // mood — only the distance hard filter is deliberately not in play, the
  // same deliberate exception District Guide already makes.
  const [viewMode, setViewMode] = useState<'ranked' | 'districts'>('ranked');

  const districtMatches = useMemo(() => {
    if (viewMode !== 'districts') return [];
    return DISTRICTS.map((d) => {
      const input = buildMatchmakingInputFromSession(session, {
        context: contextWithWeather,
        moodFilter,
        location: { lat: d.lat, lon: d.lon },
        radiusMiles: 999,
      });
      const districtVenues = venuesByDistrict(d.id);
      const ranked = rankVenues(input, districtVenues, DISTRICTS, RATING_STATS).ranked;
      const matches = ranked
        .map((r) => {
          const venue = districtVenues.find((v) => v.id === r.venueId);
          return venue ? { venue, score: r.score, reason: r.reason } : null;
        })
        .filter((m): m is { venue: (typeof districtVenues)[number]; score: number; reason: string } => !!m)
        .sort((a, b) => (b.score !== a.score ? b.score - a.score : a.venue.name.localeCompare(b.venue.name)));
      const topWindow = matches.slice(0, DISTRICT_SCORE_WINDOW);
      // "How much would you enjoy this district right now" — the average of
      // its own top few matches, not a separate opaque formula (see
      // DISTRICT_SCORE_WINDOW's own comment above).
      const rankScore = topWindow.length
        ? topWindow.reduce((sum, m) => sum + m.score, 0) / topWindow.length
        : 0;
      const topVenue = matches[0]?.venue;
      const distanceMiles = haversineMiles(session.searchOrigin, { lat: d.lat, lon: d.lon });
      return { district: d, matchCount: matches.length, rankScore, topVenue, distanceMiles };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, session, contextWithWeather, moodFilter, contentVersion]);

  const districtsByMetro = useMemo(() => {
    return CITIES.map((city) => {
      // A district needs real matches to be worth recommending as "go here
      // right now" — see MIN_MATCHES_TO_RANK's own comment. Thin/uncurated
      // districts (many still have 0-2 venues) simply don't appear in this
      // view rather than showing an empty or misleadingly-ranked card.
      //
      // radiusMiles is a hard filter here (2026-09-18, at explicit user
      // request: "add a radius filter to the districts list like on the
      // venues list page") — same session-level radius the RANKED tab's
      // slider controls (Hard rule 5: one radius for the whole List page),
      // applied to the district's own distance rather than to any single
      // venue's. This is a different use of the same value from the 999
      // passed into each district's own internal matchInput above — that
      // 999 is deliberately unlimited so a district that DOES pass this
      // filter still ranks by its true best matches, not ones artificially
      // cut off at the same radius a second time.
      const inMetro = districtMatches.filter(
        (dm) =>
          dm.district.metro === city.id &&
          dm.matchCount >= MIN_MATCHES_TO_RANK &&
          dm.distanceMiles <= radiusMiles
      );
      const sorted = [...inMetro].sort((a, b) => b.rankScore - a.rankScore);
      return { city, districts: sorted };
    }).filter((m) => m.districts.length > 0);
  }, [districtMatches, radiusMiles]);

  // Found live 2026-09-18 ("i see a profile icon... that says AV?"): this
  // was a hardcoded literal, never wired to the real signed-in user, unlike
  // Map's own EmblemButton (map.tsx/map.web.tsx) which both already derive
  // this from session.user?.name — same computation here now.
  const initials = (session.user?.name ?? 'You')
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  // District quick-nav for the RANKED tab (2026-09, at explicit user
  // request: "incorporate [Moments' district navigation] on... list view").
  // The DISTRICTS tab above is already a full district browser, so this
  // isn't repeated there — it exists to let someone jump straight to
  // District Guide for a specific district without leaving RANKED first.
  // Nearest-to-the-user first, same ordering districtsByMetro and Moments'
  // own pill row both use; filtered to districts with a real venue so no
  // pill is a dead end.
  const nearbyDistricts = useMemo(
    () =>
      DISTRICTS.filter((d) => venuesByDistrict(d.id).length > 0).sort(
        (a, b) => haversineMiles(session.searchOrigin, a) - haversineMiles(session.searchOrigin, b)
      ),
    [session.searchOrigin, contentVersion]
  );

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Kicker>{viewMode === 'ranked' ? 'Ranked for you' : 'Explore by district'}</Kicker>
            <Text style={styles.headline}>
              {viewMode === 'ranked' ? listHeadline : `${districtsByMetro.reduce((n, m) => n + m.districts.length, 0)} districts`}
            </Text>
            <Text style={styles.meta}>{listMeta}</Text>
          </View>
          <EmblemButton initials={initials} onPress={() => router.push('/profile')} />
        </View>

        <View style={styles.viewModeRow}>
          {(['ranked', 'districts'] as const).map((mode) => (
            <Pressable key={mode} onPress={() => setViewMode(mode)} style={styles.viewModeTab}>
              <Text style={[styles.viewModeLabel, viewMode === mode && styles.viewModeLabelActive]}>
                {mode === 'ranked' ? 'RANKED' : 'DISTRICTS'}
              </Text>
              {viewMode === mode && <View style={styles.viewModeUnderline} />}
            </Pressable>
          ))}
        </View>

        <Pressable
          onPress={() => setMoodOpen(true)}
          style={[styles.moodPill, moodOn && styles.moodPillOn]}
        >
          <View style={styles.moodTextCol}>
            <Text style={[styles.moodKicker, moodOn && styles.moodKickerOn]} numberOfLines={1}>
              {moodKickerText}
            </Text>
            <Text style={[styles.moodLabel, moodOn && styles.moodLabelOn]} numberOfLines={1}>
              {moodLabelText}
            </Text>
          </View>
          {moodOn && (
            <Pressable onPress={clearMood} hitSlop={8}>
              <Text style={styles.moodClear}>×</Text>
            </Pressable>
          )}
        </Pressable>

        <Card tone="inset" style={styles.radiusCard}>
          <View style={styles.radiusHeader}>
            <Kicker style={styles.radiusKicker}>Search radius</Kicker>
            <Text style={styles.radiusValue}>{radiusLabelFor(radiusMiles, nearbyDistricts[0]?.name)}</Text>
          </View>
          <Pressable
            onPress={() => setSearchOrigin(session.location ?? DEMO_LOCATION)}
            hitSlop={8}
            style={styles.radiusRecenterRow}
          >
            <Text style={styles.radiusRecenter}>Use my location</Text>
          </Pressable>
          <RadiusSlider value={radiusMiles} onChange={setRadiusMiles} />
          <View style={styles.radiusEndpoints}>
            <Text style={styles.radiusEndpoint}>¼ MI</Text>
            <Text style={styles.radiusEndpoint}>{radiusHintFor(radiusMiles)}</Text>
            <Text style={styles.radiusEndpoint}>30 MI</Text>
          </View>
          <Text style={styles.radiusNote}>
            {viewMode === 'districts' ? districtRadiusNoteFor(radiusMiles) : radiusNoteFor(radiusMiles)}
          </Text>
        </Card>

        {viewMode === 'districts' ? (
          <View style={styles.districtBrowse}>
            {districtsByMetro.length === 0 ? (
              <Text style={styles.districtEmptyNote}>
                {moodOn
                  ? 'Nothing matches this mood right now — try clearing it.'
                  : `Nothing within ${formatMiles(radiusMiles)} of ${nearbyDistricts[0]?.name ?? 'here'} has built up enough real matches to rank yet. Try widening the radius above.`}
              </Text>
            ) : (
              districtsByMetro.map(({ city, districts }) => (
                <View key={city.id} style={styles.metroGroup}>
                  <Kicker style={styles.metroKicker}>{city.name}</Kicker>
                  {districts.map(({ district, topVenue, distanceMiles }) => {
                    const photoUri = topVenue?.photos[0] ?? placeholderPhotoFor(topVenue?.type ?? '', topVenue?.id);
                    return (
                      <Pressable
                        key={district.id}
                        onPress={() => router.push(`/district/${district.id}`)}
                        style={styles.districtCard}
                      >
                        <Image source={{ uri: photoUri }} style={styles.districtPhoto} resizeMode="cover" />
                        <View style={styles.districtCardBody}>
                          <View style={styles.districtCardHeader}>
                            <Text style={styles.districtName}>{district.name}</Text>
                            <Text style={styles.districtDistance}>{formatDistance(distanceMiles)}</Text>
                          </View>
                          {district.editorialDescription && (
                            <Text style={styles.districtDescription} numberOfLines={3}>
                              {district.editorialDescription}
                            </Text>
                          )}
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              ))
            )}
          </View>
        ) : (
          <>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.districtNavRow}
            >
              {nearbyDistricts.map((d) => (
                <Tag key={d.id} label={d.name} onPress={() => router.push(`/district/${d.id}`)} />
              ))}
            </ScrollView>

            <View style={styles.rows}>
          {rankedVisible.map((r, i) => {
            const venue = VENUES.find((v) => v.id === r.venueId);
            if (!venue) return null;
            const district = DISTRICTS.find((d) => d.id === venue.districtId);
            // session.searchOrigin, not the fixed DEMO_LOCATION constant —
            // the displayed distance must agree with whatever point the
            // radius hard filter above actually measured from (2026-08),
            // or a venue could show "0.3 miles away" while you're browsing
            // an area nowhere near it.
            const distanceMiles = haversineMiles(session.searchOrigin, venue);
            const saved = isVenueSaved(venue.id);
            return (
              <View key={venue.id} style={styles.row}>
                <Pressable onPress={() => router.push(`/venue/${venue.id}`)}>
                  <View style={styles.photo}>
                    <Image
                      source={{ uri: venue.photos[0] ?? placeholderPhotoFor(venue.type, venue.id) }}
                      style={styles.photoImage}
                      resizeMode="cover"
                    />
                    <View style={styles.rankBadge}>
                      <Text style={styles.rankBadgeText}>NO. {i + 1}</Text>
                    </View>
                  </View>
                </Pressable>
                <View style={styles.rowBody}>
                  <Pressable style={styles.rowNameCol} onPress={() => router.push(`/venue/${venue.id}`)}>
                    <Text style={styles.name} numberOfLines={2}>
                      {venue.name}
                    </Text>
                    <View style={styles.typeRow}>
                      <Text style={styles.type} numberOfLines={1}>
                        {(district?.name ?? '').toUpperCase()} · {venue.type}
                      </Text>
                      {venue.status === 'coming-soon' && (
                        <View style={styles.newBadge}>
                          <Text style={styles.newBadgeText}>NEW</Text>
                        </View>
                      )}
                    </View>
                  </Pressable>
                  <View style={styles.rowRight}>
                    <View style={styles.rowRightText}>
                      <Text style={styles.spend}>{'£'.repeat(venue.spendLevel)}</Text>
                      <Text style={styles.dist}>{formatDistance(distanceMiles)}</Text>
                    </View>
                    <Pressable
                      onPress={() => toggleSavedVenue(venue.id)}
                      hitSlop={8}
                      style={[styles.saveButton, saved && styles.saveButtonOn]}
                      accessibilityRole="button"
                      accessibilityLabel={saved ? `Unsave ${venue.name}` : `Save ${venue.name}`}
                    >
                      <Text style={[styles.saveMark, saved && styles.saveMarkOn]}>
                        {saved ? '✦' : '✧'}
                      </Text>
                    </Pressable>
                  </View>
                </View>
                <Text style={styles.reason}>{r.reason}</Text>
                {r.contextNote && <Text style={styles.contextNote}>{r.contextNote}</Text>}
              </View>
            );
          })}

          {result.empty && (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyTitle}>
                Nothing within {formatMiles(radiusMiles)} of {nearbyDistricts[0]?.name ?? 'here'}.
              </Text>
              <Text style={styles.emptyNote}>
                {moodOn
                  ? `Nothing matching this mood inside ${formatMiles(
                      radiusMiles
                    )}. Widen the search, or clear the mood to see everything you normally would.`
                  : 'Widen the radius above and we will find you something worth the journey.'}
              </Text>
            </View>
          )}
            </View>
          </>
        )}
      </ScrollView>

      <Modal
        visible={moodOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setMoodOpen(false)}
      >
        <Pressable style={styles.sheetBackdrop} onPress={() => setMoodOpen(false)} />
        <Card tone="sheet" style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>I&rsquo;m in the mood to…</Text>
            <Pressable onPress={() => setMoodOpen(false)}>
              <Text style={styles.sheetDone}>DONE</Text>
            </Pressable>
          </View>

          <View style={styles.moodCatRow}>
            {MOOD_CATEGORIES.map((cat) => {
              const on = moodCategory === cat;
              return (
                <Pressable
                  key={cat}
                  onPress={() => selectMoodCategory(cat)}
                  style={[styles.moodCatButton, on && styles.moodCatButtonOn]}
                >
                  <Text style={[styles.moodCatLabel, on && styles.moodCatLabelOn]}>{cat}</Text>
                </Pressable>
              );
            })}
          </View>

          {moodCategory && moodCoveredTiles.length > 0 && (
            <>
              <Kicker style={styles.narrowKicker}>Narrow it (optional)</Kicker>
              <View style={styles.moodTileWrap}>
                {moodCoveredTiles.map(({ tile, slug }) => {
                  const on = moodSlugs.includes(slug);
                  return (
                    <Pressable
                      key={tile.id}
                      onPress={() => toggleMoodTile(slug)}
                      style={[styles.moodTile, on && styles.moodTileOn]}
                    >
                      <Text style={[styles.moodTileLabel, on && styles.moodTileLabelOn]}>{tile.name}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          )}

          <Text style={styles.moodNote}>{moodNoteText}</Text>

          {moodOn && (
            <Pressable
              onPress={() => {
                clearMood();
                setMoodOpen(false);
              }}
              style={styles.moodClearAll}
            >
              <Text style={styles.moodClearAllLabel}>CLEAR AND USE MY PREFERENCES</Text>
            </Pressable>
          )}
        </Card>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: color.baseVariants.c,
  },
  scroll: {
    paddingBottom: spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
  },
  headerText: {
    flex: 1,
  },
  headline: {
    fontFamily: font.serif,
    fontSize: 30,
    color: color.textPrimary,
    marginTop: spacing.sm,
  },
  meta: {
    fontFamily: font.sans,
    fontSize: 11.5,
    letterSpacing: 1.6,
    color: color.textSecondary,
    marginTop: 8,
  },

  viewModeRow: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginTop: spacing.lg,
    marginHorizontal: spacing.lg,
  },
  viewModeTab: {
    paddingBottom: spacing.sm,
  },
  viewModeLabel: {
    fontFamily: font.sansMedium,
    fontSize: 11,
    letterSpacing: 2,
    color: color.textTertiary,
  },
  viewModeLabelActive: {
    color: color.textPrimary,
  },
  viewModeUnderline: {
    marginTop: 6,
    height: 2,
    backgroundColor: color.gold,
    borderRadius: 1,
  },

  districtBrowse: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    gap: spacing.xl,
  },
  metroGroup: {
    gap: spacing.md,
  },
  metroKicker: {
    fontSize: 10,
  },
  districtCard: {
    gap: spacing.sm,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: color.hairlineMin,
  },
  districtPhoto: {
    height: 172,
    borderRadius: radius.lg,
    backgroundColor: color.surface,
    overflow: 'hidden',
  },
  districtCardBody: {
    gap: 4,
  },
  districtCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: spacing.sm,
  },
  districtName: {
    fontFamily: font.serif,
    fontSize: 20,
    color: color.textPrimary,
  },
  districtDistance: {
    fontFamily: font.sans,
    fontSize: 10.5,
    letterSpacing: 1,
    color: color.textTertiary,
  },
  districtDescription: {
    fontFamily: font.serifRegular,
    fontSize: 14,
    lineHeight: 20,
    color: color.textSecondary,
  },
  districtEmptyNote: {
    fontFamily: font.serifRegular,
    fontStyle: 'italic',
    fontSize: 13,
    color: color.textSecondary,
    paddingVertical: 4,
  },
  moodPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    alignSelf: 'flex-start',
    marginTop: spacing.md,
    marginHorizontal: spacing.lg,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.hairlineMax,
    backgroundColor: 'rgba(19,17,16,.78)',
  },
  moodPillOn: {
    borderColor: 'rgba(192,160,98,.55)',
    backgroundColor: 'rgba(192,160,98,.14)',
  },
  moodTextCol: {
    minWidth: 0,
    flexShrink: 1,
  },
  moodKicker: {
    fontFamily: font.sansRegular,
    fontSize: 8.5,
    letterSpacing: 1.6,
    color: color.textSecondary,
  },
  moodKickerOn: {
    color: color.gold,
  },
  moodLabel: {
    fontFamily: font.serifRegular,
    fontSize: 13,
    color: color.textSecondaryAlt,
    marginTop: 4,
  },
  moodLabelOn: {
    color: color.textPrimary,
  },
  moodClear: {
    fontFamily: font.sans,
    fontSize: 14,
    color: color.gold,
    paddingHorizontal: 2,
  },

  districtNavRow: {
    gap: spacing.sm - 2,
    marginTop: spacing.md,
    marginHorizontal: spacing.lg,
    paddingBottom: 2,
  },
  radiusCard: {
    marginTop: spacing.md,
    marginHorizontal: spacing.lg,
  },
  radiusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  radiusKicker: {
    fontSize: 9.5,
  },
  radiusValue: {
    fontFamily: font.sans,
    fontSize: 12.5,
    letterSpacing: 0.8,
    color: color.textPrimary,
  },
  radiusRecenterRow: {
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  radiusRecenter: {
    fontFamily: font.sans,
    fontSize: 10.5,
    letterSpacing: 0.6,
    color: color.gold,
  },
  sliderTrack: {
    height: 24,
    justifyContent: 'center',
    marginTop: 12,
  },
  sliderRail: {
    height: 2,
    borderRadius: 1,
    backgroundColor: color.hairlineMax,
  },
  sliderFill: {
    position: 'absolute',
    left: 0,
    height: 2,
    borderRadius: 1,
    backgroundColor: color.gold,
  },
  sliderThumb: {
    position: 'absolute',
    top: 3,
    marginLeft: -9,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: color.goldLight,
    borderWidth: 1,
    borderColor: color.gold,
  },
  radiusEndpoints: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  radiusEndpoint: {
    fontFamily: font.sans,
    fontSize: 9,
    letterSpacing: 1.4,
    color: color.textTertiary,
  },
  radiusNote: {
    fontFamily: font.sans,
    fontSize: 10.5,
    lineHeight: 16,
    color: color.textTertiary,
    marginTop: 11,
  },

  rows: {
    padding: spacing.lg,
    gap: 18,
  },
  row: {
    gap: 4,
  },
  photo: {
    height: 172,
    borderRadius: radius.lg,
    backgroundColor: color.surface,
    overflow: 'hidden',
  },
  // 2026-09, at explicit user request following feedback that the app had
  // no venue photos: `photos[0]` renders here when a venue has a real one,
  // placeholderPhotoFor(venue.type) otherwise — see that module's doc
  // comment. rankBadge already carries its own opaque pill background
  // (below), so no separate scrim is needed here the way venue/[id].tsx's
  // hero needed one for its plain-text name/kicker.
  photoImage: {
    ...StyleSheet.absoluteFill,
  },
  rankBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    paddingVertical: 6,
    paddingHorizontal: 11,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(12,10,9,.72)',
  },
  rankBadgeText: {
    fontFamily: font.sansRegular,
    fontSize: 10,
    letterSpacing: 1.6,
    color: color.goldLight,
  },
  rowBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    marginTop: 14,
  },
  rowNameCol: {
    flex: 1,
    minWidth: 0,
  },
  // Was fontSize 23, numberOfLines 1 — a longer venue name (e.g. "The
  // Northern Lawn Tennis & Squash Club") truncated to "The Northern ..."
  // after only a few characters, at real user report ("venue names are cut
  // off very quickly making it hard to read them"). Slightly smaller and
  // wraps to 2 lines instead, so most names show in full.
  name: {
    fontFamily: font.serifRegular,
    fontSize: 19,
    lineHeight: 23,
    color: color.textPrimary,
  },
  type: {
    fontFamily: font.sans,
    fontSize: 10.5,
    letterSpacing: 1.6,
    color: color.textSecondary,
    flexShrink: 1,
  },
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 9,
  },
  newBadge: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(192,160,98,.6)',
    backgroundColor: 'rgba(192,160,98,.14)',
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  newBadgeText: {
    fontFamily: font.sansMedium,
    fontSize: 8.5,
    letterSpacing: 1.4,
    color: color.goldLight,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexShrink: 0,
  },
  rowRightText: {
    alignItems: 'flex-end',
  },
  spend: {
    fontFamily: font.sans,
    fontSize: 13,
    letterSpacing: 0.8,
    color: color.borderNeutral,
  },
  dist: {
    fontFamily: font.sans,
    fontSize: 10.5,
    letterSpacing: 1,
    color: color.textTertiary,
    marginTop: 9,
  },
  saveButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: color.hairlineMax,
  },
  saveButtonOn: {
    borderColor: 'rgba(192,160,98,.75)',
    backgroundColor: 'rgba(192,160,98,.16)',
  },
  saveMark: {
    fontFamily: font.sans,
    fontSize: 15,
    color: color.textSecondary,
  },
  saveMarkOn: {
    color: color.goldLight,
  },
  reason: {
    fontFamily: font.sans,
    fontSize: 12.5,
    lineHeight: 20,
    color: color.textSecondary,
    marginTop: 10,
    maxWidth: 320,
  },
  contextNote: {
    fontFamily: font.sans,
    fontSize: 12,
    lineHeight: 17,
    color: color.gold,
    marginTop: 4,
    maxWidth: 320,
  },

  emptyWrap: {
    paddingTop: 40,
    borderTopWidth: 1,
    borderTopColor: color.hairlineMin,
  },
  emptyTitle: {
    fontFamily: font.serif,
    fontSize: 22,
    color: color.textPrimary,
  },
  emptyNote: {
    fontFamily: font.sans,
    fontSize: 13,
    lineHeight: 20,
    color: color.textSecondary,
    marginTop: 12,
    maxWidth: 280,
  },

  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(11,10,9,.66)',
  },
  sheet: {
    paddingHorizontal: spacing.lg,
    paddingTop: 16,
    paddingBottom: 40,
    borderRadius: 0,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
  },
  sheetHandle: {
    width: 36,
    height: 3,
    borderRadius: 2,
    backgroundColor: color.hairlineMax,
    alignSelf: 'center',
    marginBottom: 18,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sheetTitle: {
    fontFamily: font.serif,
    fontSize: 22,
    color: color.textPrimary,
  },
  sheetDone: {
    fontFamily: font.sans,
    fontSize: 11,
    letterSpacing: 1.8,
    color: color.textSecondary,
  },
  moodCatRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 20,
  },
  moodCatButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: radius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: color.hairlineMax,
  },
  moodCatButtonOn: {
    borderColor: 'rgba(192,160,98,.55)',
    backgroundColor: 'rgba(192,160,98,.14)',
  },
  moodCatLabel: {
    fontFamily: font.serifRegular,
    fontSize: 19,
    color: color.textSecondaryAlt,
  },
  moodCatLabelOn: {
    color: color.textPrimary,
  },
  narrowKicker: {
    fontSize: 9.5,
    marginTop: 26,
  },
  moodTileWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginTop: 13,
  },
  moodTile: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.hairlineMax,
  },
  moodTileOn: {
    borderColor: 'rgba(192,160,98,.5)',
    backgroundColor: 'rgba(192,160,98,.13)',
  },
  moodTileLabel: {
    fontFamily: font.sans,
    fontSize: 12.5,
    color: color.textSecondary,
  },
  moodTileLabelOn: {
    color: color.goldLight,
  },
  moodNote: {
    fontFamily: font.sans,
    fontSize: 11.5,
    lineHeight: 18,
    color: color.textTertiary,
    marginTop: 22,
  },
  moodClearAll: {
    width: '100%',
    marginTop: 18,
    paddingVertical: 15,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.hairlineMax,
    alignItems: 'center',
  },
  moodClearAllLabel: {
    fontFamily: font.sans,
    fontSize: 11,
    letterSpacing: 1.8,
    color: color.borderNeutral,
  },
});
