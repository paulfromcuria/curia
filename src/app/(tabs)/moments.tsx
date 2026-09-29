import { Fragment, useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card, Kicker } from '../../components/curia';
import { DISTRICTS, JOURNEYS, MOMENTS, VENUES, journeyDistricts, journeyHasClosedStop } from '../../lib/data/seed';
import { placeholderPhotoFor } from '../../lib/data/placeholder-photos';
import { haversineMiles, isVenueClosed } from '../../lib/scoring/rank-venues';
import { useSession } from '../../lib/state/session';
import type { Journey, MomentType } from '../../types/models';
import { color, font, radius, spacing } from '../../theme';

type SeedVenue = (typeof VENUES)[number];
type SeedDistrict = (typeof DISTRICTS)[number];

/**
 * A moment's venue pick, rendered as a photo-topped card (2026-09-29, at
 * explicit user request — "redo the UX on moments and journeys to be
 * imagery led," brainstormed against a competitor's rail-of-photos
 * pattern but built in Curia's own voice, not copied). Reuses the exact
 * photo treatment already shipped on List's ranked rows
 * (src/app/(tabs)/list.tsx's photo/photoImage) rather than inventing a
 * third card style — same placeholderPhotoFor fallback, same rounded
 * photo, just sized for a horizontal rail instead of a vertical stack.
 * Replaces the old text-only chip (name + type, no photo) that stood
 * here before. `venue.description`, when a venue has real curated copy,
 * shows the same way `reasonFor()` already surfaces it elsewhere — never
 * a second, separate reasoning block (Presentation layer rule,
 * CLAUDE.md), just the venue's own line.
 *
 * District name is now printed on every card, not just a once-per-group
 * subheading (2026-09-29, at explicit user request, the same pass that
 * replaced exact-district filtering with an area-radius one below) —
 * once a rail can span several real districts at once, a subheading
 * above the whole rail stops being able to say which district any one
 * card is actually in.
 */
function MomentVenueCard({
  venue,
  district,
  onPress,
}: {
  venue: SeedVenue;
  district: SeedDistrict | undefined;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.venueCard}>
      <View style={styles.venuePhotoWrap}>
        <Image
          source={{ uri: venue.photos[0] ?? placeholderPhotoFor(venue.type, venue.id) }}
          style={styles.venuePhoto}
          resizeMode="cover"
        />
        <View style={styles.venuePriceBadge}>
          <Text style={styles.venuePriceBadgeText}>{'£'.repeat(venue.spendLevel)}</Text>
        </View>
      </View>
      <Text style={styles.venueChipName} numberOfLines={1}>
        {venue.name}
      </Text>
      <Text style={styles.venueChipType} numberOfLines={1}>
        {district ? `${district.name} · ` : ''}
        {venue.type}
      </Text>
      {venue.description ? (
        <Text style={styles.venueChipReason} numberOfLines={2}>
          {venue.description}
        </Text>
      ) : null}
    </Pressable>
  );
}

/**
 * A journey's real stops, in sequence, connected by the journey's own
 * real walk times — the "imagery-led" pass's second half (2026-09-29):
 * Journeys previously showed zero imagery at all (meta/title/blurb only).
 * Deliberately not the same big single-photo treatment MomentVenueCard
 * uses — a Journey is a sequence, not one venue, so this previews the
 * *shape* of the evening (small stop thumbnails + walk time between each)
 * rather than picking one stop to stand in for the whole thing. Stops
 * stay non-interactive (a plain View, not a Pressable) so the journey
 * card keeps the one-tap-target contract this file's own top comment
 * documents ("a journey card's whole surface does navigate") — tapping
 * anywhere, stop photos included, opens the journey, not a venue.
 */
