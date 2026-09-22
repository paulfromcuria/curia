import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import * as Location from 'expo-location';
import type {
  DietaryRequirement,
  HomeRegion,
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
 * Which-in-app notifications a member has switched on. Originally 4 toggles
 * transcribed verbatim from the prototype's own `NOTIFS` state (Curia.dc.html)
 * — real copy, but copy describing functionality that doesn't actually
 * exist behind it. 2026-09, at explicit user report after using the real
 * app ("i saw 'alert about an open table at one of your saved places' and
 * we do not have that functionality"): `table` (real-time table
 * availability at saved venues) and `district` (a district being
 * unusually lively right now) both promised a live signal this app has no
 * way to generate — `table` because there's no venue-side availability
 * feed at all, `district` because a real "unusually lively right now"
 * read needs actual user density data, not the static day/band
 * liveliness multipliers rank-venues.ts's districtLiveliness() uses for
 * scoring. `journey` (weather + "your diary" suiting a planned evening)
 * has the same problem — no diary/calendar integration exists to match
 * against. Cut down to the one toggle with a real, buildable trigger:
 * editors actually do add Moments/Journeys by hand (this session added
 * dozens), so "new from our editors" is a real future event, just not
 * wired to a real send yet. There is no push/email provider wired up
 * (a genuine credential gap — flag it, don't guess at one per
 * .claude/agents/curia-profile.md) — this toggle is a real user
 * preference in the meantime. Local-only, not persisted — see this file's
 * own top comment.
 */
export interface NotificationPrefs {
  editorial: boolean;
}

const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
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
  /** Null until the onboarding 'Region' step is answered — see HomeRegion's
   * own doc comment (types/models.ts) for why this exists and what it does
   * and doesn't gate. Tile-catalog filtering treats null as 'uk' (every
   * real member before this feature existed is UK-based), but the local
   * value stays null until a real choice is made so onboarding's own
   * "done" indicator doesn't lie about a step nobody has actually seen
   * yet. */
  homeRegion: HomeRegion | null;
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
  /** This member's own venue ratings (1-5), loaded from `venue_ratings` on
   * login — see supabase/migrations/0005_venue_ratings.sql. Keyed by venue
   * id; a venue this member hasn't rated simply has no entry. Distinct from
   * RATING_STATS (src/lib/data/seed.ts), which is the cross-member
   * aggregate the scoring engine reads — this is just "what did *I* say",
   * shown back to the member on venue/[id].tsx. */
  myRatings: Record<string, number>;
  /** Set when hydrateFromDatabase's profile fetch genuinely fails (network,
   * RLS, transient error) — found live 2026-09-18 ("why have i been logged
   * out... it was as if it needed me to redo onboarding"). Before this fix,
   * a failed profile query was silently swallowed and defaulted
   * onboardingComplete to false for a real, fully-onboarded member — still
   * authenticated (a real user object was set), so it looked exactly like
   * "logged in but suddenly needs onboarding again", not a real logout.
   * src/app/index.tsx shows a retry screen instead of routing anywhere
   * while this is set, rather than presenting a false onboarding/login
   * state. */
  hydrateError: string | null;
}

const DEFAULT_RADIUS_MILES = 0.9;

const INITIAL_STATE: SessionState = {
  user: null,
  onboardingComplete: false,
  preferences: {
    Do: EMPTY_PREFERENCE('Do'),
    Drink: EMPTY_PREFERENCE('Drink'),
    Eat: EMPTY_PREFERENCE('Eat'),
    Holiday: EMPTY_PREFERENCE('Holiday'),
  },
  you: DEFAULT_YOU,
  subscriptionStatus: 'none',
  homeRegion: null,
  radiusMiles: DEFAULT_RADIUS_MILES,
  context: { now: true },
  mood: null,
  location: null,
  searchOrigin: DEMO_LOCATION,
  weather: null,
  savedCollections: [],
  savedJourneyIds: [],
  notificationPrefs: DEFAULT_NOTIFICATION_PREFS,
  myRatings: {},
  hydrateError: null,
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
  /** True once the open-beta gate has been cleared (Hard rule 4: this is
   * distinct from `onboardingComplete` — completing onboarding alone must
   * never grant access). Named `isSubscribed` for the real subscription
   * check it becomes once Stripe billing replaces the open beta. */
  isSubscribed: boolean;
  /** Re-runs hydrateFromDatabase for whoever's currently authenticated —
   * the retry action for the hydrateError screen (src/app/index.tsx). A
   * no-op if there's no real authenticated user to retry for. */
  retryHydrate: () => void;
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
  setHomeRegion: (value: HomeRegion) => void;
  completeOnboarding: () => void;
  enterOpenBeta: () => void;
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
  /** This member's own rating for venueId, or undefined if they haven't
   * rated it. */
  myRatingFor: (venueId: string) => number | undefined;
  /** Sets (or replaces) this member's own 1-5 rating for venueId. */
  rateVenue: (venueId: string, rating: number) => void;
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
  home_region: HomeRegion | null;
}

/** Everything that lives in Supabase, fetched in one go right after a
 * session appears (fresh sign-in, or a persisted session restored on
 * launch). */
