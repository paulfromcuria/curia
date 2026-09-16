import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';
import { color, spacing } from '../../theme';

/**
 * Inline back control for pushed screens with no hero image to float a
 * circular button over. venue/[id].tsx, district/[id].tsx and
 * journey/[id].tsx each hand-roll their own absolute-over-hero variant of
 * this same "←" treatment; this is the plain-background equivalent for
 * profile/saved/subscription/notifications/travel, added 2026-09 after a
 * real user report that there was no way back from those screens —
 * `headerShown: false` is global (src/app/_layout.tsx) so there is no
 * native chevron anywhere, and web has no hardware back button to fall
 * back on either.
 */
export function BackButton() {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.back()}
      style={styles.button}
      accessibilityLabel="Go back"
      accessibilityRole="button"
    >
      <Text style={styles.text}>←</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: color.hairlineMax,
    backgroundColor: 'rgba(240,233,223,.04)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  text: { color: color.textPrimary, fontSize: 15 },
});
