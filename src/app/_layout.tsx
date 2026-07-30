import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';
import { useCuriaFonts } from '../hooks/use-curia-fonts';
import { configureMapbox } from '../lib/map/mapbox-config';
import { SessionProvider } from '../lib/state/session';
import { color } from '../theme';

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

  useEffect(() => {
    configureMapbox();
  }, []);

  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: color.base }} />;
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
