import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useCuriaFonts } from '../hooks/use-curia-fonts';
import { loadContentData } from '../lib/data/seed';
import { configureMapbox } from '../lib/map/mapbox-config';
import { SessionProvider } from '../lib/state/session';
import { color, font } from '../theme';

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

  useEffect(() => {
    configureMapbox();
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

  if (!fontsLoaded || dataState === 'loading') {
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
      <SessionProvider>
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
      </SessionProvider>
    </GestureHandlerRootView>
  );
}