async function hydrateFromDatabase(userId: string, email: string): Promise<Partial<SessionState> & { user: SessionUser }> {
  const [profileRes, prefsRes, collectionsRes, journeysRes, ratingsRes] = await Promise.all([
    // maybeSingle(), not single(): single() throws on zero rows, which
    // would be a real (if unlikely, given the auto-create trigger in
    // 0001_init.sql) case for a genuinely brand-new user, not a real
    // failure. Either way, profileRes.error is checked explicitly below —
    // found live 2026-09-18 that this whole function used to silently
    // ignore every one of these five queries' own error field, reading
    // only .data with a `?? default` fallback throughout. For the other
    // four, a failed fetch just means an empty list, low-severity. For
    // profile specifically, a failed fetch silently defaulted
    // onboardingComplete to false for a real, fully-onboarded member —
    // see hydrateError's own doc comment (SessionState) for the real bug
    // this caused.
    supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
    supabase.from('user_preferences').select('*').eq('user_id', userId),
    supabase
      .from('saved_collections')
      .select('id, name, saved_collection_venues(venue_id)')
      .eq('user_id', userId)
      .order('created_at'),
    supabase.from('saved_journeys').select('journey_id').eq('user_id', userId),
    supabase.from('venue_ratings').select('venue_id, rating').eq('user_id', userId),
  ]);

  if (profileRes.error) {
    throw new Error(`Couldn't load your profile: ${profileRes.error.message}`);
  }
  const profile = profileRes.data as ProfileRow | null;

  const preferences: Record<TileCategory, UserPreference> = {
    Do: EMPTY_PREFERENCE('Do'),
    Drink: EMPTY_PREFERENCE('Drink'),
    Eat: EMPTY_PREFERENCE('Eat'),
    Holiday: EMPTY_PREFERENCE('Holiday'),
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

  const myRatings: Record<string, number> = {};
  for (const r of ratingsRes.data ?? []) myRatings[r.venue_id] = r.rating;

  return {
    user: { id: userId, name: profile?.name ?? '', email },
    onboardingComplete: profile?.onboarding_complete ?? false,
    subscriptionStatus: profile?.subscription_status ?? 'none',
    homeRegion: (profile?.home_region as HomeRegion | null) ?? null,
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
    myRatings,
  };
}

/**
 * Requests permission and resolves one real device fix, or `null` on
 * denial/error/unavailability — the exact logic the old inline geolocation
 * effect below used to own alone. Pulled out to a standalone export
 * (2026-09-22) so `_layout.tsx` can kick this off in parallel with
 * `loadContentData()`, before `SessionProvider` even mounts — see that
 * file's own comment on the real bug this fixes (every cold load painting
 * Map's camera at DEMO_LOCATION/Northern Quarter first, then visibly
 * snapping to the real fix a moment later, found live 2026-09-22).
 */
export async function resolveDeviceLocation(): Promise<{ lat: number; lon: number } | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;
    const pos = await Location.getCurrentPositionAsync({});
    return { lat: pos.coords.latitude, lon: pos.coords.longitude };
  } catch {
    return null;
  }
}

