import { useCallback, useMemo, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import {
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
import { Card, EmblemButton, Kicker } from '../../components/curia';
import { rankVenues, haversineMiles, slugifyType } from '../../lib/scoring/rank-venues';
import { buildMatchmakingInputFromSession, DEMO_LOCATION } from '../../lib/scoring/session-input';
import { DISTRICTS, VENUES, tilesByCategory } from '../../lib/data/seed';
import { useSession } from '../../lib/state/session';
import { color, font, radius, spacing } from '../../theme';
import type { TileCategory } from '../../types/models';
import type { MatchmakingInput } from '../../types/matchmaking';

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

// Fixed demo location (no geolocation/Mapbox key yet — a real credential
// gap per CLAUDE.md) now comes from src/lib/scoring/session-input.ts's
// DEMO_LOCATION, the one place Map/List/venue/district detail all read it
// from, rather than this screen's own copy.

/**
 * Save/star toggle here is local component state only — there is no
 * SavedCollection model wired up yet (that's `curia-profile`'s M7 work, see
 * src/app/saved.tsx's own placeholder comment). Toggling a star on this
 * screen does not persist anywhere and resets on navigation away.
 */

const MIN_RADIUS = 0.25;
const MAX_RADIUS = 30;
const RADIUS_STEP = 0.25;
// Default initial radius (0.9mi, the prototype's own `state.radius`) now
// lives in src/lib/state/session.tsx, since it's shared with Map.

function clampRadius(value: number): number {
  const clamped = Math.min(MAX_RADIUS, Math.max(MIN_RADIUS, value));
  return Math.round(clamped / RADIUS_STEP) * RADIUS_STEP;
}

/** Mirrors the prototype's own `miles()` formatter exactly (Curia.dc.html). */
function formatMiles(value: number): string {
  const n = value % 1 === 0 ? String(value) : value.toFixed(2).replace(/0$/, '');
  return `${n} ${value === 1 ? 'mile' : 'miles'}`;
}

function radiusLabelFor(value: number): string {
  return value >= MAX_RADIUS ? 'Anywhere in the region' : `Within ${formatMiles(value)}`;
}

function radiusHintFor(value: number): string {
  if (value <= 2) return 'WALKABLE';
  if (value <= 8) return 'SHORT CAB';
  return 'WORTH THE DRIVE';
}

function radiusNoteFor(value: number): string {
  if (value <= 2) return 'Close to home — we let proximity break ties between good matches.';
  if (value <= 10) return 'You will travel a little, so we weigh the walk lightly.';
  return 'You have told us distance is no object — ranked on fit alone.';
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
const VENUE_TYPE_SLUGS = new Set(VENUES.map((v) => slugifyType(v.type)));

function coveredTiles(category: TileCategory) {
  return tilesByCategory(category)
    .map((tile) => ({ tile, slug: slugifyType(tile.name) }))
    .filter(({ slug }) => VENUE_TYPE_SLUGS.has(slug));
}

const DISTRICT_BY_ID = new Map(DISTRICTS.map((d) => [d.id, d]));

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
      return clampRadius(MIN_RADIUS + ratio * (MAX_RADIUS - MIN_RADIUS));
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

  const ratio = (value - MIN_RADIUS) / (MAX_RADIUS - MIN_RADIUS);

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
      accessibilityValue={{ min: MIN_RADIUS, max: MAX_RADIUS, now: value, text: formatMiles(value) }}
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

  // Shared with Map via session state, not local — Hard rule 5 ("Map and
  // List share one radius and one context, so switching tabs never changes
  // the answer"). Was local component state; both M5 builds flagged this
  // gap, closed by lifting it into src/lib/state/session.tsx.
  const { radiusMiles, setRadiusMiles } = session;
  const [moodOpen, setMoodOpen] = useState(false);
  const [moodCategory, setMoodCategory] = useState<TileCategory | null>(null);
  const [moodSlugs, setMoodSlugs] = useState<string[]>([]);
  const [savedVenueIds, setSavedVenueIds] = useState<Set<string>>(new Set());

  const toggleSaved = useCallback((venueId: string) => {
    setSavedVenueIds((prev) => {
      const next = new Set(prev);
      if (next.has(venueId)) next.delete(venueId);
      else next.add(venueId);
      return next;
    });
  }, []);

  const clearMood = useCallback(() => {
    setMoodCategory(null);
    setMoodSlugs([]);
  }, []);

  const selectMoodCategory = useCallback((category: TileCategory) => {
    setMoodCategory((current) => (current === category ? null : category));
    setMoodSlugs([]);
  }, []);

  const toggleMoodTile = useCallback((slug: string) => {
    setMoodSlugs((current) =>
      current.includes(slug) ? current.filter((s) => s !== slug) : [...current, slug]
    );
  }, []);

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
  // "now" is still the only context this screen can offer — a real shared
  // day/time picker lives on the ContextStrip (Map's surface) and isn't
  // wired into a cross-tab session store yet (Hard rule 5 gap, flagged in
  // the M5/M9 reports rather than duplicated here).
  const matchmakingInput = useMemo<MatchmakingInput>(
    () => buildMatchmakingInputFromSession(session, { radiusMiles, moodFilter }),
    [session, radiusMiles, moodFilter]
  );

  const result = useMemo(() => rankVenues(matchmakingInput, VENUES, DISTRICTS), [matchmakingInput]);

  const listHeadline = result.ranked.length
    ? `${result.ranked.length} ${result.ranked.length === 1 ? 'venue' : 'venues'}`
    : 'Nothing in range';

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Kicker>Ranked for you</Kicker>
            <Text style={styles.headline}>{listHeadline}</Text>
            <Text style={styles.meta}>RANKED FOR NOW</Text>
          </View>
          <EmblemButton initials="AV" onPress={() => router.push('/profile')} />
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
            <Text style={styles.radiusValue}>{radiusLabelFor(radiusMiles)}</Text>
          </View>
          <RadiusSlider value={radiusMiles} onChange={setRadiusMiles} />
          <View style={styles.radiusEndpoints}>
            <Text style={styles.radiusEndpoint}>¼ MI</Text>
            <Text style={styles.radiusEndpoint}>{radiusHintFor(radiusMiles)}</Text>
            <Text style={styles.radiusEndpoint}>30 MI</Text>
          </View>
          <Text style={styles.radiusNote}>{radiusNoteFor(radiusMiles)}</Text>
        </Card>

        <View style={styles.rows}>
          {result.ranked.map((r, i) => {
            const venue = VENUES.find((v) => v.id === r.venueId);
            if (!venue) return null;
            const district = DISTRICT_BY_ID.get(venue.districtId);
            const distanceMiles = haversineMiles(DEMO_LOCATION, venue);
            const saved = savedVenueIds.has(venue.id);
            return (
              <View key={venue.id} style={styles.row}>
                <Pressable onPress={() => router.push(`/venue/${venue.id}`)}>
                  <View style={styles.photo}>
                    <View style={styles.rankBadge}>
                      <Text style={styles.rankBadgeText}>NO. {i + 1}</Text>
                    </View>
                    <View style={styles.scoreBadge}>
                      <Text style={styles.scoreBadgeScore}>{r.score}</Text>
                      <Text style={styles.scoreBadgeLabel}>MATCH</Text>
                    </View>
                  </View>
                </Pressable>
                <View style={styles.rowBody}>
                  <Pressable style={styles.rowNameCol} onPress={() => router.push(`/venue/${venue.id}`)}>
                    <Text style={styles.name} numberOfLines={1}>
                      {venue.name}
                    </Text>
                    <Text style={styles.type} numberOfLines={1}>
                      {(district?.name ?? '').toUpperCase()} · {venue.type}
                    </Text>
                  </Pressable>
                  <View style={styles.rowRight}>
                    <View style={styles.rowRightText}>
                      <Text style={styles.spend}>{'£'.repeat(venue.spendLevel)}</Text>
                      <Text style={styles.dist}>{formatDistance(distanceMiles)}</Text>
                    </View>
                    <Pressable
                      onPress={() => toggleSaved(venue.id)}
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
              </View>
            );
          })}

          {result.empty && (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyTitle}>Nothing inside {formatMiles(radiusMiles)}.</Text>
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
  scoreBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 11,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(12,10,9,.72)',
  },
  scoreBadgeScore: {
    fontFamily: font.serifRegular,
    fontSize: 13,
    color: color.gold,
  },
  scoreBadgeLabel: {
    fontFamily: font.sans,
    fontSize: 8.5,
    letterSpacing: 1.6,
    color: color.textSecondary,
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
  name: {
    fontFamily: font.serifRegular,
    fontSize: 23,
    color: color.textPrimary,
  },
  type: {
    fontFamily: font.sans,
    fontSize: 10.5,
    letterSpacing: 1.6,
    color: color.textSecondary,
    marginTop: 9,
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
