import { StyleSheet, Text, View } from 'react-native';
import { Kicker } from '../components/curia';
import { color, font, spacing } from '../theme';

/**
 * Placeholder ride-to-venue screen — the prototype shows an Uber deep-link
 * handoff with a live fare estimate across 3 tiers, triggered from venue
 * detail. Real provider integration needs an account/API key — flag that
 * gap when `curia-moments-journeys` builds this for real (M6).
 */
export default function Ride() {
  return (
    <View style={styles.container}>
      <Kicker>Ride to venue</Kicker>
      <Text style={styles.title}>Fare estimate</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: color.baseVariants.a, padding: spacing.lg, paddingTop: spacing.xxl },
  title: { fontFamily: font.serif, fontSize: 30, color: color.textPrimary, marginTop: spacing.sm },
});
