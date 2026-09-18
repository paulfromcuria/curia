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
  // Found 2026-09-18, at explicit user report from the admin tile-coverage
  // dashboard: Culture and Clothes shopping had 11 and 6 real, live venues
  // between them (museums, heritage centres, historic houses/churches;
  // fashion boutiques) that already existed across the dataset but were
  // never wired to either tile — a pure mapping gap, not a density one.
  // Distinct from Independent cinema/Theatre/Ballet & opera/Art galleries
  // above, which already have their own tiles.
  Culture: ['museum', 'contemporary-art-museum', 'heritage-centre', 'historic-house', 'historic-church'],
  'Clothes shopping': ['fashion-boutique', 'boutique'],
  Markets: ['market-hall', 'artisan-market'],
  'Independent cinema': ['independent-cinema'],
  // Ballet & opera merged into Theatre 2026-09-18 (tile-simplification pass
  // — see docs/data/tiles.json's own _tileSimplificationSource note) — the
  // two tiles mapped to the exact same 8 venues (both real, both
  // performing-arts) with zero actual differentiation between them; a
  // second onboarding pick that produced an identical result set wasn't
  // adding a real choice, just an extra step.
  Theatre: ['performing-arts', 'black-box-theater'],
  // wellness-studio added 2026-09-03 (Wilmslow Pilates & Wellness) — real
  // pampering/relaxation overlap with spa, unlike fitness-studio below.
  // beauty-salon added 2026-09-05 (KLUB, Spinningfields) — one-to-one
  // hair/beauty treatments read the same as a spa visit, not a fitness class.
  'Spa & wellness': ['spa', 'wellness-studio', 'beauty-salon'],
  'Live music': ['live-music'],
  'Art galleries': ['art-gallery'],
  // botanical-garden added 2026-09-15 (Chelsea Physic Garden, London) — a
  // walled botanic garden is the same real "green space" outing as a
  // riverside park, just a different kind of green.
  'Parks & green space': ['riverside-park', 'botanical-garden'],
  // cricket-club added 2026-09-03 (Mobberley Cricket Club) — same spectator
  // afternoon as rugby, a different pitch. golf-club removed 2026-09-18,
  // at explicit user request adding a real 'Play sport' tile below — a
  // private members' golf club is somewhere you play, not spectator
  // infrastructure the way a racecourse or a rugby ground is; it never
  // belonged here, it just had nowhere better to go until now.
  'Spectator sport': ['rugby-club', 'cricket-club'],
  // Play sport added 2026-09-18 (22 real Cheshire golf clubs — see
  // venues.json's own _cheshireGolfClubsSource note). Padel/Tennis have no
  // real venues yet as of this tile's own creation — real sub-preference
  // options, kept in full through the same-day tile-simplification pass at
  // explicit user request ("we should keep padel and tennis but we should
  // source some venues") — sourcing was already underway when that
  // decision was made, unlike every other thin tile cut in that pass.
  'Play sport': ['golf-club'],
  // fitness-studio (Alchemy Personal Training) deliberately left untiled —
  // 2026-09-03 review: one-to-one personal training isn't an evening-plans
  // discovery the way spa/wellness is; CATEGORY_BY_VENUE_TYPE below still
  // has it as 'Do' so mood filtering finds it, it just has no dedicated tile.
  //
  // Comedy, Ballet & opera (see Theatre above), Walking tours, Antiques &
  // design and Cookery & craft were all removed from tiles.json 2026-09-18
  // (tile-simplification pass) — each had 1-6 real venues, not enough to
  // justify a dedicated onboarding pick per the user's own "real value
  // added, not fluff" standard. Their venues (comedy-club, design-gallery,
  // rare-bookshop, cookery-school, pottery-studio, cookbook-shop,
  // walking-tour) are untouched in CATEGORY_BY_VENUE_TYPE below, so they
  // stay fully visible in Map/List and to the mood filter's category-level
  // matching — cutting the tile only removes the dedicated onboarding pick,
  // never the venue itself. See docs/data/tiles.json's own
  // _tileSimplificationSource note for the full reasoning.

  // Drink
  // Found 2026-09-18 alongside the Culture/Clothes shopping fix above —
  // Enigma Club and Koo Club (both real, live NIGHTCLUB-type venues)
  // existed but Nightclubs had never been wired to them either.
  Nightclubs: ['nightclub'],
  // whisky-bar folded in 2026-09-18 (tile-simplification pass — 'Whisky &
  // spirits' cut, its one real venue, The Whiskey Jar, wasn't enough to
  // justify its own onboarding pick, but stays reachable here rather than
  // losing its tile-match signal entirely).
  'Cocktail bars': ['cocktail-bar', 'speakeasy', 'whisky-bar'],
  'Jazz bars': ['jazz-bar'],
  'Rooftop & scenic': ['rooftop'],
  // gastropub added 2026-09-03 (Wilmslow Tavern, Charlie Brown's Hale) —
  // same fireplace/beer-garden register as a country pub, not a precise fit
  // for both (Charlie Brown's leans more cocktail-bar), but the closer of
  // the two real Drink tiles available. beer-garden folded in 2026-09-18
  // (tile-simplification pass — 'Beer gardens' cut, its one real venue,
  // Port Street Beer House, stays reachable here instead; its own real
  // "Beer garden" refinement, kept on this tile, is what a member would
  // toggle to find it).
  'Upmarket pubs': ['country-pub', 'gastropub', 'beer-garden'],
  'Hotel bars': ['hotel-bar'],
  'Cafés (late)': ['coffee-room', 'bakery'],
  // Riyadh Drink catalog (region-scoped, see HomeRegion's own doc comment,
  // src/types/models.ts) — wired 2026-09-15 alongside Riyadh's first real
  // venues (docs/data/venues.json's own _riyadhVenueSource note). Alcohol
  // is prohibited nationwide, so these replace cocktail-bar/wine-bar-style
  // tiles entirely for Riyadh members rather than sitting alongside them.
  // coffee-room already existed (reused above for 'Cafés (late)') — reused
  // again here rather than introducing a second, redundant type.
  'Specialty coffee': ['coffee-room'],
  'Shisha lounges': ['shisha-lounge'],
  'Dessert cafés': ['dessert-cafe'],
  'Hotel lounges': ['hotel-lounge'],
  // tea-house added 2026-09-15 (HODAJ, Diriyah) — the second Riyadh venue
  // pass's first Tea houses match.
  'Tea houses': ['tea-house'],
  // 'Mocktail lounges' and 'Juice & smoothie bars' still match zero
  // venues — a real coverage gap for the next Riyadh pass, not wired to
  // anything yet since a mapping with no venue behind it would be
  // premature (same "an empty array is not a bug" convention as every
  // other sparse tile in this file).
  //
  // "Members' clubs" cut 2026-09-18 (tile-simplification pass) — its one
  // real venue (members-club type) stays visible via CATEGORY_BY_VENUE_TYPE
  // below, just without a dedicated onboarding pick.
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
  // italian-restaurant added 2026-09-03 (Cibo) — a hundred-and-sixty-cover
  // room with a retractable roof and an open kitchen is exactly this
  // tile's register, not a quiet neighbourhood table.
  'Lively & loud': ['italian-restaurant'],
  // "Chef's counter" (handmade-pasta) and "Late-night eats" (sherry-bar)
  // cut 2026-09-18 (tile-simplification pass) — handmade-pasta had zero
  // real venues left (Sugo Pasta Kitchen, referenced in this file's own
  // 2026-09-03 note, is no longer in the live dataset — checked directly
  // against Supabase, not assumed), and sherry-bar had exactly one. Porta's
  // sherry-bar venue stays visible via CATEGORY_BY_VENUE_TYPE below, just
  // without a dedicated onboarding pick.
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
  // lebanese-restaurant added 2026-09-15 (Ishbilia, London) — 26 years
  // family-run with no scene to speak of, the same honest-fixture register
  // as this tile's other cuisine types.
  // cafeteria/caribbean-restaurant/senegalese/diner/soul-food added
  // 2026-09-18 (Curia's first US metro — Hyde Park/Kenwood/Woodlawn,
  // Chicago; see docs/data/venues.json's own _chicagoVenueSource note) —
  // all five are exactly this tile's honest-fixture-not-a-scene register
  // (Valois' steam table since 1921, Ja' Grill's decade on 53rd, Gorée
  // Cuisine's family recipe from Dakar, Daley's since 1892, Let's Eat To
  // Live's free Sunday meals). dive-bar/record-shop/southern-restaurant/
  // indian-southern-fusion/creole-brazilian (CATEGORY_BY_VENUE_TYPE below)
  // are left category-only, same as this file's many other unwired US/
  // non-UK cuisine and register types — no existing tile fits them
  // precisely.
  'Neighbourhood favourite': ['cantonese-roast', 'pizzeria', 'vietnamese', 'indian-restaurant', 'thai-restaurant', 'greek-taverna', 'farm-shop', 'lebanese-restaurant', 'cafeteria', 'caribbean-restaurant', 'senegalese', 'diner', 'soul-food'],

  // Holiday (added 2026-09 for the Santorini pass — see TileCategory's own
  // doc comment in src/types/models.ts). Started as one tile ('Beach
  // clubs'); expanded to four 2026-09 at explicit user request ('expand the
  // preferences beyond just beach club') — see docs/data/tiles.json's own
  // _holidaySource note for the real venue counts backing each. 'Wine
  // tasting' and 'Boat trips' have just one real venue each so far, same
  // precedent as 'Champagne bars' when it was first added with one.
  'Beach clubs': ['beach-club'],
  'Sunset bars': ['sunset-bar'],
  'Wine tasting': ['winery'],
  'Boat trips': ['boat-tour'],
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
export const CATEGORY_BY_VENUE_TYPE: Record<string, 'Do' | 'Drink' | 'Eat' | 'Holiday'> = {
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
  // Added 2026-09-07 for White Peak Alpaca Farm (Mobberley) — no existing
  // type fit a pre-booked animal-encounter attraction; category-only (Do),
  // same treatment as RARE BOOKSHOP/CRICKET CLUB above since no onboarding
  // tile targets it specifically yet.
  'FARM EXPERIENCE': 'Do',
  // Added 2026-09-09 for Chorlton Bookshop — RARE BOOKSHOP specifically
  // implies antiquarian/secondhand stock, which this general independent
  // new-book shop isn't; category-only (Do), same treatment as RARE
  // BOOKSHOP/FARM EXPERIENCE above since no onboarding tile fits precisely.
  'BOOKSHOP': 'Do',
  // Added 2026-09-10 for the day's promoted Heaton Moor/Alderley Edge
  // candidates (see docs/data/venues.json's own _dailyReviewPromotionSource20260910
  // note). FRENCH BISTRO (Cure Bistro) — GASTROPUB is the closest existing
  // Eat type but implies a British pub kitchen, which this isn't; NATURE
  // RESERVE (The Edge) — RIVERSIDE PARK implies a riverside, which this
  // isn't. Both category-only, same treatment as CANTONESE ROAST/GREEK
  // TAVERNA/FARM EXPERIENCE above since no onboarding tile fits precisely.
  'FRENCH BISTRO': 'Eat',
  'NATURE RESERVE': 'Do',
  // Added 2026-09-13 for Deadwood Smokehouse (Nantwich) — no existing Eat
  // type fits a dedicated American BBQ smokehouse; category-only, same
  // treatment as CANTONESE ROAST/GREEK TAVERNA above since no onboarding
  // tile fits precisely.
  'SMOKEHOUSE': 'Eat',
  // Santorini pass (2026-09) — see docs/data/venues.json's own source note
  // and TileCategory's doc comment (src/types/models.ts). BEACH CLUB,
  // SUNSET BAR, WINERY and BOAT TOUR map to the four Holiday tiles above
  // (the Holiday-catalog expansion, also 2026-09); the rest are
  // category-only, matching real venue types Manchester/Cheshire tiles
  // don't target.
  'BEACH CLUB': 'Holiday',
  NIGHTCLUB: 'Drink',
  'SPORTS BAR': 'Drink',
  // Caldera-facing sunset-viewing bars (Oia/Imerovigli) — a real, distinct
  // Santorini category, not the same as ROOFTOP.
  'SUNSET BAR': 'Holiday',
  WINERY: 'Holiday',
  'JEWELLERY BOUTIQUE': 'Do',
  'FASHION BOUTIQUE': 'Do',
  MUSEUM: 'Do',
  'BOAT TOUR': 'Holiday',
  'SOUVLAKI SPOT': 'Eat',
  'SEAFOOD RESTAURANT': 'Eat',
  // London pass (2026-09-15) — see docs/data/venues.json's own
  // _londonVenueSource note. LEBANESE RESTAURANT maps to the real
  // 'Neighbourhood favourite' tile above; BOTANICAL GARDEN maps to 'Parks
  // & green space'; COOKBOOK SHOP maps to 'Cookery & craft'. The rest are
  // category-only, same treatment as this file's many existing
  // category-only types, since no existing tile fits any of them
  // precisely.
  'LEBANESE RESTAURANT': 'Eat',
  'TURKISH RESTAURANT': 'Eat',
  'BRITISH RESTAURANT': 'Eat',
  'BOTANICAL GARDEN': 'Do',
  'TRADITIONAL PUB': 'Drink',
  BOUTIQUE: 'Do',
  'INDEPENDENT BOOKSHOP': 'Do',
  'COOKBOOK SHOP': 'Do',
  'HISTORIC HOUSE': 'Do',
  // Riyadh pass (2026-09-15) — see docs/data/venues.json's own
  // _riyadhVenueSource note. SHISHA LOUNGE, DESSERT CAFE and HOTEL LOUNGE
  // map onto real Riyadh Drink tiles above; SAUDI HERITAGE CUISINE and
  // FIRE GRILL are category-only (Eat), distinct enough from MIDDLE
  // EASTERN to warrant their own label; CONTEMPORARY ART MUSEUM is
  // category-only (Do) — a purpose-built national museum is a different
  // register from a commercial ART GALLERY.
  'SHISHA LOUNGE': 'Drink',
  'DESSERT CAFE': 'Drink',
  'HOTEL LOUNGE': 'Drink',
  'SAUDI HERITAGE CUISINE': 'Eat',
  'FIRE GRILL': 'Eat',
  'CONTEMPORARY ART MUSEUM': 'Do',
  // Riyadh second pass (2026-09-15). TEA HOUSE maps to the real 'Tea
  // houses' tile above. MOROCCAN LOUNGE is category-only — not hotel-based
  // and not a shisha-only concept, so no existing Drink type fits it.
  'TEA HOUSE': 'Drink',
  'MOROCCAN LOUNGE': 'Drink',
  // Manchester Comedy/Whisky & spirits/Beer gardens pass (2026-09-18) — see
  // docs/data/venues.json's own _tileCoverageGapSource note. Three brand
  // new types, one venue each, each wired to the one real tile it exists
  // to close: COMEDY CLUB (Do), WHISKY BAR and BEER GARDEN (both Drink).
  'COMEDY CLUB': 'Do',
  'WHISKY BAR': 'Drink',
  'BEER GARDEN': 'Drink',
  // Chicago pass (2026-09-18) — Curia's first US metro, Hyde Park/Kenwood/
  // Woodlawn. See docs/data/venues.json's own _chicagoVenueSource note.
  // CAFETERIA/CARIBBEAN RESTAURANT/SENEGALESE/DINER/SOUL FOOD map onto the
  // real 'Neighbourhood favourite' tile above. DIVE BAR (Jimmy's/Woodlawn
  // Tap) deliberately doesn't map to 'Upmarket pubs' — that tile is
  // explicitly upmarket, a dive bar is the opposite register on purpose.
  // RECORD SHOP, SOUTHERN RESTAURANT, INDIAN-SOUTHERN FUSION and
  // CREOLE-BRAZILIAN are category-only, same treatment as this file's many
  // other US/non-UK types with no precise existing tile fit.
  CAFETERIA: 'Eat',
  'DIVE BAR': 'Drink',
  'RECORD SHOP': 'Do',
  'CARIBBEAN RESTAURANT': 'Eat',
  'SOUTHERN RESTAURANT': 'Eat',
  'INDIAN-SOUTHERN FUSION': 'Eat',
  'CREOLE-BRAZILIAN': 'Eat',
  SENEGALESE: 'Eat',
  DINER: 'Eat',
  'SOUL FOOD': 'Eat',
};
