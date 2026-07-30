import { StyleSheet, Text, View } from 'react-native';
import { Kicker } from '../components/curia';
import { color, font, spacing } from '../theme';

/** Placeholder Notifications screen — `curia-profile`'s M7 work. */
export default function Notifications() {
  return (
    <View style={styles.container}>
      <Kicker>Notifications</Kicker>
      <Text style={styles.title}>Nothing new yet</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: color.baseVariants.a, padding: spacing.lg, paddingTop: spacing.xxl },
  title: { fontFamily: font.serif, fontSize: 30, color: color.textPrimary, marginTop: spacing.sm },
});
