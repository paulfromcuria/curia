import { useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Tag, TextField } from '../curia';
import { MultiplierGrid } from './multiplier-grid';
import { color, font, spacing } from '../../theme';
import type { City, District, DistrictKind } from '../../types/models';

// Monday-first, matching docs/data/districts.json's own dayMultiplier key
// order. NOT the same as rank-venues.ts's private, Sunday-first DAY_NAMES
// (that one indexes off Date.getDay() for resolveContext() and is unrelated
// — don't import it here).
const DAY_NAMES = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

const BAND_NAMES = ['morning', 'afternoon', 'evening', 'late'] as const;

const KIND_OPTIONS: DistrictKind[] = ['city', 'county'];

interface DistrictFormProps {
  initial: District;
  cities: City[];
  onSave: (district: District) => void;
  onDelete?: () => void;
  saveLabel?: string;
}

/**
 * Shared edit form for both "edit existing district" and "add district"
 * (2026-08, admin growth-dashboard expansion). Supersedes the earlier
 * editorial-description-only district editor — that M8-era scoping
 * decision assumed CLAUDE.md's "real 10 districts, two metros" was a fixed
 * set, but docs/data/districts.json already grew to 15 districts across 3
 * metros (Manchester/Cheshire/LA) by hand-editing JSON in an earlier
 * session — real evidence the manual-edit friction this form exists to
 * remove had already happened once.
 *
 * Structurally a clone of venue-form.tsx's conventions: a single `draft`
 * state object + generic `update<K>()` setter, shadow-string state for
 * every numeric field (parsed back to numbers only at save time), Tag rows
 * for single-select fields.
 */
export function DistrictForm({ initial, cities, onSave, onDelete, saveLabel = 'Save changes' }: DistrictFormProps) {
  const [draft, setDraft] = useState<District>(initial);
  const [latText, setLatText] = useState(String(initial.lat));
  const [lonText, setLonText] = useState(String(initial.lon));
  const [baseText, setBaseText] = useState(String(initial.base));
  const [dayMultiplierText, setDayMultiplierText] = useState<Record<string, string>>(
    Object.fromEntries(DAY_NAMES.map((d) => [d, String(initial.dayMultiplier?.[d] ?? 1)]))
  );
  const [bandMultiplierText, setBandMultiplierText] = useState<Record<string, string>>(
    Object.fromEntries(BAND_NAMES.map((b) => [b, String(initial.bandMultiplier?.[b] ?? 1)]))
  );

  function update<K extends keyof District>(key: K, value: District[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  function parseMultiplierMap(keys: readonly string[], text: Record<string, string>): Record<string, number> {
    return Object.fromEntries(
      keys.map((k) => {
        const n = Number(text[k]);
        return [k, Number.isFinite(n) ? n : 1];
      })
    );
  }

  function handleSave() {
    const lat = Number(latText);
    const lon = Number(lonText);
    const base = Number(baseText);
    onSave({
      ...draft,
      lat: Number.isFinite(lat) ? lat : draft.lat,
      lon: Number.isFinite(lon) ? lon : draft.lon,
      base: Number.isFinite(base) ? base : draft.base,
      dayMultiplier: parseMultiplierMap(DAY_NAMES, dayMultiplierText),
      bandMultiplier: parseMultiplierMap(BAND_NAMES, bandMultiplierText),
    });
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <TextField label="Name" value={draft.name} onChangeText={(v) => update('name', v)} placeholder="District name" />

      <Field label="Metro">
        <View style={styles.wrap}>
          {cities.map((c) => (
            <Tag key={c.id} label={c.name} active={draft.metro === c.id} onPress={() => update('metro', c.id)} />
          ))}
        </View>
      </Field>

      <Field label="Kind">
        <View style={styles.wrap}>
          {KIND_OPTIONS.map((k) => (
            <Tag key={k} label={k} active={draft.kind === k} onPress={() => update('kind', k)} />
          ))}
        </View>
      </Field>

      <View style={styles.row}>
        <View style={styles.half}>
          <TextField label="Latitude" value={latText} onChangeText={setLatText} keyboardType="decimal-pad" />
        </View>
        <View style={styles.half}>
          <TextField label="Longitude" value={lonText} onChangeText={setLonText} keyboardType="decimal-pad" />
        </View>
      </View>

      <TextField label="Base liveliness score" value={baseText} onChangeText={setBaseText} keyboardType="decimal-pad" />

      <Field label="Accent color">
        <View style={styles.accentRow}>
          <View style={[styles.swatch, { backgroundColor: draft.accentColor }]} />
          <View style={styles.accentInput}>
            <TextField
              label="Hex value"
              value={draft.accentColor}
              onChangeText={(v) => update('accentColor', v)}
              placeholder="#C0A062"
              autoCapitalize="none"
            />
          </View>
        </View>
      </Field>

      <TextField
        label="Editorial description"
        value={draft.editorialDescription ?? ''}
        onChangeText={(v) => update('editorialDescription', v)}
        multiline
        placeholder="Editorial copy for this district's guide screen"
      />

      <MultiplierGrid
        label="Day-of-week multiplier"
        keys={DAY_NAMES}
        values={dayMultiplierText}
        onChange={(k, v) => setDayMultiplierText((s) => ({ ...s, [k]: v }))}
      />
      <MultiplierGrid
        label="Time-of-day band multiplier"
        keys={BAND_NAMES}
        values={bandMultiplierText}
        onChange={(k, v) => setBandMultiplierText((s) => ({ ...s, [k]: v }))}
      />

      <Button label={saveLabel} onPress={handleSave} disabled={!draft.name.trim()} />
      {onDelete ? <Button label="Delete district" variant="ghost" onPress={onDelete} /> : null}
    </ScrollView>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  row: { flexDirection: 'row', gap: spacing.md },
  half: { flex: 1 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  field: { gap: spacing.xs },
  fieldLabel: {
    fontFamily: font.sansMedium,
    fontSize: 10,
    letterSpacing: 2.2,
    textTransform: 'uppercase',
    color: color.textTertiary,
  },
  accentRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  swatch: { width: 14, height: 14, borderRadius: 7 },
  accentInput: { flex: 1 },
});
