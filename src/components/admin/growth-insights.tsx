import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Card, Kicker, Tag, TextField } from '../curia';
import {
  contentQualityMetrics,
  lowCoverageTiles,
  memberGrowthMetrics,
  metroCoverage,
  tierDistribution,
  tileCoverage,
} from '../../lib/admin/dashboard-insights';
import type { AdminMember } from '../../lib/admin/admin-members';
import { useAdminTargets } from '../../lib/admin/admin-targets';
import { color, font, spacing } from '../../theme';
import type { City, District, Tile, Venue } from '../../types/models';

interface GrowthInsightsProps {
  venues: Venue[];
  districts: District[];
  tiles: Tile[];
  cities: City[];
  members: AdminMember[];
}

/** A metric with a real current value against either a fixed, objective
 * completion target (100%, 0 remaining — not a business judgment call) or
 * an admin-set one persisted to admin_targets. Editable targets show an
 * inline number field when tapped; fixed ones just show the bar. */
function TargetBar({
  label,
  current,
  target,
  targetKey,
  format = (n: number) => String(n),
}: {
  label: string;
  current: number;
  target: number | null;
  targetKey?: string;
  format?: (n: number) => string;
}) {
  const { setTarget } = useAdminTargets();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  if (target === null) {
    return (
      <View style={styles.targetRow}>
        <Text style={styles.targetLabel}>{label}</Text>
        {editing ? (
          <View style={styles.targetEditRow}>
            <TextField
              label=""
              value={draft}
              onChangeText={setDraft}
              placeholder="Target"
              keyboardType="numeric"
            />
            <Pressable
              onPress={() => {
                const n = Number(draft);
                if (targetKey && !Number.isNaN(n) && n > 0) setTarget(targetKey, n);
                setEditing(false);
              }}
            >
              <Text style={styles.targetSetLink}>Save</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable onPress={() => setEditing(true)}>
            <Text style={styles.targetSetLink}>{format(current)} · Set a target</Text>
          </Pressable>
        )}
      </View>
    );
  }

  const pct = target === 0 ? (current === 0 ? 100 : 0) : Math.min(100, Math.round((current / target) * 100));
  return (
    <View style={styles.targetRow}>
      <View style={styles.targetHeaderRow}>
        <Text style={styles.targetLabel}>{label}</Text>
        <Text style={styles.targetValue}>
          {format(current)} / {format(target)}
        </Text>
      </View>
      <View style={styles.targetTrack}>
        <View style={[styles.targetFill, { width: `${pct}%` }]} />
      </View>
    </View>
  );
}

/**
 * Real, computed growth/coverage signals for the admin dashboard home
 * (2026-08, admin growth-dashboard expansion; extended 2026-09-18 for real
 * user-growth/engagement KPIs and admin-settable targets, at explicit user
 * request: "some skpi's and metrics and BA stuff on there... metrics
 * tracking development progress and database depth etc with some
 * targets"). Everything here is derived from the live admin
 * venues/districts/tiles/members state, never demo data. No new chart
 * library: plain Card/Text/bar rows, matching the dashboard's existing
 * minimalist look.
 *
 * Targets fall into two kinds: fixed, objective completion targets (100%
 * tile coverage, 100% of venues individually scored, 0 districts below
 * the ranking floor) — these aren't business judgment calls, they're
 * "is the data complete" questions, so they're hardcoded rather than
 * left blank. Member/venue *growth* targets are real business decisions
 * this app has no basis to invent — those are editable, persisted to
 * admin_targets (migration 0018), and start unset.
 */
