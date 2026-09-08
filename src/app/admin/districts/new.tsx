import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { AdminHeader } from '../../../components/admin/admin-header';
import { DistrictForm } from '../../../components/admin/district-form';
import { slugifyDistrictName, useAdminData } from '../../../lib/admin/admin-data';
import { CITIES } from '../../../lib/data/seed';
import { color } from '../../../theme';
import type { District } from '../../../types/models';

/**
 * Add a new district (2026-08, admin growth-dashboard expansion — see
 * district-form.tsx's doc comment for why this exists). Mirrors
 * venues/new.tsx exactly: a blank draft with conservative defaults, id
 * only finalized on save via slugifyDistrictName.
 */
export default function NewDistrict() {
  const router = useRouter();
  const { districts, upsertDistrict } = useAdminData();

  const draft: District = useMemo(() => {
    return {
      id: '', // replaced on save
      name: '',
      metro: CITIES[0]?.id ?? 'manchester',
      lat: 0,
      lon: 0,
      base: 60,
      kind: 'city',
      accentColor: '#C0A062',
      editorialDescription: '',
      dayMultiplier: undefined,
      bandMultiplier: undefined,
      groupId: undefined,
    };
    // Only computed once on mount — re-running would reset in-progress edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={styles.flex}>
      <AdminHeader title="Add district" />
      <DistrictForm
        initial={draft}
        cities={CITIES}
        saveLabel="Add district"
        onSave={(district) => {
          const id = slugifyDistrictName(district.name, districts.map((d) => d.id));
          upsertDistrict({ ...district, id });
          router.back();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: color.base },
});
