import { useRouter } from 'expo-router';
import { Pressable, SectionList, StyleSheet, Text, View } from 'react-native';
import { AdminHeader } from '../../../components/admin/admin-header';
import { MOMENTS } from '../../../lib/data/seed';
import { color, font, spacing } from '../../../theme';
import { MOMENT_CATEGORIES } from '../../../types/models';
import type { Moment } from '../../../types/models';

/**
 * Simple read-only view of the 17 curated Moment types, grouped by their
 * `MomentCategory` (CLAUDE.md "Moments" — widened 2026-09-30 from the
 * original fixed-4, "do not add ... without real curated content behind
 * it"). Per the M8 brief this is a view, not a CRUD surface — no
 * add/edit/delete here; the category grouping is display-only, same
 * reasoning as the flat list it replaces.
 */
export default function MomentsList() {
  const router = useRouter();

  const sections = MOMENT_CATEGORIES.map((cat) => ({
    title: cat.title,
    data: MOMENTS.filter((m) => m.category === cat.id),
  })).filter((s) => s.data.length > 0);

  function renderItem({ item }: { item: Moment }) {
    return (
      <Pressable
        style={styles.row}
        onPress={() => router.push({ pathname: '/admin/moments/[id]', params: { id: item.id } })}
      >
        <Text style={styles.rowTitle}>{item.title}</Text>
        <Text style={styles.rowMeta}>{item.curator} · {item.venueIds.length} picks</Text>
        <Text style={styles.rowBlurb} numberOfLines={2}>{item.blurb}</Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.flex}>
      <AdminHeader title="Moments" subtitle={`${MOMENTS.length} moment types across ${sections.length} categories`} />
      <SectionList
        sections={sections}
        keyExtractor={(m) => m.id}
        renderItem={renderItem}
        renderSectionHeader={({ section }) => <Text style={styles.sectionHeader}>{section.title.toUpperCase()}</Text>}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        stickySectionHeadersEnabled={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: color.base },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  separator: { height: 1, backgroundColor: color.hairline },
  sectionHeader: {
    fontFamily: font.sansMedium,
    fontSize: 11,
    letterSpacing: 1.6,
    color: color.gold,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xs,
  },
  row: { paddingVertical: spacing.md, gap: 4 },
  rowTitle: { fontFamily: font.serifRegular, fontSize: 20, color: color.textPrimary },
  rowMeta: { fontFamily: font.sansMedium, fontSize: 11, letterSpacing: 1.2, color: color.gold, textTransform: 'uppercase' },
  rowBlurb: { fontFamily: font.sans, fontSize: 12.5, lineHeight: 18, color: color.textSecondary },
});
