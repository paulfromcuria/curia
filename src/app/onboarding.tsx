import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Button, Kicker } from '../components/curia';
import { color, font, spacing } from '../theme';

/**
 * Placeholder — full Do/Drink/Eat/You tile-grid flow is `curia-onboarding`'s
 * M4 work (see CLAUDE.md "Onboarding model" and Hard rules 2/4/7). This stub
 * exists so the navigation shell is provably wired end to end.
 */
export default function Onboarding() {
  return (
    <View style={styles.container}>
      <Kicker>Curia</Kicker>
      <Text style={styles.title}>How do you like to spend the hours in between?</Text>
      <Text style={styles.blurb}>
        Onboarding tile-grid (Do / Drink / Eat / You) — owned by curia-onboarding, M4.
      </Text>
      <View style={styles.actions}>
        <Link href="/(tabs)/map" asChild>
          <Button label="Continue (placeholder)" />
        </Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: color.baseVariants.c,
    padding: spacing.lg,
    paddingTop: spacing.xxl,
    gap: spacing.sm,
  },
  title: {
    fontFamily: font.serif,
    fontSize: 31,
    lineHeight: 37,
    color: color.textPrimary,
    marginTop: spacing.lg,
  },
  blurb: {
    fontFamily: font.sans,
    fontSize: 13.5,
    lineHeight: 23,
    color: color.textSecondary,
    maxWidth: 300,
  },
  actions: {
    marginTop: spacing.lg,
  },
});
