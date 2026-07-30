import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { AdminHeader } from '../../../components/admin/admin-header';
import { VenueForm } from '../../../components/admin/venue-form';
import { slugifyVenueName, useAdminData } from '../../../lib/admin/admin-data';
import { color } from '../../../theme';
import type { Venue } from '../../../types/models';

/**
 * Add a new venue. A blank draft is built with conservative defaults
 * (matching src/lib/data/seed.ts's own defaulting comment for fields the
 * design bundle doesn't specify per-venue) — the id is only finalized on
 * save, once the name is known, via slugifyVenueName.
 */
export default function NewVenue() {
  const router = useRouter();
  const { venues, districts, upsertVenue } = useAdminData();

  const draft: Venue = useMemo(() => {
    const firstDistrict = districts[0];
    return {
      id: '', // replaced on save
      name: '',
      type: '',
      subPreferenceTags: [],
      spendLevel: 3,
      districtId: firstDistrict?.id ?? '',
      metro: firstDistrict?.metro ?? 'manchester',
      lat: firstDistrict?.lat ?? 0,
      lon: firstDistrict?.lon ?? 0,
      petFriendly: false,
      dietaryOptions: ['none'],
      photos: [],
      description: '',
      bands: ['evening'],
      base: 70,
      tier: 'texture',
      sourceConfidence: 0.5,
      notes: undefined,
    };
    // Only computed once on mount — re-running on every districts change
    // would reset in-progress edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={styles.flex}>
      <AdminHeader title="Add venue" />
      <VenueForm
        initial={draft}
        districts={districts}
        saveLabel="Add venue"
        onSave={(venue) => {
          const id = slugifyVenueName(venue.name, venues.map((v) => v.id));
          upsertVenue({ ...venue, id });
          router.back();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: color.base },
});
