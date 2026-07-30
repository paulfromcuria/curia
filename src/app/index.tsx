import { Redirect } from 'expo-router';

/**
 * Entry redirect. No auth/subscription backend exists yet (Supabase +
 * Stripe are credential gaps per CLAUDE.md), so this always sends a fresh
 * launch to login. `curia-onboarding` replaces this with a real
 * session/subscription check once auth exists — the gate must sit after
 * onboarding, before Map/List (Hard rule 4).
 */
export default function Index() {
  return <Redirect href="/(auth)/login" />;
}
