import { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Kicker } from '../components/curia';
import { DISTRICTS, VENUES } from '../lib/data/seed';
import { useSession } from '../lib/state/session';
import { estimateTrip, formatGBP, rideTiersFor } from '../lib/travel/trip';
import { color, font, radius, spacing } from '../theme';

/**
 * Real Ride-to-venue screen (M6) — matches the design source's `isRide`
 * block: pickup/destination and a fare estimate across 3 tiers (UberX /
 * Uber Comfort / Uber Black).
 *
 * The fare-estimate structure is real and working (src/lib/travel/trip.ts
 * ports the design source's own `trip()`/tier-multiplier formulas exactly —
 * a local, self-contained calculation, not a live pricing call), but there
 * is no real Uber (or other ride-hailing) account/API key anywhere in this
 * project — a genuine credential gap, same category as the Mapbox/Stripe
 * gaps CLAUDE.md already names under "Still genuinely open". The prototype
 * itself never calls a real Uber API either: tapping "REQUEST X" there just
 * flips local state to show "Handing you to the Uber app…" — this screen
 * mirrors that same honest simulation rather than guessing at a deep-link
 * integration (e.g. a real `uber://` URI scheme call) that would silently
 * fail without real client credentials.
 *
 * 2026-08 concierge positioning pass, at explicit user request: dropped the
 * raw "X mi · about Y min by road" readout from the trip card — a
 * concierge offers to sort the car, not a logistics printout. Trip is now
 * computed from `session.searchOrigin`, not the old `DEMO_LOCATION`
 * fallback this screen used until this same pass — that's the one real
 * "where you are" source of truth List/Map/venue detail all already used
 * (src/app/venue/[id].tsx, fixed the same way), so this screen's distance
 * can never quietly disagree with the venue detail page's "FROM YOU" for
 * the same venue.
 */
