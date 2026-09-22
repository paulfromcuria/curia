import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { AdminHeader } from '../../../components/admin/admin-header';
import { DistrictForm } from '../../../components/admin/district-form';
import { useAdminData } from '../../../lib/admin/admin-data';
import { color, font, spacing } from '../../../theme';

/**
 * Edit an existing district (2026-08, admin growth-dashboard expansion).
 * Replaces the earlier editorial-only editor — see district-form.tsx's doc
 * comment for why. Delete warns (not blocks) if venues still reference this
 * district, matching chain-denylist.ts's warn-don't-overengineer approach.
 *
 * `cities` comes from useAdminData() (admin-scoped, unfiltered), not
 * seed.ts's member-facing CITIES singleton — see admin-data.tsx's own
 * 2026-09-22 doc-comment addition for why (Santorini was unselectable
 * here while HOLIDAY_FEATURE_ENABLED is off, same root cause as the
 * "venues by metro graph doesn't add up" bug).
 */
export default function EditDistrict() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getDistrict, venues, cities, upsertDistrict, deleteDistrict } = useAdminData();
  const district = getDistrict(id);

  if (!district) {
    return (
      <View style={styles.flex}>
        <AdminHeader title="District not found" />
        <Text style={styles.empty}>No district with id &quot;{id}&quot;.</Text>
      </View>
    );
  }

  function handleDelete() {
    const affected = venues.filter((v) => v.districtId === district!.id).length;
    const message =
      affected > 0
        ? `"${district!.name}" has ${affected} venue(s) assigned to it. Deleting it will leave them pointing at a district that no longer exists. Delete anyway?`
        : `Remove "${district!.name}" from the admin data set?`;
    Alert.alert('Delete district', message, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteDistrict(district!.id);
          router.back();
        },
      },
    ]);
  }

  return (
    <View style={styles.flex}>
      <AdminHeader title={district.name} subtitle={`${district.metro} · ${district.kind}`} />
      <DistrictForm
        initial={district}
        cities={cities}
        onSave={(updated) => {
          upsertDistrict(updated);
          router.back();
        }}
        onDelete={handleDelete}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: color.base },
  empty: { fontFamily: font.sans, fontSize: 13, color: color.textSecondary, paddingHorizontal: spacing.lg },
});
