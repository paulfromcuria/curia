import { useRouter } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { AdminHeader } from '../../../components/admin/admin-header';
import { useAdminData } from '../../../lib/admin/admin-data';
import { JOURNEYS, journeyDistricts } from '../../../lib/data/seed';
import { color, font, spacing } from '../../../theme';
import type { Journey } from '../../../types/models';

/** Simple read-only view of Journeys — per the M8 brief this is a view,
 * not a CRUD surface.
 *
 * `venues` comes from useAdminData() (admin-scoped, unfiltered), not
 * seed.ts's own module-level VENUES — passed into journeyDistricts so the
 * "districts touched" line resolves for every real Journey, including one
 * touching a metro (London, Chicago) the admin session hasn't lazily
 * loaded — see journeyDistricts' own doc comment in seed.ts for why. */
export default function JourneysList() {
  const router = useRouter();
  const { venues } = useAdminData();

  function renderItem({ item }: { item: Journey }) {
    const districts = journeyDistricts(item, venues).map((d) => d.name).join(', ');
    return (
      <Pressable
        style={styles.row}
        onPress={() => router.push({ pathname: '/admin/journeys/[id]', params: { id: item.id } })}
      >
        <Text style={styles.rowTitle}>{item.title}</Text>
        <Text style={styles.rowMeta}>{item.meta ?? `${item.stops.length} stops`}</Text>
        <Text style={styles.rowDistricts}>{districts}</Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.flex}>
      <AdminHeader title="Journeys" subtitle={`${JOURNEYS.length} total`} />
      <FlatList
        data={JOURNEYS}
        keyExtractor={(j) => j.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: color.base },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  separator: { height: 1, backgroundColor: color.hairline },
  row: { paddingVertical: spacing.md, gap: 4 },
  rowTitle: { fontFamily: font.serifRegular, fontSize: 20, color: color.textPrimary },
  rowMeta: { fontFamily: font.sansMedium, fontSize: 11, letterSpacing: 1.2, color: color.gold, textTransform: 'uppercase' },
  rowDistricts: { fontFamily: font.sans, fontSize: 12, color: color.textSecondary },
});
