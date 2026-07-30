import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card, EmblemButton, Kicker } from '../../components/curia';
import { placeholderRankedVenues } from '../../lib/scoring/placeholder-rank';
import { VENUES } from '../../lib/data/seed';
import { color, font, spacing } from '../../theme';

/**
 * Placeholder List screen — the search-radius control and full row layout
 * (photo, rank badge, score) are `curia-list`'s M5 work. Deliberately calls
 * the exact same `placeholderRankedVenues()` as Map so the two can never
 * silently diverge (Hard rule 5) — this is the thing to preserve when the
 * real engine replaces the placeholder.
 */
export default function List() {
  const router = useRouter();
  const ranked = placeholderRankedVenues();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Kicker>Ranked for you</Kicker>
          <Text style={styles.headline}>Tuesday evening, near you</Text>
        </View>
        <EmblemButton initials="AV" onPress={() => router.push('/profile')} />
      </View>
      <ScrollView contentContainerStyle={styles.list}>
        {ranked.map((r, i) => {
          const venue = VENUES.find((v) => v.id === r.venueId)!;
          return (
            <Card key={r.venueId} style={styles.row}>
              <View style={styles.rowTop}>
                <Text style={styles.rank}>#{i + 1}</Text>
                <Text style={styles.score}>{r.score} MATCH</Text>
              </View>
              <Text style={styles.name}>{venue.name}</Text>
              <Text style={styles.meta}>{venue.type}</Text>
              <Text style={styles.reason}>{r.reason}</Text>
            </Card>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: color.baseVariants.c,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
  },
  headline: {
    fontFamily: font.serif,
    fontSize: 26,
    color: color.textPrimary,
    marginTop: spacing.sm,
  },
  list: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  row: {
    gap: 4,
  },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rank: {
    fontFamily: font.sans,
    fontSize: 10,
    letterSpacing: 1.6,
    color: color.goldLight,
  },
  score: {
    fontFamily: font.sans,
    fontSize: 10,
    letterSpacing: 1.6,
    color: color.gold,
  },
  name: {
    fontFamily: font.serifRegular,
    fontSize: 23,
    color: color.textPrimary,
    marginTop: 6,
  },
  meta: {
    fontFamily: font.sans,
    fontSize: 10.5,
    letterSpacing: 1.8,
    color: color.textSecondary,
  },
  reason: {
    fontFamily: font.sans,
    fontSize: 12,
    lineHeight: 18,
    color: color.textSecondaryAlt,
    marginTop: 4,
  },
});
