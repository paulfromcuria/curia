import { useMemo, useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Tag, TextField } from '../curia';
import { matchesChainDenylist } from '../../lib/admin/chain-denylist';
import { color, font, spacing } from '../../theme';
import type { DayTimeBand, DietaryRequirement, District, SpendLevel, Venue } from '../../types/models';

const DIETARY_OPTIONS: DietaryRequirement[] = [
  'none',
  'vegetarian',
  'vegan',
  'pescatarian',
  'gluten-free',
  'dairy-free',
  'nut-allergy',
];

const BAND_OPTIONS: DayTimeBand[] = ['morning', 'afternoon', 'evening', 'late'];

interface VenueFormProps {
  initial: Venue;
  districts: District[];
  onSave: (venue: Venue) => void;
  onDelete?: () => void;
  saveLabel?: string;
}

/**
 * Shared edit form for both the "edit existing venue" and "add venue"
 * screens. Surfaces every field on the Venue type (src/types/models.ts),
 * including the internal-only tier/sourceConfidence/notes trio (Hard rule
 * 8 — editable here, never rendered in the member app) under a clearly
 * labeled section.
 *
 * Validates the venue name against src/lib/admin/chain-denylist.ts on every
 * keystroke (Hard rule 1) and blocks saving while a match is showing —
 * a simple denylist + inline warning, not a full brand-detection system,
 * per the M8 brief.
 */
export function VenueForm({ initial, districts, onSave, onDelete, saveLabel = 'Save changes' }: VenueFormProps) {
  const [draft, setDraft] = useState<Venue>(initial);
  const [latText, setLatText] = useState(String(initial.lat));
  const [lonText, setLonText] = useState(String(initial.lon));
  const [baseText, setBaseText] = useState(String(initial.base));
  const [confidenceText, setConfidenceText] = useState(String(initial.sourceConfidence));
  const [tagsText, setTagsText] = useState(initial.subPreferenceTags.join(', '));

  const denylistHit = useMemo(() => matchesChainDenylist(draft.name), [draft.name]);

  function update<K extends keyof Venue>(key: K, value: Venue[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  function toggleInArray<T>(arr: T[], value: T): T[] {
    return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
  }

  function handleSave() {
    const lat = Number(latText);
    const lon = Number(lonText);
    const base = Number(baseText);
    const sourceConfidence = Number(confidenceText);
    const subPreferenceTags = tagsText
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    onSave({
      ...draft,
      lat: Number.isFinite(lat) ? lat : draft.lat,
      lon: Number.isFinite(lon) ? lon : draft.lon,
      base: Number.isFinite(base) ? base : draft.base,
      sourceConfidence: Number.isFinite(sourceConfidence)
        ? Math.min(1, Math.max(0, sourceConfidence))
        : draft.sourceConfidence,
      subPreferenceTags,
      notes: draft.notes?.trim() ? draft.notes : undefined,
    });
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <TextField label="Name" value={draft.name} onChangeText={(v) => update('name', v)} placeholder="Venue name" />
      {denylistHit ? (
        <Text style={styles.warning}>
          This name matches &quot;{denylistHit}&quot; on the chain/fast-food denylist
          (CLAUDE.md Hard rule 1). Chain venues must never be added, ever — rename or cancel.
        </Text>
      ) : null}

      <TextField
        label="Type / category"
        value={draft.type}
        onChangeText={(v) => update('type', v)}
        placeholder="e.g. SMALL PLATES"
        autoCapitalize="characters"
      />

      <Field label="District">
        <View style={styles.wrap}>
          {districts.map((d) => (
            <Tag
              key={d.id}
              label={d.name}
              active={draft.districtId === d.id}
              onPress={() => setDraft((prev) => ({ ...prev, districtId: d.id, metro: d.metro }))}
            />
          ))}
        </View>
      </Field>

      <Field label="Spend level">
        <View style={styles.wrap}>
          {([1, 2, 3, 4, 5] as SpendLevel[]).map((level) => (
            <Tag
              key={level}
              label={'£'.repeat(level)}
              active={draft.spendLevel === level}
              onPress={() => update('spendLevel', level)}
            />
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

      <Field label="Pet friendly">
        <View style={styles.wrap}>
          <Tag
            label={draft.petFriendly ? 'Yes' : 'No'}
            active={draft.petFriendly}
            onPress={() => update('petFriendly', !draft.petFriendly)}
          />
        </View>
      </Field>

      <Field label="Dietary options">
        <View style={styles.wrap}>
          {DIETARY_OPTIONS.map((opt) => (
            <Tag
              key={opt}
              label={opt}
              active={draft.dietaryOptions.includes(opt)}
              onPress={() => update('dietaryOptions', toggleInArray(draft.dietaryOptions, opt))}
            />
          ))}
        </View>
      </Field>

      <Field label="Time-of-day bands">
        <View style={styles.wrap}>
          {BAND_OPTIONS.map((b) => (
            <Tag
              key={b}
              label={b}
              active={draft.bands.includes(b)}
              onPress={() => update('bands', toggleInArray(draft.bands, b))}
            />
          ))}
        </View>
      </Field>

      <TextField
        label="Description / match reason"
        value={draft.description}
        onChangeText={(v) => update('description', v)}
        multiline
      />

      <TextField
        label="Sub-preference tags (comma separated)"
        value={tagsText}
        onChangeText={setTagsText}
        autoCapitalize="none"
        placeholder="e.g. natural wine, communal tables"
      />

      <TextField
        label="Base attractiveness score"
        value={baseText}
        onChangeText={setBaseText}
        keyboardType="decimal-pad"
      />

      <Text style={styles.sectionLabel}>Internal only — never shown to members (Hard rule 8)</Text>

      <Field label="Tier">
        <View style={styles.wrap}>
          <Tag label="signature" active={draft.tier === 'signature'} onPress={() => update('tier', 'signature')} />
          <Tag label="texture" active={draft.tier === 'texture'} onPress={() => update('tier', 'texture')} />
        </View>
      </Field>

      <TextField
        label="Source confidence (0-1)"
        value={confidenceText}
        onChangeText={setConfidenceText}
        keyboardType="decimal-pad"
      />

      <TextField
        label="Curator notes"
        value={draft.notes ?? ''}
        onChangeText={(v) => update('notes', v)}
        multiline
        placeholder="Internal-only notes — never rendered in the member app"
      />

      <Button label={saveLabel} onPress={handleSave} disabled={!draft.name.trim() || !!denylistHit} />
      {onDelete ? <Button label="Delete venue" variant="ghost" onPress={onDelete} /> : null}
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
  warning: { fontFamily: font.sans, fontSize: 12, lineHeight: 18, color: color.goldHover },
  sectionLabel: {
    fontFamily: font.sansMedium,
    fontSize: 11,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: color.textSecondary,
    marginTop: spacing.md,
  },
});
