import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Card, Kicker, Tag, TextField } from '../curia';
import { BarChart } from './bar-chart';
import {
  contentQualityMetrics,
  engagementFunnel,
  lowCoverageTiles,
  memberGrowthMetrics,
  metroCoverage,
  signupsByDay,
  subscriptionBreakdownChart,
  tierDistribution,
  tileCoverage,
  venuesByMetroChart,
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

/** One big, readable number — tap it to reveal the real chart behind it
 * ("like a tableau dashboard", 2026-09-18 at explicit user request). Only
 * one chart panel is expanded at a time per StatTile row, not global, so
 * tapping a second tile doesn't require closing the first by hand. */
function StatTile({
  label,
  value,
  expanded,
  onPress,
}: {
  label: string;
  value: string | number;
  expanded: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={[styles.tile, expanded && styles.tileActive]} onPress={onPress}>
      <Text style={styles.tileValue}>{value}</Text>
      <Text style={styles.tileLabel}>{label}</Text>
      <Text style={styles.tileHint}>{expanded ? 'HIDE CHART' : 'TAP FOR CHART'}</Text>
    </Pressable>
  );
}

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
            <TextField label="" value={draft} onChangeText={setDraft} placeholder="Target" keyboardType="numeric" />
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
 * Real, computed growth/coverage KPIs for the admin dashboard home — pushed
 * to the TOP of the page (2026-09-18, at explicit user request: "push it to
 * the top and give big readable metrics, which can be clicked through into
 * graphs, like a tableau dashboard"). Big stat tiles up front, each one
 * expanding into a real SVG chart (src/components/admin/bar-chart.tsx) on
 * tap — no charting library, react-native-svg was already a dependency.
 * Every chart is built from data that's actually real: signups-by-day is
 * the one genuinely time-series metric this app can honestly draw (the
 * only per-member field with a real timestamp history is join date —
 * saved/rated counts are current snapshots with no "when" behind them).
 *
 * Targets fall into two kinds, unchanged from the previous pass: fixed,
 * objective completion targets (100% tile coverage, 100% individually
 * scored, 0 districts below the ranking floor) are hardcoded, since
 * they're not business judgment calls. Member/venue growth targets are
 * real business decisions this app has no basis to invent, so they're
 * editable and persisted to admin_targets (migration 0018).
 */
export function GrowthInsights({ venues, districts, tiles, cities, members }: GrowthInsightsProps) {
  const { targets } = useAdminTargets();
  const [expanded, setExpanded] = useState<string | null>(null);
  const toggle = (key: string) => setExpanded((cur) => (cur === key ? null : key));

  const metros = useMemo(() => metroCoverage(venues, districts, cities), [venues, districts, cities]);
  const tiers = useMemo(() => tierDistribution(venues), [venues]);
  const coverage = useMemo(() => tileCoverage(venues, tiles), [venues, tiles]);
  const lowCoverage = useMemo(() => lowCoverageTiles(coverage), [coverage]);
  const growth = useMemo(() => memberGrowthMetrics(members), [members]);
  const content = useMemo(() => contentQualityMetrics(venues, districts, tiles), [venues, districts, tiles]);
  const signups = useMemo(() => signupsByDay(members), [members]);
  const funnel = useMemo(() => engagementFunnel(members), [members]);
  const venuesByMetro = useMemo(() => venuesByMetroChart(venues, cities), [venues, cities]);
  const subscriptionChart = useMemo(() => subscriptionBreakdownChart(growth.subscriptionCounts), [growth]);

  return (
    <View style={styles.container}>
      <Kicker>KPIs & growth</Kicker>
      <Text style={styles.note}>Real, live numbers — tap any of these for the chart behind it.</Text>

      <View style={styles.tileGrid}>
        <StatTile label="Members" value={growth.total} expanded={expanded === 'members'} onPress={() => toggle('members')} />
        <StatTile label="Venues" value={content.totalVenues} expanded={expanded === 'venues'} onPress={() => toggle('venues')} />
        <StatTile
          label="Activated"
          value={`${growth.activatedPct}%`}
          expanded={expanded === 'activation'}
          onPress={() => toggle('activation')}
        />
        <StatTile
          label="Subscriptions"
          value={growth.total - (growth.subscriptionCounts.none ?? 0)}
          expanded={expanded === 'subs'}
          onPress={() => toggle('subs')}
        />
      </View>

      {expanded === 'members' && (
        <Card tone="inset" style={styles.chartCard}>
          <Text style={styles.chartTitle}>Signups, last 14 days</Text>
          <BarChart bars={signups} />
        </Card>
      )}
      {expanded === 'venues' && (
        <Card tone="inset" style={styles.chartCard}>
          <Text style={styles.chartTitle}>Venues by metro</Text>
          <BarChart bars={venuesByMetro} barWidth={70} />
        </Card>
      )}
      {expanded === 'activation' && (
        <Card tone="inset" style={styles.chartCard}>
          <Text style={styles.chartTitle}>Signup → onboarded → activated → returned</Text>
          <BarChart bars={funnel} barWidth={70} />
        </Card>
      )}
      {expanded === 'subs' && (
        <Card tone="inset" style={styles.chartCard}>
          <Text style={styles.chartTitle}>Subscription status</Text>
          <BarChart bars={subscriptionChart} barWidth={70} />
        </Card>
      )}

      <Card tone="inset" style={styles.card}>
        <Text style={styles.cardTitle}>Members</Text>
        <Text style={styles.statLine}>
          {growth.total} total · {growth.new7d} new this week · {growth.new30d} new this month
        </Text>
        <TargetBar label="Total members" current={growth.total} target={targets.member_count ?? null} targetKey="member_count" />
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
        <TargetBar label="Total venues" current={content.totalVenues} target={targets.venue_count ?? null} targetKey="venue_count" />
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
  container: { paddingHorizontal: spacing.lg, gap: spacing.md, marginBottom: spacing.lg },
  note: { fontFamily: font.sans, fontSize: 11.5, lineHeight: 17, color: color.textTertiary, marginTop: -spacing.sm },
  sectionKicker: { marginTop: spacing.md },
  tileGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tile: {
    flexGrow: 1,
    flexBasis: '45%',
    backgroundColor: color.surface,
    borderRadius: 14,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: color.hairline,
  },
  tileActive: { borderColor: color.gold },
  tileValue: { fontFamily: font.serif, fontSize: 38, color: color.goldLight },
  tileLabel: { fontFamily: font.sans, fontSize: 12, color: color.textSecondary, marginTop: 2 },
  tileHint: { fontFamily: font.sans, fontSize: 9, letterSpacing: 1.2, color: color.textTertiary, marginTop: spacing.sm },
  chartCard: { gap: spacing.sm },
  chartTitle: { fontFamily: font.serif, fontSize: 16, color: color.textPrimary },
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
