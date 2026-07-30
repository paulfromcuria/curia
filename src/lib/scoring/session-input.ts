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
 * - `radiusMiles` / `context` / `moodFilter` are per-view, in-session state
 *   (the prototype's own language: an "active in-session quick filter"),
 *   not part of the persisted session — the caller (Map today) owns that
 *   local state and passes it in as overrides rather than this module
 *   inventing a second, competing place for it to live.
 *
 * Known gap flagged, not silently patched here: the real onboarding tile
 * catalog (src/lib/data/seed.ts `TILES`) ids tiles as `${category}|${name}`
 * (e.g. "Drink|Cocktail bars"). `rank-venues.ts`'s `scoreTileMatch` /
 * `passesMoodFilter` compare selected tile ids against
 * `slugifyType(venue.type)` (e.g. "cocktail-bar") — see that module's own
 * `slugifyType` doc comment, which anticipated exactly this. The two id
 * conventions don't line up (plural tile names, compound names like
 * "Rooftop & scenic" vs. single-word venue types), so passing real
 * onboarding `selectedTileIds` straight through means tile-match scores 0
 * for every venue rather than being a neutral no-op. This is a cross-cutting
 * M3/M4 gap this module doesn't own the fix for (rank-venues.ts is
 * `curia-matchmaking`'s); flagged in the M5 report rather than patched
 * ad hoc here.
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
