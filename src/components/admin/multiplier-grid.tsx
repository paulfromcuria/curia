import { StyleSheet, Text, View } from 'react-native';
import { TextField } from '../curia';
import { color, font, spacing } from '../../theme';

interface MultiplierGridProps {
  label: string;
  /** Fixed, known keys (e.g. the 7 day names, or the 4 band names) — not a
   * generic dynamic-key editor, since District.dayMultiplier/bandMultiplier
   * always use these exact key sets (docs/data/districts.json). */
  keys: readonly string[];
  /** Shadow-string state, keyed the same as `keys`, parsed back to numbers
   * only at save time by the caller (same pattern DistrictForm/VenueForm
   * use for every other numeric field). */
  values: Record<string, string>;
  onChange: (key: string, text: string) => void;
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/**
 * Editor for a District's dayMultiplier/bandMultiplier — the one field
 * shape (Record<string, number> over a fixed key set) neither VenueForm nor
 * any read-only admin screen had a UI pattern for before this (2026-08,
 * admin growth-dashboard expansion). One small labeled numeric input per
 * key, wrapped in a row, rather than a generic add/remove-key editor.
 */
export function MultiplierGrid({ label, keys, values, onChange }: MultiplierGridProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.wrap}>
        {keys.map((key) => (
          <View key={key} style={styles.cell}>
            <TextField
              label={capitalize(key)}
              value={values[key] ?? ''}
              onChangeText={(v) => onChange(key, v)}
              keyboardType="decimal-pad"
              placeholder="1.0"
            />
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: spacing.xs },
  fieldLabel: {
    fontFamily: font.sansMedium,
    fontSize: 10,
    letterSpacing: 2.2,
    textTransform: 'uppercase',
    color: color.textTertiary,
  },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  cell: { width: '30%' },
});
