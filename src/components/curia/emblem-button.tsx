import { Pressable, StyleSheet, Text } from 'react-native';
import { color, font } from '../../theme';

interface EmblemButtonProps {
  initials: string;
  onPress?: () => void;
  /** 2026-09, at explicit user request: Map's top row was crowded enough
   * (context pill + mood pill + this) that the full-size emblem no longer
   * fit alongside the other two in one row. List keeps the default size —
   * only Map opts into compact. */
  compact?: boolean;
}

/**
 * The circular avatar button (top-right on Map/List) that opens Profile.
 * Per Hard rule 9, this — not a 4th bottom tab — is how Profile is reached.
 */
export function EmblemButton({ initials, onPress, compact }: EmblemButtonProps) {
  return (
    <Pressable onPress={onPress} style={[styles.base, compact && styles.baseCompact]}>
      <Text style={[styles.label, compact && styles.labelCompact]}>{initials}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(192,160,98,.45)',
    backgroundColor: 'rgba(19,17,16,.5)',
  },
  baseCompact: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  label: {
    fontFamily: font.serifRegular,
    fontSize: 15,
    letterSpacing: 0.8,
    color: color.goldLight,
  },
  labelCompact: {
    fontSize: 12.5,
  },
});
