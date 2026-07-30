import { StyleSheet, Text, type TextProps } from 'react-native';
import { color, font } from '../../theme';

interface KickerProps extends TextProps {
  tone?: 'gold' | 'tertiary';
}

/**
 * The uppercase, letter-spaced "kicker" label texture used throughout the
 * prototype (e.g. "RANKED FOR YOU", "SEARCH RADIUS", the "CURIA" wordmark).
 * This is Jost + letter-spacing + uppercase — NOT a monospace font. See
 * CLAUDE.md "Design tokens" > Typography.
 */
export function Kicker({ tone = 'gold', style, ...props }: KickerProps) {
  return (
    <Text
      {...props}
      style={[styles.base, { color: tone === 'gold' ? color.gold : color.textTertiary }, style]}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    fontFamily: font.sansMedium,
    fontSize: 11,
    letterSpacing: 2.6, // ~.24em
    textTransform: 'uppercase',
  },
});
