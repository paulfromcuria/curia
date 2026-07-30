import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { AdminHeader } from '../../../components/admin/admin-header';
import { Button, TextField } from '../../../components/curia';
import { useAdminData } from '../../../lib/admin/admin-data';
import { color, font, spacing } from '../../../theme';

/**
 * Edit a district's editorial description — the one district field the M8
 * brief calls out as editable here. Name, metro, kind, and accent color are
 * fixed/derived (CLAUDE.md's real 10 districts and per-district accent
 * family), shown read-only for context rather than made editable.
 */
export default function EditDistrict() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getDistrict, updateDistrictEditorial } = useAdminData();
  const district = getDistrict(id);
  const [draft, setDraft] = useState(district?.editorialDescription ?? '');

  if (!district) {
    return (
      <View style={styles.flex}>
        <AdminHeader title="District not found" />
        <Text style={styles.empty}>No district with id &quot;{id}&quot;.</Text>
      </View>
    );
  }

  function handleSave() {
    updateDistrictEditorial(district!.id, draft);
    router.back();
  }

  return (
    <View style={styles.flex}>
      <AdminHeader title={district.name} subtitle={`${district.metro} · ${district.kind}`} />
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.readOnlyRow}>
          <View style={[styles.swatch, { backgroundColor: district.accentColor }]} />
          <Text style={styles.readOnlyText}>Accent {district.accentColor}</Text>
        </View>
        <Text style={styles.readOnlyText}>Base liveliness score: {district.base}</Text>

        <TextField
          label="Editorial description"
          value={draft}
          onChangeText={setDraft}
          multiline
          placeholder="Editorial copy for this district's guide screen"
        />

        <Button label="Save changes" onPress={handleSave} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: color.base },
  container: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  readOnlyRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  swatch: { width: 14, height: 14, borderRadius: 7 },
  readOnlyText: { fontFamily: font.sans, fontSize: 12.5, color: color.textSecondary },
  empty: { fontFamily: font.sans, fontSize: 13, color: color.textSecondary, paddingHorizontal: spacing.lg },
});
