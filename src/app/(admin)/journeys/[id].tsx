import { useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { AdminHeader } from '../../../components/admin/admin-header';
import { useAdminData } from '../../../lib/admin/admin-data';
import { JOURNEYS, journeyDistricts } from '../../../lib/data/seed';
import { color, font, spacing } from '../../../theme';

/** Read-only Journey detail: ordered stops, walk times, and the districts
 * touched (CLAUDE.md: "a Journey's displayed location is the set of
 * districts its stops touch"). */
export default function JourneyDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getVenue } = useAdminData();
  const journey = JOURNEYS.find((j) => j.id === id);

  if (!journey) {
    return (
      <View style={styles.flex}>
        <AdminHeader title="Journey not found" />
        <Text style={styles.empty}>No journey with id &quot;{id}&quot;.</Text>
      </View>
    );
  }

  const districts = journeyDistricts(journey).map((d) => d.name).join(', ');

  return (
    <View style={styles.flex}>
      <AdminHeader title={journey.title} subtitle={journey.meta ?? districts} />
      <ScrollView contentContainerStyle={styles.container}>
        {journey.blurb ? <Text style={styles.blurb}>{journey.blurb}</Text> : null}
        <Text style={styles.sectionLabel}>Stops ({journey.stops.length})</Text>
        {journey.stops
          .slice()
          .sort((a, b) => a.order - b.order)
          .map((stop, i) => {
            const venue = getVenue(stop.venueId);
            return (
              <View key={`${stop.venueId}-${stop.order}`} style={styles.stopRow}>
                <Text style={styles.stopIndex}>{i + 1}</Text>
                <View style={styles.stopMain}>
                  <Text style={styles.stopName}>{venue?.name ?? stop.venueId}</Text>
                  <Text style={styles.stopMeta}>{venue?.type}</Text>
                  {stop.walkTimeToNextMinutes != null ? (
                    <Text style={styles.stopWalk}>{stop.walkTimeToNextMinutes} min walk to next stop</Text>
                  ) : null}
                </View>
              </View>
            );
          })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: color.base },
  container: { padding: spacing.lg, gap: spacing.sm, paddingBottom: spacing.xxl },
  blurb: { fontFamily: font.serifRegular, fontSize: 17, lineHeight: 25, color: color.textPrimary, fontStyle: 'italic' },
  sectionLabel: {
    fontFamily: font.sansMedium,
    fontSize: 10,
    letterSpacing: 2.2,
    textTransform: 'uppercase',
    color: color.textTertiary,
    marginTop: spacing.md,
  },
  stopRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: color.hairline,
  },
  stopIndex: { fontFamily: font.sansMedium, fontSize: 13, color: color.gold, width: 18 },
  stopMain: { flex: 1, gap: 2 },
  stopName: { fontFamily: font.serifRegular, fontSize: 16, color: color.textPrimary },
  stopMeta: { fontFamily: font.sans, fontSize: 11.5, color: color.textSecondary },
  stopWalk: { fontFamily: font.sans, fontSize: 11, color: color.textTertiary },
  empty: { fontFamily: font.sans, fontSize: 13, color: color.textSecondary, paddingHorizontal: spacing.lg },
});
