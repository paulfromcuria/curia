import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Card, Kicker, Tag } from '../components/curia';
import { tilesByCategory } from '../lib/data/seed';
import { useSession } from '../lib/state/session';
import { color, font, spacing } from '../theme';
import type {
  AgeRange,
  DietaryRequirement,
  Gender,
  PetPreference,
  ReligiousObservance,
  RelationshipStatus,
  SpendLevel,
  TileCategory,
} from '../types/models';

/**
 * Do -> Drink -> Eat -> You onboarding, tile-grid model per CLAUDE.md
 * "Onboarding model" (the prototype's real, working implementation governs
 * over the superseded taxonomy doc). Copy (headlines/subheads/gate notes)
 * is transcribed from Curia.dc.html's HEADLINES/SUBHEADS/YOU_GROUPS
 * constants.
 *
 * One deliberate deviation from the prototype: the prototype's "ENTER
 * CURIA" button on the You step jumps straight to the map screen. This app
 * instead routes to the subscription gate first (Hard rule 4: completing
 * onboarding alone must never grant Map/List access) — see
 * src/app/subscription.tsx and src/app/index.tsx's redirect chain.
 *
 * Second, minimal addition (M7, curia-profile): Profile's "edit preferences"
 * entry points need to land on a specific step (e.g. "Edit Do preferences"
 * vs. "Edit You details") rather than always starting at Do. This screen
 * already supports jumping straight to any step once every category has its
 * 3-tile minimum (`reachable` below allows any tab once `allOk`) — the only
 * gap was always initializing `step` to 'Do'. Reading an optional `?step=`
 * query param closes that gap without touching the gating/continue logic,
 * which stays curia-onboarding's surface. NOTE: the prototype also has a
 * real "editing" mode (headline becomes "Edit your ... preferences.", the
 * Continue button becomes "SAVE CHANGES" and returns straight to Profile
 * instead of advancing to the next step/subscription) — that's a genuine
 * behavior change beyond a step jump, so it's intentionally left out here
 * per this agent's brief to keep the addition minimal; flagging it back for
 * curia-onboarding/the orchestrator to pick up. Practical effect today:
 * editing an already-subscribed member's preferences and clicking through
 * to "You" → "Enter Curia" lands on /subscription, which shows the
 * membership-management view (not a paywall) since they're already
 * subscribed — a minor rough edge, not a broken gate.
 */

type Step = TileCategory | 'You';
const STEPS: Step[] = ['Do', 'Drink', 'Eat', 'You'];

function isStep(value: string | undefined): value is Step {
  return value === 'Do' || value === 'Drink' || value === 'Eat' || value === 'You';
}

const HEADLINES: Record<Step, string> = {
  Do: 'How do you like to spend the hours in between?',
  Drink: 'Where would you rather be drinking?',
  Eat: 'And when you sit down to eat?',
  You: 'A little about you.',
};

const TILE_SUBHEAD =
  "Pick the ones you'd actually choose — three or more, as many as you like. Everything below a tile is on by default because most people want it; turn off anything you don't care for.";
const YOU_SUBHEAD =
  'Set once, applied everywhere. These weight the ranking rather than filter it — nothing is ever hidden outright.';

const SPEND_LEVELS: SpendLevel[] = [1, 2, 3, 4, 5];

const DIETARY_OPTS: { label: string; value: DietaryRequirement }[] = [
  { label: 'No requirements', value: 'none' },
  { label: 'Vegetarian', value: 'vegetarian' },
  { label: 'Vegan', value: 'vegan' },
  { label: 'Pescatarian', value: 'pescatarian' },
  { label: 'Gluten-free', value: 'gluten-free' },
  { label: 'Dairy-free', value: 'dairy-free' },
  { label: 'Nut allergy', value: 'nut-allergy' },
];

const PET_OPTS: { label: string; value: PetPreference }[] = [
  { label: 'No pet', value: 'none' },
  { label: 'Small dog', value: 'small-dog' },
  { label: 'Large dog', value: 'large-dog' },
];

const FAITH_OPTS: { label: string; value: ReligiousObservance }[] = [
  { label: 'None', value: 'none' },
  { label: 'Halal', value: 'halal' },
  { label: 'Kosher', value: 'kosher' },
  { label: 'Alcohol-free', value: 'alcohol-free' },
  { label: 'Prayer space nearby', value: 'prayer-space-nearby' },
  { label: 'Friday observance', value: 'friday-observance' },
];

