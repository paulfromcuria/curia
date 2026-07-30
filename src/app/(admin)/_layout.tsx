import { Redirect, Stack, useSegments } from 'expo-router';
import { AdminDataProvider } from '../../lib/admin/admin-data';
import { AdminSessionProvider, useAdminSession } from '../../lib/admin/admin-session';
import { color } from '../../theme';

/**
 * Admin curation surface (M8, curia-admin) — a separate top-level route
 * group from the member-facing app, per the M8 brief and
 * .claude/agents/curia-admin.md ("a separate surface from the
 * member-facing mobile app"). Nothing in (auth), (tabs), onboarding, or any
 * pushed member screen links here — reaching `/(admin)` means navigating
 * to it directly (e.g. by URL), there is no in-app entry point.
 *
 * Provides its own mock session (src/lib/admin/admin-session.tsx) —
 * entirely separate from src/lib/state/session.tsx's member
 * SessionProvider — and its own in-memory CRUD data store
 * (src/lib/admin/admin-data.tsx) seeded from the same src/lib/data/seed.ts
 * loader every other surface reads from.
 */
export default function AdminLayout() {
  return (
    <AdminSessionProvider>
      <AdminDataProvider>
        <GuardedAdminStack />
      </AdminDataProvider>
    </AdminSessionProvider>
  );
}

/** Same guard-in-the-layout idiom src/app/(tabs)/_layout.tsx and
 * src/app/index.tsx already use for the member app's auth chain — except
 * here the group's own login screen lives inside this same Stack, so the
 * check also has to let `login` itself through and bounce an already
 * signed-in admin away from it. */
function GuardedAdminStack() {
  const { isAdminAuthenticated } = useAdminSession();
  const segments = useSegments();
  const isLoginRoute = segments[segments.length - 1] === 'login';

  if (!isAdminAuthenticated && !isLoginRoute) {
    return <Redirect href="/(admin)/login" />;
  }
  if (isAdminAuthenticated && isLoginRoute) {
    return <Redirect href="/(admin)" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: color.base },
      }}
    />
  );
}
