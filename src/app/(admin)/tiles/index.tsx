import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { AdminHeader } from '../../../components/admin/admin-header';
import { Button, Tag, TextField } from '../../../components/curia';
import { useAdminData } from '../../../lib/admin/admin-data';
import { color, font, spacing } from '../../../theme';
import type { Tile, TileCategory } from '../../../types/models';

const CATEGORY_FILTERS: (TileCategory | 'All')[] = ['All', 'Do', 'Drink', 'Eat'];

/**
 * Onboarding tile catalog list — search by name, filter by category, tap a
 * row to edit, add new below (2026-08, admin growth-dashboard expansion —
 * docs/data/tiles.json had no admin surface at all before this).
 */
export default function TilesList() {
  const router = useRouter();
  const { tiles } = useAdminData();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<TileCategory | 'All'>('All');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tiles.filter((t) => {
      if (category !== 'All' && t.category !== category) return false;
      if (q && !t.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [tiles, query, category]);

  function renderItem({ item }: { item: Tile }) {
    return (
      <Pressable
        style={styles.row}
        onPress={() => router.push({ pathname: '/(admin)/tiles/[id]', params: { id: item.id } })}
      >
        <View style={styles.rowMain}>
          <Text style={styles.rowTitle}>{item.name}</Text>
          <Text style={styles.rowMeta}>
            {item.subPreferences.length} sub-preference{item.subPreferences.length === 1 ? '' : 's'}
          </Text>
        </View>
        <Text style={styles.categoryBadge}>{item.category}</Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.flex}>
      <AdminHeader title="Tiles" subtitle={`${tiles.length} total`} />
      <View style={styles.filterRow}>
        {CATEGORY_FILTERS.map((c) => (
          <Tag key={c} label={c} active={category === c} onPress={() => setCategory(c)} />
        ))}
      </View>
      <View style={styles.searchRow}>
        <TextField label="Search" value={query} onChangeText={setQuery} placeholder="Tile name" autoCapitalize="none" />
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(t) => t.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={<Text style={styles.empty}>No tiles match &quot;{query}&quot;.</Text>}
      />
      <View style={styles.footer}>
        <Button label="Add tile" onPress={() => router.push('/(admin)/tiles/new')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: color.base },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, paddingHorizontal: spacing.lg, marginBottom: spacing.sm },
  searchRow: { paddingHorizontal: spacing.lg, marginBottom: spacing.sm },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  separator: { height: 1, backgroundColor: color.hairline },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  rowMain: { flex: 1, gap: 2 },
  rowTitle: { fontFamily: font.serifRegular, fontSize: 18, color: color.textPrimary },
  rowMeta: { fontFamily: font.sans, fontSize: 12, color: color.textSecondary },
  categoryBadge: {
    fontFamily: font.sansMedium,
    fontSize: 10,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: color.gold,
  },
  empty: { fontFamily: font.sans, fontSize: 13, color: color.textSecondary, paddingVertical: spacing.lg },
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: color.hairline,
    backgroundColor: color.base,
  },
});
