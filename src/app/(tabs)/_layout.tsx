import { Redirect, Tabs } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useSession } from '../../lib/state/session';
import { color, font } from '../../theme';

/**
 * The home tab shell — exactly 3 tabs (Hard rule 9): Map, List, Moments.
 * Profile/Saved/Notifications/Subscription are pushed screens reached via
 * the avatar emblem, never added here. See CLAUDE.md "Navigation shell".
 *
 * Guard duplicates `src/app/index.tsx`'s redirect chain so a deep link or
 * back-navigation straight into (tabs) can't skip auth/onboarding/the
 * subscription gate (Hard rule 4: completing onboarding alone must never
 * grant access to Map/List).
 */
export default function TabsLayout() {
  const { isAuthenticated, onboardingComplete, isSubscribed } = useSession();

  if (!isAuthenticated) return <Redirect href="/(auth)/login" />;
  if (!onboardingComplete) return <Redirect href="/onboarding" />;
  if (!isSubscribed) return <Redirect href="/subscription" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: color.goldLight,
        tabBarInactiveTintColor: color.textTertiary,
        tabBarShowLabel: true,
        tabBarLabelStyle: styles.tabLabel,
        tabBarItemStyle: styles.tabItem,
      }}
    >
      <Tabs.Screen
        name="map"
        options={{ title: 'Map', tabBarIcon: ({ focused }) => <TabMark focused={focused} /> }}
      />
      <Tabs.Screen
        name="list"
        options={{ title: 'List', tabBarIcon: ({ focused }) => <TabMark focused={focused} /> }}
      />
      <Tabs.Screen
        name="moments"
        options={{ title: 'Moments', tabBarIcon: ({ focused }) => <TabMark focused={focused} /> }}
      />
    </Tabs>
  );
}

/** The small gold underline mark the prototype uses instead of glyph icons. */
function TabMark({ focused }: { focused: boolean }) {
  return (
    <View
      style={{
        width: focused ? 16 : 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: focused ? color.gold : 'rgba(240,233,223,.2)',
      }}
    />
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: color.baseVariants.c,
    borderTopColor: color.hairlineMax,
    borderTopWidth: 1,
    height: 78,
    paddingTop: 10,
  },
  tabItem: {
    paddingTop: 4,
  },
  tabLabel: {
    fontFamily: font.sansMedium,
    fontSize: 10,
    letterSpacing: 2.2,
    textTransform: 'uppercase',
  },
});
