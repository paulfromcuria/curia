import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { Card, Kicker } from '../../components/curia';
import { MOMENTS } from '../../lib/data/seed';
import { color, font, spacing } from '../../theme';

/**
 * Placeholder Moments tab — full Moments + Journeys editorial layout is
 * `curia-moments-journeys`'s M6 work. Exactly 4 moment types per CLAUDE.md;
 * do not add more here.
 */
export default function Moments() {
  const router = useRouter();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.list}>
      <Kicker>Moments & journeys</Kicker>
      {MOMENTS.map((m) => (
        <Card key={m.id} onTouchEnd={() => router.push(`/journey/${m.id}`)} style={styles.row}>
          <Text style={styles.title}>{m.title}</Text>
          <Text style={styles.curator}>CURATED BY {m.curator}</Text>
          <Text style={styles.blurb}>{m.blurb}</Text>
        </Card>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: color.baseVariants.c,
  },
  list: {
    padding: spacing.lg,
    paddingTop: spacing.xxl,
    gap: spacing.md,
  },
  row: {
    gap: 6,
  },
  title: {
    fontFamily: font.serifRegular,
    fontSize: 22,
    color: color.textPrimary,
  },
  curator: {
    fontFamily: font.sans,
    fontSize: 9.5,
    letterSpacing: 2,
    color: color.gold,
  },
  blurb: {
    fontFamily: font.sans,
    fontSize: 12.5,
    lineHeight: 19,
    color: color.textSecondary,
  },
});
