import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { AdminUser } from '../../types/models';

/**
 * Mock admin auth for the curation surface (M8). Mirrors the pattern
 * src/lib/state/session.tsx uses for member auth: there is no Supabase
 * project yet (a genuine credential gap per CLAUDE.md "Tech stack" / "Still
 * genuinely open"), so this accepts any well-formed email + non-empty
 * password and never checks a real credential store.
 *
 * `AdminUser.role` is a single role at launch (`AdminRole = 'admin'` in
 * src/types/models.ts) — there is deliberately no permission system here.
 *
 * This context is entirely separate from src/lib/state/session.tsx's
 * member SessionProvider: no shared state, no shared login, and nothing
 * here is reachable from or imported into any member-facing screen.
 */
export interface AdminSessionContextValue {
  admin: AdminUser | null;
  isAdminAuthenticated: boolean;
  login: (email: string) => void;
  logout: () => void;
}

const AdminSessionContext = createContext<AdminSessionContextValue | null>(null);

export function AdminSessionProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminUser | null>(null);

  const login = useCallback((email: string) => {
    const normalized = email.trim().toLowerCase();
    setAdmin({ id: normalized, email: normalized, role: 'admin' });
  }, []);

  const logout = useCallback(() => setAdmin(null), []);

  const value = useMemo<AdminSessionContextValue>(
    () => ({ admin, isAdminAuthenticated: admin !== null, login, logout }),
    [admin, login, logout]
  );

  return <AdminSessionContext.Provider value={value}>{children}</AdminSessionContext.Provider>;
}

export function useAdminSession(): AdminSessionContextValue {
  const ctx = useContext(AdminSessionContext);
  if (!ctx) throw new Error('useAdminSession must be used within an AdminSessionProvider');
  return ctx;
}
