import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import * as Location from 'expo-location';
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
import type { MatchContext } from '../../types/matchmaking';
import { resolveContext } from '../scoring/rank-venues';
import { DEMO_LOCATION } from '../scoring/session-input';
import { fetchWeather } from '../weather/forecast';
import { supabase } from '../data/supabase-client';

/**
 * Real auth/profile/preferences/saved-data, backed by Supabase (see
 * supabase/migrations/*.sql). Replaces the local-only mock this module used
 * to be — every export/interface member below keeps the same name and
 * shape the mock had, so screens didn't need to change for this swap,
 * except login/signup/logout becoming async (real network calls) and
 * gaining an `authReady` flag (src/app/index.tsx waits on it before
 * deciding where to redirect, so a persisted session doesn't flash through
 * "logged out" on a fresh launch).
 *
 * `notificationPrefs` deliberately stays local-only, unpersisted — CLAUDE.md
 * doesn't list it in the core data model (there's no real push/email
 * provider to act on it yet either, a genuine credential gap), so it isn't
 * in supabase/migrations/0001_init.sql. Everything else that used to live
 * only in memory (the "You" profile, onboarding/subscription status, tile
 * preferences, saved venues/journeys) now round-trips through the
 * `profiles`/`user_preferences`/`saved_collections`/`saved_journeys`
 * tables, scoped by Row Level Security to auth.uid() — see that migration's
 * own RLS section.
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
 * notifications to send against them yet. Local-only, not persisted — see
 * this file's own top comment.
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

/**
 * The active in-session "mood" quick filter ("I'm in the mood to...").
 * `null` = no mood active. A category with an empty `tileIds` means "this
 * category, unnarrowed" — matching both Map's and List's prior local
 * behavior where picking a category alone (no tile narrowing) is still a
 * valid, active mood.
 */
