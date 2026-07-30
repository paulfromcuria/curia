import { StyleSheet, View, type ViewProps } from 'react-native';
import { color, radius, spacing } from '../../theme';

interface CardProps extends ViewProps {
  /** Surface tone — 'default' is the standard card surface, 'sheet' matches
   * the bottom-sheet/modal surface used for the context and mood pickers. */
  tone?: 'default' | 'sheet' | 'inset';
}

export function Card({ tone = 'default', style, ...props }: CardProps) {
  return <View {...props} style={[styles.base, toneStyles[tone], style]} />;
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.xl,
    padding: spacing.md,
  },
});

const toneStyles = StyleSheet.create({
  default: {
    backgroundColor: color.surface,
  },
  sheet: {
    backgroundColor: color.surfaceVariants.d,
    borderTopWidth: 1,
    borderTopColor: 'rgba(192,160,98,.28)',
  },
  inset: {
    backgroundColor: 'rgba(240,233,223,.03)',
    borderWidth: 1,
    borderColor: color.hairlineMax,
  },
});
