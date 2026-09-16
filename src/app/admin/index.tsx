import { useRouter, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { AdminHeader } from '../../components/admin/admin-header';
import { GrowthInsights } from '../../components/admin/growth-insights';
import { Button, Card } from '../../components/curia';
import { useAdminData } from '../../lib/admin/admin-data';
import { useAdminMembers } from '../../lib/admin/admin-members';
import { useAdminSession } from '../../lib/admin/admin-session';
import { supabaseAdmin } from '../../lib/data/supabase-admin-client';
import { CITIES, JOURNEYS, MOMENTS } from '../../lib/data/seed';
import { color, font, spacing } from '../../theme';

/**
 * Admin dashboard — the group's root screen. Links to the six curation
 * sections: venues, districts, and tiles are full CRUD (in-memory, see
 * src/lib/admin/admin-data.tsx); moments and journeys are simple views
 * (read from src/lib/data/seed.ts directly, no edit surface); users is a
 * read-only view of real members (src/lib/admin/admin-members.tsx, wired to
 * Supabase 2026-09 — see that file and supabase/migrations/0004_admin_access.sql).
 * Districts and Tiles were expanded from editorial-only/nonexistent to full
 * CRUD, and Users/Growth signals are new (2026-08, admin growth-dashboard
 * expansion).
 */
export default function AdminHome() {
  const router = useRouter();
  const { admin, logout } = useAdminSession();
  const { venues, districts, tiles } = useAdminData();
  const { members } = useAdminMembers();
  const [pendingReviewCount, setPendingReviewCount] = useState(0);

  useEffect(() => {
    supabaseAdmin
      .from('venue_candidates')
      .select('id', { count: 'exact', head: true })
      .in('status', ['pending_review', 'needs_new_type'])
      .then(({ count }) => setPendingReviewCount(count ?? 0));
  }, []);

  const sections: { label: string; description: string; count: number; href: Href }[] = [
    {
      label: 'Review',
      description: 'Approve or reject Curator worker candidates awaiting a decision.',
      count: pendingReviewCount,
      href: '/admin/review',
    },
    {
      label: 'Venues',
      description: 'Edit venue details, spend level, tier, source confidence and curator notes.',
      count: venues.length,
      href: '/admin/venues',
    },
    {
      label: 'Districts',
      description: 'Add, edit and delete districts, including liveliness multipliers.',
      count: districts.length,
      href: '/admin/districts',
    },
    {
      label: 'Tiles',
      description: 'Add, edit and delete the Do/Drink/Eat onboarding tile catalog.',
      count: tiles.length,
      href: '/admin/tiles',
    },
    {
      label: 'Moments',
      description: 'View the 4 curated moment lists and their curator bylines.',
      count: MOMENTS.length,
      href: '/admin/moments',
    },
    {
      label: 'Journeys',
      description: 'View multi-stop journeys and the districts they touch.',
      count: JOURNEYS.length,
      href: '/admin/journeys',
    },
    {
      label: 'Users',
      description: 'Real members, pulled live from Supabase, read-only.',
      count: members.length,
      href: '/admin/users',
    },
  ];

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <AdminHeader
        title="Curation tools"
        subtitle={admin ? `Signed in as ${admin.email}` : undefined}
        showBack={false}
      />

      <View style={styles.grid}>
        {sections.map((s) => (
          <Card key={s.label} style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardLabel}>{s.label}</Text>
              <Text style={styles.cardCount}>{s.count}</Text>
            </View>
            <Text style={styles.cardDescription}>{s.description}</Text>
            <Button label={`Open ${s.label}`} variant="secondary" onPress={() => router.push(s.href)} />
          </Card>
        ))}
      </View>

      <GrowthInsights venues={venues} districts={districts} tiles={tiles} cities={CITIES} />

      <Text style={styles.note}>
        Venues, Districts and Tiles edits are in-memory for this app session only. There is no
        backend wired up for them yet (see src/lib/admin/admin-data.tsx). Restarting the app
        resets those three back to the seed data in docs/data/*.json. Users is real, pulled
        live from Supabase.
      </Text>

      <Button label="Sign out" variant="ghost" onPress={logout} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, paddingBottom: spacing.xxl, gap: spacing.md },
  grid: { paddingHorizontal: spacing.lg, gap: spacing.md },
  card: { gap: spacing.sm },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  cardLabel: { fontFamily: font.serif, fontSize: 20, color: color.textPrimary },
  cardCount: { fontFamily: font.sansMedium, fontSize: 14, color: color.gold },
  cardDescription: { fontFamily: font.sans, fontSize: 12.5, lineHeight: 19, color: color.textSecondary },
  note: {
    marginHorizontal: spacing.lg,
    fontFamily: font.sans,
    fontSize: 11.5,
    lineHeight: 18,
    color: color.textTertiary,
  },
});
