import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Card, Kicker, Tag } from '../curia';
import { lowCoverageTiles, metroCoverage, tierDistribution, tileCoverage } from '../../lib/admin/dashboard-insights';
import { color, font, spacing } from '../../theme';
import type { City, District, Tile, Venue } from '../../types/models';

interface GrowthInsightsProps {
  venues: Venue[];
  districts: District[];
  tiles: Tile[];
  cities: City[];
}

/**
 * Real, computed growth/coverage signals for the admin dashboard home
 * (2026-08, admin growth-dashboard expansion) — everything here is derived
 * from the live admin venues/districts/tiles state, never demo data. No
 * new chart/graph library: plain Card/Text/Tag rows, matching the
 * dashboard's existing minimalist look.
 */
export function GrowthInsights({ venues, districts, tiles, cities }: GrowthInsightsProps) {
  const metros = useMemo(() => metroCoverage(venues, districts, cities), [venues, districts, cities]);
  const tiers = useMemo(() => tierDistribution(venues), [venues]);
  const coverage = useMemo(() => tileCoverage(venues, tiles), [venues, tiles]);
  const lowCoverage = useMemo(() => lowCoverageTiles(coverage), [coverage]);

  return (
    <View style={styles.container}>
      <Kicker>Growth signals</Kicker>
      <Text style={styles.note}>Computed live from the venues, districts and tiles above — not demo data.</Text>

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
      </Card>

      <Card tone="inset" style={styles.card}>
        <Text style={styles.cardTitle}>Venue tier split</Text>
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
  card: { gap: spacing.sm },
  cardTitle: { fontFamily: font.serif, fontSize: 17, color: color.textPrimary },
  metroRow: { flexDirection: 'row', justifyContent: 'space-between' },
  metroName: { fontFamily: font.serifRegular, fontSize: 14, color: color.textPrimary },
  metroStat: { fontFamily: font.sans, fontSize: 12, color: color.textSecondary },
  statLine: { fontFamily: font.sans, fontSize: 13, color: color.textSecondary },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
});
