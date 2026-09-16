import { Redirect, Stack } from 'expo-router';
import { useSession } from '../../lib/state/session';

/**
 * Real gap found 2026-09 while investigating a reported "session
 * persistence" bug: this group had no guard at all, so an already-signed-in
 * member landing directly on /login or /signup (a bookmark, browser
 * back-navigation, an old link) saw the auth form instead of being sent
 * wherever they actually belong. The root "/" route (src/app/index.tsx)
 * already had this exact redirect chain — turns out the underlying session
 * restore was working correctly the whole time; testing kept deep-linking
 * straight to /login, the one screen with no reason to know about that.
 * Mirrors the same guard-in-the-group-layout pattern (tabs)/_layout.tsx and
 * admin/_layout.tsx already use, reading the same authReady/isAuthenticated
 * state SessionProvider (mounted at the true root, src/app/_layout.tsx)
 * already provides — no new provider, no remount risk.
 */
export default function AuthLayout() {
  const { authReady, isAuthenticated, onboardingComplete, isSubscribed } = useSession();

  if (authReady && isAuthenticated) {
    if (!onboardingComplete) return <Redirect href="/onboarding" />;
    if (!isSubscribed) return <Redirect href="/subscription" />;
    return <Redirect href="/(tabs)/map" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
