import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Kicker } from '../components/curia';
import { formatMonthlyPrice, SUBSCRIPTION_CONFIG } from '../lib/config/subscription';
import { useSession } from '../lib/state/session';
import { color, font, radius, spacing } from '../theme';

/**
 * Membership screen — serves two roles from one route, matching how the
 * prototype's own `subscription`/`isSub` screen is written as a single
 * membership-management view (Curia.dc.html):
 *
 *  - GATE (subscriptionStatus === 'none'): the structural checkpoint Hard
 *    rule 4 requires between onboarding and Map/List. Completing onboarding
 *    alone never grants access — `src/app/index.tsx` and
 *    `src/app/(tabs)/_layout.tsx` both redirect here until this is cleared.
 *  - MANAGE (already trialing/active): the prototype's real membership-card
 *    copy ("Renews {{date}}", "Update payment method", "Pause or cancel"),
 *    reached from Profile via the avatar emblem (curia-profile's surface).
 *
 * There is no Stripe account/API key yet (CLAUDE.md "Still genuinely open"
 * — a genuine credential gap, not guessable). `startTrial`/`cancelMembership`
 * in src/lib/state/session.tsx are local mock actions standing in for real
 * Stripe Checkout/Billing Portal calls — every place that needs to become
 * real Stripe wiring is marked `SUBSCRIPTION_CONFIG.isMockBilling`.
 */
export default function Subscription() {
  const router = useRouter();
  const { subscriptionStatus, isSubscribed, startTrial, cancelMembership } = useSession();

  function onStartTrial() {
    startTrial();
    // Route through "/" rather than hardcoding a tab path so the redirect
    // chain in index.tsx stays the single source of truth for "what's next".
    router.replace('/');
  }

  if (!isSubscribed) {
    return (
      <View style={styles.container}>
        <Kicker>Membership</Kicker>
        <View style={styles.card}>
          <Kicker>Curia Membership</Kicker>
          <View style={styles.priceRow}>
            <Text style={styles.price}>{formatMonthlyPrice()}</Text>
            <Text style={styles.perMonth}>/ Month</Text>
          </View>
          <Text style={styles.trialLine}>
            Free for your first {SUBSCRIPTION_CONFIG.trialDays} days, then {formatMonthlyPrice()} a month.
          </Text>
        </View>
        <Text style={styles.gateBody}>
          One last step before Curia opens up: start your trial to unlock the map and list.
        </Text>
        {SUBSCRIPTION_CONFIG.isMockBilling && (
          <Text style={styles.mockNotice}>
            No payment is taken yet — Stripe isn&apos;t wired up (a flagged credential gap), so this sets a local
            trial flag only.
          </Text>
        )}
        <View style={styles.actions}>
          <Button label={`Start ${SUBSCRIPTION_CONFIG.trialDays}-day free trial`} onPress={onStartTrial} />
        </View>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Kicker>Membership</Kicker>
      <View style={styles.card}>
        <Kicker>Curia Membership</Kicker>
        <View style={styles.priceRow}>
          <Text style={styles.price}>{formatMonthlyPrice()}</Text>
          <Text style={styles.perMonth}>/ Month</Text>
        </View>
        <Text style={styles.trialLine}>
          {subscriptionStatus === 'trialing' ? 'Currently in your free trial period.' : 'Active membership.'}
        </Text>
      </View>
      <Text style={styles.sectionLabel}>What it includes</Text>
      {[
        'The full curated venue database — no chains, ever.',
        'Predictive ranking tuned to your tiles, spend and the moment.',
        'Moments and journeys curated by Curia’s editors.',
        'Saved places and collections across Manchester and Cheshire.',
      ].map((perk) => (
        <View key={perk} style={styles.perkRow}>
          <View style={styles.perkDot} />
          <Text style={styles.perkText}>{perk}</Text>
        </View>
      ))}
      <Button label="Update payment method" variant="secondary" onPress={() => {}} />
      <Button label="Pause or cancel membership" variant="ghost" onPress={cancelMembership} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: color.baseVariants.a,
    padding: spacing.lg,
    paddingTop: spacing.xxl,
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
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
  },
  price: {
    fontFamily: font.serif,
    fontSize: 42,
    color: color.textPrimary,
  },
  perMonth: {
    fontFamily: font.sans,
    fontSize: 12,
    letterSpacing: 1.4,
    color: color.textSecondary,
  },
  trialLine: {
    fontFamily: font.sans,
    fontSize: 12.5,
    lineHeight: 20,
    color: color.textSecondaryAlt,
  },
  gateBody: {
    fontFamily: font.sans,
    fontSize: 13.5,
    lineHeight: 22,
    color: color.textSecondary,
    maxWidth: 300,
  },
  mockNotice: {
    fontFamily: font.sans,
    fontSize: 11.5,
    lineHeight: 18,
    color: color.textTertiary,
    maxWidth: 300,
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
