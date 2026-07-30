import { useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { Kicker } from '../../components/curia';
import { VENUES } from '../../lib/data/seed';
import { color, font, spacing } from '../../theme';

/**
 * Placeholder venue detail — full layout (photo hero, ride-to-venue handoff)
 * is `curia-moments-journeys`'s M6 work. Never render internal-only fields
 * (tier/sourceConfidence/notes — Hard rule 8), even here.
 */
export default function VenueDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const venue = VENUES.find((v) => v.id === id);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Kicker>{venue?.type ?? 'Venue'}</Kicker>
      <Text style={styles.title}>{venue?.name ?? 'Not found'}</Text>
      <Text style={styles.desc}>{venue?.description}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: color.baseVariants.a },
  content: { padding: spacing.lg, paddingTop: spacing.xxl, gap: spacing.sm },
  title: { fontFamily: font.serif, fontSize: 34, color: color.textPrimary, marginTop: spacing.sm },
  desc: { fontFamily: font.sans, fontSize: 13.5, lineHeight: 22, color: color.textSecondaryAlt },
});
