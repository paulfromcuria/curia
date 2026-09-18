import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Button, Kicker, Tag } from '../../components/curia';
import { DISTRICTS, MOMENTS, RATING_STATS, VENUES } from '../../lib/data/seed';
import { placeholderPhotoFor } from '../../lib/data/placeholder-photos';
import { DEMO_LOCATION } from '../../lib/scoring/session-input';
import { useSession } from '../../lib/state/session';
import { contextNoteFor, resolveContext } from '../../lib/scoring/rank-venues';
import { estimateTrip } from '../../lib/travel/trip';
import type { DietaryRequirement, MomentType } from '../../types/models';
import { color, font, radius, spacing } from '../../theme';

const BAND_LABEL: Record<string, string> = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  evening: 'Evening',
  late: 'Late night',
};

const MOMENT_LABEL: Record<MomentType, string> = {
  'date-night': 'Date Night',
  'entertaining-a-client': 'Entertaining a Client',
  'big-group-of-friends': 'Big Group of Friends',
  'solo-reset': 'Solo Reset',
};

const DIETARY_LABEL: Record<Exclude<DietaryRequirement, 'none'>, string> = {
  vegetarian: 'Vegetarian options',
  vegan: 'Vegan options',
  pescatarian: 'Pescatarian options',
  'gluten-free': 'Gluten-free options',
  'dairy-free': 'Dairy-free options',
  'nut-allergy': 'Nut-allergy friendly',
};

