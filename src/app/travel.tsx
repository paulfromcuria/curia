import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card, Kicker, Tag } from '../components/curia';
import { DESTINATIONS, TILES } from '../lib/data/seed';
import { rankDestinations } from '../lib/scoring/rank-destinations';
import { useSession } from '../lib/state/session';
import { color, font, spacing } from '../theme';

/**
 * Real Travel screen (2026-08, at explicit user request — a subtle,
 * Profile-only feature: "much more subtle than map list or journeys on the
 * nav... this travel button would tell you which cities/island would be a
 * good place for YOU to go holiday"). Reached only from Profile's "YOUR
 * TASTE" group (see profile.tsx), never a tab (Hard rule 9) and not linked
 * from anywhere else — deliberately quiet, the way the user asked for it.
 *
 * No back button here, matching the existing convention for every other
 * Profile-child screen (saved.tsx, subscription.tsx, notifications.tsx all
 * rely on the platform's own back gesture/button, not an in-UI control) —
 * not an oversight, just following the pattern already established rather
 * than inventing a new one for this one screen.
 *
 * Ranking is real onboarding-tile overlap (src/lib/scoring/rank-destinations.ts),
 * not a coin flip or static order — capped to the top 6 rather than all 20,
 * since CLAUDE.md's brand voice explicitly steers away from "cluttered
 * directory-style UI"; this should read as a short, considered shortlist,
 * the same scale Moments works at (4 curated cards), not a browsable list.
 */
export default function Travel() {
  const session = useSession();

  const ranked = useMemo(
    () => rankDestinations(Object.values(session.preferences), DESTINATIONS, TILES).slice(0, 6),
    [session.preferences]
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Kicker tone="tertiary">Travel</Kicker>
      <Text style={styles.headline}>Where you'd actually want to go.</Text>
      <Text style={styles.tagline}>
        Matched against the same taste you gave us for tonight — not a "top places to visit"
        list, just the places that overlap with what you already told us you like.
      </Text>

      <View style={styles.list}>
        {ranked.map(({ destination, matchedTileNames, reason }, index) => (
          <Card key={destination.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.rank}>{String(index + 1).padStart(2, '0')}</Text>
              <View style={styles.cardHeaderText}>
                <Text style={styles.name}>{destination.name}</Text>
                <Text style={styles.region}>{destination.region.toUpperCase()}</Text>
              </View>
            </View>

            <Text style={styles.season}>BEST {destination.bestSeasonLabel.toUpperCase()}</Text>

            <Text style={styles.reason}>{reason}</Text>

            {matchedTileNames.length > 0 && (
              <View style={styles.tagRow}>
                {matchedTileNames.map((name) => (
                  <Tag key={name} label={name} active />
                ))}
              </View>
            )}

            <Text style={styles.curator}>PICKED BY {destination.curator.toUpperCase()}</Text>
          </Card>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: color.baseVariants.a },
  content: { padding: spacing.lg, paddingTop: spacing.xxl, paddingBottom: spacing.xxl },
  headline: {
    fontFamily: font.serif,
    fontSize: 30,
    color: color.textPrimary,
    marginTop: spacing.sm,
    maxWidth: 300,
  },
  tagline: {
    fontFamily: font.sans,
    fontSize: 13,
    lineHeight: 20,
    color: color.textSecondary,
    marginTop: spacing.sm,
    maxWidth: 320,
  },
  list: {
    marginTop: spacing.xl,
    gap: spacing.md,
  },
  card: {
    gap: spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm + 2,
  },
  rank: {
    fontFamily: font.serifRegular,
    fontSize: 15,
    color: color.gold,
    paddingTop: 3,
  },
  cardHeaderText: {
    flexShrink: 1,
    gap: 4,
  },
  name: {
    fontFamily: font.serif,
    fontSize: 24,
    color: color.textPrimary,
  },
  region: {
    fontFamily: font.sans,
    fontSize: 10,
    letterSpacing: 1.4,
    color: color.textSecondary,
  },
  season: {
    fontFamily: font.sansMedium,
    fontSize: 9.5,
    letterSpacing: 1.8,
    color: color.textTertiary,
  },
  reason: {
    fontFamily: font.serifRegular,
    fontSize: 15,
    lineHeight: 21,
    color: color.textPrimary,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs + 2,
  },
  curator: {
    fontFamily: font.sansMedium,
    fontSize: 9,
    letterSpacing: 1.8,
    color: color.gold,
    marginTop: spacing.xs,
  },
});
