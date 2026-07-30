import { useRouter } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { AdminHeader } from '../../../components/admin/admin-header';
import { useAdminData } from '../../../lib/admin/admin-data';
import { color, font, spacing } from '../../../theme';
import type { District } from '../../../types/models';

/** District list — tap a row to edit its editorial description. Name,
 * metro, and accent color are shown read-only (CLAUDE.md's real 10
 * districts and their accent family are fixed, see theme/tokens.ts). */
export default function DistrictsList() {
  const router = useRouter();
  const { districts } = useAdminData();

  function renderItem({ item }: { item: District }) {
    return (
      <Pressable
        style={styles.row}
        onPress={() => router.push({ pathname: '/(admin)/districts/[id]', params: { id: item.id } })}
      >
        <View style={[styles.swatch, { backgroundColor: item.accentColor }]} />
        <View style={styles.rowMain}>
          <Text style={styles.rowTitle}>{item.name}</Text>
          <Text style={styles.rowMeta}>
            {item.metro} · {item.kind}
            {item.editorialDescription ? '' : ' · no editorial copy yet'}
          </Text>
        </View>
      </Pressable>
    );
  }

  return (
    <View style={styles.flex}>
      <AdminHeader title="Districts" subtitle={`${districts.length} total`} />
      <FlatList
        data={districts}
        keyExtractor={(d) => d.id}
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
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  swatch: { width: 14, height: 14, borderRadius: 7 },
  rowMain: { flex: 1, gap: 2 },
  rowTitle: { fontFamily: font.serifRegular, fontSize: 18, color: color.textPrimary },
  rowMeta: { fontFamily: font.sans, fontSize: 12, color: color.textSecondary },
});
