import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BackButton, Kicker } from '../components/curia';
import { type NotificationPrefs, useSession } from '../lib/state/session';
import { color, font, radius, spacing } from '../theme';

/**
 * Real Notifications screen (M7). Originally 4 toggle rows transcribed
 * verbatim from the Claude Design handoff bundle's `isNotif`/`NOTIFS` data
 * (Curia.dc.html) — real, but real copy for functionality that turned out
 * not to exist. 2026-09, at explicit user report after using the real app:
 * "i saw 'alert about an open table at one of your saved places' and we do
 * not have that functionality." Cut down to the one toggle with a real,
 * buildable trigger behind it — see NotificationPrefs's own doc comment in
 * src/lib/state/session.tsx for why `table`/`journey`/`district` are gone,
 * not just hidden.
 *
 * There is no push/email provider (APNs/FCM/email) wired up anywhere in
 * this project yet — a genuine credential gap, not guessable, per
 * .claude/agents/curia-profile.md ("flag rather than guessing at one"). The
 * "RECENT" empty state below is therefore expected, not a gap to fake: with
 * no notification-generating backend, there is nothing real to list. The
 * toggle itself is a real, working user preference
 * (session.notificationPrefs) — it just doesn't yet gate a real send.
 */

const ROWS: { key: keyof NotificationPrefs; label: string; sub: string }[] = [
  {
    key: 'editorial',
    label: 'New from our editors',
    sub: 'One note a week when a Moment or Journey is added near you.',
  },
];

export default function Notifications() {
  const session = useSession();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <BackButton />
      <Kicker tone="tertiary">Notifications</Kicker>
      <Text style={styles.title}>We would rather say nothing than say something dull.</Text>
      <Text style={styles.subhead}>
        Choose what is worth interrupting your evening for. Everything else stays quiet.
      </Text>

      <View style={styles.rows}>
        {ROWS.map((row) => {
          const on = session.notificationPrefs[row.key];
          return (
            <Pressable
              key={row.key}
              onPress={() => session.toggleNotificationPref(row.key)}
              style={styles.row}
              accessibilityRole="switch"
              accessibilityState={{ checked: on }}
            >
              <View style={styles.rowText}>
                <Text style={styles.rowLabel}>{row.label}</Text>
                <Text style={styles.rowSub}>{row.sub}</Text>
              </View>
              <View style={[styles.track, on ? styles.trackOn : styles.trackOff]}>
                <View style={[styles.knob, on ? styles.knobOn : styles.knobOff]} />
              </View>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.recentCard}>
        <Kicker>Recent</Kicker>
        <Text style={styles.recentTitle}>Nothing yet. You only joined this week.</Text>
        <Text style={styles.recentBody}>
          When our editors add a new Moment or Journey near you, it appears here. Never more than
          once a week.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: color.baseVariants.a },
  content: { padding: spacing.lg, paddingTop: spacing.xxl, paddingBottom: spacing.xxl },
  title: {
    fontFamily: font.serif,
    fontSize: 30,
    lineHeight: 34,
    color: color.textPrimary,
    marginTop: spacing.lg,
    maxWidth: 300,
  },
  subhead: {
    fontFamily: font.sans,
    fontSize: 13,
    lineHeight: 21,
    color: color.textSecondary,
    marginTop: spacing.sm,
    maxWidth: 300,
  },
  rows: {
    marginTop: spacing.xl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: color.hairlineMin,
  },
  rowText: {
    flexShrink: 1,
    gap: spacing.sm,
  },
  rowLabel: {
    fontFamily: font.serifRegular,
    fontSize: 17,
    color: color.textPrimary,
  },
  rowSub: {
    fontFamily: font.sans,
    fontSize: 12,
    lineHeight: 18,
    color: color.textSecondary,
    maxWidth: 230,
  },
  track: {
    width: 46,
    height: 26,
    borderRadius: radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 3,
    borderWidth: 1,
  },
  trackOn: {
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(192,160,98,.28)',
    borderColor: 'rgba(192,160,98,.6)',
  },
  trackOff: {
    justifyContent: 'flex-start',
    backgroundColor: 'rgba(240,233,223,.08)',
    borderColor: color.hairlineMax,
  },
  knob: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  knobOn: {
    backgroundColor: color.goldLight,
  },
  knobOff: {
    backgroundColor: color.textTertiary,
  },
  recentCard: {
    marginTop: spacing.xl,
    padding: spacing.lg,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: color.hairlineMax,
    backgroundColor: 'rgba(240,233,223,.02)',
    gap: spacing.sm,
  },
  recentTitle: {
    fontFamily: font.serifRegular,
    fontSize: 18,
    lineHeight: 24,
    color: color.textPrimary,
  },
  recentBody: {
    fontFamily: font.sans,
    fontSize: 12.5,
    lineHeight: 20,
    color: color.textSecondary,
  },
});