export default function Ride() {
  const router = useRouter();
  const session = useSession();
  const { venueId } = useLocalSearchParams<{ venueId?: string }>();
  const venue = venueId ? VENUES.find((v) => v.id === venueId) : undefined;
  const district = venue ? DISTRICTS.find((d) => d.id === venue.districtId) : undefined;
  const trip = venue ? estimateTrip(session.searchOrigin, venue) : undefined;
  const tiers = trip ? rideTiersFor(trip) : [];

  const [tierIndex, setTierIndex] = useState(0);
  const [requested, setRequested] = useState(false);

  const selectedTier = tiers[tierIndex];

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </Pressable>
        <Kicker style={styles.kicker}>Via Uber</Kicker>
        <Text style={styles.title}>A car to {venue?.name ?? 'your venue'}</Text>
        {trip?.walkable && (
          <Text style={styles.walkNote}>
            Walkable in {trip.walkMinutes} minutes, but the car is here if you would rather not.
          </Text>
        )}

        <View style={styles.tripCard}>
          <View style={styles.tripRow}>
            <View style={styles.tripDots}>
              <View style={styles.dotMe} />
              <View style={styles.dotLine} />
              <View style={styles.dotVenue} />
            </View>
            <View style={styles.tripCols}>
              <View>
                <Text style={styles.tripLabel}>PICKUP</Text>
                <Text style={styles.tripValue}>Your location</Text>
              </View>
              <View style={styles.tripDestination}>
                <Text style={styles.tripLabel}>DESTINATION</Text>
                <Text style={styles.tripValue}>
                  {venue ? `${venue.name} · ${district?.name ?? ''}` : '—'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <Kicker style={styles.chooseKicker}>Choose a ride</Kicker>
        <View style={styles.tierList}>
          {tiers.map((tier, idx) => {
            const selected = idx === tierIndex;
            return (
              <Pressable
                key={tier.name}
                onPress={() => setTierIndex(idx)}
                style={[styles.tierRow, selected && styles.tierRowSelected]}
              >
                <View style={styles.tierText}>
                  <Text style={[styles.tierName, selected && styles.tierNameSelected]}>{tier.name}</Text>
                  <Text style={styles.tierSub}>{tier.sub}</Text>
                </View>
                <View style={styles.tierPriceCol}>
                  <Text style={[styles.tierPrice, selected && styles.tierPriceSelected]}>
                    {formatGBP(tier.price)}
                  </Text>
                  <Text style={styles.tierWait}>{tier.waitMinutes} min away</Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          onPress={() => setRequested(true)}
          style={[styles.cta, requested && styles.ctaRequested]}
          disabled={requested}
        >
          <Text style={[styles.ctaLabel, requested && styles.ctaLabelRequested]}>
            {requested ? 'OPENING UBER…' : `REQUEST ${(selectedTier?.name ?? '').toUpperCase()}`}
          </Text>
        </Pressable>
        <Text style={styles.foot}>
          {requested
            ? 'Handing you to the Uber app with the pickup and destination already set.'
            : "Fare shown is Uber's estimate for this route now. You confirm and pay in Uber."}
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: color.baseVariants.d },
  content: { padding: spacing.lg, paddingTop: spacing.xxl, paddingBottom: spacing.xxl },
  backButton: {
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
  kicker: { marginTop: spacing.lg },
  title: {
    fontFamily: font.serif,
    fontSize: 30,
    color: color.textPrimary,
    marginTop: spacing.sm,
  },
  walkNote: {
    fontFamily: font.sans,
    fontSize: 12.5,
    lineHeight: 19,
    color: color.textSecondary,
    marginTop: spacing.sm,
  },
  tripCard: {
    marginTop: spacing.lg,
    padding: spacing.md + 6,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.hairlineMax,
    backgroundColor: 'rgba(240,233,223,.03)',
  },
  tripRow: { flexDirection: 'row', gap: spacing.md },
  tripDots: { alignItems: 'center', paddingTop: 5 },
  dotMe: { width: 8, height: 8, borderRadius: 4, backgroundColor: color.textPrimary },
  dotLine: { width: 1, height: 30, backgroundColor: color.hairlineMax },
  dotVenue: { width: 8, height: 8, borderRadius: 4, backgroundColor: color.gold },
  tripCols: { flex: 1, gap: spacing.lg },
  tripDestination: {},
  tripLabel: {
    fontFamily: font.sans,
    fontSize: 9,
    letterSpacing: 1.8,
    color: color.textTertiary,
  },
  tripValue: {
    fontFamily: font.sans,
    fontSize: 13.5,
    color: color.borderNeutral,
    marginTop: 6,
  },
  chooseKicker: { marginTop: spacing.xl },
  tierList: { gap: spacing.sm, marginTop: spacing.md },
  tierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    padding: spacing.md + 4,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.hairlineMax,
  },
  tierRowSelected: {
    borderColor: 'rgba(192,160,98,.55)',
    backgroundColor: 'rgba(192,160,98,.09)',
  },
  tierText: { flex: 1 },
  tierName: { fontFamily: font.serifRegular, fontSize: 17, color: color.borderNeutral },
  tierNameSelected: { fontFamily: font.serif, color: color.textPrimaryBright },
  tierSub: {
    fontFamily: font.sans,
    fontSize: 11.5,
    lineHeight: 17,
    color: color.textSecondary,
    marginTop: 5,
  },
  tierPriceCol: { alignItems: 'flex-end' },
  tierPrice: { fontFamily: font.sansRegular, fontSize: 15, color: color.textSecondaryAlt },
  tierPriceSelected: { color: color.goldLight },
  tierWait: {
    fontFamily: font.sans,
    fontSize: 10,
    letterSpacing: 1.2,
    color: color.textTertiary,
    marginTop: 6,
  },
  cta: {
    marginTop: spacing.xl,
    paddingVertical: 17,
    borderRadius: radius.md,
    backgroundColor: color.gold,
    alignItems: 'center',
  },
  ctaRequested: { backgroundColor: 'rgba(192,160,98,.22)' },
  ctaLabel: {
    fontFamily: font.sansMedium,
    fontSize: 12,
    letterSpacing: 2.2,
    color: color.goldText,
  },
  ctaLabelRequested: { color: color.goldLight },
  foot: {
    fontFamily: font.sans,
    fontSize: 11,
    lineHeight: 17,
    color: color.textTertiary,
    textAlign: 'center',
    marginTop: spacing.md,
  },
});
