import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { AdminUser } from '../../types/models';
import { supabaseAdmin } from '../data/supabase-admin-client';

/**
 * Real admin auth for the curation surface (M8, made real 2026-09 at
 * explicit user request — see the "why are the users in the admin portal
 * demo users" conversation). Signs in against the same Supabase project as
 * the member app (src/lib/state/session.tsx) but through a SEPARATE client
 * (supabase-admin-client.ts) so the two sessions never collide in one
 * browser, and gates access on a second, admin-specific check: being
 * authenticated isn't enough, the signed-in account must also have a row in
 * `admin_users` (supabase/migrations/0001_init.sql, policy added in
 * 0004_admin_access.sql). There is no admin signup flow — an account
 * becomes an admin only via a manual, service-role insert into admin_users
 * (see that migration's own notes), matching how admin_users has no
 * insert/update/delete policy for anon/authenticated at all.
 *
 * State-update pattern mirrors session.tsx exactly: `login`/`logout` only
 * make the Supabase call and report pass/fail back to the caller; the
 * `onAuthStateChange` listener below is the single place `admin` state
 * actually gets set, so a persisted session (page refresh, app relaunch)
 * restores the same way an interactive login does, not via separate code
 * paths. `login` additionally awaits its own admin_users check so it can
 * reject + sign back out a real-but-non-admin account before the caller's
 * promise resolves — the listener runs the same check again right after
 * (harmless, idempotent) and is what actually updates `admin`.
 */
export interface AdminSessionContextValue {
  admin: AdminUser | null;
  isAdminAuthenticated: boolean;
  /** True once the persisted-session check on mount has resolved — mirrors
   * session.tsx's authReady, so a returning admin doesn't flash through
   * "logged out" before their session is restored. */
  authReady: boolean;
  login: (email: string, password: string) => Promise<{ error: string | null }>;
  logout: () => Promise<void>;
}

const AdminSessionContext = createContext<AdminSessionContextValue | null>(null);

async function resolveAdmin(userId: string, email: string | undefined): Promise<AdminUser | null> {
  const { data } = await supabaseAdmin.from('admin_users').select('id').eq('id', userId).maybeSingle();
  if (!data) return null;
  return { id: userId, email: email ?? '', role: 'admin' };
}

export function AdminSessionProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const { data: sub } = supabaseAdmin.auth.onAuthStateChange((_event, authSession) => {
      const user = authSession?.user;
      if (!user) {
        setAdmin(null);
        setAuthReady(true);
        return;
      }
      resolveAdmin(user.id, user.email).then((resolved) => {
        setAdmin(resolved);
        setAuthReady(true);
      });
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabaseAdmin.auth.signInWithPassword({ email: email.trim(), password });
    if (error || !data.user) return { error: error?.message ?? 'Sign-in failed.' };
    const resolved = await resolveAdmin(data.user.id, data.user.email);
    if (!resolved) {
      await supabaseAdmin.auth.signOut();
      return { error: 'This account does not have admin access.' };
    }
    return { error: null };
  }, []);

  const logout = useCallback(async () => {
    await supabaseAdmin.auth.signOut();
  }, []);

  const value = useMemo<AdminSessionContextValue>(
    () => ({ admin, isAdminAuthenticated: admin !== null, authReady, login, logout }),
    [admin, authReady, login, logout]
  );

  return <AdminSessionContext.Provider value={value}>{children}</AdminSessionContext.Provider>;
}

export function useAdminSession(): AdminSessionContextValue {
  const ctx = useContext(AdminSessionContext);
  if (!ctx) throw new Error('useAdminSession must be used within an AdminSessionProvider');
  return ctx;
}
