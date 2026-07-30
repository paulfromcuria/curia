/**
 * Bridges the real onboarding Tile catalog (docs/data/tiles.json, ids shaped
 * `"${category}|${name}"`, e.g. "Drink|Cocktail bars" — see M4) to the venue
 * "type" slugs `rank-venues.ts` actually scores against (e.g. "cocktail-bar",
 * derived from `Venue.type` via `slugifyType`).
 *
 * This gap was independently flagged by both the M5 Map and M5 List builds:
 * a real signed-in user's `selectedTileIds` come from the Tile catalog, but
 * `scoreTileMatch`/`passesMoodFilter` were only ever tested against bare
 * type-slugs (e.g. `['cocktail-bar']`, matching this project's own demo/test
 * fixtures) — so real onboarding picks scored a uniform 0 tile-match, a wash
 * across every venue rather than a useful signal. Fixing here (the scoring
 * engine) rather than in Map/List, since both screens call the same
 * `rankVenues` and shouldn't each carry their own translation layer.
 *
 * Only tiles with an actual corresponding venue type in today's seed data
 * (docs/data/venues.json) are mapped — an empty array is not a bug, it's
 * this tile category genuinely having no matching venue yet (e.g. every
 * "Do" tile except "Markets": today's seed venues are all Drink/Eat types,
 * so Do-category picks can't yet move tile-match. That's a seed-data
 * coverage gap for curia-admin/M8 to fill as real Do-type venues are
 * curated, not a scoring defect — flagged here rather than faked).
 */
export const TILE_NAME_TO_VENUE_TYPE_SLUGS: Record<string, string[]> = {
  // Do
  Markets: ['market-hall'],

  // Drink
  'Cocktail bars': ['cocktail-bar', 'speakeasy'],
  'Jazz bars': ['jazz-bar'],
  'Rooftop & scenic': ['rooftop'],
  'Upmarket pubs': ['country-pub'],
  'Hotel bars': ['hotel-bar'],
  'Cafés (late)': ['coffee-room', 'bakery'],

  // Eat
  'Tasting menu': ['tasting-menu'],
  'Fine dining': ['fine-dining'],
  Scenic: ['rooftop'],
  'Small plates': ['small-plates'],
  'Hidden gem': ['speakeasy'],
  Celebratory: ['celebratory'],
};

/**
 * Resolves one selected tile id into the venue-type slug(s) it should match.
 * Handles both real catalog ids (`"Drink|Cocktail bars"`) and bare
 * type-slugs (`"cocktail-bar"`, the convention this project's demo input and
 * unit tests already use) so neither call site has to know which form it's
 * holding.
 */
export function tileIdToVenueTypeSlugs(tileId: string): string[] {
  const separatorIndex = tileId.indexOf('|');
  if (separatorIndex === -1) {
    // Not a catalog id — already a bare type-slug (demo-input.ts / tests).
    return [tileId];
  }
  const name = tileId.slice(separatorIndex + 1);
  return TILE_NAME_TO_VENUE_TYPE_SLUGS[name] ?? [];
}
