import { useMemo, useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Tag, TextField } from '../curia';
import { color, font, spacing } from '../../theme';
import type { Tile, TileCategory } from '../../types/models';

const CATEGORY_OPTIONS: TileCategory[] = ['Do', 'Drink', 'Eat'];

interface TileFormProps {
  initial: Tile;
  /** For duplicate-id validation on create — see the id-stability note below. */
  existingTiles: Tile[];
  onSave: (tile: Tile) => void;
  onDelete?: () => void;
  saveLabel?: string;
}

/**
 * Shared edit form for both "edit existing tile" and "add tile" (2026-08,
 * admin growth-dashboard expansion — the onboarding Do/Drink/Eat catalog,
 * docs/data/tiles.json, had no admin surface at all before this).
 *
 * `Tile.id` is shaped `${category}|${name}`. The natural instinct is to
 * recompute it on every save, but that breaks admin-data.tsx's
 * insert-or-replace upsert logic on rename: if the id changes, upsertTile
 * can't find "the same" tile to replace and inserts a duplicate instead,
 * leaving the stale old-id entry behind. So the id is assigned ONCE, only
 * at creation (`initial.id` is empty for a brand-new draft — see
 * tiles/new.tsx), and stays stable across edits after that — exactly like
 * Venue.id. Renaming a tile can still change its displayed category/name;
 * the id (and anything already referencing it) doesn't move. This is the
 * same "id and display name can silently diverge after a rename" behavior
 * Venue already has, not a new inconsistency — shown read-only below during
 * edit for transparency (same spirit as VenueForm's internal-only-fields
 * section).
 */
export function TileForm({ initial, existingTiles, onSave, onDelete, saveLabel = 'Save changes' }: TileFormProps) {
  const [draft, setDraft] = useState<Tile>(initial);
  const [subPreferencesText, setSubPreferencesText] = useState(initial.subPreferences.join(', '));

  function update<K extends keyof Tile>(key: K, value: Tile[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  const isNew = !initial.id;
  const candidateId = `${draft.category}|${draft.name.trim()}`;
  const duplicateHit = useMemo(
    () => isNew && existingTiles.some((t) => t.id === candidateId),
    [isNew, existingTiles, candidateId]
  );

  function handleSave() {
    const subPreferences = subPreferencesText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    onSave({ ...draft, id: initial.id || candidateId, name: draft.name.trim(), subPreferences });
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <TextField label="Name" value={draft.name} onChangeText={(v) => update('name', v)} placeholder="Tile name" />
      {duplicateHit ? (
        <Text style={styles.warning}>
          A {draft.category} tile named &quot;{draft.name.trim()}&quot; already exists — rename this one or edit that
          one instead.
        </Text>
      ) : null}

      <Field label="Category">
        <View style={styles.wrap}>
          {CATEGORY_OPTIONS.map((c) => (
            <Tag key={c} label={c} active={draft.category === c} onPress={() => update('category', c)} />
          ))}
        </View>
      </Field>

      {!isNew ? (
        <Text style={styles.idNote}>ID: {initial.id} (fixed — renaming won&apos;t change this)</Text>
      ) : null}

      <TextField
        label="Sub-preferences (comma separated)"
        value={subPreferencesText}
        onChangeText={setSubPreferencesText}
        autoCapitalize="none"
        placeholder="e.g. Speakeasy-style, Award-winning list"
        multiline
      />

      <Button label={saveLabel} onPress={handleSave} disabled={!draft.name.trim() || duplicateHit} />
      {onDelete ? <Button label="Delete tile" variant="ghost" onPress={onDelete} /> : null}
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
  idNote: { fontFamily: font.sans, fontSize: 11.5, color: color.textTertiary },
});
