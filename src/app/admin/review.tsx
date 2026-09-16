import { useCallback, useEffect, useMemo, useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AdminHeader } from '../../components/admin/admin-header';
import { Button, Card, Kicker, Tag, TextField } from '../../components/curia';
import { useAdminSession } from '../../lib/admin/admin-session';
import { supabaseAdmin } from '../../lib/data/supabase-admin-client';
import { color, font, spacing } from '../../theme';

/**
 * /admin/review — the human review surface for the Curator worker's
 * output (growth-engine plan, Step 5). Reuses AdminSessionProvider exactly
 * as every other admin screen (see src/app/admin/_layout.tsx's guard) —
 * no separate auth here. Writes go through supabaseAdmin (the same
 * anon-key client every admin screen already uses) rather than a
 * service-role secret: this app is a static SPA with no backend to hold
 * one, so migration 0012_admin_review_access.sql grants admin_users
 * members direct RLS access to the four growth-engine tables instead —
 * see that migration's own header comment for the full reasoning.
 *
 * Deliberately NOT a literal swipe-card stack (react-native-gesture-handler
 * is in this repo, react-native-reanimated isn't, and this is internal
 * back-office tooling, not a customer surface — see AdminHeader's own
 * comment on that distinction) — Approve/Reject/Next buttons are the same
 * interaction model without needing gesture-physics tuning nobody could
 * test on a real device from here.
 */

interface VenueCandidateRow {
  id: string;
  name: string;
  type: string;
  district_id: string;
  metro: string;
  spend_level: number | null;
  description: string | null;
  editor_copy_override: string | null;
  ownership: string | null;
  distinctiveness_proposed: number | null;
  gate1_reasoning: string | null;
  sources: Array<{ url?: string; note?: string }> | null;
  status: string;
  reject_reason: string | null;
  created_at: string;
}

interface DistrictCandidateRow {
  id: string;
  name: string;
  region: string;
  character: string | null;
  rationale: string | null;
  sources: Array<{ url?: string; note?: string }> | null;
  status: string;
}

interface WorkerRunRow {
  id: string;
  started_at: string;
  finished_at: string | null;
  market: string;
  candidates_discovered: number;
  submitted_for_review: number;
  api_cost_usd: number;
}

const REJECT_REASON_CHIPS = [
  'Not real / unverifiable',
  'Fails Gate 1',
  'Duplicate of existing venue',
  'Copy needs work',
  'Wrong district',
];

