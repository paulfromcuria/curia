import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Button, Kicker } from '../../components/curia';
import { color, font, spacing } from '../../theme';

/**
 * Placeholder auth screen — full form + copy is `curia-onboarding`'s M4 work.
 * Prototype reference copy: "The evening, already decided." / membership
 * line "Membership is £19.99 a month after your first fortnight."
 * (see CLAUDE.md > Subscription).
 */
export default function Login() {
  return (
    <View style={styles.container}>
      <Kicker>Curia</Kicker>
      <Text style={styles.title}>The evening, already decided.</Text>
      <Text style={styles.blurb}>
        A private map of the rooms worth your night, across Manchester and Cheshire.
      </Text>
      <View style={styles.actions}>
        <Link href="/onboarding" asChild>
          <Button label="Sign in" />
        </Link>
        <Link href="/onboarding" asChild>
          <Button label="Create an account" variant="secondary" />
        </Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: color.baseVariants.c,
    justifyContent: 'flex-end',
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.sm,
  },
  title: {
    fontFamily: font.serif,
    fontSize: 40,
    lineHeight: 44,
    color: color.textPrimary,
    maxWidth: 290,
    marginTop: spacing.md,
  },
  blurb: {
    fontFamily: font.sans,
    fontSize: 13.5,
    lineHeight: 23,
    color: color.textSecondaryAlt,
    maxWidth: 280,
  },
  actions: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
});
