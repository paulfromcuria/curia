import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { AdminHeader } from '../../../components/admin/admin-header';
import { Button, Tag, TextField } from '../../../components/curia';
import { type AdminMember, useAdminMembers } from '../../../lib/admin/admin-members';
import { color, font, spacing } from '../../../theme';
import type { SpendLevel, SubscriptionStatus } from '../../../types/models';

const STATUS_FILTERS: (SubscriptionStatus | 'All')[] = ['All', 'none', 'trialing', 'active', 'past_due', 'canceled'];
const STATUS_LABELS: Record<SubscriptionStatus | 'All', string> = {
  All: 'All',
  none: 'None',
  trialing: 'Trialing',
  active: 'Active',
  past_due: 'Past due',
  canceled: 'Canceled',
};
const SPEND_FILTERS: (SpendLevel | 'All')[] = ['All', 1, 2, 3, 4, 5];

/**
 * Users list (2026-09) — real members (src/lib/admin/admin-members.tsx),
 * read-only, no add/edit/delete: members aren't administered by creating
 * rows by hand even in a real system, this surfaces who has signed up.
 */
export default function UsersList() {
  const router = useRouter();
  const { members, loading, error, refresh } = useAdminMembers();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<SubscriptionStatus | 'All'>('All');
  const [spend, setSpend] = useState<SpendLevel | 'All'>('All');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return members.filter((m) => {
      if (status !== 'All' && m.subscriptionStatus !== status) return false;
      if (spend !== 'All' && m.spendLevel !== spend) return false;
      if (q && !m.name.toLowerCase().includes(q) && !m.email.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [members, query, status, spend]);

  function renderItem({ item }: { item: AdminMember }) {
    return (
      <Pressable
        style={styles.row}
        onPress={() => router.push({ pathname: '/admin/users/[id]', params: { id: item.id } })}
      >
        <View style={styles.rowMain}>
          <Text style={styles.rowTitle}>{item.name}</Text>
          <Text style={styles.rowMeta}>
            {item.email} · {'£'.repeat(item.spendLevel)}
          </Text>
        </View>
        <Text style={styles.statusBadge}>{STATUS_LABELS[item.subscriptionStatus]}</Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.flex}>
      <AdminHeader title="Users" subtitle={`${members.length} member${members.length === 1 ? '' : 's'}`} />
      <View style={styles.filterRow}>
        {STATUS_FILTERS.map((s) => (
          <Tag key={s} label={STATUS_LABELS[s]} active={status === s} onPress={() => setStatus(s)} />
        ))}
      </View>
      <View style={styles.filterRow}>
        {SPEND_FILTERS.map((s) => (
          <Tag key={s} label={s === 'All' ? 'All' : '£'.repeat(s)} active={spend === s} onPress={() => setSpend(s)} />
        ))}
      </View>
      <View style={styles.searchRow}>
        <TextField label="Search" value={query} onChangeText={setQuery} placeholder="Name or email" autoCapitalize="none" />
      </View>
      {error ? (
        <View style={styles.stateBlock}>
          <Text style={styles.errorText}>Couldn&apos;t load members: {error}</Text>
          <Button label="Retry" variant="secondary" onPress={refresh} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(m) => m.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            <Text style={styles.empty}>{loading ? 'Loading members…' : 'No members match these filters.'}</Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: color.base },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, paddingHorizontal: spacing.lg, marginBottom: spacing.sm },
  searchRow: { paddingHorizontal: spacing.lg, marginBottom: spacing.sm },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  separator: { height: 1, backgroundColor: color.hairline },
  stateBlock: { paddingHorizontal: spacing.lg, paddingVertical: spacing.lg, gap: spacing.sm },
  errorText: { fontFamily: font.sans, fontSize: 13, color: color.goldHover },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  rowMain: { flex: 1, gap: 2 },
  rowTitle: { fontFamily: font.serifRegular, fontSize: 18, color: color.textPrimary },
  rowMeta: { fontFamily: font.sans, fontSize: 12, color: color.textSecondary },
  statusBadge: {
    fontFamily: font.sansMedium,
    fontSize: 10,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: color.gold,
  },
  empty: { fontFamily: font.sans, fontSize: 13, color: color.textSecondary, paddingVertical: spacing.lg },
});
