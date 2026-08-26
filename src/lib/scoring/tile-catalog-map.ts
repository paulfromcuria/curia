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
 * this tile category genuinely having no matching venue yet. Do used to be
 * almost entirely empty (only "Markets" had a matching venue type) — closed
 * 2026-08 at explicit user request ("expand... good coverage for DO, DRINK,
 * AND EAT") once real Do-type venues (art galleries, spas, live music,
 * performing arts, design galleries) were curated across the LA metro. Any
 * tile still mapped to `[]` genuinely has no matching venue yet — a
 * seed-data coverage gap for curia-admin/M8, not a scoring defect.
 */
export const TILE_NAME_TO_VENUE_TYPE_SLUGS: Record<string, string[]> = {
  // Do
  Markets: ['market-hall'],
  'Independent cinema': ['independent-cinema'],
  Theatre: ['performing-arts', 'black-box-theater'],
  'Ballet & opera': ['performing-arts'],
  'Spa & wellness': ['spa'],
  'Live music': ['live-music'],
  'Art galleries': ['art-gallery'],
  'Antiques & design': ['design-gallery'],

  // Drink
  'Cocktail bars': ['cocktail-bar', 'speakeasy'],
  'Jazz bars': ['jazz-bar'],
  'Rooftop & scenic': ['rooftop'],
  'Upmarket pubs': ['country-pub'],
  'Hotel bars': ['hotel-bar'],
  'Cafés (late)': ['coffee-room', 'bakery'],
  "Members' clubs": ['members-club'],

  // Eat
  'Tasting menu': ['tasting-menu'],
  'Fine dining': ['fine-dining'],
  Scenic: ['rooftop'],
  'Small plates': ['small-plates'],
  'Hidden gem': ['speakeasy'],
  Celebratory: ['celebratory'],
  // Added 2026-08 for Aldeli (Cheshire expansion) — the first venue of this
  // type; 'Brunch' previously matched zero venues anywhere in the app.
  Brunch: ['brunch-spot'],
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

/**
 * Which Do/Drink/Eat category each real seed venue type belongs to. Lives
 * here (not src/lib/map/mood-tiles.ts, which originally defined this and now
 * imports it from here instead) so `rank-venues.ts`'s `passesMoodFilter` can
 * use the same map `moodTileOptionsForCategory` already used to build the
 * mood-sheet's own tile chips — this file has zero imports of its own
 * (unlike mood-tiles.ts, which pulls in `VENUES` from src/lib/data/seed.ts),
 * so importing it here doesn't drag the JSON-import-attribute problem into
 * this module's plain-`node --test` compatibility (see this module's own
 * `rank-venues.ts` import comment).
 *
 * 2026-08 bug fix: picking a mood category with no tiles narrowed (e.g. just
 * "Do", no specific tile chips) is a valid, intentionally "unnarrowed"
 * selection (session.tsx's MoodSelection doc comment), but
 * `passesMoodFilter` never actually read `moodFilter.category` — only
 * `tileIds`/`subPreferences`, both empty in that case — so a category-only
 * mood filter silently filtered nothing at all (user report: filtered to
 * "Do" and still saw 20 Stories/The Ivy/Pollen Bakery — a bar, a restaurant,
 * a bakery, none of them Do). This map is what closes that gap.
 */
export const CATEGORY_BY_VENUE_TYPE: Record<string, 'Do' | 'Drink' | 'Eat'> = {
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
  'WINE BAR': 'Drink',
  'INDEPENDENT CINEMA': 'Do',
  PIZZERIA: 'Eat',
  'SHERRY BAR': 'Drink',
  'PERFORMING ARTS': 'Do',
  SPA: 'Do',
  'MEMBERS CLUB': 'Drink',
  'LIVE MUSIC': 'Do',
  'DESIGN GALLERY': 'Do',
  'ART GALLERY': 'Do',
  'SEASONAL KITCHEN': 'Eat',
  'CALIFORNIA CUISINE': 'Eat',
  'HANDMADE PASTA': 'Eat',
  'LISTENING BAR': 'Drink',
  'BLACK BOX THEATER': 'Do',
  'FRENCH BRASSERIE': 'Eat',
  // Added 2026-08 for Happy Seasons (Manchester Chinatown) — a real venue
  // from the daily research pipeline with no existing Eat type/tile fit
  // for a roast-meats specialist. Category-only, so mood filtering still
  // finds it; no onboarding tile targets it specifically yet (see
  // docs/data/venues.json's own _manchesterCheshireResearchSource note).
  'CANTONESE ROAST': 'Eat',
  // Added 2026-08 for the Cheshire expansion (see docs/data/venues.json's
  // own _cheshireExpansionSource note). HANDMADE PASTA already existed as a
  // type (see above) — Sugo Pasta Kitchen is its first real venue. ALE HOUSE
  // (The Old Dancer) and GREEK TAVERNA (The Stolen Lamb) are new, left
  // category-only like CANTONESE ROAST since no tile fits either precisely.
  // BRUNCH SPOT (Aldeli) also maps to the real 'Brunch' tile above.
  'ALE HOUSE': 'Drink',
  'GREEK TAVERNA': 'Eat',
  'BRUNCH SPOT': 'Eat',
};
