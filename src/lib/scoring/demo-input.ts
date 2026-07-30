/**
 * TEMPORARY shared MatchmakingInput used by Map and List until curia-onboarding
 * (M4) exists to capture a real signed-in user's tiles/sub-prefs/You data,
 * location, radius, and mood filter. Map and List must import this one
 * constant and call `rankVenues` with it identically (Hard rule 5) rather
 * than each inventing their own placeholder input, so they can never drift
 * apart even before real user state exists.
 *
 * Location is central Northern Quarter, Manchester; radius is wide enough
 * (15mi) to reach into the Cheshire seed districts too, so the demo result
 * set isn't trivially just "everything in Manchester". Tile selections below
 * are slugified venue `type` values already present in docs/data/venues.json
 * (see rank-venues.ts's slugifyType doc comment re: no real Tile catalog
 * existing yet) so the demo actually exercises tile-match scoring against
 * real seed venues.
 */
import type { MatchmakingInput } from '../../types/matchmaking';

export const DEMO_MATCHMAKING_INPUT: MatchmakingInput = {
  preferences: [
    {
      category: 'Drink',
      selectedTileIds: ['cocktail-bar', 'speakeasy', 'jazz-bar'],
      subPreferenceState: {},
    },
    {
      category: 'Eat',
      selectedTileIds: ['small-plates', 'tasting-menu', 'fine-dining'],
      subPreferenceState: {},
    },
    {
      category: 'Do',
      selectedTileIds: ['rooftop', 'market-hall', 'country-pub'],
      subPreferenceState: {},
    },
  ],
  you: {
    spendLevel: 4,
    dietary: ['none'],
    pet: 'none',
  },
  location: { lat: 53.484, lon: -2.236 },
  radiusMiles: 15,
  context: { now: true },
};
