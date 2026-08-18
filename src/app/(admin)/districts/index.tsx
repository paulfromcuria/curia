import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { AdminHeader } from '../../../components/admin/admin-header';
import { Button, TextField } from '../../../components/curia';
import { useAdminData } from '../../../lib/admin/admin-data';
import { color, font, spacing } from '../../../theme';
import type { District } from '../../../types/models';

/**
 * District list — search by name/metro, tap a row to edit, add new below
 * (2026-08, admin growth-dashboard expansion — full CRUD now that
 * docs/data/districts.json has grown past CLAUDE.md's original "fixed 10"
 * assumption; see district-form.tsx's doc comment).
 */
export default function DistrictsList() {
  const router = useRouter();
  const { districts } = useAdminData();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return districts;
    return districts.filter((d) => d.name.toLowerCase().includes(q) || d.metro.toLowerCase().includes(q));
  }, [districts, query]);

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
      <View style={styles.searchRow}>
        <TextField label="Search" value={query} onChangeText={setQuery} placeholder="Name or metro" autoCapitalize="none" />
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(d) => d.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={<Text style={styles.empty}>No districts match &quot;{query}&quot;.</Text>}
      />
      <View style={styles.footer}>
        <Button label="Add district" onPress={() => router.push('/(admin)/districts/new')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: color.base },
  searchRow: { paddingHorizontal: spacing.lg, marginBottom: spacing.sm },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  separator: { height: 1, backgroundColor: color.hairline },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  swatch: { width: 14, height: 14, borderRadius: 7 },
  rowMain: { flex: 1, gap: 2 },
  rowTitle: { fontFamily: font.serifRegular, fontSize: 18, color: color.textPrimary },
  rowMeta: { fontFamily: font.sans, fontSize: 12, color: color.textSecondary },
  empty: { fontFamily: font.sans, fontSize: 13, color: color.textSecondary, paddingVertical: spacing.lg },
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: color.hairline,
    backgroundColor: color.base,
  },
});