const DIETARY_MISMATCH_LABEL: Record<Exclude<DietaryRequirement, 'none'>, string> = {
  vegetarian: 'No confirmed vegetarian options',
  vegan: 'No confirmed vegan options',
  pescatarian: 'No confirmed pescatarian options',
  'gluten-free': 'No confirmed gluten-free options',
  'dairy-free': 'No confirmed dairy-free options',
  'nut-allergy': 'Nut-allergy friendliness not confirmed',
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
 * `session.location` (2026-09-18, at explicit user report — this used
 * `session.searchOrigin` since the 2026-08 pass, but session.tsx's own doc
 * comment on that field says plainly it's for ranking/browsing, not "real
 * physical distance (walk/ride ETAs)"; searchOrigin follows wherever Map's
 * camera has been panned to, so "FROM YOU" could silently mean "from where
 * you were looking on the map," not from you. Fixed the same way in
 * src/app/walk.tsx and src/app/ride.tsx, so this still can't disagree with
 * either of those — just correctly anchored now).
 *
 * 2026-09 addition, at explicit user request: "GOOD FOR" moment chips and a
 * "GOOD TO KNOW" matched-facts row. Both are real, computed signals, not new
 * copy or a second scoring system:
 * - "GOOD FOR" lists every real Moment (docs/data/venues.json `moments` ->
 *   `Moment.venueIds`, see seed.ts) this venue is an actual curated pick in
 *   -- tapping one deep-links to Moments filtered to that moment + this
 *   venue's district (see moments.tsx's `moment` param).
 * - "GOOD TO KNOW" tags are plain amenity facts, not a preference-match
 *   score breakdown -- deliberately distinct from the "Why it's ranked here"
 *   block the 2026-08 concierge pass removed (Hard rule 8 / Presentation
 *   layer section: no labelled YOUR PREFERENCES fields). Each tag only
 *   appears when it's a genuinely matched fact against the signed-in
 *   member's own `session.you` profile (set for real during onboarding) --
 *   spend level, dietary requirements, and pet-friendliness are all real
 *   `Venue`/`YouProfile` fields already used as hard filters/ranking signals
 *   elsewhere (rank-venues.ts); this reads the same facts rather than
 *   inventing new ones. `Venue.subPreferenceTags` is intentionally not used
 *   here -- no seed venue has any populated yet (a real, pre-existing data
 *   gap, not something to fake for this screen).
 *
 * 2026-09 extension, at explicit user request ("say these tags match, these
 * tags don't... aware of why somewhere is a good fit or a great fit but they
 * cant take their dog"): "GOOD TO KNOW" now also surfaces genuine mismatches
 * -- pet-friendliness and dietary requirements the venue does NOT confirm --
 * not just matches, styled as plain (inactive) tags next to the gold
 * (active) matched ones in the same row. This still isn't the "Why it's
 * ranked here" score breakdown the 2026-08 pass removed: every tag here is a
 * concrete yes/no fact the member can act on (can I bring the dog? is there
 * a vegan option?), never a weight, category label, or number. Worth this
 * distinction precisely because pet-friendliness is now a soft ranking
 * signal, not a hard filter (rank-venues.ts's scorePetFit) -- a
 * pet-unfriendly venue can genuinely appear and even rank well for a
 * pet-owner now, so the member needs to be told plainly, not left to
 * assume every result they see is dog-friendly. Spend level intentionally
 * has no mismatch counterpart: it's a continuous fit, not a binary
 * can/can't-do-this fact the way pet and dietary are.
 *
 * 2026-09-18 addition, at explicit user request, prompted by a real example
 * (Rex Cinema recommended in Wilmslow on a rainy Friday evening — a great
 * match, but nothing said why): a real-time "why this works right now" line,
 * shown directly under the curated blurb when the live weather or the
 * district's own liveliness curve is actually notable right now
 * (`contextNoteFor`, rank-venues.ts). A third instance of this screen's own
 * standing rule — a real computed signal, never a score or a labelled
 * category — and deliberately not a repeat of the blurb: the blurb is the
 * venue's fixed character, this is what today specifically adds to it.
 * Absent (not a filler line) when neither signal is notable right now.
 */
export default function VenueDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const session = useSession();

  const venue = VENUES.find((v) => v.id === id);
  const saved = venue ? session.isVenueSaved(venue.id) : false;
  const myRating = venue ? session.myRatingFor(venue.id) : undefined;
  const ratingStats = venue ? RATING_STATS[venue.id] : undefined;
  const district = venue ? DISTRICTS.find((d) => d.id === venue.districtId) : undefined;
  // Real-time-now weather/liveliness aside, same signal Map/List's
  // contextNoteFor already computes as part of rankVenues — this screen
  // doesn't call rankVenues at all (it reads the venue directly by id), so
  // it's computed standalone here from the same real `session.weather`/
  // `session.context`, not a second implementation.
  const contextNote = venue
    ? contextNoteFor(venue, district, resolveContext(session.context), session.weather ?? undefined)
    : undefined;

  const trip = venue ? estimateTrip(session.location ?? DEMO_LOCATION, venue) : undefined;

  const matchedMoments = venue ? MOMENTS.filter((m) => m.venueIds.includes(venue.id)) : [];

  interface FactTag {
    label: string;
    matched: boolean;
  }
  const factTags: FactTag[] = [];
  if (venue) {
    if (venue.spendLevel === session.you.spendLevel) factTags.push({ label: 'In your price range', matched: true });
    if (session.you.pet !== 'none') {
      factTags.push(
        venue.petFriendly
          ? { label: 'Dog friendly', matched: true }
          : { label: 'Not dog friendly', matched: false }
      );
    }
    for (const req of session.you.dietary) {
      if (req === 'none') continue;
      const confirmed = venue.dietaryOptions.includes(req);
      factTags.push({
        label: confirmed ? DIETARY_LABEL[req] : DIETARY_MISMATCH_LABEL[req],
        matched: confirmed,
      });
    }
  }

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
        <Image
          source={{ uri: venue.photos[0] ?? placeholderPhotoFor(venue.type) }}
          style={styles.heroImage}
          resizeMode="cover"
        />
        <View style={styles.heroScrim} />
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
          <View style={styles.nameRow}>
            <Text style={styles.name}>{venue.name}</Text>
            {venue.status === 'coming-soon' && (
              <View style={styles.newBadge}>
                <Text style={styles.newBadgeText}>NEW</Text>
              </View>
            )}
          </View>
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
        {contextNote && <Text style={styles.contextNote}>{contextNote}</Text>}

        {matchedMoments.length > 0 && (
          <View style={styles.tagSection}>
            <Text style={styles.tagSectionLabel}>GOOD FOR</Text>
            <View style={styles.tagRow}>
              {matchedMoments.map((m) => (
                <Tag
                  key={m.id}
                  label={MOMENT_LABEL[m.type]}
                  active
                  onPress={() =>
                    router.push({
                      pathname: '/(tabs)/moments',
                      params: { moment: m.type, ...(district ? { district: district.id } : {}) },
                    })
                  }
                />
              ))}
            </View>
          </View>
        )}

        {factTags.length > 0 && (
          <View style={styles.tagSection}>
            <Text style={styles.tagSectionLabel}>GOOD TO KNOW</Text>
            <View style={styles.tagRow}>
              {factTags.map((tag) => (
                <Tag key={tag.label} label={tag.label} active={tag.matched} />
              ))}
            </View>
          </View>
        )}

        <View style={styles.tagSection}>
          <Text style={styles.tagSectionLabel}>YOUR RATING</Text>
          <View style={styles.starRow}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Pressable
                key={n}
                onPress={() => venue && session.rateVenue(venue.id, n)}
                hitSlop={8}
                accessibilityLabel={`Rate ${n} of 5 stars`}
              >
                <Text style={[styles.star, n <= (myRating ?? 0) && styles.starOn]}>★</Text>
              </Pressable>
            ))}
          </View>
          {ratingStats && (
            <Text style={styles.ratingCrowdNote}>
              {ratingStats.avg.toFixed(1)} average from {ratingStats.count} {ratingStats.count === 1 ? 'member' : 'members'}
            </Text>
          )}
        </View>

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
    overflow: 'hidden',
  },
  // 2026-09, at explicit user request following feedback that the app had
  // no venue photos: `photos[0]` renders here when a venue has a real one,
  // placeholderPhotoFor(venue.type) otherwise (most of them, until admin
  // fills real photos in — see VenueForm's own doc comment and
  // placeholder-photos.ts's). `hero`'s own backgroundColor stays as a pure
  // loading-flash guard, not a real fallback path anymore. Flat scrim
  // rather than a gradient — no gradient library is a dependency here yet —
  // just enough to keep name/kicker legible over an arbitrary photo instead
  // of the flat surface color they were originally designed against.
  heroImage: {
    ...StyleSheet.absoluteFill,
  },
  heroScrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(11,10,9,.4)',
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
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  newBadge: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(192,160,98,.6)',
    backgroundColor: 'rgba(192,160,98,.14)',
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  newBadgeText: {
    fontFamily: font.sansMedium,
    fontSize: 9.5,
    letterSpacing: 1.6,
    color: color.goldLight,
  },
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
  contextNote: {
    fontFamily: font.sans,
    fontSize: 13,
    lineHeight: 19,
    color: color.gold,
    marginTop: spacing.xs,
  },
  tagSection: { gap: spacing.xs },
  tagSectionLabel: {
    fontFamily: font.sans,
    fontSize: 9,
    letterSpacing: 1.8,
    color: color.textTertiary,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  // 2026-09, at explicit user request: "a feedback loop e.g how was smoke,
  // i rate it 2 stars, it remembers that, takes it on board for other
  // similar users." Tapping a star writes straight through session.rateVenue
  // (optimistic, no confirm step) — the real "remembers it" half. The
  // crowd-average note below is the "other similar users" half's visible
  // side; scoreRatings (rank-venues.ts) is the half that actually feeds it
  // into ranking, invisibly, same as every other scoring signal here.
  starRow: {
    flexDirection: 'row',
    gap: 6,
  },
  star: {
    fontSize: 22,
    color: color.hairlineMax,
  },
  starOn: {
    color: color.goldLight,
  },
  ratingCrowdNote: {
    fontFamily: font.sans,
    fontSize: 11.5,
    color: color.textSecondary,
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