export function SessionProvider({
  children,
  initialLocation = null,
}: {
  children: ReactNode;
  /**
   * A device fix already resolved by `_layout.tsx` before this provider
   * mounted (see `resolveDeviceLocation` above) — seeds `location`/
   * `searchOrigin` directly instead of the DEMO_LOCATION-then-snap sequence
   * every consumer used to go through on a cold load. `null` (the default)
   * preserves the old behavior exactly: fall back to DEMO_LOCATION, resolve
   * for real in the background effect below.
   */
  initialLocation?: { lat: number; lon: number } | null;
}) {
  const [state, setState] = useState<SessionState>(() => ({
    ...INITIAL_STATE,
    location: initialLocation,
    searchOrigin: initialLocation ?? DEMO_LOCATION,
  }));
  const [authReady, setAuthReady] = useState(false);
  // Guards the profile/preferences sync effects below from immediately
  // writing straight back the exact values a hydrate just read — harmless
  // either way (idempotent), just an avoidable round trip.
  const hydratingRef = useRef(false);
  // Remembered so retryHydrate (exposed below, for the hydrateError retry
  // screen — see src/app/index.tsx) can re-run the same fetch without
  // needing a fresh auth event to fire one.
  const currentAuthUserRef = useRef<{ id: string; email: string } | null>(null);

  const runHydrate = useCallback((userId: string, email: string) => {
    if (hydratingRef.current) return;
    hydratingRef.current = true;
    hydrateFromDatabase(userId, email)
      .then((hydrated) => {
        setState((s) => ({ ...s, ...hydrated, hydrateError: null }));
      })
      .catch((err) => {
        // Deliberately does NOT reset user/onboardingComplete/etc back to
        // INITIAL_STATE here — found live 2026-09-18 ("why have i been
        // logged out... it was as if it needed me to redo onboarding"):
        // silently defaulting those on a failed fetch is exactly what
        // produced that bug. A real fetch failure gets a real, visible
        // retry screen (hydrateError, checked in src/app/index.tsx)
        // instead of a false "you need to onboard again" or "you're
        // logged out" state.
        const message = err instanceof Error ? err.message : String(err);
        console.error('Failed to load account data:', err);
        setState((s) => ({ ...s, hydrateError: message }));
      })
      .finally(() => {
        hydratingRef.current = false;
        setAuthReady(true);
      });
  }, []);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, authSession) => {
      if (authSession?.user) {
        currentAuthUserRef.current = { id: authSession.user.id, email: authSession.user.email ?? '' };
        // Supabase fires both INITIAL_SESSION and SIGNED_IN in quick
        // succession on a single fresh load with a persisted session (found
        // 2026-09 while investigating a reported "session persistence" bug
        // — the restore itself was already working; this guard just stops
        // it from doing the real hydrate fetch twice for one page load).
        runHydrate(authSession.user.id, authSession.user.email ?? '');
      } else {
        currentAuthUserRef.current = null;
        setState(INITIAL_STATE);
        setAuthReady(true);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [runHydrate]);

  const retryHydrate = useCallback(() => {
    if (!currentAuthUserRef.current) return;
    setState((s) => ({ ...s, hydrateError: null }));
    runHydrate(currentAuthUserRef.current.id, currentAuthUserRef.current.email);
  }, [runHydrate]);

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

  const setHomeRegion = useCallback((value: HomeRegion) => {
    setState((s) => ({ ...s, homeRegion: value }));
  }, []);

  const completeOnboarding = useCallback(() => {
    setState((s) => ({ ...s, onboardingComplete: true }));
  }, []);

  // Open beta (2026-09, at explicit user request): no real Stripe account
  // exists yet (CLAUDE.md "Still genuinely open" — a genuine credential gap,
  // see src/lib/config/subscription.ts), and rather than keep showing a
  // trial/price paywall for a charge that can't actually happen, the gate
  // between onboarding and Map/List is now framed as entering the open beta.
  // The underlying model is untouched on purpose: `subscriptionStatus` still
  // round-trips through `profiles.subscription_status` (the sync effect
  // below) exactly as it did before, so a real Stripe integration later just
  // swaps this function's body (and the UI copy) back to a real
  // trial/charge flow without any schema or gating-logic change. `'active'`
  // rather than `'trialing'` on purpose — there's no real trial clock
  // counting down to a real charge to be "in a trial" of.
  const enterOpenBeta = useCallback(() => {
    setState((s) => ({ ...s, subscriptionStatus: 'active' }));
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
        home_region: state.homeRegion,
      })
      .eq('id', state.user.id)
      .then(({ error }) => {
        if (error) console.error('Failed to save profile:', error);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.user, state.onboardingComplete, state.subscriptionStatus, state.you, state.homeRegion]);

  // Persists tile preferences to `user_preferences` (one upsert covering
  // every category) whenever they change.
  useEffect(() => {
    if (!state.user || hydratingRef.current) return;
    const rows = (['Do', 'Drink', 'Eat', 'Holiday'] as TileCategory[]).map((category) => ({
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

  // Real device geolocation — skipped entirely when `initialLocation` (from
  // _layout.tsx's own earlier, parallel resolution, see that file's own
  // comment) already answered this before SessionProvider even mounted.
  // Only still needed here as the slow-path fallback: first-time permission
  // prompts the member hesitates on, or a slow GPS/wifi-location fix that
  // missed _layout.tsx's short window. Silent no-op on denial/error/
  // unavailability — `location` simply stays null and every consumer
  // already falls back to DEMO_LOCATION.
  useEffect(() => {
    if (state.location) return;
    let cancelled = false;
    resolveDeviceLocation().then((resolved) => {
      if (resolved && !cancelled) {
        setState((s) => ({ ...s, location: resolved, searchOrigin: resolved }));
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const myRatingFor = useCallback((venueId: string) => state.myRatings[venueId], [state.myRatings]);

  // Upsert, not insert — re-rating an already-rated venue replaces the old
  // value rather than erroring on the (user_id, venue_id) primary key
  // (0005_venue_ratings.sql). Optimistic local update first, same
  // fire-and-forget pattern as toggleSavedVenue above — this file's own top
  // comment covers why callers shouldn't await a return value here.
  const rateVenue = useCallback((venueId: string, rating: number) => {
    setState((s) => {
      if (s.user) {
        supabase
          .from('venue_ratings')
          .upsert({ user_id: s.user.id, venue_id: venueId, rating })
          .then(({ error }: { error: { message: string } | null }) => {
            if (error) console.error('Failed to save rating:', error);
          });
      }
      return { ...s, myRatings: { ...s.myRatings, [venueId]: rating } };
    });
  }, []);

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
      retryHydrate,
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
      setHomeRegion,
      completeOnboarding,
      enterOpenBeta,
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
      myRatingFor,
      rateVenue,
    }),
    [
      state,
      authReady,
      retryHydrate,
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
      setHomeRegion,
      completeOnboarding,
      enterOpenBeta,
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
      myRatingFor,
      rateVenue,
    ]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within a SessionProvider');
  return ctx;
}
