import { Fragment, useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card, formatRadiusMiles, Kicker, RadiusSlider } from '../../components/curia';
import { DISTRICTS, JOURNEYS, MOMENTS, VENUES, journeyDistricts, journeyHasClosedStop } from '../../lib/data/seed';
import { placeholderPhotoFor } from '../../lib/data/placeholder-photos';
import { centroid, MAX_RADIUS_MILES, metroForPoint, MIN_RADIUS_MILES } from '../../lib/map/geo';
import { haversineMiles, isVenueClosed } from '../../lib/scoring/rank-venues';
import {
  BIG_EVENT_BUMP_LOOKAHEAD_HOURS,
  BIG_EVENT_DURATION_HOURS,
  BIG_EVENT_SHOW_LOOKAHEAD_HOURS,
  describeFixtureTiming,
  fetchNextBigEventFixture,
  fetchNextFootballFixture,
  type Fixture,
  FOOTBALL_BUMP_LOOKAHEAD_HOURS,
  FOOTBALL_DURATION_HOURS,
  FOOTBALL_SHOW_LOOKAHEAD_HOURS,
  isWithinFixtureWindow,
} from '../../lib/sports/fixtures';
import { useSession } from '../../lib/state/session';
import { fetchExtremeWeatherOutlook, isExtremeWeather } from '../../lib/weather/forecast';
import { DEMO_LOCATION } from '../../lib/scoring/session-input';
import type { Journey, MetroId, MomentCategory, MomentType } from '../../types/models';
import { MOMENT_CATEGORIES } from '../../types/models';
import { color, font, radius, spacing } from '../../theme';

/**
 * Real regions to browse by (2026-09-29, replacing the area-radius-from-a-
 * tapped-district model above with a real region concept — see the file's
 * own doc comment for the direct user report this fixes: an unscoped
 * "EVERYWHERE" mixed in venues from every metro at once with nothing
 * saying so — Chicago's Hyde Park/Kenwood showed up looking like local
 * Cheshire picks). Manchester+Cheshire stay one combined "home" region,
 * matching every other browsing surface in the app (DEFAULT_METROS,
 * the old district pill row) — they were never distinguished from each
 * other anywhere else, so splitting them apart only here would be new
 * inconsistency, not a fix.
 */
const REGIONS: { id: string; label: string; metros: MetroId[] }[] = [
  { id: 'home', label: 'Manchester & Cheshire', metros: ['manchester', 'cheshire'] },
  { id: 'london', label: 'London', metros: ['london'] },
  { id: 'chicago', label: 'Chicago', metros: ['chicago'] },
  { id: 'riyadh', label: 'Riyadh', metros: ['riyadh'] },
];

/** Local, home-region default — generous enough to comfortably span a real
 * cluster (Alderley Edge/Wilmslow/Mobberley/Hale/Knutsford are all within
 * this of each other) without needing to touch the slider on a first
 * visit. A non-home region defaults to MAX_RADIUS_MILES instead (see
 * `setRegion` below) — "distance from yourself" has no real meaning once
 * yourself is a different city, so that case defaults to showing the
 * whole region rather than a number of miles that would exclude
 * everything.
 */
