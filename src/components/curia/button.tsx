import { Pressable, StyleSheet, Text, type PressableProps } from 'react-native';
import { color, font, radius, spacing } from '../../theme';

interface ButtonProps extends PressableProps {
  label: string;
  /** 'primary' = solid gold CTA. 'secondary' = outlined. 'ghost' = text-only. */
  variant?: 'primary' | 'secondary' | 'ghost';
}

/** Primary CTA styling matches the prototype's gold-fill continue/sign-in buttons exactly. */
export function Button({ label, variant = 'primary', style, disabled, ...props }: ButtonProps) {
  return (
    <Pressable
      {...props}
      disabled={disabled}
      style={(state) => [
        styles.base,
        variantStyles[variant],
        disabled && styles.disabled,
        typeof style === 'function' ? style(state) : style,
      ]}
    >
      <Text style={[styles.label, labelStyles[variant]]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: font.sansMedium,
    fontSize: 12,
    letterSpacing: 2.4,
    textTransform: 'uppercase',
  },
  disabled: {
    opacity: 0.45,
  },
});

const variantStyles = StyleSheet.create({
  primary: {
    backgroundColor: color.gold,
  },
  secondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: color.hairlineMax,
  },
  ghost: {
    backgroundColor: 'transparent',
    paddingVertical: spacing.sm,
  },
});

const labelStyles = StyleSheet.create({
  primary: { color: color.goldText },
  secondary: { color: color.borderNeutral },
  ghost: { color: color.textSecondary },
});
