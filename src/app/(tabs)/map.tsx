import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import type { LayoutChangeEvent } from 'react-native';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';
import { Button, Card, ContextStrip, EmblemButton, Kicker } from '../../components/curia';
import { rankVenues, resolveContext } from '../../lib/scoring/rank-venues';
import { buildMatchmakingInputFromSession } from '../../lib/scoring/session-input';
import { DISTRICTS, VENUES } from '../../lib/data/seed';
import {
  DEFAULT_ZOOM_INDEX,
  MAP_HOME,
  ZOOM_SPAN_MILES,
  beyondEdgeFraction,
  centroid,
  clampZoomIndex,
  districtsInViewport,
  fitZoomIndex,
  groupVisibleDistricts,
  labelLiveliness,
  project,
  spanMilesToFit,
} from '../../lib/map/geo';
import type { GeoPoint, MapLabel } from '../../lib/map/geo';
import { moodTileOptionsForCategory } from '../../lib/map/mood-tiles';
import { useSession } from '../../lib/state/session';
import { color, font, radius, spacing } from '../../theme';
import type { MatchContext } from '../../types/matchmaking';
import type { DayTimeBand, TileCategory } from '../../types/models';

/**
 * Real Map screen (M5). Renders the M3 scoring engine's actual output
 * (`rankVenues`) against a real `MatchmakingInput` built from live onboarding
 * state (`useSession()`, via `buildMatchmakingInputFromSession` — see
 * src/lib/scoring/session-input.ts) instead of the placeholder's hardcoded
 * `DEMO_MATCHMAKING_INPUT`.
 *
 * Real vs. mocked, so this doesn't read as more finished than it is:
 * - Onboarding preferences/You profile: real (M4's session state).
 * - Ranking/hard filters: real (M3's `rankVenues`).
 * - District grouping/zoom-aid labels: real, computed against the actual
 *   seed districts/groups (src/lib/data/seed.ts) per CLAUDE.md's naming
 *   rule (Hard rule 6).
 * - Device location: mocked (`MAP_HOME`/`DEMO_LOCATION`, central Northern
 *   Quarter) — no Mapbox/geolocation key exists yet (CLAUDE.md "Still
 *   genuinely open").
 * - Weather: mocked, static per time-band (no live weather API anywhere in
 *   this project).
 * - Map projection: a simple equirectangular-ish projection, not the
 *   prototype's pixel-tuned one (see src/lib/map/geo.ts doc comment) — by
 *   design, per this milestone's brief.
 * - Search radius: fixed at the shared default (15mi); the interactive
 *   radius slider is List's own screen (List, "SEARCH RADIUS"), matching
 *   the prototype's actual UI split (Map never shows a radius control).
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

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/** Same register the prototype's own `miles()` helper uses (e.g. "15 miles",
 * "1 mile"). */
function formatMiles(value: number): string {
  const n = value % 1 === 0 ? String(value) : value.toFixed(2).replace(/0$/, '');
  return `${n} ${value === 1 ? 'mile' : 'miles'}`;
}

interface MoodState {
  category: TileCategory | null;
  tiles: Record<string, boolean>;
}