const DEFAULT_HOME_RADIUS_MILES = 8;

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
 * 2026-09-29 update #1, at explicit user request ("loosen the criteria
 * for being good for a date night when filtered by district... nudge
 * user behaviour towards using a search radius, and instead of choosing
 * specific districts, let them filter by area instead"): the pill row
 * used to filter to an EXACT district id match, which read fine for a
 * dense district but went thin or duplicate-looking for a small one — a
 * real report: filtering Date Night to Knutsford surfaced exactly one
 * pick, LI-LY, and it was *also* the only Entertaining a Client pick, so
 * the same photo showed twice in a row. Because a rail can now span
 * several real districts at once, a once-per-group subheading can no
 * longer say which district a given card is in — every `MomentVenueCard`
 * now prints its own district name instead (see that component's doc
 * comment), and the old subheading-grouping (`groupVenuesByDistrict`) is
 * gone; every rail is flat.
 *
 * 2026-09-29 update #2, direct follow-up user report ("i shouldnt be
 * seeing london businesses but i am"): update #1's own first cut let a
 * tapped district set a bare radius-from-that-point with no metro
 * boundary at all — harmless near home, but the *default*, unfiltered
 * "EVERYWHERE" state mixed every real metro into one flat rail with
 * nothing distinguishing them (Chicago's Hyde Park/Kenwood read as local
 * Cheshire picks). Proposed and built the way the user asked for it: a
 * real three-level filter — REGION first (`REGIONS` above, a hard
 * pre-filter on `venue.metro`, always resolved to a real region, never
 * "every metro at once"), a `RadiusSlider` measuring real distance from
 * yourself *within* that region, and a small secondary district row to
 * narrow to one exact district when you want precision over breadth.
 * `district` (still the same param District Guide's "ALL MOMENTS IN
 * {DISTRICT}" link sets) is now that exact override again, not an area
 * center — when set, it ignores the radius entirely. The slider's
 * reference point is real device location while the selected region is
 * genuinely the one the member is standing in; otherwise it's that
 * region's own centroid ("distance from yourself" has no meaning once
 * yourself is a different city) — see `setRegion`'s own comment for why
 * the default radius also depends on which of those two is true.
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
 * An optional `category` param (a `MomentCategory`, added 2026-09-30 when
 * Moments widened from 4 to 17 types) narrows to one category's sections;
 * with neither `moment` nor `category` set, every category renders as its
 * own labeled group, in `orderedMomentCategories` order — `MOMENT_CATEGORIES`'
 * own fixed order, unless genuinely extreme weather bumps Weather-Led to
 * the front (see that memo's own doc comment) — the natural continuation
 * of the old "just show all 4" behavior at 17-type scale, not a new
 * paradigm. `region`/`district`/`view`/`moment`/`category` all narrow
 * independently.
 */
export default function Moments() {
  const router = useRouter();
  const session = useSession();
  const {
    region: regionParam,
    district: districtId,
    moment: momentType,
    category: categoryParam,
    view: viewParam,
  } = useLocalSearchParams<{
    region?: string;
    district?: string;
    moment?: MomentType;
    category?: MomentCategory;
    view?: string;
  }>();

  const view: 'moments' | 'journeys' = viewParam === 'journeys' ? 'journeys' : 'moments';

  // Every real district with at least one moment pick or journey stop —
  // same discipline the old filterableDistricts used, now the basis for
  // both which regions are worth offering and which districts populate
  // the small district row within whichever region is selected.
  const districtsWithContent = useMemo(() => {
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
    return DISTRICTS.filter((d) => ids.has(d.id));
  }, []);

  const availableRegions = useMemo(
    () => REGIONS.filter((r) => districtsWithContent.some((d) => r.metros.includes(d.metro))),
    [districtsWithContent]
  );

  // Real metro the member is actually standing in, where resolvable —
  // session.location first (real device GPS), session.searchOrigin
  // otherwise (the shared "what am I browsing" point — see CLAUDE.md's
  // Presentation layer section for why these two are deliberately not
  // the same field). Decides both the default region on first load and
  // whether the radius slider below measures from a real self or a
  // region's own centroid.
  const homeMetro = metroForPoint(session.location ?? session.searchOrigin);
  const defaultRegionId =
    (homeMetro && REGIONS.find((r) => r.metros.includes(homeMetro))?.id) ?? availableRegions[0]?.id ?? 'home';
  const regionId = regionParam ?? defaultRegionId;
  const selectedRegion = REGIONS.find((r) => r.id === regionId) ?? REGIONS[0];

  const regionDistricts = useMemo(
    () => DISTRICTS.filter((d) => selectedRegion.metros.includes(d.metro)),
    [selectedRegion]
  );
  const isHomeRegion = !!homeMetro && selectedRegion.metros.includes(homeMetro);
  const referencePoint = isHomeRegion ? (session.location ?? session.searchOrigin) : centroid(regionDistricts);

  // The small, secondary "narrow to one district" row — scoped to
  // whichever region is currently selected, nearest-first.
  const districtChoices = useMemo(
    () =>
      regionDistricts
        .filter((d) => districtsWithContent.some((dc) => dc.id === d.id))
        .sort((a, b) => haversineMiles(session.searchOrigin, a) - haversineMiles(session.searchOrigin, b)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [regionDistricts, districtsWithContent]
  );

  const district = districtId ? DISTRICTS.find((d) => d.id === districtId) : undefined;

  // Radius (2026-09-29) — local state, not session.radiusMiles; a
  // separate, editorial-browse concept from Map/List's shared ranking
  // radius, same as the rest of this screen has always been independent
  // of them. See DEFAULT_HOME_RADIUS_MILES's own doc comment for the
  // home-vs-other-region default split.
  const [radiusMiles, setRadiusMiles] = useState(() => (isHomeRegion ? DEFAULT_HOME_RADIUS_MILES : MAX_RADIUS_MILES));

  function setRegion(id: string) {
    router.replace({
      pathname: '/(tabs)/moments',
      params: {
        ...(momentType ? { moment: momentType } : {}),
        ...(categoryParam ? { category: categoryParam } : {}),
        ...(view === 'journeys' ? { view } : {}),
        region: id,
        // district deliberately dropped — a district from the old region
        // would be meaningless (or, worse, coincidentally real but wrong)
        // once the region itself has changed.
      },
    });
    const r = REGIONS.find((rr) => rr.id === id);
    const home = !!homeMetro && !!r?.metros.includes(homeMetro);
    setRadiusMiles(home ? DEFAULT_HOME_RADIUS_MILES : MAX_RADIUS_MILES);
  }

  function setExactDistrict(id: string | undefined) {
    router.replace({
      pathname: '/(tabs)/moments',
      params: {
        ...(momentType ? { moment: momentType } : {}),
        ...(categoryParam ? { category: categoryParam } : {}),
        ...(view === 'journeys' ? { view } : {}),
        region: regionId,
        ...(id ? { district: id } : {}),
      },
    });
  }

  // Moment-category pill row (2026-09-30, the 4-to-17-type moment
  // expansion) — narrows which category's sections render below, same
  // route-param-driven pattern as setRegion/setExactDistrict rather than
  // local component state, so a deep link can land directly on one
  // category. Only meaningful for the Moments view (Journeys aren't
  // grouped by category), but harmless to carry through view switches —
  // setView below preserves it the same way it preserves `moment`.
  function setCategory(id: MomentCategory | undefined) {
    router.replace({
      pathname: '/(tabs)/moments',
      params: {
        ...(momentType ? { moment: momentType } : {}),
        region: regionId,
        ...(districtId ? { district: districtId } : {}),
        ...(id ? { category: id } : {}),
      },
    });
  }

  function setView(v: 'moments' | 'journeys') {
    router.replace({
      pathname: '/(tabs)/moments',
      params: {
        ...(momentType ? { moment: momentType } : {}),
        ...(categoryParam ? { category: categoryParam } : {}),
        region: regionId,
        ...(districtId ? { district: districtId } : {}),
        ...(v === 'journeys' ? { view: v } : {}),
      },
    });
  }

  // Region is always a hard pre-filter on the venue's own metro; within
  // it, an exact district (the small row) overrides the radius entirely
  // rather than combining with it — see this file's 2026-09-29 update #2
  // doc comment for the reasoning.
  function withinFilter(venue: SeedVenue): boolean {
    if (!selectedRegion.metros.includes(venue.metro)) return false;
    if (district) return venue.districtId === district.id;
    return haversineMiles(referencePoint, venue) <= radiusMiles;
  }

  // Context-aware Moments (2026-09-30, at explicit user request: "figure
  // out a context aware way of reordering the list of moment... during
  // extremes aka super sunny or snowing etc it should be bumped", then
  // extended twice the same day: "watch the football and big fight night
  // should be context aware too", and "if a category isnt relevant
  // currently, dont even show it... dont show boxing if there isnt a
  // televised good bocing fight within the next 2 weeks... maybe we could
  // list the events too". Three real signals, each independent:
  //
  // 1. Weather outlook (src/lib/weather/forecast.ts) — a multi-day scan,
  //    not just the single resolved day+band session.weather already is,
  //    since "is it worth showing Weather-Led at all" needs to know about
  //    the next few days, not just right now. Split hot vs cold/wet so
  //    First Sunny Evening and Cosy Winter Warm-Up can show independently
  //    — showing a cosy-fire moment during a hot week just because a
  //    storm is also forecast would be exactly the kind of irrelevant
  //    clutter this exists to remove.
  // 2. Real Premier League/Champions League/FA Cup fixtures — Watch the
  //    Football.
  // 3. Real Boxing/F1 fixtures — Big Fight Night (Ryder Cup and Sky
  //    Sports' own schedule were researched and deliberately dropped, see
  //    src/lib/sports/fixtures.ts's own top comment).
  //
  // Each of the 4 context-gated Moment types (the two weather ones, the
  // two sport ones) gets both a wide SHOW window (is this worth surfacing
  // at all) and, for the sport pair, a narrower BUMP window (is this
  // worth leading with) — the "documented, extensible rule set" shape
  // weightsFor (rank-venues.ts) already uses for context-dependent
  // ranking weights, not a one-off hardcoded check. Deliberately not
  // day-of-week-based for anything beyond real fetched data: nothing in
  // this app has real fixture/forecast data to justify hiding or bumping
  // a category "because it's Saturday" on its own, and this file's own
  // notification-prefs precedent (session.tsx) already cut a feature for
  // promising a signal the app couldn't actually back.
  const [weatherOutlook, setWeatherOutlook] = useState<{ hotExtreme: boolean; coldWetExtreme: boolean }>({
    hotExtreme: false,
    coldWetExtreme: false,
  });
  const [nextFootballFixture, setNextFootballFixture] = useState<Fixture | null>(null);
  const [nextBigEventFixture, setNextBigEventFixture] = useState<Fixture | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetchExtremeWeatherOutlook(session.location ?? DEMO_LOCATION, 4).then((outlook) => {
      if (!cancelled) setWeatherOutlook(outlook);
    });
    fetchNextFootballFixture().then((f) => {
      if (!cancelled) setNextFootballFixture(f);
    });
    fetchNextBigEventFixture().then((f) => {
      if (!cancelled) setNextBigEventFixture(f);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // "now" is read fresh on every render inside each isWithinFixtureWindow
  // call below (no Date frozen at fetch time), so the whole show/bump
  // state stays live between fetches — the "once event ends, it should
  // adjust accordingly, unless more events are coming up" requirement
  // falls out of this for free (see isWithinFixtureWindow's own comment).
  const footballShow = isWithinFixtureWindow(nextFootballFixture, FOOTBALL_SHOW_LOOKAHEAD_HOURS, FOOTBALL_DURATION_HOURS);
  const footballBumped = isWithinFixtureWindow(nextFootballFixture, FOOTBALL_BUMP_LOOKAHEAD_HOURS, FOOTBALL_DURATION_HOURS);
  const bigEventShow = isWithinFixtureWindow(nextBigEventFixture, BIG_EVENT_SHOW_LOOKAHEAD_HOURS, BIG_EVENT_DURATION_HOURS);
  const bigEventBumped = isWithinFixtureWindow(nextBigEventFixture, BIG_EVENT_BUMP_LOOKAHEAD_HOURS, BIG_EVENT_DURATION_HOURS);

  // Which context-gated Moment types are genuinely worth showing right
  // now — everything else in MOMENTS (Date Night, Pub Crawl, ...) is
  // always shown, same as before this feature existed.
  const hiddenMomentTypes = useMemo(() => {
    const hidden = new Set<MomentType>();
    if (!weatherOutlook.hotExtreme) hidden.add('first-sunny-evening');
    if (!weatherOutlook.coldWetExtreme) hidden.add('cosy-winter-warm-up');
    if (!footballShow) hidden.add('watch-the-football');
    if (!bigEventShow) hidden.add('big-fight-night');
    return hidden;
  }, [weatherOutlook, footballShow, bigEventShow]);

  // Which shown Moment types are "hot" enough to lead with — a real match
  // or fight/race within its narrower bump window, not just present
  // somewhere in the next fortnight. Used below to put the live one first
  // within its category and to bump that category to the front of the
  // whole list.
  const hotMomentTypes = useMemo(() => {
    const set = new Set<MomentType>();
    if (footballBumped) set.add('watch-the-football');
    if (bigEventBumped) set.add('big-fight-night');
    // Weather has no separate "bump" window — showing First Sunny Evening
    // or Cosy Winter Warm-Up at all already means the outlook found a
    // genuine extreme somewhere in the next few days; isExtremeWeather
    // (a stricter, right-now-only check) decides whether that also earns
    // Weather-Led a spot at the front of the whole category list, below.
    return set;
  }, [footballBumped, bigEventBumped]);

  // The real fixture line to show under a context-gated moment's blurb
  // ("maybe we could list the events too... e.g premier league live now,
  // or x vs y on at 11pm thursday for boxing") — only populated for
  // moment types that are actually being shown.
  const momentFixtureLine = useMemo(() => {
    const lines: Partial<Record<MomentType, string>> = {};
    if (!hiddenMomentTypes.has('watch-the-football') && nextFootballFixture) {
      lines['watch-the-football'] = describeFixtureTiming(nextFootballFixture, FOOTBALL_DURATION_HOURS);
    }
    if (!hiddenMomentTypes.has('big-fight-night') && nextBigEventFixture) {
      lines['big-fight-night'] = describeFixtureTiming(nextBigEventFixture, BIG_EVENT_DURATION_HOURS);
    }
    return lines;
  }, [hiddenMomentTypes, nextFootballFixture, nextBigEventFixture]);

  const weatherExtreme = isExtremeWeather(session.weather);

  const momentSections = useMemo(
    () =>
      MOMENTS.filter((m) => !momentType || m.type === momentType)
        .filter((m) => !categoryParam || m.category === categoryParam)
        // An explicit ?moment= deep link (Venue detail's GOOD FOR chips)
        // always wins over the ambient hide — a member who tapped a chip
        // for Cosy Winter Warm-Up wants to see it, whether or not real
        // cold weather happens to be forecast this visit.
        .filter((m) => momentType || !hiddenMomentTypes.has(m.type))
        .map((m) => {
          const venues = m.venueIds
            .map((id) => VENUES.find((v) => v.id === id))
            .filter((v): v is NonNullable<typeof v> => !!v && !isVenueClosed(v))
            .filter((v) => withinFilter(v));
          return { moment: m, venues };
        })
        .filter((sec) => sec.venues.length > 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedRegion, district, radiusMiles, momentType, categoryParam, hiddenMomentTypes]
  );

  const bumpedCategoryIds = useMemo(() => {
    const ids: MomentCategory[] = [];
    if (weatherExtreme) ids.push('weather-led');
    if (hotMomentTypes.size > 0) ids.push('sport-spectating');
    return ids;
  }, [weatherExtreme, hotMomentTypes]);

  const orderedMomentCategories = useMemo(() => {
    if (bumpedCategoryIds.length === 0) return MOMENT_CATEGORIES;
    const bumped = bumpedCategoryIds
      .map((id) => MOMENT_CATEGORIES.find((c) => c.id === id))
      .filter((c): c is (typeof MOMENT_CATEGORIES)[number] => !!c);
    const rest = MOMENT_CATEGORIES.filter((c) => !bumpedCategoryIds.includes(c.id));
    return [...bumped, ...rest];
  }, [bumpedCategoryIds]);

  // Groups momentSections under their orderedMomentCategories header, in
  // display order, dropping any category with nothing to show here (same
  // "only real content, never an empty section" discipline as
  // momentSections itself — a category left with zero visible sections
  // once hiddenMomentTypes has done its work drops out here the same way
  // an empty region/district match always has) — and within a group, a
  // hot moment type (e.g. Watch the Football with a real match on) sorts
  // first. When a single category is already selected via the pill row,
  // the per-group heading is redundant with the active pill and skipped
  // at render time below, not filtered out here — groupedMomentSections
  // stays the one shared shape for both states.
  const groupedMomentSections = useMemo(
    () =>
      orderedMomentCategories
        .map((cat) => ({
          category: cat,
          sections: momentSections
            .filter((sec) => sec.moment.category === cat.id)
            .sort((a, b) => Number(hotMomentTypes.has(b.moment.type)) - Number(hotMomentTypes.has(a.moment.type))),
        }))
        .filter((g) => g.sections.length > 0),
    [orderedMomentCategories, momentSections, hotMomentTypes]
  );

  // Which categories actually have real content anywhere in the currently
  // selected region/district/radius (independent of the category filter
  // itself) — the same "only offer a pill that leads somewhere real" rule
  // districtChoices/availableRegions already follow. Ordered the same way
  // groupedMomentSections is, so the pill row and the content below never
  // disagree about what's first.
  const availableCategories = useMemo(() => {
    const ids = new Set<string>();
    MOMENTS.filter((m) => !momentType || m.type === momentType)
      .filter((m) => momentType || !hiddenMomentTypes.has(m.type))
      .forEach((m) => {
        const hasVisible = m.venueIds.some((id) => {
          const v = VENUES.find((vv) => vv.id === id);
          return v && !isVenueClosed(v) && withinFilter(v);
        });
        if (hasVisible) ids.add(m.category);
      });
    return orderedMomentCategories.filter((c) => ids.has(c.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderedMomentCategories, selectedRegion, district, radiusMiles, momentType, hiddenMomentTypes]);

  // Nearest-district-first, same reading as districtChoices — a journey's
  // own meta line already states its district, so (unlike Moments) no
  // per-card district label is needed here.
  const journeys = useMemo(() => {
    const filtered = JOURNEYS.filter(
      (j) =>
        !journeyHasClosedStop(j) &&
        j.stops.some((s) => {
          const v = VENUES.find((vv) => vv.id === s.venueId);
          return v && withinFilter(v);
        })
    );
    const nearest = (j: Journey) =>
      Math.min(...journeyDistricts(j).map((d) => haversineMiles(session.searchOrigin, d)));
    return [...filtered].sort((a, b) => nearest(a) - nearest(b));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRegion, district, radiusMiles, session.searchOrigin]);

  const nothingHere = view === 'moments' ? momentSections.length === 0 : journeys.length === 0;

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

      <Text style={styles.filterKicker}>REGION</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.districtFilterRow}
      >
        {availableRegions.map((r) => (
          <Pressable
            key={r.id}
            onPress={() => setRegion(r.id)}
            style={[styles.districtPill, regionId === r.id && styles.districtPillActive]}
          >
            <Text style={[styles.districtPillText, regionId === r.id && styles.districtPillTextActive]}>
              {r.label.toUpperCase()}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {!district && (
        <View style={styles.radiusBlock}>
          <View style={styles.radiusHeaderRow}>
            <Text style={styles.filterKicker}>WITHIN</Text>
            <Text style={styles.radiusValue}>{formatRadiusMiles(radiusMiles)}</Text>
          </View>
          <RadiusSlider value={radiusMiles} onChange={setRadiusMiles} />
        </View>
      )}

      {districtChoices.length > 0 && (
        <View style={styles.districtNarrowBlock}>
          <Text style={styles.filterKicker}>OR NARROW TO A DISTRICT</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.districtNarrowRow}
          >
            <Pressable
              onPress={() => setExactDistrict(undefined)}
              style={[styles.districtNarrowPill, !district && styles.districtNarrowPillActive]}
            >
              <Text
                style={[styles.districtNarrowPillText, !district && styles.districtNarrowPillTextActive]}
              >
                ANY DISTRICT
              </Text>
            </Pressable>
            {districtChoices.map((d) => (
              <Pressable
                key={d.id}
                onPress={() => setExactDistrict(d.id)}
                style={[styles.districtNarrowPill, district?.id === d.id && styles.districtNarrowPillActive]}
              >
                <Text
                  style={[
                    styles.districtNarrowPillText,
                    district?.id === d.id && styles.districtNarrowPillTextActive,
                  ]}
                >
                  {d.name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      {view === 'moments' && availableCategories.length > 0 && (
        <View style={styles.districtNarrowBlock}>
          <Text style={styles.filterKicker}>MOMENT CATEGORY</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.districtFilterRow}
          >
            <Pressable
              onPress={() => setCategory(undefined)}
              style={[styles.districtPill, !categoryParam && styles.districtPillActive]}
            >
              <Text style={[styles.districtPillText, !categoryParam && styles.districtPillTextActive]}>
                ALL
              </Text>
            </Pressable>
            {availableCategories.map((cat) => (
              <Pressable
                key={cat.id}
                onPress={() => setCategory(cat.id)}
                style={[styles.districtPill, categoryParam === cat.id && styles.districtPillActive]}
              >
                <Text
                  style={[styles.districtPillText, categoryParam === cat.id && styles.districtPillTextActive]}
                >
                  {cat.title.toUpperCase()}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      {nothingHere && (
        <Card tone="inset" style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>
            {district ? `Nothing kept in ${district.name} yet.` : `Nothing within ${formatRadiusMiles(radiusMiles)} yet.`}
          </Text>
          <Text style={styles.emptyBody}>
            {district
              ? 'Try Any District above for the rest of the region, or check back as our editors keep going.'
              : 'Widen the radius above, or our editors are still working through this region.'}
          </Text>
        </Card>
      )}

      {view === 'moments'
        ? groupedMomentSections.map(({ category, sections }) => (
            <View key={category.id} style={styles.categoryGroup}>
              {/* Redundant with the active pill once a single category is
                  already selected — only shown in the "ALL" grouped view. */}
              {!categoryParam && <Text style={styles.categoryGroupTitle}>{category.title.toUpperCase()}</Text>}
              {sections.map(({ moment, venues }) => (
                <View key={moment.id} style={styles.section}>
                  <Text style={styles.title}>{moment.title}</Text>
                  <Text style={styles.blurb}>{moment.blurb}</Text>
                  {momentFixtureLine[moment.type] && (
                    <Text style={styles.fixtureLine}>{momentFixtureLine[moment.type]}</Text>
                  )}
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
              ))}
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
  // Small section label shared by all three filter rows (REGION / WITHIN /
  // OR NARROW TO A DISTRICT) — one style, three headings, same register.
  filterKicker: {
    fontFamily: font.sansMedium,
    fontSize: 10,
    letterSpacing: 1.6,
    color: color.textTertiary,
    marginBottom: spacing.xs,
  },
  districtFilterRow: {
    gap: spacing.sm,
    paddingBottom: 2,
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
  // Real drag slider (2026-09-29, RadiusSlider — components/curia) — how
  // far to look within the selected region, measured from a real self or
  // a region centroid depending on which region is picked (see the
  // screen's own doc comment).
  radiusBlock: {
    marginTop: -spacing.xs,
  },
  radiusHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  radiusValue: {
    fontFamily: font.serifRegular,
    fontSize: 13,
    color: color.textPrimary,
  },
  // The small, secondary "or just this one district" row (2026-09-29) —
  // deliberately smaller/dimmer than the region pills above, so it reads
  // as an optional precision override, not a second primary control.
  districtNarrowBlock: {
    marginTop: -spacing.xs,
  },
  districtNarrowRow: {
    gap: 6,
    paddingBottom: 2,
  },
  districtNarrowPill: {
    paddingVertical: 6,
    paddingHorizontal: 11,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.hairlineMin,
  },
  districtNarrowPillActive: {
    borderColor: 'rgba(192,160,98,.45)',
    backgroundColor: 'rgba(192,160,98,.1)',
  },
  districtNarrowPillText: {
    fontFamily: font.sans,
    fontSize: 9.5,
    letterSpacing: 1,
    color: color.textTertiary,
  },
  districtNarrowPillTextActive: {
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
  categoryGroup: {
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  categoryGroupTitle: {
    fontFamily: font.sansMedium,
    fontSize: 11,
    letterSpacing: 2,
    color: color.gold,
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
  fixtureLine: {
    fontFamily: font.sansMedium,
    fontSize: 11.5,
    color: color.gold,
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
