import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { BackButton, Button, Kicker } from '../components/curia';
import { useSession } from '../lib/state/session';
import { color, font, radius, spacing } from '../theme';

const PERKS = [
  'The full curated venue database, no chains, ever.',
  'Predictive ranking tuned to your tiles, spend and the moment.',
  'Moments and journeys curated by Curia’s editors.',
  'Saved places and collections across every city Curia covers.',
];

/**
 * Open beta gate (2026-09, at explicit user request, replacing the old
 * paywall this route used to show). There is no Stripe account/API key yet
 * (CLAUDE.md "Still genuinely open" — a genuine credential gap), and rather
 * than keep showing a price and a trial countdown for a charge that can't
 * actually happen, this route now just asks someone to enter the beta —
 * structurally still the Hard rule 4 checkpoint between onboarding and
 * Map/List (`src/app/index.tsx` and `(tabs)/_layout.tsx` both still redirect
 * here until `isSubscribed` is true), it just doesn't show subscription
 * language to get there. `session.enterOpenBeta()` sets the same real
 * `subscriptionStatus` field a Stripe webhook will write later
 * (src/lib/state/session.tsx's own doc comment on that function) — when
 * real billing exists, this screen goes back to being a real paywall
 * without any change to the gating logic around it, only to what's shown
 * here.
 *
 * The old MANAGE view (price, "Update payment method", "Pause or cancel
 * membership") is gone too — there's no real subscription yet to manage,
 * and a fake "cancel" button that revokes free beta access for no reason
 * would be actively misleading. Someone who's already in just sees a plain
 * confirmation if they land back here (e.g. via Profile).
 *
 * Real bug fixed 2026-09: this screen's root was a plain `View`, not a
 * `ScrollView` — on a phone where the perks list + button run taller than
 * the visible viewport (worse once the browser's own address bar eats into
 * it), the "Enter open beta" button rendered below the fold with no way to
 * scroll down to it, stranding a brand-new member on this exact screen
 * with no visible way forward. Every sibling screen with this same
 * BackButton treatment (profile/notifications/travel) already used
 * `ScrollView style={styles.container} contentContainerStyle={styles.content}`
 * — this just brings subscription.tsx in line with that established
 * pattern instead of the one-off plain View it had.
 */
export default function Subscription() {
  const router = useRouter();
  const { isSubscribed, enterOpenBeta } = useSession();

  function onEnter() {
    enterOpenBeta();
    // Route through "/" rather than hardcoding a tab path so the redirect
    // chain in index.tsx stays the single source of truth for "what's next".
    router.replace('/');
  }

  if (!isSubscribed) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <BackButton />
        <Kicker>Open beta</Kicker>
        <View style={styles.card}>
          <Kicker>Curia is in open beta</Kicker>
          <Text style={styles.headline}>Free while we build this out.</Text>
          <Text style={styles.body}>
            You&apos;re trying Curia before anyone else can pay for it. No card, no commitment, just
            the same curated map and recommendations everyone else will eventually pay for.
          </Text>
        </View>
        <Text style={styles.sectionLabel}>What&apos;s included</Text>
        {PERKS.map((perk) => (
          <View key={perk} style={styles.perkRow}>
            <View style={styles.perkDot} />
            <Text style={styles.perkText}>{perk}</Text>
          </View>
        ))}
        <View style={styles.actions}>
          <Button label="Enter open beta" onPress={onEnter} />
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <BackButton />
      <Kicker>Open beta</Kicker>
      <View style={styles.card}>
        <Kicker>You&apos;re in</Kicker>
        <Text style={styles.headline}>Free while we build this out.</Text>
        <Text style={styles.body}>
          Nothing to manage yet. No card on file, nothing to renew. We&apos;ll let you know well
          before that changes.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: color.baseVariants.a },
  content: {
    flexGrow: 1,
    padding: spacing.lg,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  card: {
    marginTop: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(192,160,98,.35)',
    backgroundColor: 'rgba(192,160,98,.08)',
    gap: spacing.sm,
  },
  headline: {
    fontFamily: font.serif,
    fontSize: 26,
    color: color.textPrimary,
  },
  body: {
    fontFamily: font.sans,
    fontSize: 13,
    lineHeight: 21,
    color: color.textSecondaryAlt,
  },
  actions: {
    marginTop: spacing.md,
  },
  sectionLabel: {
    marginTop: spacing.md,
    fontFamily: font.sansMedium,
    fontSize: 10,
    letterSpacing: 2.4,
    textTransform: 'uppercase',
    color: color.gold,
  },
  perkRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: color.hairlineMin,
  },
  perkDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginTop: 7,
    backgroundColor: color.gold,
  },
  perkText: {
    flex: 1,
    fontFamily: font.sans,
    fontSize: 13,
    lineHeight: 20,
    color: color.borderNeutral,
  },
});
