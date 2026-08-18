import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
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
   * this area" behavior works (2026-08, at explicit user request: "if user
   * moves map and zooms into manchester, they should see the best matches
   * based on where they have navigated to" — whereas a plain zoom, with no
   * pan, should keep ranking against their real location, just with a
   * different radius).
   *
   * Deliberately a SEPARATE field from `location` above, not a replacement
   * for it: `location` stays the ground truth for real physical distance
   * (walk/ride ETAs in venue detail, src/lib/travel/trip.ts) and must never
   * silently change just because the user panned an exploratory map away
   * from where they actually are. `searchOrigin` is the "what am I
   * browsing" point; `location` is the "where am I" point.
   *
   * Always set (never null, unlike `location`) — starts at DEMO_LOCATION
   * before geolocation resolves, is set to the same point `location`
   * resolves to (see the geolocation effect below), and after that is kept
   * live by Map's onCameraChanged on every camera settle. No special-casing
   * is needed to tell "zoom" apart from "pan": zooming via the +/- buttons
   * or a pinch doesn't move the camera's center, so it naturally stays
   * wherever it already was (real location, until the user actually pans
   * away from it) — the camera's current center simply *is* the search
   * origin, whatever put it there, including the locate-me button flying
   * back to real location.
   *
   * Shared here rather than Map-local state for the same Hard-rule-5 reason
   * as radiusMiles/context/mood/location: List has no map of its own but
   * must reflect the same ranked set, so it reads whatever Map's camera
   * last settled on instead of always ranking from real location.
   */
  searchOrigin: { lat: number; lon: number };
  /**
   * Real forecast weather for the currently-resolved context (day + band)
   * and location, e.g. "11° Light rain" (2026-08, at explicit user
   * request: "lets pull in real weather data using an API. when a user
   * changes their context...the predicted weather should be pulled in
   * too" — replaces the static `WEATHER_BY_BAND` mock that previously
   * lived directly in map.tsx/map.web.tsx). `null` until the fetch effect
   * below resolves, or if it fails (network error, offline, date beyond
   * Open-Meteo's forecast window) — every consumer must fall back to the
   * old static per-band mock while this is null, same null-means-fallback
   * pattern as `location`/DEMO_LOCATION. Lives here rather than per-screen
   * so Map and List would show the same weather if List ever surfaces it
   * too — the same Hard-rule-5 reasoning as `context`/`location`.
   */
  weather: string | null;
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
  context: { now: true },
  mood: null,
  location: null,
  searchOrigin: DEMO_LOCATION,
  weather: null,
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

  // Real device geolocation (2026-08, at explicit user request — previously
  // a genuine credential gap per CLAUDE.md, blocked on the same Mapbox
  // account now unblocked). expo-location supports web via the browser
  // Geolocation API as well as native, so this one effect covers every
  // platform without a separate branch. Silent no-op on denial/error/
  // unavailability — `location` simply stays null and every consumer
  // already falls back to DEMO_LOCATION, so there's no error UI to show for
  // "the map centers on Manchester instead of you," which isn't a failure
  // state worth interrupting the user over.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted' || cancelled) return;
        const pos = await Location.getCurrentPositionAsync({});
        if (!cancelled) {
          const resolved = { lat: pos.coords.latitude, lon: pos.coords.longitude };
          // Seeds searchOrigin to the same point — Map's auto-fly-to-location
          // effect will also settle the camera here and re-set it via
          // onCameraChanged, but setting it directly here too means List (or
          // any screen that mounts before Map ever does) isn't stuck on
          // DEMO_LOCATION in the meantime.
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

  // Real forecast weather (2026-08, at explicit user request: "lets pull in
  // real weather data using an API. when a user changes their context...the
  // predicted weather should be pulled in too"). Refetches whenever the
  // resolved day/band or the effective location changes — the same
  // "share it, don't fork it" reasoning as the geolocation effect above,
  // except this one re-runs on more than mount because the whole point is
  // reacting to the user picking a different day/band in the context-strip
  // sheet. Deliberately keyed off `resolveContext(state.context)`'s
  // *resolved* day/band (a plain string pair), not `state.context` itself
  // (an object) — `context: {now: true}` never changes reference on its
  // own, and re-resolving it here is how "Now" would eventually pick up a
  // real day/band change without adding a polling timer (consistent with
  // the passive/live "Now" decision documented on `context` above).
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
