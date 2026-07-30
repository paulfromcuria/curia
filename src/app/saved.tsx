import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button, Kicker } from '../components/curia';
import { DISTRICTS, JOURNEYS, VENUES } from '../lib/data/seed';
import { useSession } from '../lib/state/session';
import { color, font, radius, spacing } from '../theme';

/**
 * Real Saved places / Saved journeys screen (M7). Layout and copy are
 * transcribed from the Claude Design handoff bundle's `isSaved` block
 * (Curia.dc.html) — a Places/Journeys toggle (`savedView` in the prototype,
 * `?view=` query param here), rows grouped by collection, and the
 * prototype's own empty-state copy.
 *
 * This screen reads/writes the shared `savedCollections`/`savedJourneyIds`
 * session state added in src/lib/state/session.tsx for M7 — see that
 * file's comments. IMPORTANT, flagged rather than silently worked around:
 * Map (src/app/(tabs)/map.tsx) and List (src/app/(tabs)/list.tsx) currently
 * have their own local, unpersisted per-screen save-star toggles that are
 * NOT wired to this shared store yet — so a venue starred there won't (yet)
 * appear here. Wiring them up is left as follow-up work for curia-map /
 * curia-list, per this agent's brief not to rewire another subagent's
 * screens. Venue/journey detail (src/app/venue/[id].tsx,
 * src/app/journey/[id].tsx) are still curia-moments-journeys' placeholders
 * for the same reason — once built, they should call
 * `session.toggleSavedVenue` / `session.toggleSavedJourney`.
 */

type SavedView = 'places' | 'journeys';

export default function Saved() {
  const router = useRouter();
  const session = useSession();
  const { view } = useLocalSearchParams<{ view?: string }>();
  const [activeView, setActiveView] = useState<SavedView>(view === 'journeys' ? 'journeys' : 'places');
  const [newCollectionName, setNewCollectionName] = useState('');

  const totalSavedVenues = useMemo(
    () => session.savedCollections.reduce((sum, c) => sum + c.venueIds.length, 0),
    [session.savedCollections]
  );

  const places = activeView === 'places';

  function handleCreateCollection() {
    const name = newCollectionName.trim();
    if (!name) return;
    session.createCollection(name);
    setNewCollectionName('');
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Kicker tone="tertiary">{places ? 'Saved places' : 'Saved journeys'}</Kicker>

      <View style={styles.tabRow}>
        {(['places', 'journeys'] as SavedView[]).map((v) => (
          <Pressable key={v} onPress={() => setActiveView(v)} style={styles.tab}>
            <Text style={[styles.tabLabel, activeView === v && styles.tabLabelActive]}>
              {v === 'places' ? 'PLACES' : 'JOURNEYS'}
            </Text>
            {activeView === v && <View style={styles.tabUnderline} />}
          </Pressable>
        ))}
      </View>

      <Text style={styles.title}>{places ? 'Places you kept.' : 'Journeys you kept.'}</Text>
      <Text style={styles.intro}>
        {places
          ? 'Bookmarked rooms, re-ranked against tonight every time you open them.'
          : 'Whole evenings, held for whenever the occasion turns up.'}
      </Text>

      {places ? (
        <PlacesView
          newCollectionName={newCollectionName}
          onChangeNewCollectionName={setNewCollectionName}
          onCreateCollection={handleCreateCollection}
        />
      ) : (
        <JourneysView />
      )}

      {places && totalSavedVenues === 0 && (
        <EmptyState
          mark="✧"
          title="Nothing kept yet."
          body="Save a room from Map or List and it will wait here — re-ranked against whatever evening you open next."
          cta="BROWSE TONIGHT"
          onPress={() => router.push('/(tabs)/list')}
        />
      )}
      {!places && session.savedJourneyIds.length === 0 && (
        <EmptyState
          mark="⟶"
          title="No journeys kept yet."
          body="Our editors plan whole evenings, stop by stop. Keep one and it will be here when the occasion arrives."
          cta="SEE JOURNEYS"
          onPress={() => router.push('/(tabs)/moments')}
        />
      )}
    </ScrollView>
  );
}

