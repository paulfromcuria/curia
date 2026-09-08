import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { AdminHeader } from '../../../components/admin/admin-header';
import { TileForm } from '../../../components/admin/tile-form';
import { useAdminData } from '../../../lib/admin/admin-data';
import { color, font, spacing } from '../../../theme';

/**
 * Edit an existing onboarding tile (2026-08, admin growth-dashboard
 * expansion). `id` here is shaped `${category}|${name}` (e.g.
 * "Do|Culture") — the first id in this codebase containing a literal `|`,
 * a reserved URL character. Routed via the same object-form Href every
 * other admin list->detail link already uses, which expo-router encodes/
 * decodes automatically — verified live rather than assumed.
 */
export default function EditTile() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getTile, tiles, upsertTile, deleteTile } = useAdminData();
  const tile = getTile(id);

  if (!tile) {
    return (
      <View style={styles.flex}>
        <AdminHeader title="Tile not found" />
        <Text style={styles.empty}>No tile with id &quot;{id}&quot; (it may have been deleted).</Text>
      </View>
    );
  }

  function handleDelete() {
    Alert.alert('Delete tile', `Remove "${tile!.name}" from the onboarding catalog?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteTile(tile!.id);
          router.back();
        },
      },
    ]);
  }

  return (
    <View style={styles.flex}>
      <AdminHeader title={tile.name} subtitle={tile.category} />
      <TileForm
        initial={tile}
        existingTiles={tiles}
        onSave={(updated) => {
          upsertTile(updated);
          router.back();
        }}
        onDelete={handleDelete}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: color.base },
  empty: { fontFamily: font.sans, fontSize: 13, color: color.textSecondary, paddingHorizontal: spacing.lg },
});
