import { useEffect, useMemo } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Kicker } from '../../components/curia';
import {
  CITIES,
  DISTRICTS,
  RATING_STATS,
  journeysByDistrict,
  loadVenuesForMetro,
  momentsByDistrict,
  useContentVersion,
  venuesByDistrict,
} from '../../lib/data/seed';
import { districtLiveliness } from '../../lib/map/geo';
import { haversineMiles, rankVenues, resolveContext } from '../../lib/scoring/rank-venues';
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
 *
 * `venuesByDistrict` reads straight from seed.ts's own VENUES, which only
 * ever holds DEFAULT_METROS (manchester+cheshire) until something actually
 * loads the rest (map.web.tsx's region switcher, or loadContentData()'s own
 * top-up of whichever specific venues Moments/Journeys reference — see that
 * file's doc comment). This screen is reachable for ANY real district,
 * including one in a metro nothing has loaded yet (a district pill on
 * Moments only needs one of that metro's venues loaded to appear, not the
 * whole roster) — found live 2026-09-23, same audit pass as the Moments/
 * Journeys metro-scoping fix: opening a London/Chicago district straight
 * from a Moments pill showed a quietly incomplete "TOP MATCHES" (whatever
 * subset happened to already be loaded), not the real, complete one. Kicks
 * off the same full-metro load map.web.tsx's region switcher does, so this
 * screen's ranking is always against the real, complete roster regardless
 * of how a member arrived here.
 */
export default function DistrictGuide() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const session = useSession();
  const contentVersion = useContentVersion();

  const district = DISTRICTS.find((d) => d.id === id);
  const metroName = CITIES.find((c) => c.id === district?.metro)?.name ?? '';

  useEffect(() => {
    if (district) loadVenuesForMetro(district.metro);
  }, [district]);

  const districtVenues = useMemo(
    () => (district ? venuesByDistrict(district.id) : []),
    // contentVersion: recompute once loadVenuesForMetro() above resolves and
    // adds this district's real venues, the same dependency map.web.tsx's
    // own VENUES-derived useMemos already include.
    [district, contentVersion]
  );
  const districtVenueIds = useMemo(() => new Set(districtVenues.map((v) => v.id)), [districtVenues]);

  const matchInput = useMemo(
    () =>
      district
        ? buildMatchmakingInputFromSession(session, {
            // This screen's "live now" bar means real current time always,
            // not whatever day/band the member may have planned for on Map
            // — deliberately not `session.context` here. `weather` borrows
            // `session.weather` anyway (close enough in practice, since that
            // only ever differs from "now" while a manual plan is active on
            // Map) rather than a second live fetch just for this screen —
            // same fix map.tsx/list.tsx needed for contextNoteFor to work.
            context: { now: true, weather: session.weather ?? undefined },
            location: { lat: district.lat, lon: district.lon },
            radiusMiles: 999,
          })
        : undefined,
    [session, district]
  );
  const resolved = matchInput ? resolveContext(matchInput.context) : undefined;
  const ranked = useMemo(
    () => (matchInput ? rankVenues(matchInput, districtVenues, DISTRICTS, RATING_STATS) : { ranked: [], empty: true }),
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
    ...moments.map((m) => {
      const pickCount = m.venueIds.filter((vid) => districtVenueIds.has(vid)).length;
      return {
        kicker: 'MOMENT',
        title: m.title,
        // Mirrors a Journey's "N STOPS" meta line above — no curator byline
        // here either, see moments.tsx's own doc comment for why.
        sub: `${pickCount} PICK${pickCount === 1 ? '' : 'S'}`,
        onTap: () => router.push({ pathname: '/(tabs)/moments', params: { district: district?.id } }),
      };
    }),
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
        {/* 2026-09, at explicit user request: "add a show map button on
            district page so the user can quickly hop back to the map view
            but centred on this district... at a walking distance no
            further than 7 minutes type range." Carries the district id as
            a route param map.tsx/map.web.tsx read once on mount, mirroring
            the existing `district` param Moments already reads the same
            way (see that screen's own doc comment). */}
        <Pressable
          onPress={() => router.push({ pathname: '/(tabs)/map', params: { focusDistrict: district.id } })}
          style={styles.mapButton}
        >
          <Text style={styles.mapButtonText}>MAP</Text>
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
          <Text style={styles.emptyNote}>Nothing kept here yet. Our editors are still working their way through {district.name}.</Text>
        )}
        {topMatches.map((r, idx) => {
          const venue = districtVenues.find((v) => v.id === r.venueId);
          if (!venue) return null;
          const distanceMiles = haversineMiles(session.searchOrigin, venue);
          const stats = RATING_STATS[venue.id];
          return (
            <Pressable key={venue.id} onPress={() => router.push(`/venue/${venue.id}`)} style={styles.matchRow}>
              <View style={styles.matchText}>
                <Text style={styles.matchRank}>NO. {idx + 1}</Text>
                <View style={styles.matchNameRow}>
                  <Text style={styles.matchName}>{venue.name}</Text>
                  {venue.status === 'coming-soon' && (
                    <View style={styles.newBadge}>
                      <Text style={styles.newBadgeText}>NEW</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.matchMeta}>
                  {venue.type} · {'£'.repeat(venue.spendLevel)} · {distanceMiles.toFixed(1)} MI
                  {stats ? ` · ★ ${stats.avg.toFixed(1)} (${stats.count})` : ''}
                </Text>
                <Text style={styles.matchReason}>{r.reason}</Text>
                {r.contextNote && <Text style={styles.matchContextNote}>{r.contextNote}</Text>}
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
            Nothing kept here yet. Our editors are still working their way through {district.name}.
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
  mapButton: {
    position: 'absolute',
    top: 56,
    right: spacing.lg,
    height: 38,
    paddingHorizontal: 16,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: color.hairlineMax,
    backgroundColor: 'rgba(19,17,16,.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapButtonText: {
    fontFamily: font.sansMedium,
    fontSize: 10,
    letterSpacing: 1.6,
    color: color.gold,
  },
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
  // Same "NO. N" gold-kicker convention as the map's venue popup
  // (buildVenuePopupElement in map.web.tsx) — an ordinal position, not a
  // raw score, so it's fine under CLAUDE.md's "never show a match score"
  // rule (Presentation layer section).
  matchRank: {
    fontFamily: font.sansRegular,
    fontSize: 9,
    letterSpacing: 1.8,
    color: color.gold,
  },
  matchNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  matchName: { fontFamily: font.serifRegular, fontSize: 21, color: color.textPrimary },
  newBadge: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(192,160,98,.6)',
    backgroundColor: 'rgba(192,160,98,.14)',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
  },
  newBadgeText: {
    fontFamily: font.sansMedium,
    fontSize: 9,
    letterSpacing: 1.5,
    color: color.goldLight,
  },
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
  matchContextNote: {
    fontFamily: font.sans,
    fontSize: 12,
    lineHeight: 16,
    color: color.gold,
    marginTop: 4,
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
