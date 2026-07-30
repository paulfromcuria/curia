import { StyleSheet, Text, View } from 'react-native';
import { Kicker } from '../components/curia';
import { color, font, spacing } from '../theme';

/**
 * Placeholder Membership/subscription screen — real Stripe wiring is a
 * credential gap (CLAUDE.md "Still genuinely open"); `curia-onboarding`
 * builds the gate against a mock flag until a Stripe key exists.
 */
export default function Subscription() {
  return (
    <View style={styles.container}>
      <Kicker>Membership</Kicker>
      <Text style={styles.title}>£19.99 / month</Text>
      <Text style={styles.blurb}>After your first fortnight, free.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: color.baseVariants.a, padding: spacing.lg, paddingTop: spacing.xxl, gap: spacing.sm },
  title: { fontFamily: font.serif, fontSize: 30, color: color.textPrimary, marginTop: spacing.sm },
  blurb: { fontFamily: font.sans, fontSize: 13, color: color.textSecondary },
});
