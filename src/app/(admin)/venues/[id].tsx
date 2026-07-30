import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { AdminHeader } from '../../../components/admin/admin-header';
import { VenueForm } from '../../../components/admin/venue-form';
import { useAdminData } from '../../../lib/admin/admin-data';
import { color, font, spacing } from '../../../theme';

/** Edit an existing venue. `id` is the venue's slug id (see
 * src/lib/data/seed.ts / src/lib/admin/admin-data.tsx's slugifyVenueName). */
export default function EditVenue() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getVenue, getDistrict, districts, upsertVenue, deleteVenue } = useAdminData();
  const venue = getVenue(id);

  if (!venue) {
    return (
      <View style={styles.flex}>
        <AdminHeader title="Venue not found" />
        <Text style={styles.empty}>No venue with id &quot;{id}&quot; (it may have been deleted).</Text>
      </View>
    );
  }

  function handleDelete() {
    Alert.alert('Delete venue', `Remove "${venue!.name}" from the admin data set?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteVenue(venue!.id);
          router.back();
        },
      },
    ]);
  }

  return (
    <View style={styles.flex}>
      <AdminHeader title={venue.name} subtitle={getDistrict(venue.districtId)?.name} />
      <VenueForm
        initial={venue}
        districts={districts}
        onSave={(updated) => {
          upsertVenue(updated);
          router.back();
        }}
        onDelete={handleDelete}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: color.base },
  empty: {
    fontFamily: font.sans,
    fontSize: 13,
    color: color.textSecondary,
    paddingHorizontal: spacing.lg,
  },
});
