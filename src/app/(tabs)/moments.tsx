import { useMemo } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card, Kicker } from '../../components/curia';
import { DISTRICTS, JOURNEYS, MOMENTS, VENUES, journeyDistricts } from '../../lib/data/seed';
import { color, font, radius, spacing } from '../../theme';

/**
 * Real Moments tab (M6). See the design source's own `isMoments` block
 * (Curia.dc.html) for ground truth on navigation: a moment card itself is
 * never a single tap target there — `l.venues[].onTap` opens venue detail
 * per-venue (`this.openVenue(nm)`), while a *journey* card's whole surface
 * does navigate, to Journey detail (`j.onTap = () => this.go('journey', ...)`).
 * So here: each of the 4 real Moments renders its curator byline + blurb
 * (real seed copy) plus its actual venue picks as individually-tappable
 * chips -> venue/[id]; the 2 real Journeys render as full cards -> journey/[id].
 *
 * The prototype's real Moments tab is actually organised by *district*
 * (nearest-first, with per-district chips), not by moment type — a bigger
 * restructure (it needs a live "distance from me" sort across all 10
 * districts) than this milestone's brief asks for ("the 4 real moments as
 * curated cards"). This screen keeps the moment-first structure the brief
 * describes, but honours the prototype's real district-scoping mechanism
 * for the one path that needs it: District guide's "ALL MOMENTS IN
 * {DISTRICT}" button links back here with a `district` param, which filters
 * each moment's venue chips and the journey list down to that district only
 * (mirroring the prototype's own `momentDistrict` filter/"SHOW EVERYWHERE"
 * pattern), rather than duplicating a browsable moment-detail screen.
 */
export default function Moments() {
  const router = useRouter();
  const { district: districtId } = useLocalSearchParams<{ district?: string }>();

  const district = districtId ? DISTRICTS.find((d) => d.id === districtId) : undefined;

  const momentSections = useMemo(
    () =>
      MOMENTS.map((m) => {
        const venues = m.venueIds
          .map((id) => VENUES.find((v) => v.id === id))
          .filter((v): v is NonNullable<typeof v> => !!v)
          .filter((v) => !district || v.districtId === district.id);
        return { moment: m, venues };
      }).filter((sec) => sec.venues.length > 0),
    [district]
  );

  const journeys = useMemo(
    () => JOURNEYS.filter((j) => !district || journeyDistricts(j).some((d) => d.id === district.id)),
    [district]
  );

  const nothingHere = district !== undefined && momentSections.length === 0 && journeys.length === 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Kicker>Moments &amp; journeys</Kicker>
      <Text style={styles.headline}>Chosen by people, not by your history.</Text>
      <Text style={styles.tagline}>
        Our editors keep these. They ignore your preferences on purpose — sometimes the occasion
        decides, not the algorithm.
      </Text>

      {district && (
        <Pressable onPress={() => router.replace('/(tabs)/moments')} style={styles.filterPill}>
          <Text style={styles.filterPillText}>IN {district.name.toUpperCase()}</Text>
          <Text style={styles.filterPillClear}>SHOW EVERYWHERE</Text>
        </Pressable>
      )}

      {nothingHere && (
        <Card tone="inset" style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>Our editors have not been to {district?.name} yet.</Text>
          <Text style={styles.emptyBody}>
            They are working through Cheshire this season. In the meantime, everything else is a
            short drive.
          </Text>
        </Card>
      )}

      {momentSections.map(({ moment, venues }) => (
        <View key={moment.id} style={styles.section}>
          <Text style={styles.title}>{moment.title}</Text>
          <Text style={styles.curator}>BY {moment.curator}</Text>
          <Text style={styles.blurb}>{moment.blurb}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {venues.map((v) => (
              <Pressable key={v.id} onPress={() => router.push(`/venue/${v.id}`)} style={styles.venueChip}>
                <Text style={styles.venueChipName} numberOfLines={1}>
                  {v.name}
                </Text>
                <Text style={styles.venueChipType} numberOfLines={1}>
                  {v.type}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ))}

      {journeys.length > 0 && (
        <View style={styles.section}>
          <Kicker style={styles.journeysKicker}>Journeys</Kicker>
          <View style={styles.journeyList}>
            {journeys.map((j) => (
              <Pressable key={j.id} onPress={() => router.push(`/journey/${j.id}`)}>
                <Card style={styles.journeyCard}>
                  <Text style={styles.journeyMeta}>{j.meta}</Text>
                  <Text style={styles.journeyTitle}>{j.title}</Text>
                  {j.blurb && <Text style={styles.journeyBlurb}>{j.blurb}</Text>}
                </Card>
              </Pressable>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: color.baseVariants.c,
  },
  content: {
    padding: spacing.lg,
    paddingTop: spacing.xxl,
    gap: spacing.md,
  },
  headline: {
    fontFamily: font.serif,
    fontSize: 30,
    color: color.textPrimary,
    marginTop: spacing.sm,
    maxWidth: 280,
  },
  tagline: {
    fontFamily: font.sans,
    fontSize: 13,
    lineHeight: 20,
    color: color.textSecondary,
    maxWidth: 300,
  },
  filterPill: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(192,160,98,.4)',
    backgroundColor: 'rgba(192,160,98,.09)',
  },
  filterPillText: {
    fontFamily: font.sansMedium,
    fontSize: 10.5,
    letterSpacing: 1.6,
    color: color.goldLight,
  },
  filterPillClear: {
    fontFamily: font.sans,
    fontSize: 10,
    letterSpacing: 1.2,
    color: color.gold,
  },
  emptyCard: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  emptyTitle: {
    fontFamily: font.serif,
    fontSize: 19,
    color: color.textPrimary,
    textAlign: 'center',
  },
  emptyBody: {
    fontFamily: font.sans,
    fontSize: 12.5,
    lineHeight: 19,
    color: color.textSecondary,
    textAlign: 'center',
  },
  section: {
    gap: 6,
    marginTop: spacing.sm,
  },
  title: {
    fontFamily: font.serif,
    fontSize: 24,
    color: color.textPrimary,
  },
  curator: {
    fontFamily: font.sansMedium,
    fontSize: 9.5,
    letterSpacing: 2,
    color: color.gold,
  },
  blurb: {
    fontFamily: font.sans,
    fontSize: 12.5,
    lineHeight: 19,
    color: color.textSecondary,
    maxWidth: 320,
  },
  chipRow: {
    gap: spacing.sm,
    paddingTop: spacing.sm,
    paddingBottom: 2,
  },
  venueChip: {
    minWidth: 150,
    maxWidth: 200,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.hairlineMax,
    backgroundColor: color.surface,
    gap: 4,
  },
  venueChipName: {
    fontFamily: font.serifRegular,
    fontSize: 16,
    color: color.textPrimary,
  },
  venueChipType: {
    fontFamily: font.sans,
    fontSize: 9.5,
    letterSpacing: 1.2,
    color: color.textSecondary,
  },
  journeysKicker: {
    marginBottom: spacing.xs,
  },
  journeyList: {
    gap: spacing.sm,
  },
  journeyCard: {
    gap: 6,
  },
  journeyMeta: {
    fontFamily: font.sansMedium,
    fontSize: 9.5,
    letterSpacing: 2,
    color: color.gold,
  },
  journeyTitle: {
    fontFamily: font.serifRegular,
    fontSize: 22,
    color: color.textPrimary,
  },
  journeyBlurb: {
    fontFamily: font.sans,
    fontSize: 12.5,
    lineHeight: 19,
    color: color.textSecondary,
  },
});
