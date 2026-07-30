import { StyleSheet, Text, View } from 'react-native';
import { Kicker } from '../components/curia';
import { color, font, spacing } from '../theme';

/** Placeholder walking-directions screen — `curia-moments-journeys`'s M6 work. */
export default function Walk() {
  return (
    <View style={styles.container}>
      <Kicker>Walking</Kicker>
      <Text style={styles.title}>On your way</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: color.baseVariants.a, padding: spacing.lg, paddingTop: spacing.xxl },
  title: { fontFamily: font.serif, fontSize: 30, color: color.textPrimary, marginTop: spacing.sm },
});
