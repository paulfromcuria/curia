import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Button, Kicker } from '../../components/curia';
import { DISTRICTS, VENUES } from '../../lib/data/seed';
import { useSession } from '../../lib/state/session';
import { estimateTrip } from '../../lib/travel/trip';
import { color, font, radius, spacing } from '../../theme';

const BAND_LABEL: Record<string, string> = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  evening: 'Evening',
  late: 'Late night',
};

/**
 * Real Venue detail (M6) — matches the design source's `isVenue` block:
 * photo hero, a facts strip, the curated description, a link to the
 * venue's district, and a travel handoff CTA.
 *
 * 2026-08 concierge positioning pass, at explicit user request: a real
 * concierge never shows its working, so the visible match score and the
 * separate "Why it's ranked here" (YOUR PREFERENCES/TIMING/SPEND) block are
 * gone from this screen — presentation-layer only, `rank-venues.ts`'s
 * scoring/ranking is untouched and Map/List still use it exactly as
 * before. This also fixed a real duplication bug: `reasonFor()`
 * (rank-venues.ts) returns `venue.description` verbatim whenever it's set
 * (true for every real seeded venue), so the removed "YOUR PREFERENCES" row
 * was always just repeating the `blurb` already shown above it — the blurb
 * alone already is the "one paragraph of judgment" a concierge would give.
 *
 * Save uses the shared `session.toggleSavedVenue`/`isVenueSaved`
 * (src/lib/state/session.tsx, M7) — an M9 QA pass found this had shipped
 * with its own local `useState` instead, disconnected from the same Saved
 * screen Map/List's save stars also weren't wired to; fixed here.
 *
 * The travel CTA mirrors the design source's own `vTravel` logic: under
 * half a mile it sends you to Walk, otherwise to Ride (src/lib/travel/trip.ts
 * ports that exact threshold/formula). Trip distance is computed from
 * `session.searchOrigin` — not the old `DEMO_LOCATION` fallback this screen
 * used until the same 2026-08 pass — so "FROM YOU" here can never disagree
 * with the distance List/Map show for the same venue, or with the ride
 * screen's own trip (src/app/ride.tsx, fixed the same way): one real source
 * of truth for "where you are," not two independent guesses.
 */
export default function VenueDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const session = useSession();

  const venue = VENUES.find((v) => v.id === id);
  const saved = venue ? session.isVenueSaved(venue.id) : false;
  const district = venue ? DISTRICTS.find((d) => d.id === venue.districtId) : undefined;

  const trip = venue ? estimateTrip(session.searchOrigin, venue) : undefined;

  if (!venue) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.notFound}>
        <Kicker>Venue</Kicker>
        <Text style={styles.name}>Not found</Text>
      </ScrollView>
    );
  }

  const travelLabel = trip?.walkable ? 'WALKING DIRECTIONS' : 'REQUEST A CAR';
  // A concierge offers to sort the journey, not a logistics printout — no
  // distance/time readout here for the ride case (2026-08). The walking
  // note stays: a short, practical "minutes on foot" is closer to a person
  // telling you it's an easy stroll than to a mileage-and-ETA display.
  const travelNote = trip?.walkable ? `${trip.walkMinutes} minutes on foot from where you are standing.` : '';
  const goTravel = () =>
    router.push({ pathname: trip?.walkable ? '/walk' : '/ride', params: { venueId: venue.id } });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </Pressable>
        <Pressable
          onPress={() => venue && session.toggleSavedVenue(venue.id)}
          style={[styles.saveButton, saved && styles.saveButtonOn]}
        >
          <Text style={[styles.saveButtonText, saved && styles.saveButtonTextOn]}>
            {saved ? 'SAVED' : 'SAVE'}
          </Text>
        </Pressable>
        <View style={styles.heroText}>
          <Text style={styles.kicker}>
            {(district?.name ?? '').toUpperCase()} · {venue.type}
          </Text>
          <Text style={styles.name}>{venue.name}</Text>
        </View>
      </View>

      <View style={styles.body}>
        <View style={styles.factsRow}>
          <View style={styles.fact}>
            <Text style={styles.factLabel}>SPEND</Text>
            <Text style={styles.factValue}>{'£'.repeat(venue.spendLevel)}</Text>
          </View>
          <View style={[styles.fact, styles.factBordered]}>
            <Text style={styles.factLabel}>FROM YOU</Text>
            <Text style={styles.factValue}>{trip ? `${trip.straightMiles.toFixed(1)} mi` : '—'}</Text>
          </View>
          <View style={styles.fact}>
            <Text style={styles.factLabel}>RUNS</Text>
            <Text style={styles.factValue}>{venue.bands.map((b) => BAND_LABEL[b]).join(', ')}</Text>
          </View>
        </View>

        <Text style={styles.blurb}>{venue.description}</Text>

        <Pressable onPress={() => district && router.push(`/district/${district.id}`)} style={styles.districtButton}>
          <Text style={styles.districtButtonText}>MORE IN {(district?.name ?? '').toUpperCase()}</Text>
          <Text style={styles.districtButtonArrow}>→</Text>
        </Pressable>

        <Button label={travelLabel} onPress={goTravel} style={styles.travelButton} />
        {!!travelNote && <Text style={styles.travelNote}>{travelNote}</Text>}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: color.baseVariants.a },
  notFound: { padding: spacing.lg, paddingTop: spacing.xxl, gap: spacing.sm },
  content: { paddingBottom: spacing.xxl },
  hero: {
    height: 300,
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
    paddingHorizontal: 18,
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
    fontSize: 11.5,
    letterSpacing: 1.8,
    color: color.textPrimary,
  },
  saveButtonTextOn: { color: color.goldLight },
  heroText: { padding: spacing.lg },
  kicker: {
    fontFamily: font.sansMedium,
    fontSize: 10,
    letterSpacing: 2.6,
    color: color.gold,
  },
  name: {
    fontFamily: font.serif,
    fontSize: 36,
    color: color.textPrimary,
    marginTop: spacing.sm,
  },
  body: { padding: spacing.lg, gap: spacing.md },
  factsRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: color.hairlineMax,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  fact: { flex: 1, paddingVertical: 14, paddingHorizontal: 12 },
  factBordered: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: color.hairlineMin,
  },
  factLabel: {
    fontFamily: font.sans,
    fontSize: 9,
    letterSpacing: 1.8,
    color: color.textTertiary,
  },
  factValue: {
    fontFamily: font.serifRegular,
    fontSize: 15,
    color: color.textPrimary,
    marginTop: 8,
  },
  blurb: {
    fontFamily: font.serifRegular,
    fontStyle: 'italic',
    fontSize: 15,
    lineHeight: 24,
    color: color.borderNeutral,
  },
  districtButton: {
    marginTop: spacing.sm,
    padding: spacing.md + 3,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.hairlineMax,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  districtButtonText: {
    fontFamily: font.sans,
    fontSize: 12,
    letterSpacing: 1.6,
    color: color.borderNeutral,
  },
  districtButtonArrow: { fontFamily: font.sans, fontSize: 14, color: color.gold },
  travelButton: { marginTop: spacing.xs },
  travelNote: {
    fontFamily: font.sans,
    fontSize: 11,
    lineHeight: 17,
    color: color.textTertiary,
    textAlign: 'center',
  },
});
