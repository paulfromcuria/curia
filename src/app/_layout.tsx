import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useCuriaFonts } from '../hooks/use-curia-fonts';
import { loadContentData } from '../lib/data/seed';
import { AdminDataProvider } from '../lib/admin/admin-data';
import { AdminMembersProvider } from '../lib/admin/admin-members';
import { AdminSessionProvider } from '../lib/admin/admin-session';
import { AdminTargetsProvider } from '../lib/admin/admin-targets';
import { configureMapbox } from '../lib/map/mapbox-config';
import { SessionProvider, resolveDeviceLocation } from '../lib/state/session';
import { color, font } from '../theme';

/** Cap on how long the boot gate waits for a real device fix before giving
 * up and opening with DEMO_LOCATION — see the loadInitialLocation effect
 * below for the bug this exists to fix. Long enough to cover the common
 * case (permission already granted from a prior visit, a quick wifi-based
 * fix) without meaningfully delaying first paint for someone who denies or
 * ignores the permission prompt; short enough that the slow/denied case
 * still feels like a normal app load, not a hang. */
const INITIAL_LOCATION_TIMEOUT_MS = 1500;

/**
 * Root stack. Curia is dark-mode-only end to end (CLAUDE.md) — the base
 * background applies at this level so every route inherits it before its
 * own content paints.
 *
 * Screen groups:
 *  - (auth): login/signup, no back stack
 *  - onboarding: Do/Drink/Eat/You, pushed after signup
 *  - (tabs): Map/List/Moments, the 3-tab home shell (Hard rule 9)
 *  - venue/[id], district/[id], journey/[id], profile, saved, subscription,
 *    notifications, walk, ride: pushed detail screens reached from within
 *    the tabs or from the profile emblem, never tabs themselves
 */
export default function RootLayout() {
  const [fontsLoaded] = useCuriaFonts();
  const [dataState, setDataState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [dataError, setDataError] = useState<string | null>(null);
  const [initialLocation, setInitialLocation] = useState<{ lat: number; lon: number } | null | undefined>(
    undefined
  );

  useEffect(() => {
    configureMapbox();
  }, []);

  // Real bug, found live 2026-09-22 ("every time i hard refresh the app it
  // places me in northern quarter before figuring out my location and
  // snapping to it"): the old geolocation effect lived inside
  // SessionProvider, which only mounted once loadContentData() below had
  // already resolved — so geolocation couldn't even start until the
  // content fetch finished, and Map always painted its first frame at
  // DEMO_LOCATION (central Manchester/Northern Quarter) regardless, then
  // visibly flew to the real fix a moment later. Racing this in parallel
  // with loadContentData(), capped at INITIAL_LOCATION_TIMEOUT_MS, means
  // the common case (permission already granted, a fast fix) resolves
  // before the gate below even opens — SessionProvider mounts already
  // knowing where the member is, so Map's first frame is the right one,
  // never a flash-then-snap. The slow/denied case (a hesitated-on
  // permission prompt, no GPS provider) still falls back to DEMO_LOCATION
  // and self-corrects later via SessionProvider's own fallback effect —
  // same as before this fix, just no longer the common case.
  useEffect(() => {
    let cancelled = false;
    Promise.race([
      resolveDeviceLocation(),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), INITIAL_LOCATION_TIMEOUT_MS)),
    ]).then((location) => {
      if (!cancelled) setInitialLocation(location);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Real content (venues/districts/tiles/moments/journeys) now lives in
  // Supabase, not bundled JSON — every screen that reads DISTRICTS/VENUES/
  // etc. (src/lib/data/seed.ts) assumes those arrays are already populated,
  // the same synchronous-feeling contract the old JSON mock had. This gate
  // is what makes that still true: nothing below renders until the one real
  // fetch has resolved.
  useEffect(() => {
    loadContentData()
      .then(() => setDataState('ready'))
      .catch((err) => {
        setDataError(err instanceof Error ? err.message : String(err));
        setDataState('error');
      });
  }, []);

  if (!fontsLoaded || dataState === 'loading' || initialLocation === undefined) {
    return <View style={{ flex: 1, backgroundColor: color.base }} />;
  }

  if (dataState === 'error') {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: color.base,
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          gap: 12,
        }}
      >
        <Text style={{ fontFamily: font.serif, fontSize: 22, color: color.textPrimary, textAlign: 'center' }}>
          Curia can't reach its database right now.
        </Text>
        <Text style={{ fontFamily: font.sans, fontSize: 13, color: color.textSecondary, textAlign: 'center' }}>
          {dataError}
        </Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: color.base }}>
      <SessionProvider initialLocation={initialLocation}>
        {/* 2026-09, bug fix at explicit user report ("nothing happens when
            clicking sign in" on /admin): AdminSessionProvider/AdminDataProvider
            used to live inside admin/_layout.tsx, nested alongside the same
            component that conditionally renders either <Redirect> or <Stack>
            depending on auth state. Every time that conditional flipped (e.g.
            right after a successful admin login), the whole admin layout
            subtree — including these two providers — remounted, silently
            resetting isAdminAuthenticated back to false and bouncing straight
            back to the login screen with no visible error. Moved up here,
            mirroring exactly how SessionProvider (member auth) already
            avoids the same trap by living outside any per-segment layout
            that does its own conditional redirect (see (tabs)/_layout.tsx
            and admin/_layout.tsx's own guard for the pattern this sidesteps).
            Safe to mount for the whole app, not just /admin — nothing outside
            admin/* screens ever calls useAdminSession()/useAdminData(). */}
        <AdminSessionProvider>
          <AdminMembersProvider>
            <AdminDataProvider>
              <AdminTargetsProvider>
                <StatusBar style="light" />
                <Stack
                  screenOptions={{
                    headerShown: false,
                    contentStyle: { backgroundColor: color.base },
                  }}
                >
                  <Stack.Screen name="(auth)" />
                  <Stack.Screen name="onboarding" />
                  <Stack.Screen name="subscription" />
                  <Stack.Screen name="(tabs)" />
                </Stack>
              </AdminTargetsProvider>
            </AdminDataProvider>
          </AdminMembersProvider>
        </AdminSessionProvider>
      </SessionProvider>
    </GestureHandlerRootView>
  );
}
