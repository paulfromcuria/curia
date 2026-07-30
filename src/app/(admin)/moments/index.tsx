import { useRouter } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { AdminHeader } from '../../../components/admin/admin-header';
import { MOMENTS } from '../../../lib/data/seed';
import { color, font, spacing } from '../../../theme';
import type { Moment } from '../../../types/models';

/**
 * Simple read-only view of the 4 curated Moment types (CLAUDE.md: exactly
 * 4, "do not add ... without a product decision"). Per the M8 brief this
 * is a view, not a CRUD surface — no add/edit/delete here.
 */
export default function MomentsList() {
  const router = useRouter();

  function renderItem({ item }: { item: Moment }) {
    return (
      <Pressable
        style={styles.row}
        onPress={() => router.push({ pathname: '/(admin)/moments/[id]', params: { id: item.id } })}
      >
        <Text style={styles.rowTitle}>{item.title}</Text>
        <Text style={styles.rowMeta}>{item.curator} · {item.venueIds.length} picks</Text>
        <Text style={styles.rowBlurb} numberOfLines={2}>{item.blurb}</Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.flex}>
      <AdminHeader title="Moments" subtitle={`${MOMENTS.length} moment types (fixed — Hard rule per CLAUDE.md)`} />
      <FlatList
        data={MOMENTS}
        keyExtractor={(m) => m.id}
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
  rowBlurb: { fontFamily: font.sans, fontSize: 12.5, lineHeight: 18, color: color.textSecondary },
});