export default function Map() {
  const router = useRouter();
  const session = useSession();

  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [center, setCenter] = useState<GeoPoint>(MAP_HOME);
  const [zoomIndex, setZoomIndex] = useState(DEFAULT_ZOOM_INDEX);
  const [context, setContext] = useState<MatchContext>({ now: true });
  const [mood, setMood] = useState<MoodState | null>(null);
  const [moodSheetOpen, setMoodSheetOpen] = useState(false);
  const [ctxSheetOpen, setCtxSheetOpen] = useState(false);

  const onContainerLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setContainerSize({ width, height });
  }, []);

  const resolved = resolveContext(context);
  const liveNow = resolveContext({ now: true });
  const weather = WEATHER_BY_BAND[resolved.band];
  const liveWeather = WEATHER_BY_BAND[liveNow.band];
  const bandMeta = BAND_META.find((b) => b.key === resolved.band) ?? BAND_META[2];
  const nowTimeLabel = useMemo(
    () => new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
    []
  );

  const moodFilter = useMemo(() => {
    if (!mood?.category) return undefined;
    const tileIds = Object.keys(mood.tiles).filter((k) => mood.tiles[k]);
    return { category: mood.category, tileIds, subPreferences: [] as string[] };
  }, [mood]);

  // radiusMiles comes from shared session state (src/lib/state/session.tsx),
  // not a fixed constant, so it can never drift from whatever List's slider
  // is set to (Hard rule 5) — closes the gap this screen's own build
  // originally flagged.
  const matchInput = useMemo(
    () => buildMatchmakingInputFromSession(session, { context, moodFilter, radiusMiles: session.radiusMiles }),
    [session, context, moodFilter]
  );

  const result = useMemo(() => rankVenues(matchInput, VENUES, DISTRICTS), [matchInput]);
  const ranked = result.ranked;
  const topRanked = ranked.slice(0, 4);

  const spanMiles = ZOOM_SPAN_MILES[zoomIndex];
  const hasCanvas = containerSize.width > 0 && containerSize.height > 0;

  const labels = useMemo<MapLabel[]>(() => {
    if (!hasCanvas) return [];
    const visible = districtsInViewport(center, spanMiles, containerSize);
    return groupVisibleDistricts(visible);
  }, [center, spanMiles, containerSize, hasCanvas]);

  const inBounds = useCallback(
    (p: { x: number; y: number }, margin = 20) =>
      p.x > -margin &&
      p.x < containerSize.width + margin &&
      p.y > 150 - margin &&
      p.y < containerSize.height - 200 + margin,
    [containerSize]
  );

  const placedLabels = useMemo(
    () =>
      hasCanvas
        ? labels
            .map((label) => ({ label, pixel: project(label.center, center, spanMiles, containerSize) }))
            .filter(({ pixel }) => inBounds(pixel, 40))
        : [],
    [labels, center, spanMiles, containerSize, hasCanvas, inBounds]
  );

  const mePixel = hasCanvas ? project(MAP_HOME, center, spanMiles, containerSize) : null;
  const me = mePixel && inBounds(mePixel, 30) ? mePixel : null;

  const placedPins = useMemo(() => {
    if (!hasCanvas) return [];
    return topRanked
      .map((r, idx) => {
        const venue = VENUES.find((v) => v.id === r.venueId);
        if (!venue) return null;
        const pixel = project(venue, center, spanMiles, containerSize);
        return { rank: idx + 1, venue, ranked: r, pixel };
      })
      .filter((p): p is NonNullable<typeof p> => !!p && inBounds(p.pixel, 14));
  }, [hasCanvas, topRanked, center, spanMiles, containerSize, inBounds]);

  const outFrac = hasCanvas ? beyondEdgeFraction(center, spanMiles, containerSize) : 0;
  const hasEdge = outFrac > 0.3;

  const moodOn = !!mood?.category;
  const selectedTileIds = mood ? Object.keys(mood.tiles).filter((k) => mood.tiles[k]) : [];
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

  const zoomIn = () => setZoomIndex((i) => clampZoomIndex(i - 1));
  const zoomOut = () => setZoomIndex((i) => clampZoomIndex(i + 1));
  const locate = () => {
    setCenter(MAP_HOME);
    setZoomIndex(DEFAULT_ZOOM_INDEX);
  };
  const fitRegion = () => {
    setCenter(centroid(DISTRICTS));
    setZoomIndex(fitZoomIndex(spanMilesToFit(DISTRICTS) * 1.1));
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
    // never push a route.
    const members = DISTRICTS.filter((d) => label.districtIds.includes(d.id));
    setCenter(label.center);
    setZoomIndex(fitZoomIndex(spanMilesToFit(members) * 1.05));
  };

  const openCtx = () => setCtxSheetOpen(true);
  const closeCtx = () => setCtxSheetOpen(false);
  const setNow = () => setContext({ now: true });
  const chooseDay = (day: string) =>
    setContext((c) => ({ now: false, day, band: c.band ?? resolved.band }));
  const chooseBand = (band: DayTimeBand) =>
    setContext((c) => ({ now: false, day: c.day ?? resolved.day, band }));

  const openMood = () => {
    if (!mood) setMood({ category: null, tiles: {} });
    setMoodSheetOpen(true);
  };
  const closeMood = () => setMoodSheetOpen(false);
  const clearMood = () => {
    setMood(null);
    setMoodSheetOpen(false);
  };
  const chooseMoodCategory = (c: TileCategory) =>
    setMood((m) => ({ category: m?.category === c ? null : c, tiles: {} }));
  const toggleMoodTile = (tileId: string) =>
    setMood((m) => {
      if (!m?.category) return m;
      const tiles = { ...m.tiles };
      if (tiles[tileId]) delete tiles[tileId];
      else tiles[tileId] = true;
      return { ...m, tiles };
    });

  return (
    <View style={styles.container} onLayout={onContainerLayout}>
      {hasCanvas && (
        <>
          <Svg
            width={containerSize.width}
            height={containerSize.height}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          >
            {placedLabels.map(({ label, pixel }) => (
              <Circle
                key={`glow-${label.key}`}
                cx={pixel.x}
                cy={pixel.y}
                r={label.kind === 'group' ? 46 : 30}
                fill={label.accentColor}
                opacity={0.12}
              />
            ))}
            {me &&
              placedLabels.map(({ label, pixel }) => (
                <Line
                  key={`line-${label.key}`}
                  x1={me?.x}
                  y1={me?.y}
                  x2={pixel.x}
                  y2={pixel.y}
                  stroke="rgba(192,160,98,0.22)"
                  strokeWidth={1}
                  strokeDasharray="2 6"
                />
              ))}
            {placedLabels.map(({ label, pixel }) => (
              <Circle
                key={`dot-${label.key}`}
                cx={pixel.x}
                cy={pixel.y}
                r={label.kind === 'group' ? 7 : 5}
                fill={label.accentColor}
                stroke={label.kind === 'group' ? color.baseVariants.b : 'none'}
                strokeWidth={label.kind === 'group' ? 1.5 : 0}
              />
            ))}
            {me && (
              <Circle cx={me.x} cy={me.y} r={6} fill={color.weather} stroke={color.baseVariants.b} strokeWidth={2} />
            )}
          </Svg>

          {placedLabels.map(({ label, pixel }) => (
            <Pressable
              key={label.key}
              onPress={() => onTapLabel(label)}
              style={[styles.labelWrap, { left: pixel.x - 70, top: pixel.y + 8 }]}
            >
              <Text
                style={label.kind === 'group' ? styles.groupLabel : styles.districtLabel}
                numberOfLines={1}
              >
                {label.label}
              </Text>
              <Text style={styles.labelSub} numberOfLines={1}>
                {label.kind === 'group'
                  ? `${label.districtIds.length} DISTRICTS · ZOOM`
                  : `${labelLiveliness(label, resolved.day, resolved.band)} ALIVE`}
              </Text>
            </Pressable>
          ))}

          {placedPins.map(({ rank, venue, pixel }) => (
            <Pressable
              key={venue.id}
              onPress={() => router.push(`/venue/${venue.id}`)}
              style={[styles.pin, { left: pixel.x - 14, top: pixel.y - 14 }]}
            >
              <Text style={styles.pinText}>{rank}</Text>
            </Pressable>
          ))}

          {hasEdge && (
            <View style={styles.lockedCard} pointerEvents="none">
              <View style={styles.lockedRule} />
              <Text style={styles.lockedKicker}>BEYOND THE EDGE</Text>
              <Text style={styles.lockedTitle}>Curia hasn&apos;t arrived here yet</Text>
              <Text style={styles.lockedBody}>
                We open a place only once we know it well enough to recommend it. Manchester and
                Cheshire are live today.
              </Text>
            </View>
          )}
        </>
      )}

      <View style={styles.headerRow}>
        <View style={styles.ctxWrap}>
          <ContextStrip kicker={ctxKicker} label={ctxLabel} weather={weather} onPress={openCtx} />
        </View>
        <EmblemButton initials={initials} onPress={() => router.push('/profile')} />
      </View>

      <View style={styles.moodRow}>
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
        <Text style={styles.scaleLabel}>{formatMiles(spanMiles)}</Text>
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
                <Text style={styles.sheetScore}>{r.score}</Text>
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
    position: 'absolute',
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
    position: 'absolute',
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

  lockedCard: {
    position: 'absolute',
    left: 36,
    right: 36,
    top: '36%',
    alignItems: 'center',
    gap: 10,
  },
  lockedRule: {
    width: 34,
    height: 1,
    backgroundColor: 'rgba(192,160,98,.5)',
  },
  lockedKicker: {
    fontFamily: font.sansRegular,
    fontSize: 9.5,
    letterSpacing: 3.2,
    color: 'rgba(192,160,98,.85)',
  },
  lockedTitle: {
    fontFamily: font.serif,
    fontSize: 20,
    color: 'rgba(240,233,223,.9)',
    textAlign: 'center',
  },
  lockedBody: {
    fontFamily: font.sans,
    fontSize: 11.5,
    lineHeight: 17,
    color: 'rgba(160,151,138,.9)',
    textAlign: 'center',
  },

  headerRow: {
    position: 'absolute',
    top: 56,
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  ctxWrap: {
    flex: 1,
  },

  moodRow: {
    position: 'absolute',
    top: 114,
    left: spacing.lg,
    right: 70,
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
    width: 42,
    height: 42,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.hairlineMin,
    backgroundColor: 'rgba(19,17,16,.82)',
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
  scaleLabel: {
    fontFamily: font.sans,
    fontSize: 9,
    letterSpacing: 1.4,
    color: color.textTertiary,
    marginTop: spacing.sm + 1,
    textAlign: 'center',
    width: 42,
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
  sheetScore: {
    fontFamily: font.sans,
    fontSize: 12,
    letterSpacing: 1,
    color: color.gold,
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
