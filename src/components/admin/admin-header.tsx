import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Kicker } from '../curia';
import { color, font, spacing } from '../../theme';

interface AdminHeaderProps {
  title: string;
  subtitle?: string;
  /** Shows a "Back" link when there's somewhere to go back to. Defaults on;
   * the admin home screen passes false since it's the group's root. */
  showBack?: boolean;
}

/**
 * Minimal shared header for the admin curation surface. Deliberately plain
 * internal-tooling chrome, not styled to match the member app's editorial
 * screens pixel-for-pixel — this is back-office tooling, not a customer
 * surface, though it reuses the same dark theme tokens/Kicker primitive so
 * it doesn't look like a foreign app bolted on.
 */
export function AdminHeader({ title, subtitle, showBack = true }: AdminHeaderProps) {
  const router = useRouter();
  return (
    <View style={styles.container}>
      {showBack && router.canGoBack() ? (
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backRow}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>
      ) : null}
      <Kicker tone="tertiary">Curia Admin</Kicker>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    gap: spacing.xs,
  },
  backRow: { marginBottom: spacing.sm },
  back: { fontFamily: font.sans, fontSize: 13, color: color.textSecondary },
  title: { fontFamily: font.serif, fontSize: 28, color: color.textPrimary },
  subtitle: { fontFamily: font.sans, fontSize: 12.5, color: color.textSecondary },
});