function JourneyStopFilmstrip({ journey }: { journey: Journey }) {
  const stops = journey.stops
    .slice()
    .sort((a, b) => a.order - b.order)
    .flatMap((s) => {
      const venue = VENUES.find((v) => v.id === s.venueId);
      return venue ? [{ venue, walkToNextMinutes: s.walkTimeToNextMinutes }] : [];
    });
  if (stops.length === 0) return null;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.stopRow}>
      {stops.map((s, i) => (
        <Fragment key={s.venue.id}>
          <View style={styles.stopCard}>
            <View style={styles.stopPhotoWrap}>
              <Image
                source={{ uri: s.venue.photos[0] ?? placeholderPhotoFor(s.venue.type, s.venue.id) }}
                style={styles.stopPhoto}
                resizeMode="cover"
              />
              <View style={styles.stopIndexBadge}>
                <Text style={styles.stopIndexText}>{i + 1}</Text>
              </View>
            </View>
            <Text style={styles.stopName} numberOfLines={2}>
              {s.venue.name}
            </Text>
          </View>
          {s.walkToNextMinutes != null && (
            <View style={styles.stopWalk}>
              <Text style={styles.stopWalkArrow}>→</Text>
              <Text style={styles.stopWalkText}>{s.walkToNextMinutes} min</Text>
            </View>
          )}
        </Fragment>
      ))}
    </ScrollView>
  );
}

/** A list of full Journey cards, each linking to journey/[id] — the whole
 * content of the Journeys view below. */
function JourneyCards({ journeys }: { journeys: Journey[] }) {
  const router = useRouter();
  return (
    <View style={styles.journeyList}>
      {journeys.map((j) => (
        <Pressable key={j.id} onPress={() => router.push(`/journey/${j.id}`)}>
          <Card style={styles.journeyCard}>
            <Text style={styles.journeyMeta}>{j.meta}</Text>
            <Text style={styles.journeyTitle}>{j.title}</Text>
            {j.blurb && <Text style={styles.journeyBlurb}>{j.blurb}</Text>}
            <JourneyStopFilmstrip journey={j} />
          </Card>
        </Pressable>
      ))}
    </View>
  );
}

/**
 * Real Moments tab (M6). See the design source's own `isMoments` block
 * (Curia.dc.html) for ground truth on navigation: a moment card itself is
 * never a single tap target there — `l.venues[].onTap` opens venue detail
 * per-venue (`this.openVenue(nm)`), while a *journey* card's whole surface
 * does navigate, to Journey detail (`j.onTap = () => this.go('journey', ...)`).
 * So here: each of the 4 real Moments renders its blurb (real seed copy)
 * plus its actual venue picks as individually-tappable chips -> venue/[id];
 * Journeys render as full cards -> journey/[id].
 *
 * 2026-09 update, at explicit user request ("the moments should have a
 * district filter and should probably be organized in districts too"): the
 * prototype's own real Moments tab was always organised by *district*
 * (nearest-first, with per-district chips), not by moment type — previously
 * flagged here as a bigger restructure than the original M6 milestone
 * asked for. That gap is closed now, without abandoning the moment-first
 * structure entirely (moments stay the real, fixed 4 types — CLAUDE.md's
 * "do not add without a product decision").
 *
 * 2026-09-29 update, at explicit user request ("loosen the criteria for
 * being good for a date night when filtered by district... nudge user
 * behaviour towards using a search radius, and instead of choosing
 * specific districts, let them filter by area instead"): the pill row
 * used to filter to an EXACT district id match, which read fine for a
 * dense district but went thin or duplicate-looking for a small one — a
 * real report: filtering Date Night to Knutsford surfaced exactly one
 * pick, LI-LY, and it was *also* the only Entertaining a Client pick, so
 * the same photo showed twice in a row. Tapping a pill now sets an AREA
 * CENTER (`district` — the param name stays, District Guide's "ALL
 * MOMENTS IN {DISTRICT}" link is unchanged) rather than an exact filter;
 * a second pill row (`areaRadiusMiles`, shown once a center is picked)
 * sets how far around it counts, same haversineMiles-from-a-point model
 * List's own radius slider already uses, just a fixed small preset row
 * here rather than a full drag slider. Because an area can now
 * genuinely span several real districts at once, a once-per-group
 * subheading can no longer say which district a given card is in —
 * every `MomentVenueCard` now prints its own district name instead (see
 * that component's doc comment), and the old subheading-grouping
 * (`groupVenuesByDistrict`) is gone; every rail is flat.
 *
 * 2026-09-14/15 updates, at explicit user request: the curator byline ("BY
 * ELENA M.") is hidden here and in District Guide's "Kept by our editors"
 * list — `Moment.curator` stays in the data model/admin so a real one can
 * be set later, it's just not rendered to members; these were recycled
 * placeholder initials from the design prototype, not a real, named
 * curator.
 *
 * Journeys and Moments are two fully separate views, switched by the
 * `view` toggle below. First attempt ("journeys are buried at the
 * bottom") interleaved a Moment's journeys directly under it; second
 * attempt nested them by district within that ("the journeys feel
 * randomly interjected"). Neither landed ("still shit... they should be
 * separated") — mixing journey cards into a Moment's own venue chips, no
 * matter how it was grouped, always read as one content type interrupting
 * another. Splitting them into MOMENTS and JOURNEYS (a flat list of full
 * Journey cards, nearest district first — a journey's own meta line
 * already states its district) settles that: neither view ever
 * interrupts the other. The same area pill rows now filter whichever of
 * the two is active.
 *
 * An optional `moment` param (a `MomentType`) narrows the Moments view to
 * that one moment's section only — added so Venue detail's "GOOD FOR"
 * chips (a venue can be a pick in more than one Moment) can deep-link
 * straight to the relevant section instead of dumping the visitor into
 * every moment active nearby. It has no effect on the Journeys view.
 * Selecting "EVERYWHERE" clears `district`/`areaRadiusMiles`, preserving
 * `moment` and `view` if set — the params narrow independently.
 */
