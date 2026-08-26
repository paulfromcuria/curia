import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Kicker } from '../components/curia';
import { VENUES } from '../lib/data/seed';
import { useSession } from '../lib/state/session';
import { color, font, spacing } from '../theme';

/**
 * Real Profile/account screen (M7). Copy and layout are transcribed from the
 * Claude Design handoff bundle's `isProfile` block (Curia.dc.html) — avatar
 * initials, name/email, three stat tiles, two grouped row lists ("YOUR
 * TASTE" / "ACCOUNT"), and a log-out action. Reached only via the avatar
 * emblem (Hard rule 9), never a bottom tab.
 *
 * "Edit preferences" and "Account details" route back into the real
 * onboarding screen (src/app/onboarding.tsx) at a specific step via
 * `?step=`, per CLAUDE.md's Onboarding model — this deliberately does not
 * build a second, parallel preferences editor.
 *
 * "Travel" (2026-08, at explicit user request) is not in the design
 * prototype — added as one more row in YOUR TASTE rather than a new nav
 * destination, per the user's own framing ("much more subtle than map
 * list or journeys on the nav... maybe put into the profile"). See
 * src/app/travel.tsx.
 */
export default function Profile() {
  const router = useRouter();
  const session = useSession();

  const name = session.user?.name ?? 'Member';
  const email = session.user?.email ?? '';
  const initials = name
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const preferencesSetCount =
    session.tileCount('Do') + session.tileCount('Drink') + session.tileCount('Eat');

  const savedVenueNames = useMemo(() => {
    const ids = new Set<string>();
    session.savedCollections.forEach((c) => c.venueIds.forEach((id) => ids.add(id)));
    return Array.from(ids)
      .map((id) => VENUES.find((v) => v.id === id)?.name)
      .filter((n): n is string => Boolean(n));
  }, [session.savedCollections]);

  const savedJourneyCount = session.savedJourneyIds.length;
  const notificationsOnCount = Object.values(session.notificationPrefs).filter(Boolean).length;

  function summarize(names: string[]): string {
    if (names.length === 0) return 'Nothing saved yet';
    if (names.length <= 2) return names.join(', ');
    return `${names.slice(0, 2).join(', ')} and ${names.length - 2} more`;
  }

  function handleLogout() {
    session.logout();
    router.replace('/(auth)/login');
  }

  const stats: { value: number; label: string; onPress: () => void }[] = [
    { value: savedVenueNames.length, label: 'SAVED PLACES', onPress: () => router.push('/saved?view=places') },
    { value: savedJourneyCount, label: 'SAVED JOURNEYS', onPress: () => router.push('/saved?view=journeys') },
    { value: preferencesSetCount, label: 'PREFERENCES SET', onPress: () => router.push('/onboarding?step=Do') },
  ];

  const groups: { title: string; rows: { label: string; sub: string; onPress: () => void }[] }[] = [
    {
      title: 'YOUR TASTE',
      rows: [
        {
          label: 'Edit preferences',
          sub: 'Do, Drink, Eat and You — already filled in',
          onPress: () => router.push('/onboarding?step=Do'),
        },
        {
          label: 'Saved places',
          sub: summarize(savedVenueNames),
          onPress: () => router.push('/saved?view=places'),
        },
        {
          label: 'Saved journeys',
          sub: savedJourneyCount > 0 ? `${savedJourneyCount} kept` : 'Nothing saved yet',
          onPress: () => router.push('/saved?view=journeys'),
        },
        {
          label: 'Travel',
          sub: 'Where your taste says to go next, and when',
          onPress: () => router.push('/travel'),
        },
      ],
    },
    {
      title: 'ACCOUNT',
      rows: [
        {
          label: 'Account details',
          sub: [name, email].filter(Boolean).join(' · '),
          onPress: () => router.push('/onboarding?step=You'),
        },
        {
          label: 'Membership',
          sub: membershipSummary(session.subscriptionStatus, session.isSubscribed),
          onPress: () => router.push('/subscription'),
        },
        {
          label: 'Notifications',
          sub: `${notificationsOnCount} of 4 turned on`,
          onPress: () => router.push('/notifications'),
        },
      ],
    },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Kicker tone="tertiary">Account</Kicker>

      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarLabel}>{initials || '—'}</Text>
        </View>
        <View style={styles.headerText}>
          <Text style={styles.name}>{name}</Text>
          {email ? <Text style={styles.email}>{email}</Text> : null}
        </View>
      </View>

      <View style={styles.statsRow}>
        {stats.map((s) => (
          <Pressable key={s.label} onPress={s.onPress} style={styles.statCard}>
            <Text style={styles.statValue}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </Pressable>
        ))}
      </View>

      {groups.map((group) => (
        <View key={group.title} style={styles.group}>
          <Kicker>{group.title}</Kicker>
          <View style={styles.rows}>
            {group.rows.map((row) => (
              <Pressable key={row.label} onPress={row.onPress} style={styles.row}>
                <View style={styles.rowText}>
                  <Text style={styles.rowLabel}>{row.label}</Text>
                  <Text style={styles.rowSub}>{row.sub}</Text>
                </View>
                <Text style={styles.rowArrow}>→</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ))}

      <Button label="Log out" variant="secondary" onPress={handleLogout} />
      <Text style={styles.footer}>CURIA · MANCHESTER · CHESHIRE</Text>
    </ScrollView>
  );
}

function membershipSummary(status: string, isSubscribed: boolean): string {
  if (!isSubscribed) return 'Not started';
  return status === 'trialing' ? '£19.99 a month · in free trial' : '£19.99 a month · active';
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: color.baseVariants.a },
  content: { padding: spacing.lg, paddingTop: spacing.xxl, paddingBottom: spacing.xxl, gap: spacing.sm },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(192,160,98,.5)',
    backgroundColor: 'rgba(192,160,98,.08)',
  },
  avatarLabel: {
    fontFamily: font.serifRegular,
    fontSize: 20,
    color: color.goldLight,
  },
  headerText: {
    flexShrink: 1,
    gap: spacing.xs + 4,
  },
  name: {
    fontFamily: font.serif,
    fontSize: 28,
    lineHeight: 31,
    color: color.textPrimary,
  },
  email: {
    fontFamily: font.sans,
    fontSize: 12,
    letterSpacing: 1.4,
    color: color.textSecondary,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: spacing.lg,
  },
  statCard: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: color.hairlineMin,
    backgroundColor: 'rgba(240,233,223,.03)',
  },
  statValue: {
    fontFamily: font.serifRegular,
    fontSize: 22,
    color: color.textPrimary,
  },
  statLabel: {
    marginTop: spacing.sm,
    fontFamily: font.sans,
    fontSize: 9,
    letterSpacing: 1.4,
    color: color.textTertiary,
  },
  group: {
    marginTop: spacing.xl,
  },
  rows: {
    marginTop: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: color.hairlineMin,
  },
  rowText: {
    flexShrink: 1,
    gap: 6,
  },
  rowLabel: {
    fontFamily: font.serifRegular,
    fontSize: 17,
    color: color.textPrimary,
  },
  rowSub: {
    fontFamily: font.sans,
    fontSize: 11.5,
    lineHeight: 16,
    color: color.textSecondary,
  },
  rowArrow: {
    fontFamily: font.sans,
    fontSize: 14,
    color: color.textTertiary,
  },
  footer: {
    marginTop: spacing.lg,
    fontFamily: font.sans,
    fontSize: 10.5,
    letterSpacing: 1.4,
    color: color.mutedSurface,
    textAlign: 'center',
  },
});
