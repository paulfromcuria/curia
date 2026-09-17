import { Redirect } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { useSession } from '../lib/state/session';
import { color, font } from '../theme';

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
 *   hydrate error -> retry screen (see below — checked first, deliberately)
 *   not authenticated -> login
 *   authenticated, onboarding incomplete -> onboarding (Do/Drink/Eat/You)
 *   onboarding complete, not subscribed -> subscription gate (must sit
 *     between onboarding and Map/List; completing onboarding alone must
 *     never grant access)
 *   otherwise -> Map (the tab shell)
 *
 * hydrateError checked before isAuthenticated/onboardingComplete, not
 * after — found live 2026-09-18 ("why have i been logged out... it was as
 * if it needed me to redo onboarding"): a real member IS still
 * authenticated when their profile fetch fails (a real user object is
 * already set), but onboardingComplete used to silently default to false
 * on that same failure, routing straight to /onboarding — no visible
 * error, just an experience indistinguishable from "you need to sign up
 * again". This screen makes that failure visible and retryable instead.
 */
export default function Index() {
  const { authReady, isAuthenticated, onboardingComplete, isSubscribed, hydrateError, retryHydrate } = useSession();

  if (!authReady) return <View style={{ flex: 1, backgroundColor: color.base }} />;
  if (hydrateError) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: color.base,
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          gap: 16,
        }}
      >
        <Text style={{ fontFamily: font.serif, fontSize: 22, color: color.textPrimary, textAlign: 'center' }}>
          Couldn&apos;t load your account.
        </Text>
        <Text style={{ fontFamily: font.sans, fontSize: 13, color: color.textSecondary, textAlign: 'center' }}>
          {hydrateError}
        </Text>
        <Pressable
          onPress={retryHydrate}
          style={{
            paddingVertical: 12,
            paddingHorizontal: 24,
            borderRadius: 999,
            backgroundColor: color.gold,
          }}
        >
          <Text style={{ fontFamily: font.sansMedium, fontSize: 13, color: color.goldText }}>Try again</Text>
        </Pressable>
      </View>
    );
  }
  if (!isAuthenticated) return <Redirect href="/(auth)/login" />;
  if (!onboardingComplete) return <Redirect href="/onboarding" />;
  if (!isSubscribed) return <Redirect href="/subscription" />;
  return <Redirect href="/(tabs)/map" />;
}
