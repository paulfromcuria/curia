import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { AdminHeader } from '../../../components/admin/admin-header';
import { TileForm } from '../../../components/admin/tile-form';
import { useAdminData } from '../../../lib/admin/admin-data';
import { color } from '../../../theme';
import type { Tile } from '../../../types/models';

/**
 * Add a new onboarding tile (2026-08, admin growth-dashboard expansion).
 * `id: ''` signals "new" to TileForm, which computes the real
 * `${category}|${name}` id only on save — see tile-form.tsx's doc comment
 * for why the id isn't assigned any earlier or recomputed on later edits.
 */
export default function NewTile() {
  const router = useRouter();
  const { tiles, upsertTile } = useAdminData();

  const draft: Tile = useMemo(
    () => ({ id: '', category: 'Do', name: '', subPreferences: [] }),
    []
  );

  return (
    <View style={styles.flex}>
      <AdminHeader title="Add tile" />
      <TileForm
        initial={draft}
        existingTiles={tiles}
        saveLabel="Add tile"
        onSave={(tile) => {
          upsertTile(tile);
          router.back();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: color.base },
});
