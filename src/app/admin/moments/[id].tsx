import { useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { AdminHeader } from '../../../components/admin/admin-header';
import { useAdminData } from '../../../lib/admin/admin-data';
import { MOMENTS } from '../../../lib/data/seed';
import { color, font, spacing } from '../../../theme';

/** Read-only Moment detail: curator byline, blurb, and its curated venue
 * picks with district context. Venue names are looked up through the
 * admin data store so a rename made in Venues shows up here immediately. */
export default function MomentDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getVenue, getDistrict } = useAdminData();
  const moment = MOMENTS.find((m) => m.id === id);

  if (!moment) {
    return (
      <View style={styles.flex}>
        <AdminHeader title="Moment not found" />
        <Text style={styles.empty}>No moment with id &quot;{id}&quot;.</Text>
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <AdminHeader title={moment.title} subtitle={`Curated by ${moment.curator}`} />
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.blurb}>{moment.blurb}</Text>
        <Text style={styles.sectionLabel}>Picks ({moment.venueIds.length})</Text>
        {moment.venueIds.map((venueId) => {
          const venue = getVenue(venueId);
          const district = venue ? getDistrict(venue.districtId) : undefined;
          return (
            <View key={venueId} style={styles.pickRow}>
              <Text style={styles.pickName}>{venue?.name ?? venueId}</Text>
              <Text style={styles.pickMeta}>{venue?.type} · {district?.name ?? venue?.districtId}</Text>
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
  pickRow: { paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: color.hairline },
  pickName: { fontFamily: font.serifRegular, fontSize: 16, color: color.textPrimary },
  pickMeta: { fontFamily: font.sans, fontSize: 11.5, color: color.textSecondary },
  empty: { fontFamily: font.sans, fontSize: 13, color: color.textSecondary, paddingHorizontal: spacing.lg },
});
