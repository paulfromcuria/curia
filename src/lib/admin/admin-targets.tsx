import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { supabaseAdmin } from '../data/supabase-admin-client';
import { useAdminSession } from './admin-session';

/**
 * Real, persisted admin-set targets for the dashboard KPI section
 * (supabase/migrations/0018_admin_targets.sql) — 2026-09-18, at explicit
 * user request for "metrics tracking development progress and database
 * depth etc with some targets". Plain direct RLS (admin_users-gated), not
 * a SECURITY DEFINER RPC like admin-members.tsx — no auth.users join
 * needed, no PII, so the simpler pattern (same idiom migration 0012 used
 * for growth-engine review access) is enough here.
 *
 * Deliberately no fabricated starting values — see that migration's own
 * header comment. A metric with no row here has no target set yet; the
 * dashboard shows an editable "Set a target" input instead of a bar.
 */
interface AdminTargetsContextValue {
  targets: Record<string, number>;
  loading: boolean;
  setTarget: (key: string, value: number) => Promise<void>;
}

const AdminTargetsContext = createContext<AdminTargetsContextValue | null>(null);

export function AdminTargetsProvider({ children }: { children: ReactNode }) {
  const { isAdminAuthenticated } = useAdminSession();
  const [targets, setTargets] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isAdminAuthenticated) {
      setTargets({});
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data } = await supabaseAdmin.from('admin_targets').select('key, target_value');
      if (cancelled) return;
      const map: Record<string, number> = {};
      for (const row of data ?? []) map[row.key] = row.target_value;
      setTargets(map);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [isAdminAuthenticated]);

  const setTarget = useCallback(async (key: string, value: number) => {
    setTargets((prev) => ({ ...prev, [key]: value }));
    await supabaseAdmin.from('admin_targets').upsert({ key, target_value: value, updated_at: new Date().toISOString() });
  }, []);

  const value = useMemo<AdminTargetsContextValue>(
    () => ({ targets, loading, setTarget }),
    [targets, loading, setTarget]
  );

  return <AdminTargetsContext.Provider value={value}>{children}</AdminTargetsContext.Provider>;
}

export function useAdminTargets(): AdminTargetsContextValue {
  const ctx = useContext(AdminTargetsContext);
  if (!ctx) throw new Error('useAdminTargets must be used within an AdminTargetsProvider');
  return ctx;
}
