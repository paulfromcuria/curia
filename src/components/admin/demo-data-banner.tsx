import { StyleSheet, Text } from 'react-native';
import { Card, Kicker } from '../curia';
import { color, font, spacing } from '../../theme';

interface DemoDataBannerProps {
  count: number;
}

/**
 * Persistent (non-dismissible) warning that the data on screen is
 * fabricated, not real (2026-08, admin growth-dashboard expansion —
 * Users screen). Generic on `count` rather than hard-coupled to members,
 * in case another demo-data surface needs it later. See
 * src/lib/admin/demo-users.ts's own doc comment for the full reasoning.
 */
export function DemoDataBanner({ count }: DemoDataBannerProps) {
  return (
    <Card tone="inset" style={styles.card}>
      <Kicker tone="tertiary">Demo data</Kicker>
      <Text style={styles.body}>
        No real backend yet (CLAUDE.md &quot;Tech stack&quot;) — these are {count} fabricated placeholder
        members, not real signups. See src/lib/admin/demo-users.ts.
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.xs, marginHorizontal: spacing.lg, marginBottom: spacing.md },
  body: { fontFamily: font.sans, fontSize: 12, lineHeight: 18, color: color.textSecondary },
});
