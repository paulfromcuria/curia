import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Button, Kicker } from '../components/curia';
import { color, font, spacing } from '../theme';

/**
 * Placeholder Profile screen — full account/edit-preferences layout is
 * `curia-profile`'s M7 work. Reached only via the avatar emblem, never a
 * bottom tab (Hard rule 9).
 */
export default function Profile() {
  return (
    <View style={styles.container}>
      <Kicker>Profile</Kicker>
      <Text style={styles.title}>Alexandra Vance</Text>
      <View style={styles.actions}>
        <Link href="/saved" asChild>
          <Button label="Saved places" variant="secondary" />
        </Link>
        <Link href="/subscription" asChild>
          <Button label="Membership" variant="secondary" />
        </Link>
        <Link href="/notifications" asChild>
          <Button label="Notifications" variant="secondary" />
        </Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: color.baseVariants.a, padding: spacing.lg, paddingTop: spacing.xxl, gap: spacing.sm },
  title: { fontFamily: font.serif, fontSize: 30, color: color.textPrimary, marginTop: spacing.sm },
  actions: { marginTop: spacing.lg, gap: spacing.sm },
});
