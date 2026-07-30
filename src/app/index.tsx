import { Redirect } from 'expo-router';
import { useSession } from '../lib/state/session';

/**
 * Entry redirect. Real session persistence doesn't exist yet (Supabase is a
 * credential gap per CLAUDE.md), so a fresh app launch always starts logged
 * out — but *within* a running session this now reflects real state instead
 * of always going to login.
 *
 * Order matters and mirrors CLAUDE.md's Navigation shell + Hard rule 4:
 *   not authenticated -> login
 *   authenticated, onboarding incomplete -> onboarding (Do/Drink/Eat/You)
 *   onboarding complete, not subscribed -> subscription gate (must sit
 *     between onboarding and Map/List; completing onboarding alone must
 *     never grant access)
 *   otherwise -> Map (the tab shell)
 */
export default function Index() {
  const { isAuthenticated, onboardingComplete, isSubscribed } = useSession();

  if (!isAuthenticated) return <Redirect href="/(auth)/login" />;
  if (!onboardingComplete) return <Redirect href="/onboarding" />;
  if (!isSubscribed) return <Redirect href="/subscription" />;
  return <Redirect href="/(tabs)/map" />;
}
