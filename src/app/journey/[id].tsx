import { useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Kicker } from '../../components/curia';
import { JOURNEYS, VENUES, journeyDistricts } from '../../lib/data/seed';
import { DEMO_LOCATION } from '../../lib/scoring/session-input';
import { estimateTrip } from '../../lib/travel/trip';
import { color, font, radius, spacing } from '../../theme';
import type { JourneyStop, Venue } from '../../types/models';

interface ResolvedStop {
  stop: JourneyStop;
  venue: Venue;
}

/**
 * Real Journey detail (M6) — ordered stops (venue name, order, walk-time-to-
 * next) for the real seeded journeys ("Date Night in Altrincham", "A Client,
 * Well Handled"), matching the design source's `isJourney` block ("THE
 * SEQUENCE" list, walk-time connector between stops, "START THIS JOURNEY"
 * CTA). No clock times (7:30PM etc.) — those exist in the design source's own
 * JOURNEYS constant but `JourneyStop` (src/types/models.ts) only carries
 * venue id / order / walk-time-to-next per CLAUDE.md's data model, so this
 * screen doesn't invent a schedule on top of what the model actually holds.
 */
export default function JourneyDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [saved, setSaved] = useState(false);

  const journey = JOURNEYS.find((j) => j.id === id);

  const stops = useMemo<ResolvedStop[]>(() => {
    if (!journey) return [];
    return journey.stops
      .slice()
      .sort((a, b) => a.order - b.order)
      .reduce<ResolvedStop[]>((acc, stop) => {
        const venue = VENUES.find((v) => v.id === stop.venueId);
        if (venue) acc.push({ stop, venue });
        return acc;
      }, []);
  }, [journey]);

  const districts = journey ? journeyDistricts(journey) : [];

  if (!journey) {
    return (
      <View style={[styles.container, styles.notFound]}>
        <Kicker>Journey</Kicker>
        <Text style={styles.heroTitle}>Not found</Text>
      </View>
    );
  }

  const firstVenue = stops[0]?.venue;
  const startJourney = () => {
    if (!firstVenue) return;
    const trip = estimateTrip(DEMO_LOCATION, firstVenue);
    router.push({ pathname: trip.walkable ? '/walk' : '/ride', params: { venueId: firstVenue.id } });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </Pressable>
        <Pressable onPress={() => setSaved((s) => !s)} style={[styles.saveButton, saved && styles.saveButtonOn]}>
          <Text style={[styles.saveButtonText, saved && styles.saveButtonTextOn]}>
            {saved ? 'SAVED' : 'SAVE JOURNEY'}
          </Text>
        </Pressable>
        <View style={styles.heroText}>
          {journey.meta && <Text style={styles.heroMeta}>{journey.meta}</Text>}
          <Text style={styles.heroTitle}>{journey.title}</Text>
        </View>
      </View>

      <View style={styles.body}>
        {journey.blurb && <Text style={styles.blurb}>{journey.blurb}</Text>}

        {districts.length > 0 && (
          <View style={styles.districtRow}>
            {districts.map((d) => (
              <Pressable key={d.id} onPress={() => router.push(`/district/${d.id}`)} style={styles.districtTag}>
                <Text style={styles.districtTagText}>{d.name.toUpperCase()}</Text>
              </Pressable>
            ))}
          </View>
        )}

        <Kicker style={styles.sequenceKicker}>The sequence</Kicker>
        <View>
          {stops.map(({ stop, venue }, idx) => (
            <View key={venue.id}>
              <Pressable onPress={() => router.push(`/venue/${venue.id}`)} style={styles.stopRow}>
                <View style={styles.stopPhoto} />
                <View style={styles.stopText}>
                  <Text style={styles.stopIndex}>STOP {idx + 1}</Text>
                  <Text style={styles.stopName}>{venue.name}</Text>
                  <Text style={styles.stopKind}>{venue.type}</Text>
                  <Text style={styles.stopNote}>{venue.description}</Text>
                </View>
              </Pressable>
              {stop.walkTimeToNextMinutes !== undefined && (
                <View style={styles.walkRow}>
                  <View style={styles.walkLine} />
                  <Text style={styles.walkLabel}>{stop.walkTimeToNextMinutes} MIN WALK</Text>
                </View>
              )}
            </View>
          ))}
        </View>

        <Button label="Start this journey" onPress={startJourney} style={styles.startButton} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: color.baseVariants.a },
  notFound: { padding: spacing.lg, paddingTop: spacing.xxl, gap: spacing.sm },
  content: { paddingBottom: spacing.xxl },
  hero: {
    height: 260,
    backgroundColor: color.surface,
    justifyContent: 'flex-end',
  },
  backButton: {
    position: 'absolute',
    top: 56,
    left: spacing.lg,
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: color.hairlineMax,
    backgroundColor: 'rgba(19,17,16,.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: { color: color.textPrimary, fontSize: 15 },
  saveButton: {
    position: 'absolute',
    top: 56,
    right: spacing.lg,
    height: 38,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.hairlineMax,
    backgroundColor: 'rgba(19,17,16,.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonOn: {
    borderColor: 'rgba(192,160,98,.8)',
    backgroundColor: 'rgba(192,160,98,.2)',
  },
  saveButtonText: {
    fontFamily: font.sans,
    fontSize: 11,
    letterSpacing: 1.6,
    color: color.textPrimary,
  },
  saveButtonTextOn: { color: color.goldLight },
  heroText: { padding: spacing.lg },
  heroMeta: {
    fontFamily: font.sansMedium,
    fontSize: 10,
    letterSpacing: 2.6,
    color: color.gold,
  },
  heroTitle: {
    fontFamily: font.serif,
    fontSize: 34,
    color: color.textPrimary,
    marginTop: spacing.sm,
  },
  body: { padding: spacing.lg, gap: spacing.md },
  blurb: {
    fontFamily: font.serifRegular,
    fontStyle: 'italic',
    fontSize: 15,
    lineHeight: 24,
    color: color.borderNeutral,
  },
  districtRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  districtTag: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.hairlineMax,
  },
  districtTagText: {
    fontFamily: font.sans,
    fontSize: 10,
    letterSpacing: 1.4,
    color: color.textSecondary,
  },
  sequenceKicker: { marginTop: spacing.sm },
  stopRow: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  stopPhoto: {
    width: 78,
    height: 78,
    borderRadius: radius.md,
    backgroundColor: color.surface,
  },
  stopText: { flex: 1, gap: 4 },
  stopIndex: {
    fontFamily: font.sans,
    fontSize: 9.5,
    letterSpacing: 2,
    color: color.textTertiary,
  },
  stopName: {
    fontFamily: font.serifRegular,
    fontSize: 20,
    color: color.textPrimary,
  },
  stopKind: {
    fontFamily: font.sans,
    fontSize: 10,
    letterSpacing: 1.4,
    color: color.textSecondary,
  },
  stopNote: {
    fontFamily: font.sans,
    fontSize: 12,
    lineHeight: 18,
    color: color.textSecondary,
  },
  walkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingLeft: 39,
  },
  walkLine: {
    width: 1,
    height: 20,
    backgroundColor: 'rgba(192,160,98,.35)',
  },
  walkLabel: {
    fontFamily: font.sans,
    fontSize: 10.5,
    letterSpacing: 1.6,
    color: color.textTertiary,
  },
  startButton: { marginTop: spacing.sm },
});
