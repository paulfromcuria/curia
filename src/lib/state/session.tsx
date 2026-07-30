import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type {
  DietaryRequirement,
  ReligiousObservance,
  SpendLevel,
  SubscriptionStatus,
  TileCategory,
  UserPreference,
  YouProfile,
} from '../../types/models';

/**
 * In-memory session/auth/onboarding/subscription state for the app.
 *
 * There is no Supabase project or Stripe account wired up yet (both are
 * genuine credential gaps per CLAUDE.md "Still genuinely open" and "Tech
 * stack") — this is a local mock standing in for both. Login/signup accept
 * any well-formed input and never check a real password; subscription
 * status is a local flag the user can toggle from the membership screen
 * instead of a real Stripe charge. Everything here lives only for the
 * current app session (no AsyncStorage/persistence dependency exists in
 * this project yet) — a fresh launch always starts logged out, matching
 * `src/app/index.tsx`'s existing "always send a fresh launch to login"
 * comment.
 *
 * Replace the bodies of `login`/`signup` with real Supabase calls and
 * `startTrial`/`cancelMembership` with real Stripe calls when those
 * credentials exist — the shape (User/UserPreference/YouProfile from
 * src/types/models.ts) is already built to match, so screens shouldn't need
 * to change.
 */

export interface SessionUser {
  id: string;
  name: string;
  email: string;
}

/** Sub-preference toggle keys are scoped per-tile as `${tileName}|${subPreferenceLabel}`,
 * not just the label, because the same sub-preference label (e.g. "Dress code")
 * recurs across multiple tiles within a category (Nightclubs, Members' clubs,
 * Fine dining all have their own "Dress code") — a bare-label key would let one
 * tile's toggle bleed into another's. This is a key-format convention only;
 * `UserPreference.subPreferenceState` in src/types/models.ts is untouched. */
export function subPreferenceKey(tileName: string, subPreference: string): string {
  return `${tileName}|${subPreference}`;
}

const EMPTY_PREFERENCE = (category: TileCategory): UserPreference => ({
  category,
  selectedTileIds: [],
  subPreferenceState: {},
});

const DEFAULT_YOU: YouProfile = {
  spendLevel: 3,
  dietary: [],
  pet: 'none',
  religiousObservance: [],
};

interface SessionState {
  user: SessionUser | null;
  onboardingComplete: boolean;
  preferences: Record<TileCategory, UserPreference>;
  you: YouProfile;
  subscriptionStatus: SubscriptionStatus;
  /**
   * Search radius in miles, shared between Map and List. Lives here (not as
   * separate per-screen state) so the two tabs can never drift apart on it —
   * Hard rule 5 / the prototype's own description: "Map and List share one
   * radius and one context, so switching tabs never changes the answer."
   * Both M5 builds independently flagged that this wasn't wired up yet
   * (List had its own local slider state, Map used a fixed constant);
   * closing that gap here rather than in either screen. 0.9mi matches the
   * prototype's own initial radius value.
   */
  radiusMiles: number;
}

const DEFAULT_RADIUS_MILES = 0.9;

const INITIAL_STATE: SessionState = {
  user: null,
  onboardingComplete: false,
  preferences: {
    Do: EMPTY_PREFERENCE('Do'),
    Drink: EMPTY_PREFERENCE('Drink'),
    Eat: EMPTY_PREFERENCE('Eat'),
  },
  you: DEFAULT_YOU,
  subscriptionStatus: 'none',
  radiusMiles: DEFAULT_RADIUS_MILES,
};

/** Exported so shared, non-screen-owned modules (e.g.
 * src/lib/scoring/session-input.ts, which builds a real MatchmakingInput out
 * of live session state for Map/List) can type against the real session
 * shape instead of redeclaring an ad hoc lookalike. */
export interface SessionContextValue extends SessionState {
  isAuthenticated: boolean;
  /** True once the subscription gate has been cleared (Hard rule 4: this is
   * distinct from `onboardingComplete` — completing onboarding alone must
   * never grant access). */
  isSubscribed: boolean;
  signup: (name: string, email: string) => void;
  login: (email: string) => void;
  logout: () => void;
  tileCount: (category: TileCategory) => number;
  toggleTile: (category: TileCategory, tileId: string) => void;
  isSubPreferenceOn: (category: TileCategory, tileName: string, sub: string) => boolean;
  toggleSubPreference: (category: TileCategory, tileName: string, sub: string) => void;
  setSpendLevel: (level: SpendLevel) => void;
  toggleDietary: (value: DietaryRequirement) => void;
  setPet: (value: YouProfile['pet']) => void;
  toggleReligiousObservance: (value: ReligiousObservance) => void;
  setGender: (value: YouProfile['gender']) => void;
  setAgeRange: (value: YouProfile['ageRange']) => void;
  setRelationshipStatus: (value: YouProfile['relationshipStatus']) => void;
  completeOnboarding: () => void;
  startTrial: () => void;
  cancelMembership: () => void;
  setRadiusMiles: (miles: number) => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>(INITIAL_STATE);

  const signup = useCallback((name: string, email: string) => {
    setState((s) => ({
      ...s,
      user: { id: email.toLowerCase(), name, email },
    }));
  }, []);

