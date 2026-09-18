/**
 * Mood-sheet tile options ("I'm in the mood to...") for a given Do/Drink/Eat
 * category, grounded entirely in real venue data rather than the onboarding
 * Tile catalog's raw entries (src/lib/data/seed.ts TILES) — but grouped by
 * real tile name wherever one actually covers the underlying venue type.
 *
 * 2026-09-18 rewrite, at explicit user report against a real screenshot:
 * "its such a big list because it includes all refinements instead of
 * subcategories... im in the mood to DO, and then play sport. then it will
 * show me all my options for sport" — a Do mood-filter was showing "Golf
 * Club 22", "Tennis Club 7" and "Padel Club 4" as three separate flat
 * chips instead of one "Play sport" chip covering all three, the exact
 * same ungrouped-refinement clutter the tile-simplification pass spent
 * tonight removing from onboarding.
 *
 * The original (pre-tonight) reasoning for flattening straight to
 * `Venue.type` was real at the time: `rank-venues.ts`'s `passesMoodFilter`
 * matches `moodFilter.tileIds` through `tileIdToVenueTypeSlugs`
 * (tile-catalog-map.ts), and back then most real onboarding tile names
 * didn't actually resolve to any venue type — picking one would have
 * silently zeroed out every result. That gap is closed for any tile that
 * genuinely covers >1 type today (Play sport -> golf-club/padel-club/
 * tennis-club, Neighbourhood favourite -> 13 cuisine types, Markets,
 * Cocktail bars, Upmarket pubs, etc. — see TILE_NAME_TO_VENUE_TYPE_SLUGS's
 * own entries), so those now group into one real chip. Any venue type with
 * no tile wired to it at all (still a real, honest state — see that map's
 * own "an empty array is not a bug" convention) falls back to its own
 * individual chip exactly as before, so nothing this used to surface ever
 * becomes unreachable — a type either gets grouped under its real tile, or
 * keeps standing alone; it never disappears.
 *
 * The Do/Drink/Eat grouping every real seed venue type falls into
 * (`CATEGORY_BY_VENUE_TYPE`) lives in src/lib/scoring/tile-catalog-map.ts,
 * alongside `TILE_NAME_TO_VENUE_TYPE_SLUGS` (the real tile-name -> type-slug
 * groupings this module now reads).
 */
import { TILES, VENUES } from '../data/seed';
import { slugifyType } from '../scoring/rank-venues';
import { CATEGORY_BY_VENUE_TYPE, TILE_NAME_TO_VENUE_TYPE_SLUGS } from '../scoring/tile-catalog-map';
import type { TileCategory, Venue } from '../../types/models';

export interface MoodTileOption {
  /** What `rank-venues.ts`'s `passesMoodFilter` actually checks against —
   * either a real tile catalog id ("Do|Play sport", resolved through
   * TILE_NAME_TO_VENUE_TYPE_SLUGS) or a bare venue-type slug for anything
   * with no tile covering it (resolved as itself, see
   * tileIdToVenueTypeSlugs's own bare-slug fallback). */
  tileId: string;
  label: string;
  /** How many real seed venues this chip would match — the prototype's own
   * "coverage count" badge next to each mood tile. Grouped chips sum every
   * constituent type's count, so "Play sport" reads as the real combined
   * total, not just whichever type happened to be counted first. */
  count: number;
}

function titleCase(value: string): string {
  return value.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

export function moodTileOptionsForCategory(
  category: TileCategory,
  candidates: Venue[] = VENUES
): MoodTileOption[] {
  // Only tiles actually in this category can group anything here — avoids
  // any cross-category ambiguity if a tile name were ever reused (none are
  // today, but this stays correct regardless).
  const slugToTileName = new Map<string, string>();
  for (const t of TILES) {
    if (t.category !== category) continue;
    for (const slug of TILE_NAME_TO_VENUE_TYPE_SLUGS[t.name] ?? []) slugToTileName.set(slug, t.name);
  }

  const counts = new Map<string, number>();
  const labels = new Map<string, string>();
  candidates.forEach((v) => {
    if (!(CATEGORY_BY_VENUE_TYPE[v.type] ?? []).includes(category)) return;
    const slug = slugifyType(v.type);
    const tileName = slugToTileName.get(slug);
    const key = tileName ? `${category}|${tileName}` : slug;
    counts.set(key, (counts.get(key) ?? 0) + 1);
    labels.set(key, tileName ?? titleCase(v.type));
  });

  return Array.from(counts.entries())
    .map(([tileId, count]) => ({ tileId, label: labels.get(tileId)!, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}