export default function AdminReview() {
  const { admin } = useAdminSession();
  const [tab, setTab] = useState<'candidates' | 'districts'>('candidates');

  const [lastRun, setLastRun] = useState<WorkerRunRow | null>(null);
  const [liveVenueCount, setLiveVenueCount] = useState<number | null>(null);

  const [candidates, setCandidates] = useState<VenueCandidateRow[]>([]);
  const [districtCandidates, setDistrictCandidates] = useState<DistrictCandidateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState(0);
  const [reviewedInDistrict, setReviewedInDistrict] = useState<Record<string, number>>({});

  const [draftCopy, setDraftCopy] = useState('');
  const [draftDistinctiveness, setDraftDistinctiveness] = useState<number | null>(null);
  const [selectedReasonChip, setSelectedReasonChip] = useState<string | null>(null);
  const [freeTextReason, setFreeTextReason] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    const [runRes, countRes, candidatesRes, districtRes] = await Promise.all([
      supabaseAdmin.from('worker_runs').select('*').order('started_at', { ascending: false }).limit(1).maybeSingle(),
      supabaseAdmin.from('venues').select('id', { count: 'exact', head: true }),
      supabaseAdmin
        .from('venue_candidates')
        .select('*')
        .in('status', ['pending_review', 'needs_new_type'])
        .order('created_at', { ascending: true }),
      supabaseAdmin.from('district_candidates').select('*').eq('status', 'pending_review'),
    ]);

    setLastRun((runRes.data as WorkerRunRow) ?? null);
    setLiveVenueCount(countRes.count ?? null);
    setCandidates((candidatesRes.data as VenueCandidateRow[]) ?? []);
    setDistrictCandidates((districtRes.data as DistrictCandidateRow[]) ?? []);
    setCursor(0);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const closureFlags = useMemo(() => candidates.filter((c) => c.reject_reason?.startsWith('CLOSURE?')), [candidates]);
  const reviewQueue = useMemo(
    () => candidates.filter((c) => !c.reject_reason?.startsWith('CLOSURE?')),
    [candidates]
  );

  const current = reviewQueue[cursor] ?? null;

  useEffect(() => {
    setDraftCopy(current?.editor_copy_override ?? current?.description ?? '');
    setDraftDistinctiveness(current?.distinctiveness_proposed ?? 4);
    setSelectedReasonChip(null);
    setFreeTextReason('');
  }, [current?.id]);

  async function writeFeedback(candidateId: string, decision: 'approved' | 'rejected', reason?: string) {
    await supabaseAdmin
      .from('review_feedback')
      .insert({ candidate_id: candidateId, candidate_table: 'venue_candidates', decision, reason: reason ?? null });
  }

  async function decide(candidate: VenueCandidateRow, decision: 'approved' | 'rejected') {
    const reason = decision === 'rejected' ? selectedReasonChip ?? (freeTextReason || undefined) : undefined;
    await supabaseAdmin
      .from('venue_candidates')
      .update({
        status: decision,
        reject_reason: reason ?? null,
        editor_copy_override: draftCopy !== candidate.description ? draftCopy : null,
        distinctiveness_proposed: draftDistinctiveness,
        updated_at: new Date().toISOString(),
      })
      .eq('id', candidate.id);
    await writeFeedback(candidate.id, decision, reason);

    setReviewedInDistrict((prev) => ({
      ...prev,
      [candidate.district_id]: (prev[candidate.district_id] ?? 0) + 1,
    }));
    setCandidates((prev) => prev.filter((c) => c.id !== candidate.id));
  }

  async function bulkApproveDistrict(districtId: string) {
    const inDistrict = reviewQueue.filter((c) => c.district_id === districtId);
    for (const c of inDistrict) {
      await supabaseAdmin.from('venue_candidates').update({ status: 'approved', updated_at: new Date().toISOString() }).eq('id', c.id);
      await writeFeedback(c.id, 'approved', 'bulk-approved after spot check');
    }
    setCandidates((prev) => prev.filter((c) => c.district_id !== districtId || c.reject_reason?.startsWith('CLOSURE?')));
  }

  async function decideDistrict(d: DistrictCandidateRow, decision: 'approved' | 'rejected') {
    await supabaseAdmin.from('district_candidates').update({ status: decision }).eq('id', d.id);
    await supabaseAdmin
      .from('review_feedback')
      .insert({ candidate_id: d.id, candidate_table: 'district_candidates', decision });
    setDistrictCandidates((prev) => prev.filter((x) => x.id !== d.id));
  }

  async function decideClosure(c: VenueCandidateRow, confirmed: boolean) {
    await supabaseAdmin
      .from('venue_candidates')
      .update({ status: confirmed ? 'approved' : 'rejected' })
      .eq('id', c.id);
    await writeFeedback(c.id, confirmed ? 'approved' : 'rejected', confirmed ? 'closure confirmed' : 'closure not confirmed');
    setCandidates((prev) => prev.filter((x) => x.id !== c.id));
  }

  const canBulkApprove = current ? (reviewedInDistrict[current.district_id] ?? 0) >= 5 : false;

  return (
    <View style={styles.flex}>
      <AdminHeader title="Review" subtitle="Curator candidates awaiting a decision" />

      <View style={styles.digestCard}>
        <Card tone="inset" style={styles.digest}>
          {lastRun ? (
            <>
              <Kicker tone="tertiary">Last run — {lastRun.market}</Kicker>
              <Text style={styles.digestLine}>
                {lastRun.candidates_discovered} discovered · {lastRun.submitted_for_review} submitted · $
                {lastRun.api_cost_usd?.toFixed(2) ?? '0.00'}
              </Text>
            </>
          ) : (
            <Text style={styles.digestLine}>No worker runs yet.</Text>
          )}
          <Text style={styles.digestTotal}>
            {liveVenueCount ?? '—'} venues live{admin ? ` · signed in as ${admin.email}` : ''}
          </Text>
        </Card>
      </View>

      <View style={styles.tabRow}>
        {(['candidates', 'districts'] as const).map((t) => (
          <Button
            key={t}
            label={t === 'candidates' ? `Candidates (${reviewQueue.length})` : `Districts & closures (${districtCandidates.length + closureFlags.length})`}
            variant={tab === t ? 'primary' : 'secondary'}
            onPress={() => setTab(t)}
            style={styles.tabButton}
          />
        ))}
      </View>

      {loading ? (
        <Text style={styles.empty}>Loading...</Text>
      ) : tab === 'candidates' ? (
        current ? (
          <ScrollView contentContainerStyle={styles.scroll}>
            <Card style={styles.candidateCard}>
              <Kicker tone="tertiary">
                {current.district_id} · {current.metro}
              </Kicker>
              <Text style={styles.name}>{current.name}</Text>
              <Text style={styles.meta}>
                {current.type} · {current.spend_level ? '£'.repeat(current.spend_level) : '—'} · {current.ownership ?? 'ownership unknown'}
              </Text>
              {current.status === 'needs_new_type' && (
                <Text style={styles.needsTypeFlag}>Needs a new venue type — no existing tile fits.</Text>
              )}

              <Text style={styles.sectionLabel}>Distinctiveness (Gate 2)</Text>
              <View style={styles.distinctivenessRow}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <Tag key={n} label={String(n)} active={draftDistinctiveness === n} onPress={() => setDraftDistinctiveness(n)} />
                ))}
              </View>

              <View style={styles.copyField}>
                <TextField
                  label="Copy"
                  value={draftCopy}
                  onChangeText={setDraftCopy}
                  multiline
                  numberOfLines={3}
                />
              </View>

              {current.gate1_reasoning ? (
                <Text style={styles.gateReasoning}>Gate 1: {current.gate1_reasoning}</Text>
              ) : null}

              {current.sources?.length ? (
                <View style={styles.sourcesRow}>
                  {current.sources.slice(0, 3).map((s, i) =>
                    s.url ? (
                      <Text key={i} style={styles.sourceLink} onPress={() => Linking.openURL(s.url!)}>
                        Source {i + 1}
                      </Text>
                    ) : null
                  )}
                </View>
              ) : null}

              <Text style={styles.sectionLabel}>If rejecting</Text>
              <View style={styles.reasonChips}>
                {REJECT_REASON_CHIPS.map((r) => (
                  <Tag key={r} label={r} active={selectedReasonChip === r} onPress={() => setSelectedReasonChip(r)} />
                ))}
              </View>
              <TextField
                label="Or a specific reason"
                value={freeTextReason}
                onChangeText={setFreeTextReason}
                placeholder="Optional"
              />

              <View style={styles.actionRow}>
                <Button label="Reject" variant="secondary" style={styles.actionButton} onPress={() => decide(current, 'rejected')} />
                <Button label="Approve" style={styles.actionButton} onPress={() => decide(current, 'approved')} />
              </View>
              {canBulkApprove ? (
                <Button
                  label={`Bulk-approve rest of ${current.district_id}`}
                  variant="ghost"
                  onPress={() => bulkApproveDistrict(current.district_id)}
                />
              ) : null}
              <Text style={styles.queuePosition}>
                {cursor + 1} of {reviewQueue.length}
              </Text>
            </Card>
          </ScrollView>
        ) : (
          <Text style={styles.empty}>No candidates waiting for review.</Text>
        )
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          {districtCandidates.map((d) => (
            <Card key={d.id} style={styles.candidateCard}>
              <Kicker tone="tertiary">New district — {d.region}</Kicker>
              <Text style={styles.name}>{d.name}</Text>
              {d.character ? <Text style={styles.meta}>{d.character}</Text> : null}
              {d.rationale ? <Text style={styles.gateReasoning}>{d.rationale}</Text> : null}
              <View style={styles.actionRow}>
                <Button label="Reject" variant="secondary" style={styles.actionButton} onPress={() => decideDistrict(d, 'rejected')} />
                <Button label="Approve" style={styles.actionButton} onPress={() => decideDistrict(d, 'approved')} />
              </View>
            </Card>
          ))}
          {closureFlags.map((c) => (
            <Card key={c.id} style={styles.candidateCard}>
              <Kicker tone="tertiary">Closure flag — {c.district_id}</Kicker>
              <Text style={styles.name}>{c.name}</Text>
              <Text style={styles.gateReasoning}>{c.reject_reason?.replace('CLOSURE? ', '')}</Text>
              <View style={styles.actionRow}>
                <Button label="Still open" variant="secondary" style={styles.actionButton} onPress={() => decideClosure(c, false)} />
                <Button label="Confirm closed" style={styles.actionButton} onPress={() => decideClosure(c, true)} />
              </View>
            </Card>
          ))}
          {districtCandidates.length === 0 && closureFlags.length === 0 ? (
            <Text style={styles.empty}>Nothing waiting here.</Text>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: color.base },
  digestCard: { paddingHorizontal: spacing.lg, marginBottom: spacing.sm },
  digest: { gap: 4 },
  digestLine: { fontFamily: font.sans, fontSize: 12, color: color.textSecondary },
  digestTotal: { fontFamily: font.sansMedium, fontSize: 12, color: color.goldLight, marginTop: 4 },
  tabRow: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, marginBottom: spacing.sm },
  tabButton: { flex: 1 },
  scroll: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, gap: spacing.md },
  candidateCard: { gap: spacing.sm },
  name: { fontFamily: font.serif, fontSize: 24, color: color.textPrimary },
  meta: { fontFamily: font.sans, fontSize: 12, color: color.textSecondary },
  needsTypeFlag: { fontFamily: font.sans, fontSize: 11.5, color: color.goldHover },
  sectionLabel: {
    fontFamily: font.sansMedium,
    fontSize: 10,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: color.textTertiary,
    marginTop: spacing.xs,
  },
  distinctivenessRow: { flexDirection: 'row', gap: spacing.xs },
  copyField: { marginTop: spacing.xs },
  gateReasoning: { fontFamily: font.serifRegular, fontStyle: 'italic', fontSize: 13, color: color.textSecondary },
  sourcesRow: { flexDirection: 'row', gap: spacing.md },
  sourceLink: { fontFamily: font.sans, fontSize: 11.5, color: color.gold, textDecorationLine: 'underline' },
  reasonChips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  actionRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  actionButton: { flex: 1 },
  queuePosition: { fontFamily: font.sans, fontSize: 11, color: color.textTertiary, textAlign: 'center' },
  empty: { fontFamily: font.sans, fontSize: 13, color: color.textSecondary, textAlign: 'center', padding: spacing.xl },
});
