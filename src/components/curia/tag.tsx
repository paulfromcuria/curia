import { Pressable, StyleSheet, Text } from 'react-native';
import { color, font, radius } from '../../theme';

interface TagProps {
  label: string;
  /** Sub-preferences default ON (Hard rule 2) — `active` should default true
   * wherever this represents a sub-preference toggle. */
  active?: boolean;
  onPress?: () => void;
}

/** The onboarding sub-preference chip / mood-sheet tile chip. */
export function Tag({ label, active = false, onPress }: TagProps) {
  return (
    <Pressable onPress={onPress} style={[styles.base, active ? styles.active : styles.inactive]}>
      <Text style={[styles.label, { color: active ? color.goldLight : color.textSecondary }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  active: {
    borderColor: 'rgba(192,160,98,.6)',
    backgroundColor: 'rgba(192,160,98,.14)',
  },
  inactive: {
    borderColor: color.hairlineMax,
    backgroundColor: 'transparent',
  },
  label: {
    fontFamily: font.sans,
    fontSize: 12,
    letterSpacing: 0.7,
  },
});
