import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Kicker, TextField } from '../../components/curia';
import { trialCopy } from '../../lib/config/subscription';
import { useSession } from '../../lib/state/session';
import { color, font, spacing } from '../../theme';

/**
 * Create-account screen. Copy/fields match the prototype's `signing` case
 * (Curia.dc.html `authTitle`/`authBlurb`/`authFields`/`authFoot`) exactly,
 * except the membership figure is pulled from the shared subscription
 * config rather than hardcoded (CLAUDE.md "Subscription"). Backed by real
 * Supabase Auth (src/lib/state/session.tsx) — if the project has email
 * confirmation switched on, signUp succeeds but doesn't return a session
 * until the member clicks the link in their inbox; `needsConfirmation`
 * below covers that case with real copy instead of silently hanging on
 * "Continue".
 */
export default function Signup() {
  const router = useRouter();
  const { signup } = useSession();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);

  async function onContinue() {
    if (!name.trim()) {
      setError('Tell us your name.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Enter a valid email address.');
      return;
    }
    if (password.length < 8) {
      setError('At least eight characters.');
      return;
    }
    setError(null);
    setSubmitting(true);
    const { error: authError, hasSession } = await signup(name.trim(), email.trim(), password);
    setSubmitting(false);
    if (authError) {
      setError(authError);
      return;
    }
    if (hasSession) {
      router.replace('/onboarding');
    } else {
      setNeedsConfirmation(true);
    }
  }

  if (needsConfirmation) {
    return (
      <View style={[styles.flex, styles.container, styles.confirmCenter]}>
        <Kicker>Curia</Kicker>
        <Text style={styles.title}>Check your inbox.</Text>
        <Text style={styles.blurb}>
          We sent a confirmation link to {email.trim()}. Open it, then come back and sign in.
        </Text>
        <Button label="Go to sign in" onPress={() => router.replace('/(auth)/login')} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View>
          <Kicker>Curia</Kicker>
          <Text style={styles.title}>Tell us who is joining.</Text>
          <Text style={styles.blurb}>
            Two details now, four questions next. After that Curia only asks when something changes.
          </Text>
        </View>

        <View style={styles.fields}>
          <TextField label="Name" value={name} onChangeText={setName} placeholder="Alexandra Vance" textContentType="name" />
          <TextField
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@company.co.uk"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="emailAddress"
          />
          <TextField
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="At least eight characters"
            secureTextEntry
            textContentType="newPassword"
          />
          {error ? <Text style={styles.errorBanner}>{error}</Text> : null}
        </View>

        <View style={styles.actions}>
          <Button label={submitting ? 'Creating account…' : 'Continue'} onPress={onContinue} disabled={submitting} />
          <Button
            label="I already have an account"
            variant="secondary"
            onPress={() => router.replace('/(auth)/login')}
          />
          <Text style={styles.foot}>{trialCopy()}</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: color.baseVariants.c },
  container: {
    flexGrow: 1,
    justifyContent: 'flex-end',
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  title: {
    fontFamily: font.serif,
    fontSize: 40,
    lineHeight: 44,
    color: color.textPrimary,
    maxWidth: 290,
    marginTop: spacing.md,
  },
  blurb: {
    fontFamily: font.sans,
    fontSize: 13.5,
    lineHeight: 23,
    color: color.textSecondaryAlt,
    maxWidth: 280,
  },
  fields: {
    gap: spacing.xs,
  },
  confirmCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  errorBanner: {
    marginTop: spacing.xs,
    fontFamily: font.sans,
    fontSize: 12,
    color: color.goldHover,
  },
  actions: {
    gap: spacing.sm,
  },
  foot: {
    marginTop: spacing.xs,
    textAlign: 'center',
    fontFamily: font.sans,
    fontSize: 11.5,
    letterSpacing: 0.4,
    color: color.textSecondary,
  },
});
