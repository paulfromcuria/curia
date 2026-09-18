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

const COLLAPSED_WIDTH = 40;

/**
 * Map's collapsed "top picks" rail (2026-09-18, at explicit user request —
 * see this feature's own doc comment on TOP_PICKS_RAIL_ENABLED,
 * src/lib/config/features.ts, for the full brief and revert story). Shows a
 * quiet, collapsed left-edge tab of small icon tiles — one per current top
 * pick — that expands into a short card list on tap, so the top 3-4 venues
 * are glanceable without leaving Map for List. Reads the exact same
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
  const { width: windowWidth } = useWindowDimensions();
  const expandedWidth = Math.min(Math.max(windowWidth * 0.2, 168), 220);
  const [expanded, setExpanded] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;

  if (picks.length === 0) return null;

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
    <Animated.View style={[styles.rail, { width: railWidth }]} pointerEvents="box-none">
      {/* Collapsed: a quiet stack of icon tiles, one per top pick, fading
          out as the panel expands rather than disappearing abruptly. */}
      <Animated.View
        style={[styles.collapsedContent, { opacity: collapsedOpacity }]}
        pointerEvents={expanded ? 'none' : 'auto'}
      >
        <Pressable onPress={toggle} style={styles.collapsedTouchable} accessibilityRole="button" accessibilityLabel="Show top picks">
          {picks.slice(0, 4).map((p) => (
            <View key={p.venue.id} style={styles.collapsedTile}>
              <VenueTypeIcon icon={iconForVenueType(p.venue.type)} size={14} color={color.gold} />
            </View>
          ))}
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
    top: '32%',
    maxHeight: '52%',
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
    alignItems: 'center',
    paddingVertical: spacing.sm,
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
  collapsedChevron: {
    fontFamily: font.sansRegular,
    fontSize: 16,
    color: color.textSecondary,
    marginTop: 2,
  },
  expandedContent: {
    flex: 1,
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
    flexGrow: 0,
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
