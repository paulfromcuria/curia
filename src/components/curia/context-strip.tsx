import { Pressable, StyleSheet, Text, View } from 'react-native';
import { color, font, radius, spacing } from '../../theme';

interface ContextStripProps {
  kicker: string;
  label: string;
  /** Optional — 2026-08 concierge positioning pass, at explicit user
   * request: a live weather readout sitting in the primary view read as
   * mechanics-on-display ("the weather pill"), not judgment. Weather still
   * feeds real ranking (rank-venues.ts's scoreWeather) and is still visible
   * to anyone who taps through — it's folded into the day/time sheet's own
   * forecast note (map.web.tsx/map.tsx's `ctxForecast`) rather than shown
   * here, so it's a tap away instead of always-on chrome. Left optional
   * rather than deleted so a future call site can still opt back in. */
  weather?: string;
  onPress?: () => void;
}

/**
 * The persistent kicker strip with live time/day context — a signature
 * element per CLAUDE.md, and shared between Map and List so context never
 * drifts between the two tabs (Hard rule 5).
 */
export function ContextStrip({ kicker, label, weather, onPress }: ContextStripProps) {
  return (
    <Pressable onPress={onPress} style={styles.base}>
      <View style={styles.textCol}>
        <Text style={styles.kicker}>{kicker}</Text>
        <Text style={styles.label}>{label}</Text>
      </View>
      <View style={styles.rightCol}>
        {!!weather && <Text style={styles.weather}>{weather}</Text>}
        <Text style={styles.chevron}>⌄</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.sm + 4,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.hairlineMax,
    backgroundColor: 'rgba(19,17,16,.78)',
  },
  textCol: {
    flexDirection: 'column',
    gap: 5,
    alignItems: 'flex-start',
  },
  kicker: {
    fontFamily: font.sansMedium,
    fontSize: 9.5,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: color.gold,
  },
  label: {
    fontFamily: font.serifRegular,
    fontSize: 15,
    color: color.textPrimary,
  },
  rightCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  weather: {
    fontFamily: font.sans,
    fontSize: 11.5,
    letterSpacing: 1,
    color: color.textSecondary,
  },
  chevron: {
    fontFamily: font.sans,
    fontSize: 15,
    color: color.gold,
  },
});
