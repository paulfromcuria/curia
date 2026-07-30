import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { AdminHeader } from '../../../components/admin/admin-header';
import { Button, TextField } from '../../../components/curia';
import { useAdminData } from '../../../lib/admin/admin-data';
import { color, font, spacing } from '../../../theme';
import type { Venue } from '../../../types/models';

/**
 * Venue list — search by name/district, tap a row to edit. Internal-only
 * fields (tier, source confidence) are shown here deliberately (this is the
 * admin surface they're meant for, per CLAUDE.md Hard rule 8) but nowhere
 * else in the app.
 */
export default function VenuesList() {
  const router = useRouter();
  const { venues, districts } = useAdminData();
  const [query, setQuery] = useState('');

  const districtName = (id: string) => districts.find((d) => d.id === id)?.name ?? id;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return venues;
    return venues.filter(
      (v) => v.name.toLowerCase().includes(q) || districtName(v.districtId).toLowerCase().includes(q)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venues, query, districts]);

  function renderItem({ item }: { item: Venue }) {
    return (
      <Pressable
        style={styles.row}
        onPress={() => router.push({ pathname: '/(admin)/venues/[id]', params: { id: item.id } })}
      >
        <View style={styles.rowMain}>
          <Text style={styles.rowTitle}>{item.name}</Text>
          <Text style={styles.rowMeta}>
            {item.type} · {districtName(item.districtId)} · {'£'.repeat(item.spendLevel)}
          </Text>
        </View>
        <Text style={[styles.tierBadge, item.tier === 'signature' ? styles.tierSignature : styles.tierTexture]}>
          {item.tier}
        </Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.flex}>
      <AdminHeader title="Venues" subtitle={`${venues.length} total`} />
      <View style={styles.searchRow}>
        <TextField label="Search" value={query} onChangeText={setQuery} placeholder="Name or district" autoCapitalize="none" />
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(v) => v.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={<Text style={styles.empty}>No venues match &quot;{query}&quot;.</Text>}
      />
      <View style={styles.footer}>
        <Button label="Add venue" onPress={() => router.push('/(admin)/venues/new')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: color.base },
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
  tierBadge: {
    fontFamily: font.sansMedium,
    fontSize: 10,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
  },
  tierSignature: { color: color.goldText, backgroundColor: color.gold },
  tierTexture: { color: color.textSecondary, backgroundColor: color.surfaceVariants.a },
  empty: { fontFamily: font.sans, fontSize: 13, color: color.textSecondary, paddingVertical: spacing.lg },
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: color.hairline,
    backgroundColor: color.base,
  },
});
