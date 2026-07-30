/**
 * Mood-sheet tile options ("I'm in the mood to...") for a given Do/Drink/Eat
 * category, grounded entirely in real venue data rather than the onboarding
 * Tile catalog (src/lib/data/seed.ts TILES).
 *
 * Why not the onboarding catalog: the mood quick-filter has to actually
 * narrow `MatchmakingInput.moodFilter` and re-run `rankVenues` (M5's job).
 * `rank-venues.ts`'s `passesMoodFilter` matches `moodFilter.tileIds` against
 * `slugifyType(venue.type)` — the only real per-venue "tile" signal that
 * exists today (see that module's own doc comment). The onboarding Tile
 * catalog ids tiles as "Drink|Cocktail bars" and its names don't slug-match
 * venue types 1:1 (plural tile names, compound names like "Rooftop &
 * scenic") — see src/lib/scoring/session-input.ts's doc comment for the
 * same gap on the preferences side. Offering onboarding tile names here
 * would make picking most of them silently zero out every venue.
 * Deriving tile chips straight from `Venue.type` guarantees every chip shown
 * actually has matching venues and actually narrows the result set — the
 * same principle the prototype itself uses (it only ever shows a tile chip
 * when `covered[...]` is nonzero for real seed venues).
 *
 * The Do/Drink/Eat grouping below is this module's own reasonable,
 * documented placement of the 13 real seed venue types into the three
 * known categories (not a silent product decision — there's no
 * onboarding-tile-to-venue-type catalog to consult yet, so this is
 * necessarily a judgment call, flagged here rather than guessed at
 * silently elsewhere).
 */
import { VENUES } from '../data/seed';
import { slugifyType } from '../scoring/rank-venues';
import type { TileCategory, Venue } from '../../types/models';

const CATEGORY_BY_VENUE_TYPE: Record<string, TileCategory> = {
  'SMALL PLATES': 'Eat',
  'TASTING MENU': 'Eat',
  'FINE DINING': 'Eat',
  CELEBRATORY: 'Eat',
  BAKERY: 'Eat',
  'COCKTAIL BAR': 'Drink',
  ROOFTOP: 'Drink',
  SPEAKEASY: 'Drink',
  'JAZZ BAR': 'Drink',
  'HOTEL BAR': 'Drink',
  'COFFEE ROOM': 'Drink',
  'COUNTRY PUB': 'Drink',
  'MARKET HALL': 'Do',
};

export interface MoodTileOption {
  /** What `rank-venues.ts`'s `passesMoodFilter` actually checks against. */
  tileId: string;
  label: string;
  /** How many real seed venues this chip would match — the prototype's own
   * "coverage count" badge next to each mood tile. */
  count: number;
}

function titleCase(value: string): string {
  return value.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

export function moodTileOptionsForCategory(
  category: TileCategory,
  candidates: Venue[] = VENUES
): MoodTileOption[] {
  const counts = new Map<string, number>();
  candidates.forEach((v) => {
    if (CATEGORY_BY_VENUE_TYPE[v.type] !== category) return;
    counts.set(v.type, (counts.get(v.type) ?? 0) + 1);
  });
  return Array.from(counts.entries())
    .map(([type, count]) => ({ tileId: slugifyType(type), label: titleCase(type), count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}
