import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card, ContextStrip, EmblemButton, Kicker } from '../../components/curia';
import { rankVenues } from '../../lib/scoring/rank-venues';
import { DEMO_MATCHMAKING_INPUT } from '../../lib/scoring/demo-input';
import { DISTRICTS, VENUES } from '../../lib/data/seed';
import { color, font, spacing } from '../../theme';

/**
 * Placeholder Map screen — the real abstract line/dot map render, context
 * strip modal, mood sheet, and district zoom/grouping are `curia-map`'s M5
 * work. This proves the shared ranked-result-set + shell wiring end to end.
 * Ranking now runs through the real M3 engine (`rankVenues`) — see
 * src/lib/scoring/rank-venues.ts. Calls the exact same function with the
 * exact same input as list.tsx (Hard rule 5).
 */
export default function Map() {
  const router = useRouter();
  const ranked = rankVenues(DEMO_MATCHMAKING_INPUT, VENUES, DISTRICTS).ranked.slice(0, 5);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <ContextStrip kicker="Tuesday · Early evening" label="Now" weather="11° Light rain" />
        <EmblemButton initials="AV" onPress={() => router.push('/profile')} />
      </View>
      <ScrollView contentContainerStyle={styles.list}>
        <Kicker>Ranked for you (placeholder)</Kicker>
        {ranked.map((r) => {
          const venue = VENUES.find((v) => v.id === r.venueId)!;
          return (
            <Card key={r.venueId} tone="inset" style={styles.row}>
              <Text style={styles.name}>{venue.name}</Text>
              <Text style={styles.meta}>{venue.type} · {venue.spendLevel === 1 ? '£' : '£'.repeat(venue.spendLevel)}</Text>
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
    backgroundColor: color.baseVariants.b,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
  },
  list: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  row: {
    gap: 4,
  },
  name: {
    fontFamily: font.serifRegular,
    fontSize: 17.5,
    color: color.textPrimary,
  },
  meta: {
    fontFamily: font.sans,
    fontSize: 10,
    letterSpacing: 1.4,
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
