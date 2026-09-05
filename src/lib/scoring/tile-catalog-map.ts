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
  Markets: ['market-hall', 'artisan-market'],
  'Independent cinema': ['independent-cinema'],
  Theatre: ['performing-arts', 'black-box-theater'],
  'Ballet & opera': ['performing-arts'],
  // wellness-studio added 2026-09-03 (Wilmslow Pilates & Wellness) — real
  // pampering/relaxation overlap with spa, unlike fitness-studio below.
  // beauty-salon added 2026-09-05 (KLUB, Spinningfields) — one-to-one
  // hair/beauty treatments read the same as a spa visit, not a fitness class.
  'Spa & wellness': ['spa', 'wellness-studio', 'beauty-salon'],
  'Live music': ['live-music'],
  'Art galleries': ['art-gallery'],
  // rare-bookshop added 2026-09-03 (Manchester Rare Books) — curated,
  // browsing, collecting is the same real spirit as a design showroom.
  'Antiques & design': ['design-gallery', 'rare-bookshop'],
  // Added 2026-08 for the Wilmslow density pass (see docs/data/venues.json's
  // own _wilmslowDensitySource note) — four more real Do tile-coverage gaps
  // closed, all previously zero-venue anywhere in the app.
  'Parks & green space': ['riverside-park'],
  // pottery-studio added 2026-09-05 (Knutcraft at the Ruskin Rooms,
  // Knutsford) — hands-on, expert-led glazing sits in the same real spirit
  // as a cookery class.
  'Cookery & craft': ['cookery-school', 'pottery-studio'],
  'Walking tours': ['walking-tour'],
  // cricket-club added 2026-09-03 (Mobberley Cricket Club) — same spectator
  // afternoon as rugby/golf, just a different pitch.
  'Spectator sport': ['rugby-club', 'golf-club', 'cricket-club'],
  // fitness-studio (Alchemy Personal Training) deliberately left untiled —
  // 2026-09-03 review: one-to-one personal training isn't an evening-plans
  // discovery the way spa/wellness is; CATEGORY_BY_VENUE_TYPE below still
  // has it as 'Do' so mood filtering finds it, it just has no dedicated tile.

  // Drink
  'Cocktail bars': ['cocktail-bar', 'speakeasy'],
  'Jazz bars': ['jazz-bar'],
  'Rooftop & scenic': ['rooftop'],
  // gastropub added 2026-09-03 (Wilmslow Tavern, Charlie Brown's Hale) —
  // same fireplace/beer-garden register as a country pub, not a precise fit
  // for both (Charlie Brown's leans more cocktail-bar), but the closer of
  // the two real Drink tiles available.
  'Upmarket pubs': ['country-pub', 'gastropub'],
  'Hotel bars': ['hotel-bar'],
  'Cafés (late)': ['coffee-room', 'bakery'],
  "Members' clubs": ['members-club'],
  // listening-bar added 2026-09-03 (Nam) — a serious-sound-system basement
  // room after dark is the same late-night register as Symposium.
  'Late-night lounges': ['late-night-lounge', 'listening-bar'],
  // Added 2026-09-03 for Bacchus (Prestbury) — the first venue of this
  // type; 'Champagne bars' previously matched zero venues anywhere in the app.
  'Champagne bars': ['champagne-bar'],
  // Fixed 2026-09-03, at explicit user report ("i think they can be
  // improved") — this tile existed and matched real onboarding taste, but
  // was never actually wired to the wine-bar type despite 6 real venues
  // (The Wine Cellar, Suburban Green, The Old Cellars, ATOMECA, Wallop and
  // one more) carrying it. The single biggest real bug this review found:
  // the most-populated Drink type in the whole dataset was invisible to
  // onboarding, not because of a curation gap but a missing map entry.
  'Wine bars': ['wine-bar'],

  // Eat
  'Tasting menu': ['tasting-menu'],
  'Fine dining': ['fine-dining'],
  Scenic: ['rooftop'],
  // middle-eastern added 2026-09-03 (Heddy's, BAB NQ) on Heddy's read
  // ("mezze arrives before you've finished deciding") — real tension noted
  // deliberately, not hidden: BAB NQ's actual mood ("basement cocktail room
  // that only unlocks once the sun's properly down") reads much closer to
  // Late-night lounges than to sharing plates. One shared `type` string
  // can't carry two different moods precisely — a real limit of mapping by
  // venue type rather than per-venue, worth a proper fix if more venues
  // hit the same wall, not invented today for a single pair.
  'Small plates': ['small-plates', 'middle-eastern'],
  'Hidden gem': ['speakeasy'],
  Celebratory: ['celebratory'],
  // Added 2026-08 for Aldeli (Cheshire expansion) — the first venue of this
  // type; 'Brunch' previously matched zero venues anywhere in the app.
  Brunch: ['brunch-spot'],
  // handmade-pasta added 2026-09-03 (Sugo Pasta Kitchen) — "thirty covers
  // and an open kitchen across from the market" is literally this tile.
  "Chef's counter": ['handmade-pasta'],
  // italian-restaurant added 2026-09-03 (Cibo) — a hundred-and-sixty-cover
  // room with a retractable roof and an open kitchen is exactly this
  // tile's register, not a quiet neighbourhood table.
  'Lively & loud': ['italian-restaurant'],
  // sherry-bar added 2026-09-03 (Porta) — "one last sherry standing at the
  // counter, kitchen closes at midnight" is a real late-night-eats read,
  // not a sit-down dinner.
  'Late-night eats': ['sherry-bar'],
  // New tile, added 2026-09-03 at explicit user request — deliberately a
  // real mood (honest, no-frills, a fixture rather than a scene), never a
  // cuisine list: "we aren't doing cuisine by country as a category option
  // — it's overdone... people want to know the atmosphere or moment a
  // place is known for, not what kind of food." Closes what was otherwise
  // the single largest blind spot in the catalog: 7 real venues across the
  // most varied part of the whole dataset, invisible to onboarding not
  // because nothing fit them but because nothing was *supposed* to fit
  // them on a cuisine axis. Cantonese Roast (Happy Seasons, "the queue for
  // the roast duck still forms before the doors do"), Pizzeria (Rudy's,
  // "no bookings, but the queue after the late screening is usually
  // nothing"), Vietnamese (Vietbowl, "the kind of pho you'd get told to
  // slow down and finish properly"), Indian Restaurant (Delhi Dream,
  // "never bothered opening a second site"), Thai Restaurant (Phanthong
  // Thai, "mum-and-daughter run"), Greek Taverna (The Stolen Lamb,
  // "regulars stopped reading past" the lamb chops), Farm Shop (Waugh
  // Brow, "a working farm since 1985, with a café tacked on") — none of
  // these are secret (ruling out Hidden gem) and none are a scene
  // (ruling out Lively & loud/Celebratory); they're the opposite kind of
  // good, and that's a real, distinct, requestable thing.
  'Neighbourhood favourite': ['cantonese-roast', 'pizzeria', 'vietnamese', 'indian-restaurant', 'thai-restaurant', 'greek-taverna', 'farm-shop'],
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
  // Added 2026-08 for the Wilmslow density pass (see docs/data/venues.json's
  // own _wilmslowDensitySource note). Most are category-only, same treatment
  // as CANTONESE ROAST/ALE HOUSE/GREEK TAVERNA above — a small town's real
  // venues don't sort neatly into the tile catalog's city-scale categories.
  'ITALIAN RESTAURANT': 'Eat',
  'MIDDLE EASTERN': 'Eat',
  'GASTROPUB': 'Eat',
  'THAI RESTAURANT': 'Eat',
  'VIETNAMESE': 'Eat',
  'LATE-NIGHT LOUNGE': 'Drink',
  'RIVERSIDE PARK': 'Do',
  'COOKERY SCHOOL': 'Do',
  'ARTISAN MARKET': 'Do',
  'RUGBY CLUB': 'Do',
  'GOLF CLUB': 'Do',
  'WELLNESS STUDIO': 'Do',
  'WALKING TOUR': 'Do',
  'FITNESS STUDIO': 'Do',
  // Added 2026-09-03 for the Prestbury/Cheadle Hulme/Knutsford first-venue
  // pass (see docs/data/venues.json's own source note). CHAMPAGNE BAR maps
  // to the real 'Champagne bars' tile above; RARE BOOKSHOP and CRICKET CLUB
  // were introduced the same day by the research pipeline itself.
  'CHAMPAGNE BAR': 'Drink',
  'INDIAN RESTAURANT': 'Eat',
  'RARE BOOKSHOP': 'Do',
  'CRICKET CLUB': 'Do',
  // FARM SHOP found missing 2026-09-03 during the same pass, unrelated to
  // it: introduced by the daily research pipeline's Sept 2 batch (Waugh
  // Brow Farm Shop, Mobberley) but never wired into this map, so mood
  // filtering's category-only bucket silently missed it.
  'FARM SHOP': 'Eat',
  // TOWN PARK and DIM SUM found missing 2026-09-04, same pattern: both
  // introduced by the 2026-09-04 promotion (Thorn Grove Park, Cheadle
  // Hulme; Little Yang Sing, Chinatown) but never wired in.
  'TOWN PARK': 'Do',
  'DIM SUM': 'Eat',
  // Added 2026-09-05 for the day's four promoted candidates (see
  // docs/data/venues.json's own note). DESIGN GALLERY/ART GALLERY/ITALIAN
  // RESTAURANT/BRUNCH SPOT/COCKTAIL BAR already existed above — only these
  // four are new. POTTERY STUDIO maps to the real 'Cookery & craft' tile
  // above; BEAUTY SALON maps to 'Spa & wellness' above; JAPANESE RESTAURANT
  // and WINE MERCHANT are category-only, same treatment as CANTONESE
  // ROAST/ALE HOUSE since no existing tile fits either precisely.
  'POTTERY STUDIO': 'Do',
  'JAPANESE RESTAURANT': 'Eat',
  'BEAUTY SALON': 'Do',
  'WINE MERCHANT': 'Drink',
};
