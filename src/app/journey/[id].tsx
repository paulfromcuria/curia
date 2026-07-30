import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Kicker } from '../../components/curia';
import { color, font, spacing } from '../../theme';

/** Placeholder journey detail — ordered-stops layout is `curia-moments-journeys`'s M6 work. */
export default function JourneyDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <View style={styles.container}>
      <Kicker>Journey</Kicker>
      <Text style={styles.title}>{id}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: color.baseVariants.a, padding: spacing.lg, paddingTop: spacing.xxl },
  title: { fontFamily: font.serif, fontSize: 30, color: color.textPrimary, marginTop: spacing.sm },
});
