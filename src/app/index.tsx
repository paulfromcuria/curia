import { Redirect } from 'expo-router';
import { View } from 'react-native';
import { useSession } from '../lib/state/session';
import { color } from '../theme';

/**
 * Entry redirect. Real session persistence now exists (Supabase Auth,
 * src/lib/state/session.tsx) — a returning member's session is restored
 * automatically, but that restore is itself async, so this waits on
 * `authReady` before deciding anything. Without that wait, a real returning
 * member would flash through "logged out" -> login for a moment on every
 * fresh launch, since `isAuthenticated` starts false until the persisted
 * session check resolves.
 *
 * Order after that matches CLAUDE.md's Navigation shell + Hard rule 4:
 *   not authenticated -> login
 *   authenticated, onboarding incomplete -> onboarding (Do/Drink/Eat/You)
 *   onboarding complete, not subscribed -> subscription gate (must sit
 *     between onboarding and Map/List; completing onboarding alone must
 *     never grant access)
 *   otherwise -> Map (the tab shell)
 */
export default function Index() {
  const { authReady, isAuthenticated, onboardingComplete, isSubscribed } = useSession();

  if (!authReady) return <View style={{ flex: 1, backgroundColor: color.base }} />;
  if (!isAuthenticated) return <Redirect href="/(auth)/login" />;
  if (!onboardingComplete) return <Redirect href="/onboarding" />;
  if (!isSubscribed) return <Redirect href="/subscription" />;
  return <Redirect href="/(tabs)/map" />;
}
