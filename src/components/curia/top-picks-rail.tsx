import { useRef, useState } from 'react';
import { Animated, Image, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { iconForVenueType } from '../../lib/map/venue-icons';
import { placeholderPhotoFor } from '../../lib/data/placeholder-photos';
import { color, font, radius, spacing } from '../../theme';
import { Kicker } from './kicker';
import { VenueTypeIcon } from './venue-type-icon';
import type { Venue } from '../../types/models';

export interface TopPickItem {
  venue: Venue;
  districtName: string;
  reason: string;
  contextNote?: string;
}

interface TopPicksRailProps {
  picks: TopPickItem[];
  onSelectVenue: (venueId: string) => void;
}

// Widened slightly (2026-09-18, at explicit user request) to fit the
// expand chevron beside the icon stack, vertically centered against it,
// rather than as its own row underneath — reads more like "there's more
// this way" than a trailing footnote.
const COLLAPSED_WIDTH = 56;
const COLLAPSED_TILE = 26;
const COLLAPSED_VPAD = spacing.sm;
const EXPANDED_HEIGHT = 360;

/** How many total picks the rail is prepared to show once expanded
 * (2026-09-18, at explicit user request — the collapsed view only ever
 * hinted at 4, but the expanded card list is a fixed, scrollable height
 * that can comfortably hold more). Callers (map.tsx/map.web.tsx) slice
 * their ranked list to this count before passing `picks` in. */
export const TOP_PICKS_COUNT = 8;

/** How many individual icon tiles the COLLAPSED rail shows before folding
 * the rest into a single "+N" tile — a real count, not a decorative cap,
 * so a member glancing at the collapsed rail knows there's more to
 * scroll to once they expand it, per the same user request above. */
const MAX_COLLAPSED_TILES = 4;

/** Where the rail's own vertical CENTER sits, as a fraction of the window
 * height — not where its top edge sits. Collapsed and expanded heights
 * differ a lot (collapsed hugs a handful of icons; expanded is a fixed
 * 360), so anchoring by a fixed `top` value made the rail visually drift
 * up/down as it opened and closed, or whenever the collapsed height itself
 * changed (e.g. moving the chevron beside the tiles instead of under them,
 * 2026-09-18) — a real bug, caught by direct user report. Anchoring the
 * center instead means both states stay put around the same point on
 * screen regardless of how tall either one currently is. */
const CENTER_Y_RATIO = 0.4;

/** The collapsed rail must hug its own content (a handful of small icon
 * tiles), never a fraction of the screen — computed from the same
 * constants the collapsed styles below use, rather than duplicated as a
 * second hand-tuned number that could quietly drift out of sync. The
 * chevron sits beside the tile stack now, not below it, so it no longer
 * adds its own height — it's vertically centered within whatever height
 * the tile stack already needs. */
function collapsedHeightFor(count: number): number {
  return COLLAPSED_VPAD * 2 + count * COLLAPSED_TILE + Math.max(count - 1, 0) * spacing.xs;
}

/**
 * Map's collapsed "top picks" rail (2026-09-18, at explicit user request —
 * see this feature's own doc comment on TOP_PICKS_RAIL_ENABLED,
 * src/lib/config/features.ts, for the full brief and revert story). Shows a
 * quiet, collapsed left-edge tab of small icon tiles — one per current top
 * pick, folding into a "+N" tile past MAX_COLLAPSED_TILES so a glance at
 * the collapsed rail already tells you how much more is behind it — that
 * expands into a scrollable card list of the top TOP_PICKS_COUNT venues on
 * tap, so they're glanceable without leaving Map for List. Reads the exact
 * same
 * `RankedVenue`s Map's own pins are built from (passed in as `picks` by the
 * caller), so it can never show a different answer than the pins do or than
 * List would (Hard rule 5) — this component does no ranking of its own.
 *
 * Deliberately a shared component rather than a web/native pair: unlike
 * Map's actual pins (raw imperative mapboxgl DOM markers on web,
 * @rnmapbox/maps MarkerView on native — see venue-icons.ts's own doc
 * comment on why those need two renderers), this is ordinary React Native
 * View/Text/Animated, which react-native-web already renders correctly, so
 * map.web.tsx and map.tsx each just place one instance of it and pass their
 * own `picks`/`onSelectVenue` — no duplicated markup.
 *
 * Width is capped at a fifth of the window (matching what was asked for)
 * but never below a legible minimum, since a literal fifth of a narrow
 * phone screen is too tight to read a venue name in.
 */
export function TopPicksRail({ picks, onSelectVenue }: TopPicksRailProps) {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const expandedWidth = Math.min(Math.max(windowWidth * 0.2, 168), 220);
  const centerY = windowHeight * CENTER_Y_RATIO;
  const [expanded, setExpanded] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;

  if (picks.length === 0) return null;

  const visibleTiles = picks.slice(0, MAX_COLLAPSED_TILES);
  const overflowCount = picks.length - visibleTiles.length;
  // +1 slot for the "+N" badge tile when there's more than fits — the
  // collapsed rail's height has to account for it too, not just the icons.
  const tileSlots = visibleTiles.length + (overflowCount > 0 ? 1 : 0);
  const collapsedHeight = collapsedHeightFor(tileSlots);

  const toggle = () => {
    const next = !expanded;
    setExpanded(next);
    Animated.spring(anim, {
      toValue: next ? 1 : 0,
      useNativeDriver: false,
      friction: 9,
      tension: 60,
    }).start();
  };

  const railWidth = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [COLLAPSED_WIDTH, expandedWidth],
  });
  const railHeight = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [collapsedHeight, EXPANDED_HEIGHT],
  });
  const railTop = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [centerY - collapsedHeight / 2, centerY - EXPANDED_HEIGHT / 2],
  });
  const collapsedOpacity = anim.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [1, 0, 0],
  });
  const expandedOpacity = anim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0, 1],
  });
  const expandedTranslateX = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [-14, 0],
  });

  return (
    <Animated.View style={[styles.rail, { width: railWidth, height: railHeight, top: railTop }]} pointerEvents="box-none">
      {/* Collapsed: a quiet stack of icon tiles, one per top pick, fading
          out as the panel expands rather than disappearing abruptly. */}
      <Animated.View
        style={[styles.collapsedContent, { opacity: collapsedOpacity }]}
        pointerEvents={expanded ? 'none' : 'auto'}
      >
        <Pressable onPress={toggle} style={styles.collapsedTouchable} accessibilityRole="button" accessibilityLabel="Show top picks">
          <View style={styles.collapsedTiles}>
            {visibleTiles.map((p) => (
              <View key={p.venue.id} style={styles.collapsedTile}>
                <VenueTypeIcon icon={iconForVenueType(p.venue.type)} size={14} color={color.gold} />
              </View>
            ))}
            {overflowCount > 0 && (
              <View style={[styles.collapsedTile, styles.collapsedOverflowTile]}>
                <Text style={styles.collapsedOverflowText}>+{overflowCount}</Text>
              </View>
            )}
          </View>
          <Text style={styles.collapsedChevron}>›</Text>
        </Pressable>
      </Animated.View>

      {/* Expanded: the real card list, faded/slid in slightly after the
          width animation starts so it never smears mid-expand. */}
      <Animated.View
        style={[styles.expandedContent, { opacity: expandedOpacity, transform: [{ translateX: expandedTranslateX }] }]}
        pointerEvents={expanded ? 'auto' : 'none'}
      >
        <View style={styles.expandedHeader}>
          <Kicker style={styles.expandedKicker}>Top picks</Kicker>
          <Pressable onPress={toggle} hitSlop={8} accessibilityRole="button" accessibilityLabel="Collapse top picks">
            <Text style={styles.closeMark}>×</Text>
          </Pressable>
        </View>
        <ScrollView style={styles.list} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
          {picks.map((p, i) => (
            <Pressable
              key={p.venue.id}
              onPress={() => onSelectVenue(p.venue.id)}
              style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
            >
              <View style={styles.cardTop}>
                <Text style={styles.rank}>{i + 1}</Text>
                <Image
                  source={{ uri: p.venue.photos[0] ?? placeholderPhotoFor(p.venue.type) }}
                  style={styles.thumb}
                  resizeMode="cover"
                />
              </View>
              <Text style={styles.name} numberOfLines={1}>
                {p.venue.name}
              </Text>
              <Text style={styles.meta} numberOfLines={1}>
                {p.districtName ? `${p.districtName} · ` : ''}
                {'£'.repeat(p.venue.spendLevel)}
              </Text>
              {p.contextNote && (
                <Text style={styles.contextNote} numberOfLines={2}>
                  {p.contextNote}
                </Text>
              )}
            </Pressable>
          ))}
        </ScrollView>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  rail: {
    position: 'absolute',
    left: 0,
    backgroundColor: 'rgba(27,23,20,0.94)',
    borderTopRightRadius: radius.lg,
    borderBottomRightRadius: radius.lg,
    borderTopWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(192,160,98,.32)',
    overflow: 'hidden',
  },
  collapsedContent: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: COLLAPSED_WIDTH,
  },
  collapsedTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    gap: spacing.xs,
  },
  collapsedTiles: {
    gap: spacing.xs,
  },
  collapsedTile: {
    width: 26,
    height: 26,
    borderRadius: radius.sm,
    backgroundColor: color.surfaceVariants.a,
    alignItems: 'center',
    justifyContent: 'center',
  },
  collapsedOverflowTile: {
    backgroundColor: 'rgba(192,160,98,.16)',
  },
  collapsedOverflowText: {
    fontFamily: font.sansMedium,
    fontSize: 9.5,
    color: color.gold,
  },
  collapsedChevron: {
    fontFamily: font.sansRegular,
    fontSize: 16,
    color: color.textSecondary,
  },
  expandedContent: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
  },
  expandedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  expandedKicker: {
    fontSize: 10.5,
    letterSpacing: 1.6,
  },
  closeMark: {
    fontFamily: font.sansRegular,
    fontSize: 18,
    lineHeight: 18,
    color: color.textSecondary,
    paddingHorizontal: spacing.xs,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  card: {
    borderTopWidth: 1,
    borderTopColor: color.hairlineMin,
    paddingTop: spacing.sm,
  },
  cardPressed: {
    opacity: 0.7,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: 4,
  },
  rank: {
    fontFamily: font.serifMedium,
    fontSize: 13,
    color: color.gold,
    width: 14,
  },
  thumb: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
  },
  name: {
    fontFamily: font.sansMedium,
    fontSize: 12.5,
    color: color.textPrimary,
  },
  meta: {
    fontFamily: font.sans,
    fontSize: 11,
    color: color.textSecondary,
    marginTop: 1,
  },
  contextNote: {
    fontFamily: font.sans,
    fontSize: 10.5,
    lineHeight: 14,
    color: color.gold,
    marginTop: 3,
  },
});
