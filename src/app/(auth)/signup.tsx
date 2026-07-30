import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Button, Kicker } from '../../components/curia';
import { color, font, spacing } from '../../theme';

export default function Signup() {
  return (
    <View style={styles.container}>
      <Kicker>Curia</Kicker>
      <Text style={styles.title}>Tell us who is joining.</Text>
      <Text style={styles.blurb}>
        Two details now, four questions next. After that Curia only asks when something changes.
      </Text>
      <View style={styles.actions}>
        <Link href="/onboarding" asChild>
          <Button label="Continue" />
        </Link>
        <Link href="/(auth)/login" asChild>
          <Button label="I already have an account" variant="secondary" />
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
