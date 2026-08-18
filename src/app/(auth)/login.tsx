import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Kicker, TextField } from '../../components/curia';
import { useSession } from '../../lib/state/session';
import { color, font, spacing } from '../../theme';

/**
 * Sign-in screen. Copy and field set match the prototype's `authTitle` /
 * `authBlurb` / `authFields` / `authFoot` for the non-signup (`isAuth &&
 * !signing`) case exactly (Curia.dc.html). There is no Supabase project yet
 * (CLAUDE.md "Tech stack" credential gap), so this accepts any well-formed
 * email/password rather than checking a real account — see
 * src/lib/state/session.tsx for what a real backend swap replaces.
 */
export default function Login() {
  const router = useRouter();
  const { login } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  function onSignIn() {
    if (!email.trim() || !email.includes('@')) {
      setError('Enter a valid email address.');
      return;
    }
    if (!password) {
      setError('Enter your password.');
      return;
    }
    setError(null);
    login(email.trim());
    router.replace('/');
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View>
          <Kicker>Curia</Kicker>
          <Text style={styles.title}>The evening, already decided.</Text>
          <Text style={styles.blurb}>
            A private map of the rooms worth your night, across Manchester, Cheshire, and Los
            Angeles.
          </Text>
        </View>

        <View style={styles.fields}>
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
            placeholder="Your password"
            secureTextEntry
            textContentType="password"
          />
          {error ? <Text style={styles.errorBanner}>{error}</Text> : null}
        </View>

        <View style={styles.actions}>
          <Button label="Sign in" onPress={onSignIn} />
          <Button
            label="Create an account"
            variant="secondary"
            onPress={() => router.push('/(auth)/signup')}
          />
          <Text style={styles.foot}>Trouble signing in? We will send a link instead.</Text>
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
