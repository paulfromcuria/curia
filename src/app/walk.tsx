import { useRouter, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Kicker } from '../components/curia';
import { DISTRICTS, VENUES } from '../lib/data/seed';
import { useSession } from '../lib/state/session';
import { estimateTrip } from '../lib/travel/trip';
import { color, font, radius, spacing } from '../theme';

/**
 * Real Walk screen (M6) — matches the design source's `isWalk` block
 * structure: a live-badge header, a "NEXT" card, remaining distance/ETA, and
 * a "THE ROUTE" steps list.
 *
 * What's real vs. flagged, so this doesn't read as more finished than it is:
 * distance and ETA are real (src/lib/travel/trip.ts, the same haversine-based
 * estimate Map/List already use for their own distance readouts), computed
 * from `session.searchOrigin` (2026-08 — this screen used to use the old
 * `DEMO_LOCATION` fallback, the same fix applied to src/app/ride.tsx and
 * src/app/venue/[id].tsx for the same reason: one real "where you are"
 * source of truth, not a separately-guessed one per screen). Distance/ETA
 * shown here is live navigation progress, not a recommendation's scoring —
 * the 2026-08 concierge positioning pass that removed match scores and
 * logistics readouts elsewhere deliberately left this screen's remaining-
 * distance/ETA alone; a walking-directions screen that can't tell you how
 * far is left isn't a concierge touch, it's broken. Turn-by-
 * turn directions are NOT real — the design source's own street-by-street
 * steps ("Head north out of the square", "STEVENSON SQUARE"...) are a fixed,
 * hand-authored 5-step demo sequence in the prototype, not a real routing
 * result either, but inventing our *own* fake street names here would read
 * as more authoritative than that. A real turn-by-turn route needs a real
 * mapping/routing provider (Mapbox Directions or equivalent) — the same
 * category of credential gap CLAUDE.md already flags for the map itself
 * ("Still genuinely open": Mapbox API key) — so this shows one honest step
 * (straight-line direction + real distance) instead of fabricated streets.
 */
export default function Walk() {
  const router = useRouter();
  const session = useSession();
  const { venueId } = useLocalSearchParams<{ venueId?: string }>();
  const venue = venueId ? VENUES.find((v) => v.id === venueId) : undefined;
  const district = venue ? DISTRICTS.find((d) => d.id === venue.districtId) : undefined;
  const trip = venue ? estimateTrip(session.searchOrigin, venue) : undefined;

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </Pressable>
        <View style={styles.heroText}>
          <View style={styles.liveRow}>
            <View style={styles.livePulse} />
            <Text style={styles.liveLabel}>LIVE · FOLLOWING YOUR LOCATION</Text>
          </View>
          <Text style={styles.title}>Walking to {venue?.name ?? 'your venue'}</Text>
        </View>
      </View>

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
        <View style={styles.nextCard}>
          <Text style={styles.nextKicker}>NEXT</Text>
          <Text style={styles.nextTitle}>
            {venue ? `Continue toward ${venue.name}` : 'Continue ahead'}
          </Text>
          <Text style={styles.nextSub}>{district ? district.name.toUpperCase() : ''}</Text>
        </View>

        <View style={styles.remainingRow}>
          <Text style={styles.remaining}>
            {trip ? `${(trip.straightMiles * 1609).toFixed(0)} m to go` : '—'}
          </Text>
          <Text style={styles.eta}>{trip ? `${trip.walkMinutes} MIN ON FOOT` : ''}</Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={styles.progressFill} />
        </View>

        <Kicker style={styles.routeKicker}>The route</Kicker>
        <View style={styles.stepRow}>
          <View style={styles.stepMark} />
          <View style={styles.stepText}>
            <Text style={styles.stepInstr}>
              {venue ? `Head toward ${venue.name}, on foot` : 'Continue on foot'}
            </Text>
            <Text style={styles.stepStreet}>
              {trip ? `${trip.straightMiles.toFixed(1)} MI STRAIGHT LINE` : ''}
            </Text>
          </View>
          <Text style={styles.stepDist}>{trip ? `${trip.walkMinutes} min` : ''}</Text>
        </View>
        <Text style={styles.routeNote}>
          Turn-by-turn directions need a real mapping/routing provider, not yet connected — follow
          your phone&rsquo;s own maps app for street-by-street guidance. Distance and time above are
          real, straight-line estimates from where you are now.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: color.baseVariants.d },
  hero: {
    height: 220,
    backgroundColor: color.surfaceVariants.c,
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
    backgroundColor: 'rgba(19,17,16,.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: { color: color.textPrimary, fontSize: 15 },
  heroText: { padding: spacing.lg, paddingLeft: 76 },
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  livePulse: { width: 6, height: 6, borderRadius: 3, backgroundColor: color.gold },
  liveLabel: {
    fontFamily: font.sansMedium,
    fontSize: 9.5,
    letterSpacing: 2.4,
    color: color.gold,
  },
  title: {
    fontFamily: font.serifRegular,
    fontSize: 21,
    color: color.textPrimary,
    marginTop: spacing.sm,
  },
  body: { flex: 1 },
  bodyContent: { padding: spacing.lg, paddingBottom: spacing.xxl },
  nextCard: {
    padding: spacing.md + 6,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(192,160,98,.3)',
    backgroundColor: 'rgba(192,160,98,.06)',
  },
  nextKicker: {
    fontFamily: font.sansMedium,
    fontSize: 9.5,
    letterSpacing: 2.4,
    color: color.gold,
  },
  nextTitle: {
    fontFamily: font.serifRegular,
    fontSize: 24,
    color: color.textPrimaryBright,
    marginTop: spacing.sm,
  },
  nextSub: {
    fontFamily: font.sans,
    fontSize: 11,
    letterSpacing: 1.6,
    color: color.textSecondary,
    marginTop: spacing.sm,
  },
  remainingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: spacing.lg,
  },
  remaining: { fontFamily: font.serifRegular, fontSize: 20, color: color.textPrimary },
  eta: {
    fontFamily: font.sansMedium,
    fontSize: 9.5,
    letterSpacing: 2.2,
    color: color.gold,
  },
  progressTrack: {
    height: 2,
    borderRadius: 1,
    backgroundColor: color.hairlineMax,
    marginTop: spacing.sm,
    overflow: 'hidden',
  },
  progressFill: { height: 2, width: '4%', backgroundColor: color.gold },
  routeKicker: { marginTop: spacing.lg + 4 },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingTop: spacing.md + 3,
  },
  stepMark: { width: 9, height: 9, borderRadius: 4.5, backgroundColor: color.gold, marginTop: 6 },
  stepText: { flex: 1 },
  stepInstr: { fontFamily: font.sans, fontSize: 14, color: color.textPrimary },
  stepStreet: {
    fontFamily: font.sans,
    fontSize: 9.5,
    letterSpacing: 1.8,
    color: color.textTertiary,
    marginTop: 7,
  },
  stepDist: { fontFamily: font.sans, fontSize: 12, color: color.textSecondary },
  routeNote: {
    fontFamily: font.sans,
    fontSize: 11,
    lineHeight: 17,
    color: color.textTertiary,
    marginTop: spacing.lg,
  },
});
