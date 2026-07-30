import { useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Kicker } from '../../components/curia';
import { DISTRICTS, venuesByDistrict } from '../../lib/data/seed';
import { color, font, spacing } from '../../theme';

/**
 * Placeholder district guide — editorial description + "ALL MOMENTS IN
 * {DISTRICT}" layout is `curia-moments-journeys`'s M6 work. Only real
 * districts have a detail page — grouped map labels never route here
 * (Hard rule 6).
 */
export default function DistrictGuide() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const district = DISTRICTS.find((d) => d.id === id);
  const venues = district ? venuesByDistrict(district.id) : [];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Kicker>{district?.kind === 'county' ? 'Cheshire' : 'Manchester'}</Kicker>
      <Text style={styles.title}>{district?.name ?? 'Not found'}</Text>
      <View style={styles.venues}>
        {venues.map((v) => (
          <Text key={v.id} style={styles.venue}>{v.name} · {v.type}</Text>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: color.baseVariants.a },
  content: { padding: spacing.lg, paddingTop: spacing.xxl, gap: spacing.sm },
  title: { fontFamily: font.serif, fontSize: 34, color: color.textPrimary, marginTop: spacing.sm },
  venues: { marginTop: spacing.lg, gap: spacing.xs },
  venue: { fontFamily: font.sans, fontSize: 13, color: color.textSecondary },
});
