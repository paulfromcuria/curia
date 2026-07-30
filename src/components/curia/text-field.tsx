import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { color, font, spacing } from '../../theme';

interface TextFieldProps extends Omit<TextInputProps, 'style'> {
  label: string;
  error?: string;
}

/**
 * The auth screen's labeled input: an uppercase Jost kicker label above a
 * borderless Cormorant Garamond value line, matching the prototype's
 * `authFields` styling exactly (Curia.dc.html — fieldStyle/authFields).
 */
export function TextField({ label, error, ...props }: TextFieldProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...props}
        placeholderTextColor={color.textTertiary}
        style={styles.input}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: color.hairlineMax,
  },
  label: {
    fontFamily: font.sansMedium,
    fontSize: 10,
    letterSpacing: 2.2,
    textTransform: 'uppercase',
    color: color.textTertiary,
  },
  input: {
    marginTop: spacing.xs + 4,
    fontFamily: font.serifRegular,
    fontSize: 16,
    color: color.textPrimary,
    padding: 0,
  },
  error: {
    marginTop: spacing.xs,
    fontFamily: font.sans,
    fontSize: 11.5,
    color: color.goldHover,
  },
});