export function GrowthInsights({ venues, districts, tiles, cities, members }: GrowthInsightsProps) {
  const { targets } = useAdminTargets();
  const metros = useMemo(() => metroCoverage(venues, districts, cities), [venues, districts, cities]);
  const tiers = useMemo(() => tierDistribution(venues), [venues]);
  const coverage = useMemo(() => tileCoverage(venues, tiles), [venues, tiles]);
  const lowCoverage = useMemo(() => lowCoverageTiles(coverage), [coverage]);
  const growth = useMemo(() => memberGrowthMetrics(members), [members]);
  const content = useMemo(() => contentQualityMetrics(venues, districts, tiles), [venues, districts, tiles]);

  return (
    <View style={styles.container}>
      <Kicker>Growth & engagement</Kicker>
      <Text style={styles.note}>Computed live from real members — signups, saves and ratings, not demo data.</Text>

      <Card tone="inset" style={styles.card}>
        <Text style={styles.cardTitle}>Members</Text>
        <Text style={styles.statLine}>
          {growth.total} total · {growth.new7d} new this week · {growth.new30d} new this month
        </Text>
        <TargetBar
          label="Total members"
          current={growth.total}
          target={targets.member_count ?? null}
          targetKey="member_count"
        />
      </Card>

      <Card tone="inset" style={styles.card}>
        <Text style={styles.cardTitle}>Engagement</Text>
        <Text style={styles.statLine}>{growth.onboardingCompletionPct}% completed onboarding</Text>
        <TargetBar
          label="Activated (saved or rated a venue)"
          current={growth.activatedPct}
          target={targets.activation_pct ?? null}
          targetKey="activation_pct"
          format={(n) => `${n}%`}
        />
        <Text style={styles.statLine}>{growth.returnedPct}% have signed back in after joining</Text>
      </Card>

      <Card tone="inset" style={styles.card}>
        <Text style={styles.cardTitle}>Subscription status</Text>
        <View style={styles.wrap}>
          {Object.entries(growth.subscriptionCounts).map(([status, count]) => (
            <Tag key={status} label={`${status}: ${count}`} />
          ))}
        </View>
      </Card>

      <Kicker style={styles.sectionKicker}>Development progress & database depth</Kicker>

      <Card tone="inset" style={styles.card}>
        <Text style={styles.cardTitle}>Coverage by metro</Text>
        {metros.map((m) => (
          <View key={m.metroId} style={styles.metroRow}>
            <Text style={styles.metroName}>{m.metroName}</Text>
            <Text style={styles.metroStat}>
              {m.districtCount} district{m.districtCount === 1 ? '' : 's'} · {m.venueCount} venue
              {m.venueCount === 1 ? '' : 's'}
            </Text>
          </View>
        ))}
        <TargetBar
          label="Total venues"
          current={content.totalVenues}
          target={targets.venue_count ?? null}
          targetKey="venue_count"
        />
      </Card>

      <Card tone="inset" style={styles.card}>
        <Text style={styles.cardTitle}>Curation quality</Text>
        <TargetBar
          label="Individually scored (not just default)"
          current={content.individuallyScoredVenues}
          target={content.totalVenues}
        />
        <TargetBar label="Onboarding tiles with a real match" current={content.tilesCovered} target={content.totalTiles} />
        <TargetBar
          label="Districts below ranking floor (3 venues)"
          current={content.districtsBelowRankThreshold}
          target={0}
        />
        <Text style={styles.statLine}>
          {tiers.signatureCount} signature · {tiers.textureCount} texture ({tiers.signaturePct}% signature)
        </Text>
      </Card>

      <Card tone="inset" style={styles.card}>
        <Text style={styles.cardTitle}>Tile coverage</Text>
        <Text style={styles.statLine}>
          {lowCoverage.length} of {tiles.length} tiles have zero matching real venues
        </Text>
        {lowCoverage.length > 0 ? (
          <View style={styles.wrap}>
            {lowCoverage.slice(0, 8).map((c) => (
              <Tag key={c.tileId} label={c.name} />
            ))}
          </View>
        ) : null}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: spacing.lg, gap: spacing.md, marginTop: spacing.lg },
  note: { fontFamily: font.sans, fontSize: 11.5, lineHeight: 17, color: color.textTertiary, marginTop: -spacing.sm },
  sectionKicker: { marginTop: spacing.md },
  card: { gap: spacing.sm },
  cardTitle: { fontFamily: font.serif, fontSize: 17, color: color.textPrimary },
  metroRow: { flexDirection: 'row', justifyContent: 'space-between' },
  metroName: { fontFamily: font.serifRegular, fontSize: 14, color: color.textPrimary },
  metroStat: { fontFamily: font.sans, fontSize: 12, color: color.textSecondary },
  statLine: { fontFamily: font.sans, fontSize: 13, color: color.textSecondary },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  targetRow: { gap: 4, marginTop: 4 },
  targetHeaderRow: { flexDirection: 'row', justifyContent: 'space-between' },
  targetLabel: { fontFamily: font.sans, fontSize: 11.5, color: color.textSecondary },
  targetValue: { fontFamily: font.sans, fontSize: 11.5, color: color.textPrimary },
  targetTrack: { height: 4, borderRadius: 2, backgroundColor: color.hairlineMax, overflow: 'hidden' },
  targetFill: { height: 4, borderRadius: 2, backgroundColor: color.gold },
  targetEditRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  targetSetLink: { fontFamily: font.sans, fontSize: 11.5, color: color.gold },
});
