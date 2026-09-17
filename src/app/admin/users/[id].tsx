import { useEffect, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { AdminHeader } from '../../../components/admin/admin-header';
import { useAdminMembers } from '../../../lib/admin/admin-members';
import { supabaseAdmin } from '../../../lib/data/supabase-admin-client';
import { TILES } from '../../../lib/data/seed';
import { color, font, spacing } from '../../../theme';

const STATUS_LABELS: Record<string, string> = {
  none: 'None',
  trialing: 'Trialing',
  active: 'Active',
  past_due: 'Past due',
  canceled: 'Canceled',
};

interface MemberDetail {
  dietary: string[];
  pet: string;
  religiousObservance: string[];
  gender: string | null;
  ageRange: string | null;
  relationshipStatus: string | null;
  lastSignInAt: string | null;
}

interface SavedVenueRow {
  venue_id: string;
  venue_name: string;
  district_name: string;
  collection_name: string;
}

interface RatingRow {
  venue_id: string;
  venue_name: string;
  district_name: string;
  rating: number;
  rated_at: string;
}

function lastActiveLabel(lastSignInAt: string | null): string {
  if (!lastSignInAt) return 'Never signed in again';
  const d = new Date(lastSignInAt);
  return `${d.toLocaleDateString()} (${Math.floor((Date.now() - d.getTime()) / 86400000)}d ago)`;
}

/**
 * Read-only member detail (2026-09, real data — see
 * src/lib/admin/admin-members.tsx). No edit/delete controls — members
 * aren't administered this way even in a real system, this is explicitly a
 * read-focused view.
 *
 * Extended 2026-09-18, at explicit user request ("i want to be able to see
 * user behaviour and usage... in detail when i click on an individual
 * user"): the onboarding "You" profile (dietary/pet/religious observance/
 * gender/age/relationship), last sign-in, and every real saved venue and
 * rating this member has given — three new SECURITY DEFINER RPCs
 * (supabase/migrations/0017_member_activity.sql), same auth pattern as
 * admin_list_members(). Worth being honest about the real boundary here:
 * this is everything a member has *done* (signed up, come back, saved,
 * rated) and *told us* (onboarding answers) — there's no event log
 * anywhere in this app tracking page views, searches, or session length,
 * so that's not here either. Building that would be new instrumentation
 * throughout the member app, not a detail-screen addition.
 */
export default function UserDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { members, loading } = useAdminMembers();
  const member = members.find((m) => m.id === id);

  const [detail, setDetail] = useState<MemberDetail | null>(null);
  const [saved, setSaved] = useState<SavedVenueRow[]>([]);
  const [ratings, setRatings] = useState<RatingRow[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setActivityLoading(true);
    (async () => {
      const [memberRes, savedRes, ratingsRes] = await Promise.all([
        supabaseAdmin.rpc('admin_get_member', { member_id: id }),
        supabaseAdmin.rpc('admin_member_saved_venues', { member_id: id }),
        supabaseAdmin.rpc('admin_member_ratings', { member_id: id }),
      ]);
      if (cancelled) return;
      const row = (memberRes.data ?? [])[0];
      setDetail(
        row
          ? {
              dietary: row.dietary ?? [],
              pet: row.pet,
              religiousObservance: row.religious_observance ?? [],
              gender: row.gender,
              ageRange: row.age_range,
              relationshipStatus: row.relationship_status,
              lastSignInAt: row.last_sign_in_at,
            }
          : null
      );
      setSaved((savedRes.data ?? []) as SavedVenueRow[]);
      setRatings((ratingsRes.data ?? []) as RatingRow[]);
      setActivityLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (!member) {
    return (
      <View style={styles.flex}>
        <AdminHeader title={loading ? 'Loading…' : 'Member not found'} />
        {!loading ? <Text style={styles.empty}>No member with id &quot;{id}&quot;.</Text> : null}
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <AdminHeader title={member.name} subtitle={member.email} />
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.sectionLabel}>Account</Text>
        <Row label="Subscription" value={STATUS_LABELS[member.subscriptionStatus] ?? member.subscriptionStatus} />
        <Row label="Spend level" value={'£'.repeat(member.spendLevel)} />
        <Row label="Onboarding complete" value={member.onboardingComplete ? 'Yes' : 'No'} />
        <Row label="Joined" value={member.joinDate} />
        <Row label="Last active" value={lastActiveLabel(detail?.lastSignInAt ?? member.lastSignInAt)} />

        <Text style={styles.sectionLabel}>Usage</Text>
        <Row label="Venues saved" value={String(member.savedVenueCount)} />
        <Row label="Venues rated" value={String(member.ratedVenueCount)} />

        {detail && (
          <>
            <Text style={styles.sectionLabel}>You (onboarding answers)</Text>
            <Row label="Dietary" value={detail.dietary.length ? detail.dietary.join(', ') : 'None given'} />
            <Row label="Pet" value={detail.pet === 'none' ? 'None' : detail.pet} />
            <Row
              label="Religious observance"
              value={detail.religiousObservance.length ? detail.religiousObservance.join(', ') : 'None given'}
            />
            <Row label="Gender" value={detail.gender ?? 'Not given'} />
            <Row label="Age range" value={detail.ageRange ?? 'Not given'} />
            <Row label="Relationship status" value={detail.relationshipStatus ?? 'Not given'} />
          </>
        )}

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

        <Text style={styles.sectionLabel}>Saved venues ({saved.length})</Text>
        {activityLoading ? (
          <Text style={styles.empty}>Loading…</Text>
        ) : saved.length === 0 ? (
          <Text style={styles.empty}>Nothing saved yet.</Text>
        ) : (
          saved.map((s) => (
            <View key={s.venue_id} style={styles.tileRow}>
              <Text style={styles.tileName}>{s.venue_name}</Text>
              <Text style={styles.tileCategory}>
                {s.district_name} · {s.collection_name}
              </Text>
            </View>
          ))
        )}

        <Text style={styles.sectionLabel}>Ratings given ({ratings.length})</Text>
        {activityLoading ? (
          <Text style={styles.empty}>Loading…</Text>
        ) : ratings.length === 0 ? (
          <Text style={styles.empty}>Nothing rated yet.</Text>
        ) : (
          ratings.map((r) => (
            <View key={r.venue_id} style={styles.tileRow}>
              <Text style={styles.tileName}>{r.venue_name}</Text>
              <Text style={styles.tileCategory}>
                {'★'.repeat(r.rating)}
                {'☆'.repeat(5 - r.rating)} · {r.district_name}
              </Text>
            </View>
          ))
        )}
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
