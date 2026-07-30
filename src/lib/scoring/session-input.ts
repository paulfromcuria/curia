/**
 * Builds a real `MatchmakingInput` from the live session (M4's `useSession()`
 * state) instead of the hardcoded `DEMO_MATCHMAKING_INPUT`
 * (src/lib/scoring/demo-input.ts, which predates onboarding existing at
 * all). Map (M5, this milestone) consumes this; List should adopt the same
 * helper when `curia-list` wires up its own real input so the two tabs never
 * fork the input-building logic between them (Hard rule 5) — put here,
 * rather than inlined in map.tsx, for exactly that reason.
 *
 * Real vs. mocked, spelled out for whoever reads this next:
 * - `preferences` / `you` come straight from `useSession()` — real
 *   onboarding state, not a placeholder.
 * - `location` defaults to a fixed demo lat/lon (central Northern Quarter,
 *   Manchester). There is no device geolocation or Mapbox integration yet
 *   (CLAUDE.md "Still genuinely open": Mapbox API key is a genuine
 *   credential gap) — flagged, not guessed. Callers may pass a real
 *   `location` override once one exists.
 * - `radiusMiles` now defaults to the shared `session.radiusMiles`
 *   (src/lib/state/session.tsx) rather than a fixed per-caller constant —
 *   both M5 builds (Map and List) independently flagged that a fixed Map
 *   default alongside List's own local slider state let the two tabs show
 *   different radii for the same session, contradicting Hard rule 5 ("Map
 *   and List share one radius and one context, so switching tabs never
 *   changes the answer"). Callers may still override it (e.g. a future
 *   one-off preview), but map.tsx/list.tsx should both read/write
 *   `session.radiusMiles`, not their own copy.
 * - `context` / `moodFilter` remain per-view, in-session state, not part of
 *   the persisted session — each screen owns its own local state for these
 *   and passes them in as overrides.
 *
 * Resolved gap (previously flagged here): the real onboarding tile catalog
 * (src/lib/data/seed.ts `TILES`) ids tiles as `${category}|${name}` (e.g.
 * "Drink|Cocktail bars"), which didn't line up with `rank-venues.ts`'s
 * `slugifyType(venue.type)`-based matching. Fixed in
 * `src/lib/scoring/tile-catalog-map.ts` (`tileIdToVenueTypeSlugs`), which
 * `scoreTileMatch`/`passesMoodFilter` now go through — real onboarding
 * `selectedTileIds` pass through unchanged here and resolve correctly.
 */
import type { SessionContextValue } from '../state/session';
import type { MatchContext, MatchmakingInput } from '../../types/matchmaking';

/** Central Northern Quarter, Manchester — same fixed point demo-input.ts
 * used, kept here as the one place both Map's map-view "me" pin and its
 * matchmaking location should read from. */
export const DEMO_LOCATION = { lat: 53.484, lon: -2.236 };

/** Matches the old DEMO_MATCHMAKING_INPUT default so switching Map over to
 * real session data doesn't also silently change the result set's breadth. */
export const DEFAULT_RADIUS_MILES = 15;

export const DEFAULT_CONTEXT: MatchContext = { now: true };

export interface MatchmakingOverrides {
  location?: { lat: number; lon: number };
  radiusMiles?: number;
  context?: MatchContext;
  moodFilter?: MatchmakingInput['moodFilter'];
}

export function buildMatchmakingInputFromSession(
  session: Pick<SessionContextValue, 'preferences' | 'you'>,
  overrides: MatchmakingOverrides = {}
): MatchmakingInput {
  return {
    preferences: Object.values(session.preferences),
    you: {
      spendLevel: session.you.spendLevel,
      dietary: session.you.dietary,
      pet: session.you.pet,
    },
    location: overrides.location ?? DEMO_LOCATION,
    radiusMiles: overrides.radiusMiles ?? DEFAULT_RADIUS_MILES,
    context: overrides.context ?? DEFAULT_CONTEXT,
    moodFilter: overrides.moodFilter,
  };
}
