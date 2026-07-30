import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Kicker, TextField } from '../../components/curia';
import { useAdminSession } from '../../lib/admin/admin-session';
import { color, font, spacing } from '../../theme';

/**
 * Mock admin sign-in. There is no Supabase project yet (CLAUDE.md
 * credential gap) — mirrors src/lib/state/session.tsx's member login
 * pattern: any well-formed email + non-empty password is accepted, no real
 * credential is checked. This session is entirely separate from the
 * member app's login (src/app/(auth)/login.tsx) — it neither reads nor
 * writes member session state, and grants no access to member screens.
 */
export default function AdminLogin() {
  const router = useRouter();
  const { login } = useAdminSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  function onSignIn() {
    if (!email.trim() || !email.includes('@')) {
      setError('Enter a valid email address.');
      return;
    }
    if (!password) {
      setError('Enter a password.');
      return;
    }
    setError(null);
    login(email.trim());
    router.replace('/(admin)');
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View>
          <Kicker tone="tertiary">Curia Admin</Kicker>
          <Text style={styles.title}>Curation tools</Text>
          <Text style={styles.blurb}>
            Internal-only. Not part of the member app — venues, districts, moments and journeys
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
          />
          <TextField
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Your password"
            secureTextEntry
            textContentType="password"
          />
          {error ? <Text style={styles.errorBanner}>{error}</Text> : null}
        </View>

        <Button label="Sign in" onPress={onSignIn} />
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