export interface MoodSelection {
  category: TileCategory;
  tileIds: string[];
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
   * Day/time context ("Now" or an explicit day+band), shared between Map and
   * List for the same reason `radiusMiles` is — CLAUDE.md's "Known
   * implementation gaps": Map owned this locally, List didn't track it at
   * all (always implicitly "now"), so switching tabs could silently change
   * the answer, contradicting Hard rule 5 and the prototype's own promise
   * ("Map and List share one radius and one context..."). Only Map's
   * context-strip sheet writes to this (List has no day/time picker UI of
   * its own, per curia-list's brief), but List reads it so results and
   * copy ("RANKED FOR NOW" vs. a specific day/band) stay in sync.
   *
   * "Now" resolution stays passive/live (resolveContext() in
   * src/lib/scoring/rank-venues.ts reads the real clock fresh on every
   * call) rather than ticking on a timer — confirmed with the user: the
   * design source's own `NOW` is a hardcoded static value with no
   * clock-driven update logic anywhere, so it doesn't settle the question
   * either way, and passive recompute-on-render matches today's shipped
   * behavior without adding speculative polling.
   */
  context: MatchContext;
  /**
   * Active in-session "mood" quick filter, shared between Map and List for
   * the same reason as `context` above — both screens had their own local
   * mood state (Map: `{category, tiles: Record<string, boolean>}`, List:
   * separate `moodCategory`/`moodSlugs` state) that could disagree with each
   * other. `null` = no mood active.
   */
  mood: MoodSelection | null;
  /**
   * Real device location, once resolved (see the geolocation effect in
   * `SessionProvider` below). `null` until permission is granted and a fix
   * comes back — every consumer (session-input.ts's
   * `buildMatchmakingInputFromSession`, Map's "me" pin/recenter) must fall
   * back to `DEMO_LOCATION` while this is null, never assume it's set.
   * Shared here rather than per-screen so Map, List, venue detail, and
   * district guide all rank/measure distance from the same point — the
   * same reasoning as `radiusMiles`/`context`/`mood` (Hard rule 5's "one
   * radius and one context" extends naturally to "one location").
   */
  location: { lat: number; lon: number } | null;
  /**
   * The point matchmaking measures distance/radius from for ranking
   * purposes — defaults to real device location but follows wherever the
   * user has panned Map's camera to, the same way a real map app's "search
   * this area" behavior works. Deliberately a SEPARATE field from
   * `location` above, not a replacement for it: `location` stays the
   * ground truth for real physical distance (walk/ride ETAs), `searchOrigin`
   * is the "what am I browsing" point.
   */
  searchOrigin: { lat: number; lon: number };
  /**
   * Real forecast weather for the currently-resolved context (day + band)
   * and location. `null` until the fetch effect below resolves, or if it
   * fails — every consumer must fall back to the old static per-band mock
   * while this is null, same null-means-fallback pattern as `location`.
   */
  weather: string | null;
  /** Every member's saved-venue collections, loaded from `saved_collections`
   * / `saved_collection_venues` on login. Every member gets a default
   * un-deletable "Saved" collection at signup — see
   * supabase/migrations/0002_signup_defaults.sql's trigger, not created
   * client-side. */
  savedCollections: SavedCollection[];
  /** Saved whole-Journey bookmarks (CLAUDE.md `SavedJourney`), loaded from
   * `saved_journeys` on login. */
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
  context: { now: true },
  mood: null,
  location: null,
  searchOrigin: DEMO_LOCATION,
  weather: null,
  savedCollections: [],
  savedJourneyIds: [],
  notificationPrefs: DEFAULT_NOTIFICATION_PREFS,
};

/** Exported so shared, non-screen-owned modules (e.g.
 * src/lib/scoring/session-input.ts, which builds a real MatchmakingInput out
 * of live session state for Map/List) can type against the real session
 * shape instead of redeclaring an ad hoc lookalike. */
export interface SessionContextValue extends SessionState {
  isAuthenticated: boolean;
  /** True once the initial auth check (restoring a persisted session, if
   * any) has resolved. src/app/index.tsx waits on this before redirecting,
   * so a real returning member doesn't flash through "logged out". */
  authReady: boolean;
  /** True once the subscription gate has been cleared (Hard rule 4: this is
   * distinct from `onboardingComplete` — completing onboarding alone must
   * never grant access). */
  isSubscribed: boolean;
  /** `hasSession` is false when the Supabase project has email confirmation
   * switched on — signUp succeeds but no session (and therefore no
   * `isAuthenticated`) exists until the member clicks the emailed link.
   * Checked directly from signUp's own response rather than reading
   * `isAuthenticated` right after — that'd be a stale closure, since it only
   * updates once the separate onAuthStateChange listener's setState lands. */
  signup: (name: string, email: string, password: string) => Promise<{ error: string | null; hasSession: boolean }>;
  login: (email: string, password: string) => Promise<{ error: string | null }>;
  logout: () => Promise<void>;
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
  setContext: (context: MatchContext) => void;
  setLocation: (location: { lat: number; lon: number } | null) => void;
  setSearchOrigin: (origin: { lat: number; lon: number }) => void;
  setWeather: (weather: string | null) => void;
  /** Selecting the already-active category clears the mood entirely
   * (toggle-off); selecting a new/different category resets tileIds to []. */
  setMoodCategory: (category: TileCategory) => void;
  /** No-op if no mood category is currently active. */
  toggleMoodTile: (tileId: string) => void;
  clearMood: () => void;
  /** True if venueId appears in any saved collection. */
  isVenueSaved: (venueId: string) => boolean;
  /** Toggles venueId in/out of a collection (defaults to the member's
   * default "Saved" collection). */
  toggleSavedVenue: (venueId: string, collectionId?: string) => void;
  /** Creates a new empty named collection. Returns '' until the real id
   * comes back from the database (fire-and-forget by design, matching every
   * other mutator here — see this file's top comment) — callers that need
   * the id synchronously should read `savedCollections` after it updates
   * rather than relying on this return value. */
  createCollection: (name: string) => string;
  removeVenueFromCollection: (collectionId: string, venueId: string) => void;
  isJourneySaved: (journeyId: string) => boolean;
  toggleSavedJourney: (journeyId: string) => void;
  toggleNotificationPref: (key: keyof NotificationPrefs) => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

interface ProfileRow {
  id: string;
  name: string;
  subscription_status: SubscriptionStatus;
  onboarding_complete: boolean;
  spend_level: SpendLevel;
  dietary: DietaryRequirement[];
  pet: YouProfile['pet'];
  religious_observance: ReligiousObservance[];
  gender: YouProfile['gender'] | null;
  age_range: YouProfile['ageRange'] | null;
  relationship_status: YouProfile['relationshipStatus'] | null;
}

/** Everything that lives in Supabase, fetched in one go right after a
 * session appears (fresh sign-in, or a persisted session restored on
 * launch). */
async function hydrateFromDatabase(userId: string, email: string): Promise<Partial<SessionState> & { user: SessionUser }> {
  const [profileRes, prefsRes, collectionsRes, journeysRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).single(),
    supabase.from('user_preferences').select('*').eq('user_id', userId),
    supabase
      .from('saved_collections')
      .select('id, name, saved_collection_venues(venue_id)')
      .eq('user_id', userId)
      .order('created_at'),
    supabase.from('saved_journeys').select('journey_id').eq('user_id', userId),
  ]);