const GENDER_OPTS: { label: string; value: Gender }[] = [
  { label: 'Woman', value: 'woman' },
  { label: 'Man', value: 'man' },
  { label: 'Non-binary', value: 'non-binary' },
  { label: 'Prefer not to say', value: 'prefer-not-to-say' },
];

const AGE_OPTS: { label: string; value: AgeRange }[] = [
  { label: '18–24', value: '18-24' },
  { label: '25–34', value: '25-34' },
  { label: '35–44', value: '35-44' },
  { label: '45–54', value: '45-54' },
  { label: '55–64', value: '55-64' },
  { label: '65+', value: '65+' },
];

const REL_OPTS: { label: string; value: RelationshipStatus }[] = [
  { label: 'Single', value: 'single' },
  { label: 'Seeing someone', value: 'seeing-someone' },
  { label: 'Partnered', value: 'partnered' },
  { label: 'Married', value: 'married' },
  { label: 'Prefer not to say', value: 'prefer-not-to-say' },
];

export default function Onboarding() {
  const router = useRouter();
  const session = useSession();
  const { step: requestedStep } = useLocalSearchParams<{ step?: string }>();
  const [step, setStep] = useState<Step>(isStep(requestedStep) ? requestedStep : 'Do');
  const [openTileId, setOpenTileId] = useState<string | null>(null);

  const stepIndex = STEPS.indexOf(step);
  const counts = {
    Do: session.tileCount('Do'),
    Drink: session.tileCount('Drink'),
    Eat: session.tileCount('Eat'),
  };
  const allOk = counts.Do >= 3 && counts.Drink >= 3 && counts.Eat >= 3;
  const isYou = step === 'You';
  const gateOk = isYou ? allOk : counts[step as TileCategory] >= 3;

  const tiles = useMemo(() => (isYou ? [] : tilesByCategory(step as TileCategory)), [isYou, step]);

  function onTileTap(tileId: string) {
    const category = step as TileCategory;
    session.toggleTile(category, tileId);
    setOpenTileId((current) => (current === tileId ? null : tileId));
  }

  function onContinue() {
    if (!gateOk) return;
    if (isYou) {
      session.completeOnboarding();
      router.replace('/subscription');
      return;
    }
    setStep(STEPS[stepIndex + 1]);
    setOpenTileId(null);
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Kicker>Curia</Kicker>
        <View style={styles.progressStrip}>
          {STEPS.map((s, i) => (
            <View
              key={s}
              style={[
                styles.progressSegment,
                i < stepIndex && styles.progressSegmentDone,
                i === stepIndex && styles.progressSegmentActive,
              ]}
            />
          ))}
        </View>
        <View style={styles.tabsRow}>
          {STEPS.map((s) => {
            const active = s === step;
            const done = s !== 'You' && counts[s as TileCategory] >= 3;
            const reachable = STEPS.indexOf(s) <= stepIndex || allOk;
            return (
              <View key={s} style={styles.tab}>
                <Text
                  onPress={() => {
                    if (reachable) setStep(s);
                  }}
                  style={[
                    styles.tabLabel,
                    active && styles.tabLabelActive,
                    !reachable && styles.tabLabelUnreachable,
                    active && styles.tabLabelUnderline,
                  ]}
                >
                  {s.toUpperCase()}
                </Text>
                <Text style={[styles.tabBadge, done && styles.tabBadgeDone]}>
                  {s === 'You' ? '·' : String(counts[s as TileCategory])}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.headline}>{HEADLINES[step]}</Text>
        <Text style={styles.subhead}>{isYou ? YOU_SUBHEAD : TILE_SUBHEAD}</Text>

        {!isYou && (
          <View style={styles.tileList}>
            {tiles.map((tile) => {
              const selected = session.preferences[step as TileCategory].selectedTileIds.includes(tile.id);
              const open = openTileId === tile.id;
              const onCount = tile.subPreferences.filter((s) =>
                session.isSubPreferenceOn(step as TileCategory, tile.name, s)
              ).length;
              const meta = open
                ? onCount === tile.subPreferences.length
                  ? 'ALL REFINEMENTS ON'
                  : `${onCount} REFINEMENTS ON`
                : `${tile.subPreferences.length} REFINEMENTS`;
              return (
                <Card
                  key={tile.id}
                  tone={selected ? 'default' : 'inset'}
                  style={[styles.tile, selected && styles.tileSelected]}
                >
                  <Pressable onPress={() => onTileTap(tile.id)}>
                    <Text style={[styles.tileName, selected && styles.tileNameSelected]}>{tile.name}</Text>
                    <Text style={styles.tileMeta}>{meta}</Text>
                  </Pressable>
                  {open && (
                    <View style={styles.subRow}>
                      {tile.subPreferences.map((sub) => (
                        <Tag
                          key={sub}
                          label={sub}
                          active={session.isSubPreferenceOn(step as TileCategory, tile.name, sub)}
                          onPress={() => session.toggleSubPreference(step as TileCategory, tile.name, sub)}
                        />
                      ))}
                    </View>
                  )}
                </Card>
              );
            })}
          </View>
        )}

        {isYou && (
          <View style={styles.youGroups}>
            <YouGroup title="SPEND LEVEL" note="RANKING DIAL" help="Where your evening usually sits. Venues above and below still appear, ranked lower.">
              <View style={styles.equalRow}>
                {SPEND_LEVELS.map((level) => (
                  <Tag
                    key={level}
                    label={'£'.repeat(level)}
                    active={session.you.spendLevel === level}
                    onPress={() => session.setSpendLevel(level)}
                  />
                ))}
              </View>
            </YouGroup>

            <YouGroup title="DIETARY" note="MULTI-SELECT" help="Venues that can properly accommodate these rank first.">
              <View style={styles.wrapRow}>
                {DIETARY_OPTS.map((o) => (
                  <Tag
                    key={o.value}
                    label={o.label}
                    active={session.you.dietary.includes(o.value)}
                    onPress={() => session.toggleDietary(o.value)}
                  />
                ))}
              </View>
            </YouGroup>

            <YouGroup title="TRAVELLING WITH A PET" note="" help="Dog-friendly rooms, terraces and water bowls get weighted up when this is on.">
              <View style={styles.wrapRow}>
                {PET_OPTS.map((o) => (
                  <Tag
                    key={o.value}
                    label={o.label}
                    active={session.you.pet === o.value}
                    onPress={() => session.setPet(o.value)}
                  />
                ))}
              </View>
            </YouGroup>

            <YouGroup
              title="RELIGIOUS OBSERVANCE"
              note="MULTI-SELECT"
              help="Handled quietly — it affects ranking, never a visible label on your account."
            >
              <View style={styles.wrapRow}>
                {FAITH_OPTS.map((o) => (
                  <Tag
                    key={o.value}
                    label={o.label}
                    active={session.you.religiousObservance.includes(o.value)}
                    onPress={() => session.toggleReligiousObservance(o.value)}
                  />
                ))}
              </View>
            </YouGroup>

            <YouGroup title="GENDER" note="OPTIONAL" help="">
              <View style={styles.wrapRow}>
                {GENDER_OPTS.map((o) => (
                  <Tag
                    key={o.value}
                    label={o.label}
                    active={session.you.gender === o.value}
                    onPress={() => session.setGender(o.value)}
                  />
                ))}
              </View>
            </YouGroup>

            <YouGroup title="AGE RANGE" note="OPTIONAL" help="">
              <View style={styles.wrapRow}>
                {AGE_OPTS.map((o) => (
                  <Tag
                    key={o.value}
                    label={o.label}
                    active={session.you.ageRange === o.value}
                    onPress={() => session.setAgeRange(o.value)}
                  />
                ))}
              </View>
            </YouGroup>

            <YouGroup
              title="RELATIONSHIP"
              note="OPTIONAL"
              help="Shapes table-for-two weighting and group-friendly rooms."
            >
              <View style={styles.wrapRow}>
                {REL_OPTS.map((o) => (
                  <Tag
                    key={o.value}
                    label={o.label}
                    active={session.you.relationshipStatus === o.value}
                    onPress={() => session.setRelationshipStatus(o.value)}
                  />
                ))}
              </View>
            </YouGroup>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.gateRow}>
          {!isYou && <Text style={styles.gateCount}>{counts[step as TileCategory]} selected</Text>}
          <Text style={[styles.gateNote, gateOk && styles.gateNoteReady]}>
            {isYou
              ? allOk
                ? 'Everything set'
                : `Three still needed in ${counts.Do < 3 ? 'Do' : counts.Drink < 3 ? 'Drink' : 'Eat'}`
              : gateOk
                ? 'Ready for the next step'
                : 'Select at least 3'}
          </Text>
        </View>
        <Button
          label={isYou ? 'Enter Curia' : 'Continue'}
          disabled={!gateOk}
          onPress={onContinue}
        />
      </View>
    </View>
  );
}

function YouGroup({
  title,
  note,
  help,
  children,
}: {
  title: string;
  note: string;
  help: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.youGroup}>
      <View style={styles.youGroupHeader}>
        <Kicker>{title}</Kicker>
        {note ? <Kicker tone="tertiary">{note}</Kicker> : null}
      </View>
      {help ? <Text style={styles.youGroupHelp}>{help}</Text> : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: color.baseVariants.c,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
    gap: spacing.sm,
  },
  progressStrip: {
    flexDirection: 'row',
    gap: 4,
    marginTop: spacing.sm,
  },
  progressSegment: {
    flex: 1,
    height: 2,
    backgroundColor: color.hairlineMax,
    borderRadius: 1,
  },
  progressSegmentDone: {
    backgroundColor: 'rgba(192,160,98,.55)',
  },
  progressSegmentActive: {
    backgroundColor: color.gold,
  },
  tabsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: color.hairlineMin,
  },
  tab: {
    alignItems: 'center',
    gap: 6,
    paddingBottom: 11,
  },
  tabLabel: {
    fontFamily: font.sansRegular,
    fontSize: 11.5,
    letterSpacing: 2.4,
    color: color.textTertiary,
  },
  tabLabelActive: {
    color: color.textPrimary,
  },
  tabLabelUnreachable: {
    color: color.textDisabled,
  },
  tabLabelUnderline: {
    textDecorationLine: 'underline',
    textDecorationColor: color.gold,
  },
  tabBadge: {
    fontFamily: font.sans,
    fontSize: 9.5,
    letterSpacing: 1,
    color: color.textBadgeInactive,
  },
  tabBadgeDone: {
    color: 'rgba(192,160,98,.9)',
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.sm,
  },
  headline: {
    fontFamily: font.serif,
    fontSize: 27,
    lineHeight: 33,
    color: color.textPrimary,
    marginTop: spacing.sm,
  },
  subhead: {
    fontFamily: font.sans,
    fontSize: 13,
    lineHeight: 21,
    color: color.textSecondary,
    marginTop: spacing.xs,
  },
  tileList: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  tile: {
    gap: spacing.sm,
  },
  tileSelected: {
    borderWidth: 1,
    borderColor: 'rgba(192,160,98,.5)',
  },
  tileName: {
    fontFamily: font.serifRegular,
    fontSize: 17,
    color: color.textSecondaryAlt,
  },
  tileNameSelected: {
    color: color.textPrimary,
  },
  tileMeta: {
    fontFamily: font.sans,
    fontSize: 10,
    letterSpacing: 1.2,
    color: color.textTertiary,
  },
  subRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  youGroups: {
    marginTop: spacing.md,
    gap: spacing.lg,
  },
  youGroup: {
    gap: spacing.xs,
  },
  youGroupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  youGroupHelp: {
    fontFamily: font.sans,
    fontSize: 12,
    lineHeight: 18,
    color: color.textSecondary,
  },
  equalRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: spacing.sm,
  },
  wrapRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginTop: spacing.sm,
  },
  footer: {
    padding: spacing.lg,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: color.hairlineMin,
    backgroundColor: color.baseVariants.c,
  },
  gateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  gateCount: {
    fontFamily: font.sans,
    fontSize: 11.5,
    letterSpacing: 0.6,
    color: color.textSecondary,
  },
  gateNote: {
    fontFamily: font.sans,
    fontSize: 11.5,
    letterSpacing: 0.6,
    color: color.textSecondary,
  },
  gateNoteReady: {
    color: 'rgba(192,160,98,.9)',
  },
});
