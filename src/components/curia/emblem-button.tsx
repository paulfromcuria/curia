import { Pressable, StyleSheet, Text } from 'react-native';
import { color, font } from '../../theme';

interface EmblemButtonProps {
  initials: string;
  onPress?: () => void;
}

/**
 * The circular avatar button (top-right on Map/List) that opens Profile.
 * Per Hard rule 9, this — not a 4th bottom tab — is how Profile is reached.
 */
export function EmblemButton({ initials, onPress }: EmblemButtonProps) {
  return (
    <Pressable onPress={onPress} style={styles.base}>
      <Text style={styles.label}>{initials}</Text>
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
  label: {
    fontFamily: font.serifRegular,
    fontSize: 15,
    letterSpacing: 0.8,
    color: color.goldLight,
  },
});