  const profile = profileRes.data as ProfileRow | null;

  const preferences: Record<TileCategory, UserPreference> = {
    Do: EMPTY_PREFERENCE('Do'),
    Drink: EMPTY_PREFERENCE('Drink'),
    Eat: EMPTY_PREFERENCE('Eat'),
  };
  for (const row of prefsRes.data ?? []) {
    const category = row.category as TileCategory;
    preferences[category] = {
      category,
      selectedTileIds: row.selected_tile_ids ?? [],
      subPreferenceState: (row.sub_preference_state as Record<string, boolean>) ?? {},
    };
  }

  const savedCollections: SavedCollection[] = (collectionsRes.data ?? []).map((c) => ({
    id: c.id,
    userId,
    name: c.name,
    venueIds: (c.saved_collection_venues ?? []).map((v: { venue_id: string }) => v.venue_id),
  }));

  return {
    user: { id: userId, name: profile?.name ?? '', email },
    onboardingComplete: profile?.onboarding_complete ?? false,
    subscriptionStatus: profile?.subscription_status ?? 'none',
    you: {
      spendLevel: profile?.spend_level ?? DEFAULT_YOU.spendLevel,
      dietary: profile?.dietary ?? [],
      pet: profile?.pet ?? 'none',
      religiousObservance: profile?.religious_observance ?? [],
      gender: profile?.gender ?? undefined,
      ageRange: profile?.age_range ?? undefined,
      relationshipStatus: profile?.relationship_status ?? undefined,
    },
    preferences,
    savedCollections,
    savedJourneyIds: (journeysRes.data ?? []).map((j) => j.journey_id),
  };
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>(INITIAL_STATE);
  const [authReady, setAuthReady] = useState(false);
  // Guards the profile/preferences sync effects below from immediately
  // writing straight back the exact values a hydrate just read — harmless
  // either way (idempotent), just an avoidable round trip.
  const hydratingRef = useRef(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, authSession) => {
      if (authSession?.user) {
        hydratingRef.current = true;
        hydrateFromDatabase(authSession.user.id, authSession.user.email ?? '')
          .then((hydrated) => {
            setState((s) => ({ ...s, ...hydrated }));
          })
          .catch((err) => {
            console.error('Failed to load account data:', err);
          })
          .finally(() => {
            hydratingRef.current = false;
            setAuthReady(true);
          });
      } else {
        setState(INITIAL_STATE);
        setAuthReady(true);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const signup = useCallback(async (name: string, email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    return { error: error?.message ?? null, hasSession: data.session !== null };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

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
  // gating purposes, same as a real Stripe trial would be. subscription_status
  // still round-trips through `profiles` (the sync effect below) so a real
  // Stripe webhook can write the same column later without a shape change.
  const startTrial = useCallback(() => {
    setState((s) => ({ ...s, subscriptionStatus: 'trialing' }));
  }, []);

  const cancelMembership = useCallback(() => {
    setState((s) => ({ ...s, subscriptionStatus: 'none' }));
  }, []);

  // Persists onboarding/subscription/"You" profile fields to `profiles`
  // whenever they change locally (every setter above just does a plain
  // setState, same as the old mock — this is the one place that turns those
  // local edits into real writes).
  useEffect(() => {
    if (!state.user || hydratingRef.current) return;
    supabase
      .from('profiles')
      .update({
        onboarding_complete: state.onboardingComplete,
        subscription_status: state.subscriptionStatus,
        spend_level: state.you.spendLevel,
        dietary: state.you.dietary,
        pet: state.you.pet,
        religious_observance: state.you.religiousObservance,
        gender: state.you.gender ?? null,
        age_range: state.you.ageRange ?? null,
        relationship_status: state.you.relationshipStatus ?? null,
      })
      .eq('id', state.user.id)
      .then(({ error }) => {
        if (error) console.error('Failed to save profile:', error);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.user, state.onboardingComplete, state.subscriptionStatus, state.you]);

  // Persists tile preferences to `user_preferences` (one upsert covering all
  // three categories) whenever they change.
  useEffect(() => {
    if (!state.user || hydratingRef.current) return;
    const rows = (['Do', 'Drink', 'Eat'] as TileCategory[]).map((category) => ({
      user_id: state.user!.id,
      category,
      selected_tile_ids: state.preferences[category].selectedTileIds,
      sub_preference_state: state.preferences[category].subPreferenceState,
    }));
    supabase
      .from('user_preferences')
      .upsert(rows, { onConflict: 'user_id,category' })
      .then(({ error }) => {
        if (error) console.error('Failed to save preferences:', error);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.user, state.preferences]);

  const setRadiusMiles = useCallback((miles: number) => {
    setState((s) => ({ ...s, radiusMiles: miles }));
  }, []);

  const setContext = useCallback((context: MatchContext) => {
    setState((s) => ({ ...s, context }));
  }, []);

  const setLocation = useCallback((location: { lat: number; lon: number } | null) => {
    setState((s) => ({ ...s, location }));
  }, []);

  const setSearchOrigin = useCallback((origin: { lat: number; lon: number }) => {
    setState((s) => ({ ...s, searchOrigin: origin }));
  }, []);

  const setWeather = useCallback((weather: string | null) => {
    setState((s) => ({ ...s, weather }));
  }, []);

  // Real device geolocation. expo-location supports web via the browser
  // Geolocation API as well as native, so this one effect covers every
  // platform without a separate branch. Silent no-op on denial/error/
  // unavailability — `location` simply stays null and every consumer
  // already falls back to DEMO_LOCATION.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted' || cancelled) return;
        const pos = await Location.getCurrentPositionAsync({});
        if (!cancelled) {
          const resolved = { lat: pos.coords.latitude, lon: pos.coords.longitude };
          setState((s) => ({ ...s, location: resolved, searchOrigin: resolved }));
        }
      } catch {
        // Permission denied, no provider, timeout, etc. — stay on DEMO_LOCATION.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Real forecast weather. Refetches whenever the resolved day/band or the
  // effective location changes.
  useEffect(() => {
    let cancelled = false;
    const { day, band } = resolveContext(state.context);
    const location = state.location ?? DEMO_LOCATION;
    (async () => {
      const result = await fetchWeather(location, day, band);
      if (!cancelled) setState((s) => ({ ...s, weather: result }));
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.context, state.location]);

  const setMoodCategory = useCallback((category: TileCategory) => {
    setState((s) => ({
      ...s,
      mood: s.mood?.category === category ? null : { category, tileIds: [] },
    }));
  }, []);

  const toggleMoodTile = useCallback((tileId: string) => {
    setState((s) => {
      if (!s.mood) return s;
      const has = s.mood.tileIds.includes(tileId);
      const tileIds = has ? s.mood.tileIds.filter((id) => id !== tileId) : [...s.mood.tileIds, tileId];
      return { ...s, mood: { ...s.mood, tileIds } };
    });
  }, []);

  const clearMood = useCallback(() => {
    setState((s) => ({ ...s, mood: null }));
  }, []);

  const isVenueSaved = useCallback(
    (venueId: string) => state.savedCollections.some((c) => c.venueIds.includes(venueId)),
    [state.savedCollections]
  );

  const toggleSavedVenue = useCallback(
    (venueId: string, collectionId?: string) => {
      setState((s) => {
        const targetId = collectionId ?? s.savedCollections[0]?.id;
        if (!targetId) return s;
        const target = s.savedCollections.find((c) => c.id === targetId);
        const nowSaved = !target?.venueIds.includes(venueId);

        if (s.user) {
          const write = nowSaved
            ? supabase.from('saved_collection_venues').insert({ collection_id: targetId, venue_id: venueId })
            : supabase
                .from('saved_collection_venues')
                .delete()
                .eq('collection_id', targetId)
                .eq('venue_id', venueId);
          write.then(({ error }: { error: { message: string } | null }) => {
            if (error) console.error('Failed to save venue:', error);
          });
        }

        return {
          ...s,
          savedCollections: s.savedCollections.map((c) => {
            if (c.id !== targetId) return c;
            const has = c.venueIds.includes(venueId);
            return {
              ...c,
              venueIds: has ? c.venueIds.filter((id) => id !== venueId) : [...c.venueIds, venueId],
            };
          }),
        };
      });
    },
    []
  );

  const createCollection = useCallback((name: string) => {
    setState((s) => {
      if (!s.user) return s;
      supabase
        .from('saved_collections')
        .insert({ user_id: s.user.id, name })
        .select()
        .single()
        .then(({ data, error }: { data: { id: string; name: string } | null; error: { message: string } | null }) => {
          if (error) {
            console.error('Failed to create collection:', error);
            return;
          }
          if (data) {
            setState((s2) => ({
              ...s2,
              savedCollections: [...s2.savedCollections, { id: data.id, userId: s2.user!.id, name: data.name, venueIds: [] }],
            }));
          }
        });
      return s;
    });
    return '';
  }, []);

  const removeVenueFromCollection = useCallback((collectionId: string, venueId: string) => {
    setState((s) => {
      if (s.user) {
        supabase
          .from('saved_collection_venues')
          .delete()
          .eq('collection_id', collectionId)
          .eq('venue_id', venueId)
          .then(({ error }: { error: { message: string } | null }) => {
            if (error) console.error('Failed to remove saved venue:', error);
          });
      }
      return {
        ...s,
        savedCollections: s.savedCollections.map((c) =>
          c.id === collectionId ? { ...c, venueIds: c.venueIds.filter((id) => id !== venueId) } : c
        ),
      };
    });
  }, []);

  const isJourneySaved = useCallback(
    (journeyId: string) => state.savedJourneyIds.includes(journeyId),
    [state.savedJourneyIds]
  );

  const toggleSavedJourney = useCallback((journeyId: string) => {
    setState((s) => {
      const has = s.savedJourneyIds.includes(journeyId);
      if (s.user) {
        const write = has
          ? supabase.from('saved_journeys').delete().eq('user_id', s.user.id).eq('journey_id', journeyId)
          : supabase.from('saved_journeys').insert({ user_id: s.user.id, journey_id: journeyId });
        write.then(({ error }: { error: { message: string } | null }) => {
          if (error) console.error('Failed to save journey:', error);
        });
      }
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
      authReady,
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
      setContext,
      setLocation,
      setSearchOrigin,
      setWeather,
      setMoodCategory,
      toggleMoodTile,
      clearMood,
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
      authReady,
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
      setContext,
      setLocation,
      setSearchOrigin,
      setWeather,
      setMoodCategory,
      toggleMoodTile,
      clearMood,
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