function PlacesView({
  newCollectionName,
  onChangeNewCollectionName,
  onCreateCollection,
}: {
  newCollectionName: string;
  onChangeNewCollectionName: (v: string) => void;
  onCreateCollection: () => void;
}) {
  const router = useRouter();
  const session = useSession();
  const nonEmptyCollections = session.savedCollections.filter((c) => c.venueIds.length > 0);

  return (
    <View style={styles.groups}>
      {nonEmptyCollections.map((collection) => (
        <View key={collection.id} style={styles.group}>
          <Kicker>{collection.name}</Kicker>
          <View style={styles.rows}>
            {collection.venueIds.map((venueId) => {
              const venue = VENUES.find((v) => v.id === venueId);
              if (!venue) return null;
              const district = DISTRICTS.find((d) => d.id === venue.districtId);
              const meta = [district?.name, venue.type, '£'.repeat(venue.spendLevel)]
                .filter(Boolean)
                .join(' · ')
                .toUpperCase();
              return (
                <View key={venueId} style={styles.row}>
                  <Pressable
                    onPress={() => router.push(`/venue/${venueId}`)}
                    style={styles.rowThumb}
                  >
                    <Text style={styles.rowThumbLabel}>{venue.name[0]}</Text>
                  </Pressable>
                  <Pressable onPress={() => router.push(`/venue/${venueId}`)} style={styles.rowText}>
                    <Text style={styles.rowLabel}>{venue.name}</Text>
                    <Text style={styles.rowMeta}>{meta}</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => session.removeVenueFromCollection(collection.id, venueId)}
                    style={styles.removeButton}
                    accessibilityLabel={`Remove ${venue.name} from ${collection.name}`}
                  >
                    <Text style={styles.removeMark}>✕</Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
        </View>
      ))}

      <View style={styles.newCollectionRow}>
        <TextInput
          value={newCollectionName}
          onChangeText={onChangeNewCollectionName}
          placeholder="Name a new collection"
          placeholderTextColor={color.textTertiary}
          style={styles.newCollectionInput}
        />
        <Pressable onPress={onCreateCollection} style={styles.newCollectionAdd}>
          <Text style={styles.newCollectionAddLabel}>ADD</Text>
        </Pressable>
      </View>
    </View>
  );
}

function JourneysView() {
  const router = useRouter();
  const session = useSession();
  const savedJourneys = session.savedJourneyIds
    .map((id) => JOURNEYS.find((j) => j.id === id))
    .filter((j): j is (typeof JOURNEYS)[number] => Boolean(j));

  if (savedJourneys.length === 0) return null;

  return (
    <View style={styles.groups}>
      <View style={styles.group}>
        <View style={styles.rows}>
          {savedJourneys.map((journey) => (
            <View key={journey.id} style={styles.row}>
              <Pressable onPress={() => router.push(`/journey/${journey.id}`)} style={styles.rowText}>
                <Text style={styles.rowLabel}>{journey.title}</Text>
                <Text style={styles.rowMeta}>{journey.momentType.replace(/-/g, ' ').toUpperCase()}</Text>
              </Pressable>
              <Pressable
                onPress={() => session.toggleSavedJourney(journey.id)}
                style={styles.removeButton}
                accessibilityLabel={`Remove ${journey.title}`}
              >
                <Text style={styles.removeMark}>✕</Text>
              </Pressable>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

function EmptyState({
  mark,
  title,
  body,
  cta,
  onPress,
}: {
  mark: string;
  title: string;
  body: string;
  cta: string;
  onPress: () => void;
}) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyMark}>{mark}</Text>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
      <Button label={cta} onPress={onPress} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: color.baseVariants.a },
  content: { padding: spacing.lg, paddingTop: spacing.xxl, paddingBottom: spacing.xxl },
  tabRow: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginTop: spacing.lg,
  },
  tab: {
    paddingBottom: spacing.sm,
  },
  tabLabel: {
    fontFamily: font.sansMedium,
    fontSize: 11,
    letterSpacing: 2,
    color: color.textTertiary,
  },
  tabLabelActive: {
    color: color.textPrimary,
  },
  tabUnderline: {
    marginTop: 6,
    height: 2,
    backgroundColor: color.gold,
    borderRadius: 1,
  },
  title: {
    fontFamily: font.serif,
    fontSize: 30,
    color: color.textPrimary,
    marginTop: spacing.lg,
  },
  intro: {
    fontFamily: font.sans,
    fontSize: 13,
    lineHeight: 21,
    color: color.textSecondary,
    marginTop: spacing.sm,
    maxWidth: 290,
  },
  groups: {
    marginTop: spacing.lg,
    gap: spacing.lg,
  },
  group: {
    gap: spacing.xs,
  },
  rows: {
    marginTop: spacing.sm,
    gap: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: color.hairlineMin,
  },
  rowThumb: {
    width: 64,
    height: 64,
    borderRadius: radius.md,
    backgroundColor: color.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowThumbLabel: {
    fontFamily: font.serif,
    fontSize: 22,
    color: color.textSecondary,
  },
  rowText: {
    flex: 1,
    minWidth: 0,
    gap: spacing.xs + 4,
  },
  rowLabel: {
    fontFamily: font.serifRegular,
    fontSize: 19,
    color: color.textPrimary,
  },
  rowMeta: {
    fontFamily: font.sans,
    fontSize: 10.5,
    letterSpacing: 1.2,
    color: color.textSecondary,
  },
  removeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(192,160,98,.4)',
    backgroundColor: 'rgba(192,160,98,.1)',
  },
  removeMark: {
    fontSize: 12,
    color: color.goldLight,
  },
  newCollectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  newCollectionInput: {
    flex: 1,
    fontFamily: font.sans,
    fontSize: 13,
    color: color.textPrimary,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.hairlineMax,
  },
  newCollectionAdd: {
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(192,160,98,.5)',
  },
  newCollectionAddLabel: {
    fontFamily: font.sansMedium,
    fontSize: 11,
    letterSpacing: 1.6,
    color: color.gold,
  },
  empty: {
    marginTop: spacing.lg,
    padding: spacing.lg + 4,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: color.hairlineMax,
    backgroundColor: 'rgba(240,233,223,.02)',
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyMark: {
    fontFamily: font.serif,
    fontSize: 40,
    color: 'rgba(192,160,98,.5)',
  },
  emptyTitle: {
    fontFamily: font.serif,
    fontSize: 21,
    color: color.textPrimary,
    textAlign: 'center',
  },
  emptyBody: {
    fontFamily: font.sans,
    fontSize: 13,
    lineHeight: 21,
    color: color.textSecondary,
    textAlign: 'center',
  },
});
