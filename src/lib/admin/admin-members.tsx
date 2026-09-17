import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { SpendLevel, SubscriptionStatus } from '../../types/models';
import { supabaseAdmin } from '../data/supabase-admin-client';
import { useAdminSession } from './admin-session';

/**
 * Real member data for the admin Users screen (2026-09, replaces the
 * fabricated src/lib/admin/demo-users.ts). Fetched via the admin_list_members
 * Postgres function (supabase/migrations/0004_admin_access.sql) — a
 * SECURITY DEFINER RPC rather than a plain table select, because it needs
 * to join in auth.users.email (never exposed via PostgREST/RLS directly)
 * and because "every member, not just the caller's own row" is exactly the
 * kind of broad read Row Level Security is designed to prevent by default;
 * the function does its own admin_users check server-side instead.
 *
 * Shape mirrors demo-users.ts's DemoMember field-for-field on purpose, so
 * the Users screens' rendering code barely changed when this replaced it.
 */
export interface AdminMember {
  id: string;
  name: string;
  email: string;
  subscriptionStatus: SubscriptionStatus;
  spendLevel: SpendLevel;
  onboardingComplete: boolean;
  /** Real onboarding Tile catalog ids (`${category}|${name}`), aggregated
   * across all of a member's Do/Drink/Eat/Holiday selections. */
  selectedTileIds: string[];
  /** ISO date string, e.g. "2026-03-14" — sliced from profiles.created_at. */
  joinDate: string;
  /** Real Supabase Auth column (auth.users.last_sign_in_at) — null if they
   * signed up but have never actually signed back in. */
  lastSignInAt: string | null;
  savedVenueCount: number;
  ratedVenueCount: number;
}

interface AdminListMembersRow {
  id: string;
  email: string;
  name: string;
  subscription_status: SubscriptionStatus;
  onboarding_complete: boolean;
  spend_level: SpendLevel;
  selected_tile_ids: string[] | null;
  created_at: string;
  last_sign_in_at: string | null;
  saved_venue_count: number;
  rated_venue_count: number;
}

function mapRow(row: AdminListMembersRow): AdminMember {
  return {
    id: row.id,
    name: row.name || '(no name)',
    email: row.email,
    subscriptionStatus: row.subscription_status,
    spendLevel: row.spend_level,
    onboardingComplete: row.onboarding_complete,
    selectedTileIds: row.selected_tile_ids ?? [],
    joinDate: row.created_at.slice(0, 10),
    lastSignInAt: row.last_sign_in_at,
    savedVenueCount: row.saved_venue_count,
    ratedVenueCount: row.rated_venue_count,
  };
}

interface AdminMembersContextValue {
  members: AdminMember[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

const AdminMembersContext = createContext<AdminMembersContextValue | null>(null);

export function AdminMembersProvider({ children }: { children: ReactNode }) {
  const { isAdminAuthenticated } = useAdminSession();
  const [members, setMembers] = useState<AdminMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    if (!isAdminAuthenticated) {
      setMembers([]);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      const { data, error: rpcError } = await supabaseAdmin.rpc('admin_list_members');
      if (cancelled) return;
      if (rpcError) {
        setError(rpcError.message);
      } else {
        setMembers(((data ?? []) as AdminListMembersRow[]).map(mapRow));
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [isAdminAuthenticated, refreshToken]);

  const refresh = useCallback(() => setRefreshToken((n) => n + 1), []);

  const value = useMemo<AdminMembersContextValue>(
    () => ({ members, loading, error, refresh }),
    [members, loading, error, refresh]
  );

  return <AdminMembersContext.Provider value={value}>{children}</AdminMembersContext.Provider>;
}

export function useAdminMembers(): AdminMembersContextValue {
  const ctx = useContext(AdminMembersContext);
  if (!ctx) throw new Error('useAdminMembers must be used within an AdminMembersProvider');
  return ctx;
}