  const login = useCallback((email: string) => {
    setState((s) => ({
      ...s,
      user: { id: email.toLowerCase(), name: s.user?.name ?? email.split('@')[0], email },
      // Mock-backend simplification: a real backend would already know this
      // member finished onboarding (CLAUDE.md Navigation shell: "Returning
      // members land directly on Map"). There's no Supabase project to check
      // against yet, so "signing in" (vs. "creating an account") is what
      // marks onboarding complete here. Subscription status is left as-is —
      // still gated per Hard rule 4, not assumed from a prior session.
      onboardingComplete: true,
    }));
  }, []);

  const logout = useCallback(() => setState(INITIAL_STATE), []);

  const tileCount = useCallback(
    (category: TileCategory) => state.preferences[category].selectedTileIds.length,
    [state.preferences]
  );

  const toggleTile = useCallback((category: TileCategory, tileId: string) => {
    setState((s) => {
      const current = s.preferences[category];
      const selected = current.selectedTileIds.includes(tileId)
        ? current.selectedTileIds.filter((id) => id !== tileId)
        : [...current.selectedTileIds, tileId];
      return {
        ...s,
        preferences: { ...s.preferences, [category]: { ...current, selectedTileIds: selected } },
      };
    });
  }, []);

  const isSubPreferenceOn = useCallback(
    (category: TileCategory, tileName: string, sub: string) => {
      const key = subPreferenceKey(tileName, sub);
      const value = state.preferences[category].subPreferenceState[key];
      // Sub-preferences default ON ("I want this") — Hard rule 2. Absence of
      // an entry means it has never been turned off.
      return value ?? true;
    },
    [state.preferences]
  );

  const toggleSubPreference = useCallback((category: TileCategory, tileName: string, sub: string) => {
    setState((s) => {
      const current = s.preferences[category];
      const key = subPreferenceKey(tileName, sub);
      const wasOn = current.subPreferenceState[key] ?? true;
      return {
        ...s,
        preferences: {
          ...s.preferences,
          [category]: {
            ...current,
            subPreferenceState: { ...current.subPreferenceState, [key]: !wasOn },
          },
        },
      };
    });
  }, []);

  const setSpendLevel = useCallback((level: SpendLevel) => {
    setState((s) => ({ ...s, you: { ...s.you, spendLevel: level } }));
  }, []);

  const toggleDietary = useCallback((value: DietaryRequirement) => {
    setState((s) => {
      const has = s.you.dietary.includes(value);
      const dietary = has ? s.you.dietary.filter((d) => d !== value) : [...s.you.dietary, value];
      return { ...s, you: { ...s.you, dietary } };
    });
  }, []);

  const setPet = useCallback((value: YouProfile['pet']) => {
    setState((s) => ({ ...s, you: { ...s.you, pet: value } }));
  }, []);

  const toggleReligiousObservance = useCallback((value: ReligiousObservance) => {
    setState((s) => {
      const has = s.you.religiousObservance.includes(value);
      const religiousObservance = has
        ? s.you.religiousObservance.filter((v) => v !== value)
        : [...s.you.religiousObservance, value];
      return { ...s, you: { ...s.you, religiousObservance } };
    });
  }, []);

  const setGender = useCallback((value: YouProfile['gender']) => {
    setState((s) => ({ ...s, you: { ...s.you, gender: value } }));
  }, []);

  const setAgeRange = useCallback((value: YouProfile['ageRange']) => {
    setState((s) => ({ ...s, you: { ...s.you, ageRange: value } }));
  }, []);

  const setRelationshipStatus = useCallback((value: YouProfile['relationshipStatus']) => {
    setState((s) => ({ ...s, you: { ...s.you, relationshipStatus: value } }));
  }, []);

  const completeOnboarding = useCallback(() => {
    setState((s) => ({ ...s, onboardingComplete: true }));
  }, []);

  // Mock billing (CLAUDE.md: Stripe key is a genuine credential gap — see
  // src/lib/config/subscription.ts). `trialing` is treated as subscribed for
  // gating purposes, same as a real Stripe trial would be.
  const startTrial = useCallback(() => {
    setState((s) => ({ ...s, subscriptionStatus: 'trialing' }));
  }, []);

  const cancelMembership = useCallback(() => {
    setState((s) => ({ ...s, subscriptionStatus: 'none' }));
  }, []);

  const setRadiusMiles = useCallback((miles: number) => {
    setState((s) => ({ ...s, radiusMiles: miles }));
  }, []);

  const value = useMemo<SessionContextValue>(
    () => ({
      ...state,
      isAuthenticated: state.user !== null,
      isSubscribed: state.subscriptionStatus === 'trialing' || state.subscriptionStatus === 'active',
      signup,
      login,
      logout,
      tileCount,
      toggleTile,
      isSubPreferenceOn,
      toggleSubPreference,
      setSpendLevel,
      toggleDietary,
      setPet,
      toggleReligiousObservance,
      setGender,
      setAgeRange,
      setRelationshipStatus,
      completeOnboarding,
      startTrial,
      cancelMembership,
      setRadiusMiles,
    }),
    [
      state,
      signup,
      login,
      logout,
      tileCount,
      toggleTile,
      isSubPreferenceOn,
      toggleSubPreference,
      setSpendLevel,
      toggleDietary,
      setPet,
      toggleReligiousObservance,
      setGender,
      setAgeRange,
      setRelationshipStatus,
      completeOnboarding,
      startTrial,
      cancelMembership,
      setRadiusMiles,
    ]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within a SessionProvider');
  return ctx;
}
