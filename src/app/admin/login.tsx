import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Kicker, TextField } from '../../components/curia';
import { useAdminSession } from '../../lib/admin/admin-session';
import { color, font, spacing } from '../../theme';

/**
 * Real admin sign-in (2026-09) — backed by Supabase Auth through a separate
 * client (supabase-admin-client.ts) plus an admin_users role check
 * (admin-session.tsx). This session is entirely separate from the member
 * app's login (src/app/(auth)/login.tsx) — different client, different
 * storage key, it neither reads nor writes member session state, and grants
 * no access to member screens. An account needs a row in `admin_users`
 * (a manual, service-role-only insert — there is no admin signup flow) or
 * `login` rejects it even with a correct password.
 *
 * 2026-09, bug fix at explicit user report ("nothing happens when clicking
 * sign in"): this used to also call `router.replace('/admin')` right after
 * `login()`, racing against `_layout.tsx`'s own reactive `<Redirect>` (which
 * fires as soon as `isAdminAuthenticated` flips true). Two overlapping
 * navigation actions targeting the same destination caused the admin
 * segment's layout — and the `AdminSessionProvider` state it owns — to
 * remount, wiping `isAdminAuthenticated` straight back to false and
 * bouncing back to /admin/login with no visible error. The member app's
 * (auth)/login.tsx does something that looks similar (an explicit
 * `router.replace('/')` after login), but that's safe: `SessionProvider`
 * lives at the true app root in the root _layout.tsx, not inside a
 * per-segment layout, so it never remounts on this kind of navigation.
 * Simplest fix here: let the layout's own reactive redirect be the only
 * thing that navigates post-login — this screen just updates auth state.
 */
export default function AdminLogin() {
  const { login } = useAdminSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSignIn() {
    if (!email.trim() || !email.includes('@')) {
      setError('Enter a valid email address.');
      return;
    }
    if (!password) {
      setError('Enter a password.');
      return;
    }
    setError(null);
    setSubmitting(true);
    const { error: authError } = await login(email.trim(), password);
    setSubmitting(false);
    if (authError) {
      setError(authError);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View>
          <Kicker tone="tertiary">Curia Admin</Kicker>
          <Text style={styles.title}>Curation tools</Text>
          <Text style={styles.blurb}>
            Internal-only. Not part of the member app: venues, districts, moments and journeys
            are curated here before anything reaches a member&apos;s map.
          </Text>
        </View>

        <View style={styles.fields}>
          <TextField
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="curator@curia.internal"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="emailAddress"
            autoComplete="email"
          />
          <TextField
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Your password"
            secureTextEntry
            textContentType="password"
            autoComplete="current-password"
          />
          {error ? <Text style={styles.errorBanner}>{error}</Text> : null}
        </View>

        <Button label={submitting ? 'Signing in…' : 'Sign in'} onPress={onSignIn} disabled={submitting} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: color.base },
  container: {
    flexGrow: 1,
    justifyContent: 'flex-end',
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  title: {
    fontFamily: font.serif,
    fontSize: 34,
    color: color.textPrimary,
    marginTop: spacing.md,
  },
  blurb: {
    fontFamily: font.sans,
    fontSize: 13,
    lineHeight: 21,
    color: color.textSecondary,
    maxWidth: 320,
  },
  fields: { gap: spacing.xs },
  errorBanner: {
    marginTop: spacing.xs,
    fontFamily: font.sans,
    fontSize: 12,
    color: color.goldHover,
  },
});
