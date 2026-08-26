import { useMemo } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Kicker } from '../../components/curia';
import {
  CITIES,
  DISTRICTS,
  journeysByDistrict,
  momentsByDistrict,
  venuesByDistrict,
} from '../../lib/data/seed';
import { districtLiveliness } from '../../lib/map/geo';
import { rankVenues, resolveContext } from '../../lib/scoring/rank-venues';
import { buildMatchmakingInputFromSession } from '../../lib/scoring/session-input';
import { useSession } from '../../lib/state/session';
import { color, font, radius, spacing } from '../../theme';

/**
 * Real District guide (M6) — matches the design source's `isDistrict` block:
 * editorial description, a "live now" bar, real "TOP MATCHES" ranked venues,
 * and a combined "KEPT BY OUR EDITORS" preview of journeys + moments that
 * touch this district, with a link into the Moments tab pre-filtered to it.
 * Only real districts route here — grouped map labels never do (Hard rule 6,
 * already enforced at the call site in map.tsx).
 */
export default function DistrictGuide() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const session = useSession();

  const district = DISTRICTS.find((d) => d.id === id);
  const metroName = CITIES.find((c) => c.id === district?.metro)?.name ?? '';
  const districtVenues = useMemo(() => (district ? venuesByDistrict(district.id) : []), [district]);

  const matchInput = useMemo(
    () =>
      district
        ? buildMatchmakingInputFromSession(session, {
            location: { lat: district.lat, lon: district.lon },
            radiusMiles: 999,
          })
        : undefined,
    [session, district]
  );
  const resolved = matchInput ? resolveContext(matchInput.context) : undefined;
  const ranked = useMemo(
    () => (matchInput ? rankVenues(matchInput, districtVenues, DISTRICTS) : { ranked: [], empty: true }),
    [matchInput, districtVenues]
  );
  const topMatches = ranked.ranked.slice(0, 4);

  const journeys = district ? journeysByDistrict(district.id) : [];
  const moments = district ? momentsByDistrict(district.id) : [];
  const kept = [
    ...journeys.map((j) => ({
      kicker: 'JOURNEY',
      title: j.title,
      sub: j.meta ?? '',
      onTap: () => router.push(`/journey/${j.id}`),
    })),
    ...moments.map((m) => ({
      kicker: 'MOMENT',
      title: m.title,
      sub: `BY ${m.curator}`,
      onTap: () => router.push({ pathname: '/(tabs)/moments', params: { district: district?.id } }),
    })),
  ];
  const keptShown = kept.slice(0, 3);

  const live =
    district && resolved ? districtLiveliness(district, resolved.day, resolved.band) : undefined;

  if (!district) {
    return (
      <View style={[styles.container, styles.notFound]}>
        <Kicker>District</Kicker>
        <Text style={styles.name}>Not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </Pressable>
        <View style={styles.heroText}>
          <Text style={styles.kicker}>
            {metroName.toUpperCase()} · {district.kind === 'county' ? 'CHESHIRE SET' : 'DISTRICT'}
          </Text>
          <Text style={styles.name}>{district.name}</Text>
          {live !== undefined && (
            <View style={styles.liveRow}>
              <View style={styles.liveTrack}>
                <View style={[styles.liveFill, { width: `${live}%` }]} />
              </View>
            </View>
          )}
        </View>
      </View>

      <View style={styles.body}>
        {district.editorialDescription && <Text style={styles.blurb}>{district.editorialDescription}</Text>}

        <View style={styles.sectionHeader}>
          <Kicker>Top matches</Kicker>
          {resolved && <Text style={styles.sectionMeta}>{resolved.day.toUpperCase()} · {resolved.band.toUpperCase()}</Text>}
        </View>
        {topMatches.length === 0 && (
          <Text style={styles.emptyNote}>Nothing kept here yet — our editors are still working their way through {district.name}.</Text>
        )}
        {topMatches.map((r) => {
          const venue = districtVenues.find((v) => v.id === r.venueId);
          if (!venue) return null;
          return (
            <Pressable key={venue.id} onPress={() => router.push(`/venue/${venue.id}`)} style={styles.matchRow}>
              <View style={styles.matchText}>
                <Text style={styles.matchName}>{venue.name}</Text>
                <Text style={styles.matchMeta}>
                  {venue.type} · {'£'.repeat(venue.spendLevel)}
                </Text>
                <Text style={styles.matchReason}>{r.reason}</Text>
              </View>
            </Pressable>
          );
        })}

        <View style={styles.sectionHeader}>
          <Kicker>Kept by our editors</Kicker>
          <Text style={styles.sectionMeta}>{kept.length}</Text>
        </View>
        {keptShown.length === 0 && (
          <Text style={styles.emptyNote}>
            Nothing kept here yet — our editors are still working their way through {district.name}.
          </Text>
        )}
        {keptShown.map((k, idx) => (
          <Pressable key={`${k.kicker}-${idx}`} onPress={k.onTap} style={styles.keptRow}>
            <View style={styles.keptPhoto} />
            <View style={styles.keptText}>
              <Text style={styles.keptKicker}>{k.kicker}</Text>
              <Text style={styles.keptTitle}>{k.title}</Text>
              <Text style={styles.keptSub}>{k.sub}</Text>
            </View>
            <Text style={styles.keptArrow}>→</Text>
          </Pressable>
        ))}

        <Pressable
          onPress={() => router.push({ pathname: '/(tabs)/moments', params: { district: district.id } })}
          style={styles.allMomentsButton}
        >
          <Text style={styles.allMomentsButtonText}>ALL MOMENTS IN {district.name.toUpperCase()}</Text>
          <Text style={styles.allMomentsButtonArrow}>→</Text>
        </Pressable>
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
    backgroundColor: color.surfaceVariants.f,
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
    backgroundColor: 'rgba(19,17,16,.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: { color: color.textPrimary, fontSize: 15 },
  heroText: { padding: spacing.lg },
  kicker: {
    fontFamily: font.sansMedium,
    fontSize: 10,
    letterSpacing: 2.6,
    color: color.gold,
  },
  name: {
    fontFamily: font.serif,
    fontSize: 38,
    color: color.textPrimary,
    marginTop: spacing.sm,
  },
  liveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  liveTrack: {
    flex: 1,
    height: 2,
    borderRadius: 1,
    backgroundColor: color.hairlineMax,
    overflow: 'hidden',
  },
  liveFill: { height: 2, backgroundColor: color.gold },
  body: { padding: spacing.lg, gap: spacing.md },
  blurb: {
    fontFamily: font.serifRegular,
    fontStyle: 'italic',
    fontSize: 15.5,
    lineHeight: 24,
    color: color.borderNeutral,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: color.hairlineMax,
  },
  sectionMeta: {
    fontFamily: font.sans,
    fontSize: 11,
    letterSpacing: 1,
    color: color.textTertiary,
  },
  emptyNote: {
    fontFamily: font.serifRegular,
    fontStyle: 'italic',
    fontSize: 14,
    color: color.textSecondary,
    paddingVertical: spacing.sm,
  },
  matchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: color.hairlineMin,
  },
  matchText: { flex: 1, gap: 6 },
  matchName: { fontFamily: font.serifRegular, fontSize: 21, color: color.textPrimary },
  matchMeta: {
    fontFamily: font.sans,
    fontSize: 10.5,
    letterSpacing: 1.4,
    color: color.textSecondary,
  },
  matchReason: {
    fontFamily: font.sans,
    fontSize: 12.5,
    lineHeight: 19,
    color: color.textSecondary,
    maxWidth: 280,
  },
  keptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: color.hairlineMin,
  },
  keptPhoto: {
    width: 60,
    height: 60,
    borderRadius: radius.md,
    backgroundColor: color.surface,
  },
  keptText: { flex: 1, gap: 5 },
  keptKicker: {
    fontFamily: font.sansMedium,
    fontSize: 9.5,
    letterSpacing: 2,
    color: color.gold,
  },
  keptTitle: { fontFamily: font.serifRegular, fontSize: 18, color: color.textPrimary },
  keptSub: {
    fontFamily: font.sans,
    fontSize: 11,
    color: color.textSecondary,
  },
  keptArrow: { fontFamily: font.sans, fontSize: 14, color: color.textTertiary },
  allMomentsButton: {
    marginTop: spacing.sm,
    padding: spacing.md + 3,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.hairlineMax,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  allMomentsButtonText: {
    fontFamily: font.sans,
    fontSize: 12,
    letterSpacing: 1.6,
    color: color.borderNeutral,
  },
  allMomentsButtonArrow: { fontFamily: font.sans, fontSize: 14, color: color.gold },
});