export default function Moments() {
  const router = useRouter();
  const session = useSession();
  const {
    district: districtId,
    moment: momentType,
    view: viewParam,
  } = useLocalSearchParams<{ district?: string; moment?: MomentType; view?: string }>();

  const view: 'moments' | 'journeys' = viewParam === 'journeys' ? 'journeys' : 'moments';
  const district = districtId ? DISTRICTS.find((d) => d.id === districtId) : undefined;

  // Area radius (2026-09-29) — see the file's own doc comment above for
  // the real report this replaces exact-district matching for. Only has
  // an effect once `district` (the area's center) is set; local state,
  // not session.radiusMiles — this is a separate, editorial-browse
  // concept from List/Map's shared "what am I ranking against" radius,
  // same way the rest of this screen has always been independent of
  // List/Map's own filtering.
  const [areaRadiusMiles, setAreaRadiusMiles] = useState(6);
  const AREA_RADIUS_PRESETS = [3, 6, 12, 25];

  // Area-center pill row (2026-09, extended 2026-09-29 from an exact
  // filter to an area center). Previously a district could only be set by
  // deep-linking in from District Guide's "ALL MOMENTS IN {DISTRICT}"
  // button — this makes the same `district` param pickable directly here.
  // Scoped to districts that actually have something to show (a moment
  // pick or a journey stop), ordered nearest-to-the-user-first, same as
  // List's district-browse mode.
  const filterableDistricts = useMemo(() => {
    const ids = new Set<string>();
    MOMENTS.forEach((m) =>
      m.venueIds.forEach((id) => {
        const v = VENUES.find((vv) => vv.id === id);
        if (v && !isVenueClosed(v)) ids.add(v.districtId);
      })
    );
    JOURNEYS.filter((j) => !journeyHasClosedStop(j)).forEach((j) =>
      journeyDistricts(j).forEach((d) => ids.add(d.id))
    );
    return DISTRICTS.filter((d) => ids.has(d.id)).sort(
      (a, b) => haversineMiles(session.searchOrigin, a) - haversineMiles(session.searchOrigin, b)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.searchOrigin]);

  function goToDistrict(id: string | undefined) {
    router.replace({
      pathname: '/(tabs)/moments',
      params: {
        ...(momentType ? { moment: momentType } : {}),
        ...(view === 'journeys' ? { view } : {}),
        ...(id ? { district: id } : {}),
      },
    });
  }

  function setView(v: 'moments' | 'journeys') {
    router.replace({
      pathname: '/(tabs)/moments',
      params: {
        ...(momentType ? { moment: momentType } : {}),
        ...(districtId ? { district: districtId } : {}),
        ...(v === 'journeys' ? { view: v } : {}),
      },
    });
  }

  // Within-area check, real distance from the venue's own coordinates to
  // the chosen center (not routed through the venue's own district's
  // centroid — more accurate, and the only way a venue whose own district
  // isn't itself in range can still show up because it's genuinely close
  // to the chosen center).
  function withinArea(point: { lat: number; lon: number }): boolean {
    return !district || haversineMiles(district, point) <= areaRadiusMiles;
  }

  const momentSections = useMemo(
    () =>
      MOMENTS.filter((m) => !momentType || m.type === momentType)
        .map((m) => {
          const venues = m.venueIds
            .map((id) => VENUES.find((v) => v.id === id))
            .filter((v): v is NonNullable<typeof v> => !!v && !isVenueClosed(v))
            .filter((v) => withinArea(v));
          return { moment: m, venues };
        })
        .filter((sec) => sec.venues.length > 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [district, areaRadiusMiles, momentType]
  );

  // Nearest-district-first, same reading as filterableDistricts — a
  // journey's own meta line already states its district, so (unlike
  // Moments) no per-card district label is needed here.
  const journeys = useMemo(() => {
    const filtered = JOURNEYS.filter(
      (j) => !journeyHasClosedStop(j) && (!district || j.stops.some((s) => {
        const v = VENUES.find((vv) => vv.id === s.venueId);
        return v && withinArea(v);
      }))
    );
    const nearest = (j: Journey) =>
      Math.min(...journeyDistricts(j).map((d) => haversineMiles(session.searchOrigin, d)));
    return [...filtered].sort((a, b) => nearest(a) - nearest(b));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [district, areaRadiusMiles, session.searchOrigin]);

  const nothingHere =
    district !== undefined && (view === 'moments' ? momentSections.length === 0 : journeys.length === 0);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Kicker>Moments &amp; journeys</Kicker>
      <Text style={styles.headline}>Chosen by people, not by your history.</Text>
      <Text style={styles.tagline}>
        Our editors keep these. They ignore your preferences on purpose. Sometimes the occasion
        decides, not the algorithm.
      </Text>

      <View style={styles.viewToggleRow}>
        <Pressable
          onPress={() => setView('moments')}
          style={[styles.viewToggle, view === 'moments' && styles.viewToggleActive]}
        >
          <Text style={[styles.viewToggleText, view === 'moments' && styles.viewToggleTextActive]}>
            MOMENTS
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setView('journeys')}
          style={[styles.viewToggle, view === 'journeys' && styles.viewToggleActive]}
        >
          <Text style={[styles.viewToggleText, view === 'journeys' && styles.viewToggleTextActive]}>
            JOURNEYS
          </Text>
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.districtFilterRow}
      >
        <Pressable
          onPress={() => goToDistrict(undefined)}
          style={[styles.districtPill, !district && styles.districtPillActive]}
        >
          <Text style={[styles.districtPillText, !district && styles.districtPillTextActive]}>
            EVERYWHERE
          </Text>
        </Pressable>
        {filterableDistricts.map((d) => (
          <Pressable
            key={d.id}
            onPress={() => goToDistrict(d.id)}
            style={[styles.districtPill, district?.id === d.id && styles.districtPillActive]}
          >
            <Text
              style={[styles.districtPillText, district?.id === d.id && styles.districtPillTextActive]}
            >
              {d.name}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {district && (
        <View style={styles.radiusRow}>
          <Text style={styles.radiusLabel}>WITHIN</Text>
          {AREA_RADIUS_PRESETS.map((mi) => (
            <Pressable
              key={mi}
              onPress={() => setAreaRadiusMiles(mi)}
              style={[styles.districtPill, areaRadiusMiles === mi && styles.districtPillActive]}
            >
              <Text
                style={[styles.districtPillText, areaRadiusMiles === mi && styles.districtPillTextActive]}
              >
                {mi} MI
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {nothingHere && (
        <Card tone="inset" style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>Nothing within {areaRadiusMiles} mi of {district?.name} yet.</Text>
          <Text style={styles.emptyBody}>
            Widen the radius above, or our editors are working through Cheshire this season.
          </Text>
        </Card>
      )}

      {view === 'moments'
        ? momentSections.map(({ moment, venues }) => (
            <View key={moment.id} style={styles.section}>
              <Text style={styles.title}>{moment.title}</Text>
              <Text style={styles.blurb}>{moment.blurb}</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipRow}
              >
                {venues.map((v) => (
                  <MomentVenueCard
                    key={v.id}
                    venue={v}
                    district={DISTRICTS.find((d) => d.id === v.districtId)}
                    onPress={() => router.push(`/venue/${v.id}`)}
                  />
                ))}
              </ScrollView>
            </View>
          ))
        : journeys.length > 0 && <JourneyCards journeys={journeys} />}
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
  viewToggleRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  viewToggle: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.hairlineMax,
    alignItems: 'center',
  },
  viewToggleActive: {
    borderColor: 'rgba(192,160,98,.55)',
    backgroundColor: 'rgba(192,160,98,.14)',
  },
  viewToggleText: {
    fontFamily: font.sansMedium,
    fontSize: 11,
    letterSpacing: 2,
    color: color.textSecondary,
  },
  viewToggleTextActive: {
    color: color.goldLight,
  },
  districtFilterRow: {
    gap: spacing.sm,
    paddingBottom: 2,
  },
  // Area radius row (2026-09-29) — same pill visuals as the district row
  // above, reused rather than a new style, only shown once an area
  // center (`district`) is picked. See the file's own top doc comment.
  radiusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: -spacing.sm,
  },
  radiusLabel: {
    fontFamily: font.sansMedium,
    fontSize: 10,
    letterSpacing: 1.6,
    color: color.textTertiary,
  },
  districtPill: {
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.hairlineMax,
  },
  districtPillActive: {
    borderColor: 'rgba(192,160,98,.55)',
    backgroundColor: 'rgba(192,160,98,.14)',
  },
  districtPillText: {
    fontFamily: font.sansMedium,
    fontSize: 10.5,
    letterSpacing: 1.6,
    color: color.textSecondary,
  },
  districtPillTextActive: {
    color: color.goldLight,
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
  // Option B from the imagery-led brainstorm (2026-09-29) — the scale that
  // won out: same photo/rounded-corner treatment as List's ranked rows,
  // shrunk to fit a rail instead of a vertical stack. See
  // MomentVenueCard's own doc comment for the full reasoning.
  venueCard: {
    width: 190,
    gap: 6,
  },
  venuePhotoWrap: {
    width: 190,
    height: 136,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: color.surface,
  },
  venuePhoto: {
    ...StyleSheet.absoluteFill,
  },
  venuePriceBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(12,10,9,.72)',
  },
  venuePriceBadgeText: {
    fontFamily: font.sans,
    fontSize: 9,
    letterSpacing: 1,
    color: color.goldLight,
  },
  venueChipName: {
    fontFamily: font.serifRegular,
    fontSize: 17,
    color: color.textPrimary,
    marginTop: 2,
  },
  venueChipType: {
    fontFamily: font.sans,
    fontSize: 9.5,
    letterSpacing: 1.3,
    textTransform: 'uppercase',
    color: color.textSecondary,
  },
  venueChipReason: {
    fontFamily: font.sans,
    fontSize: 11,
    lineHeight: 15,
    color: color.textSecondary,
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
  // Journeys' own imagery pass (2026-09-29) — see JourneyStopFilmstrip's
  // doc comment for why this stays small and non-interactive rather than
  // reusing venueCard's bigger, tappable treatment.
  stopRow: {
    marginTop: 10,
    alignItems: 'flex-start',
  },
  stopCard: {
    width: 72,
  },
  stopPhotoWrap: {
    width: 72,
    height: 72,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: color.surface,
  },
  stopPhoto: {
    ...StyleSheet.absoluteFill,
  },
  stopIndexBadge: {
    position: 'absolute',
    top: 5,
    left: 5,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(12,10,9,.72)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopIndexText: {
    fontFamily: font.sansMedium,
    fontSize: 8,
    color: color.goldLight,
  },
  stopName: {
    fontFamily: font.serifRegular,
    fontSize: 11.5,
    lineHeight: 13,
    color: color.textPrimary,
    marginTop: 5,
  },
  stopWalk: {
    width: 34,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 26,
  },
  stopWalkArrow: {
    fontFamily: font.sans,
    fontSize: 11,
    color: color.gold,
  },
  stopWalkText: {
    fontFamily: font.sans,
    fontSize: 8,
    color: color.textTertiary,
    marginTop: 1,
  },
});
