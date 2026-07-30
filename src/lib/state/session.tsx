import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type {
  DietaryRequirement,
  ReligiousObservance,
  SavedCollection,
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

/**
 * Which-in-app notifications a member has switched on. Sourced from the
 * prototype's own `NOTIFS`/`notif` state (Curia.dc.html) — real copy and
 * real default values ("table" and "journey" and "editorial" on by default,
 * "district" off), not invented. There is no push/email provider wired up
 * yet (a genuine credential gap — flag it, don't guess at one per
 * .claude/agents/curia-profile.md) — these toggles are a real user
 * preference in the meantime, just with nothing generating real
 * notifications to send against them yet.
 */
export interface NotificationPrefs {
  table: boolean;
  journey: boolean;
  district: boolean;
  editorial: boolean;
}

const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  table: true,
  journey: true,
  district: false,
  editorial: true,
};

/** Every member starts with one default, un-deletable "Saved" collection
 * (matching the prototype's implicit single saved-places list) — user-named
 * additional collections are created via `createCollection`. */
export const DEFAULT_SAVED_COLLECTION_ID = 'default';

function defaultSavedCollections(userId: string): SavedCollection[] {
  return [{ id: DEFAULT_SAVED_COLLECTION_ID, userId, name: 'Saved', venueIds: [] }];
}

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
  /**
   * Shared saved-venue-collections layer (M7, curia-profile). Lives here —
   * not as screen-local state — for the same reason radiusMiles does: so
   * every screen that can save a venue (Map, List, venue detail) reads and
   * writes the one shared model instead of drifting apart. CLAUDE.md's
   * `SavedCollection` shape: a venue can belong to multiple named
   * collections. NOTE: as of M7, Map/List still have their own *local*,
   * unpersisted per-screen save-star toggles (src/app/(tabs)/list.tsx's
   * `savedVenueIds` state, and map.tsx's own) — they are not yet wired to
   * this shared store. That rewiring is flagged as follow-up work for
   * curia-map/curia-list, not done here, per this agent's brief not to
   * silently rewire another subagent's screens.
   */
  savedCollections: SavedCollection[];
  /** Saved whole-Journey bookmarks (CLAUDE.md `SavedJourney`). Journey
   * detail's "SAVE JOURNEY" button (src/app/journey/[id].tsx) reads/writes
   * this via `isJourneySaved`/`toggleSavedJourney` — an M9 QA pass found it
   * had shipped with its own local `useState` instead, which has since been
   * fixed to use these actions. */
  savedJourneyIds: string[];
  notificationPrefs: NotificationPrefs;
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
  savedCollections: defaultSavedCollections(''),
  savedJourneyIds: [],
  notificationPrefs: DEFAULT_NOTIFICATION_PREFS,
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
  /** True if venueId appears in any saved collection. */
  isVenueSaved: (venueId: string) => boolean;
  /** Toggles venueId in/out of a collection (defaults to the "Saved" default collection). */
  toggleSavedVenue: (venueId: string, collectionId?: string) => void;
  /** Creates a new empty named collection and returns its id. */
  createCollection: (name: string) => string;
  removeVenueFromCollection: (collectionId: string, venueId: string) => void;
  isJourneySaved: (journeyId: string) => boolean;
  toggleSavedJourney: (journeyId: string) => void;
  toggleNotificationPref: (key: keyof NotificationPrefs) => void;
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

  const isVenueSaved = useCallback(
    (venueId: string) => state.savedCollections.some((c) => c.venueIds.includes(venueId)),
    [state.savedCollections]
  );

  const toggleSavedVenue = useCallback(
    (venueId: string, collectionId: string = DEFAULT_SAVED_COLLECTION_ID) => {
      setState((s) => ({
        ...s,
        savedCollections: s.savedCollections.map((c) => {
          if (c.id !== collectionId) return c;
          const has = c.venueIds.includes(venueId);
          return {
            ...c,
            venueIds: has ? c.venueIds.filter((id) => id !== venueId) : [...c.venueIds, venueId],
          };
        }),
      }));
    },
    []
  );

  const createCollection = useCallback((name: string) => {
    const id = `collection-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setState((s) => ({
      ...s,
      savedCollections: [...s.savedCollections, { id, userId: s.user?.id ?? '', name, venueIds: [] }],
    }));
    return id;
  }, []);

  const removeVenueFromCollection = useCallback((collectionId: string, venueId: string) => {
    setState((s) => ({
      ...s,
      savedCollections: s.savedCollections.map((c) =>
        c.id === collectionId ? { ...c, venueIds: c.venueIds.filter((id) => id !== venueId) } : c
      ),
    }));
  }, []);

  const isJourneySaved = useCallback(
    (journeyId: string) => state.savedJourneyIds.includes(journeyId),
    [state.savedJourneyIds]
  );

  const toggleSavedJourney = useCallback((journeyId: string) => {
    setState((s) => {
      const has = s.savedJourneyIds.includes(journeyId);
      return {
        ...s,
        savedJourneyIds: has
          ? s.savedJourneyIds.filter((id) => id !== journeyId)
          : [...s.savedJourneyIds, journeyId],
      };
    });
  }, []);

  const toggleNotificationPref = useCallback((key: keyof NotificationPrefs) => {
    setState((s) => ({
      ...s,
      notificationPrefs: { ...s.notificationPrefs, [key]: !s.notificationPrefs[key] },
    }));
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
      isVenueSaved,
      toggleSavedVenue,
      createCollection,
      removeVenueFromCollection,
      isJourneySaved,
      toggleSavedJourney,
      toggleNotificationPref,
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
      isVenueSaved,
      toggleSavedVenue,
      createCollection,
      removeVenueFromCollection,
      isJourneySaved,
      toggleSavedJourney,
      toggleNotificationPref,
    ]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within a SessionProvider');
  return ctx;
}
