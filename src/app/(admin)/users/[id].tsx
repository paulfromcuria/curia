import { useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { AdminHeader } from '../../../components/admin/admin-header';
import { DemoDataBanner } from '../../../components/admin/demo-data-banner';
import { TILES } from '../../../lib/data/seed';
import { DEMO_MEMBERS } from '../../../lib/admin/demo-users';
import { color, font, spacing } from '../../../theme';

const STATUS_LABELS: Record<string, string> = {
  none: 'None',
  trialing: 'Trialing',
  active: 'Active',
  past_due: 'Past due',
  canceled: 'Canceled',
};

/**
 * Read-only member detail (2026-08, admin growth-dashboard expansion).
 * No edit/delete controls — members aren't administered this way even in
 * a real system, and this is explicitly a read-focused view. See
 * demo-users.ts's doc comment: this is fabricated placeholder data.
 */
export default function UserDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const member = DEMO_MEMBERS.find((m) => m.id === id);

  if (!member) {
    return (
      <View style={styles.flex}>
        <AdminHeader title="Member not found" />
        <Text style={styles.empty}>No demo member with id &quot;{id}&quot;.</Text>
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <AdminHeader title={member.name} subtitle={member.email} />
      <ScrollView contentContainerStyle={styles.container}>
        <DemoDataBanner count={DEMO_MEMBERS.length} />

        <Row label="Subscription" value={STATUS_LABELS[member.subscriptionStatus] ?? member.subscriptionStatus} />
        <Row label="Spend level" value={'£'.repeat(member.spendLevel)} />
        <Row label="Onboarding complete" value={member.onboardingComplete ? 'Yes' : 'No'} />
        <Row label="Joined" value={member.joinDate} />

        <Text style={styles.sectionLabel}>Selected tiles ({member.selectedTileIds.length})</Text>
        {member.selectedTileIds.map((tileId) => {
          const tile = TILES.find((t) => t.id === tileId);
          return (
            <View key={tileId} style={styles.tileRow}>
              <Text style={styles.tileName}>{tile ? tile.name : tileId}</Text>
              {tile ? <Text style={styles.tileCategory}>{tile.category}</Text> : null}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: color.base },
  container: { padding: spacing.lg, gap: spacing.sm, paddingBottom: spacing.xxl },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: color.hairline,
  },
  rowLabel: { fontFamily: font.sans, fontSize: 12.5, color: color.textSecondary },
  rowValue: { fontFamily: font.serifRegular, fontSize: 15, color: color.textPrimary },
  sectionLabel: {
    fontFamily: font.sansMedium,
    fontSize: 10,
    letterSpacing: 2.2,
    textTransform: 'uppercase',
    color: color.textTertiary,
    marginTop: spacing.md,
  },
  tileRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: color.hairline,
  },
  tileName: { fontFamily: font.serifRegular, fontSize: 16, color: color.textPrimary },
  tileCategory: { fontFamily: font.sans, fontSize: 11.5, color: color.textSecondary },
  empty: { fontFamily: font.sans, fontSize: 13, color: color.textSecondary, paddingHorizontal: spacing.lg },
});
