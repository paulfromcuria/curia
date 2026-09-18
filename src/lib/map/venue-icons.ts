/**
 * Subtle per-venue-type map icons (2026-09, at explicit user request: "use
 * icons based on venue type, e.g a gym has a subtle dumbbell on the map,
 * and a bar has a cocktail glass"). Real venue.type strings (114 distinct
 * ones as of this writing, live Supabase `venues` table) are grouped into a
 * compact set of icon concepts — enough to read as genuinely different at
 * a glance without inventing a bespoke glyph per type, the same "reuse an
 * existing bucket, only add one when nothing fits" discipline
 * src/lib/scoring/tile-catalog-map.ts already applies to category mapping.
 *
 * 2026-09-18 rewrite, at explicit user request ("cinema should have its
 * own [icon], golf and tennis and padel should have different icons") —
 * auditing against the live database found the real gap was much bigger
 * than those two examples: 56 of 114 real types had drifted into the
 * `generic` fallback dot as new venues/types were added throughout the
 * project without this file being updated alongside them. Re-triaged every
 * one, added 9 new icon concepts (cinema, golf, tennis, padel, spirits,
 * shisha, boutique, beach, boat) where nothing existing genuinely fit, and
 * folded the rest into the closest real match. `tennis`/`padel` have zero
 * live venues as of this pass — mapped preemptively (TENNIS CLUB/PADEL
 * CLUB) so real ones render correctly the moment they're added, rather
 * than needing a second follow-up pass.
 *
 * 2026-09-18, second pass the same night, at explicit user report: "all
 * culture venues... always have a book icon, so i click on one and its a
 * historic house, i click on the next and its a bookshop, the next is a
 * museum. can be confusing." `culture` had been deliberately built as a
 * broad catch-all on the same "reuse one bucket" logic as `dining` — but
 * that logic doesn't hold here the way it does for `dining`: every Dining
 * venue really is the same activity (sit down, eat) regardless of cuisine,
 * so one fork-and-knife icon is honest; a museum, a bookshop and a
 * historic house are genuinely different activities that only happened to
 * share a bucket. Split into `museum` (institutional/heritage — walk
 * through an exhibit or a building with history) and `books` (literally
 * book-related — the old `culture` glyph, now used only for things that
 * actually are books), leaving a smaller, more honest `culture` for the
 * real leftovers: live performance and hands-on workshops (performing
 * arts, comedy, cookery school, pottery studio) — a coherent "a booked
 * experience" register, not a dumping ground.
 *
 * Icons are defined once, here, as plain geometric primitives — not JSX —
 * so both map renderers can use the same shapes without sharing rendering
 * code: map.tsx (native, @rnmapbox/maps MarkerView) renders them via
 * react-native-svg (src/components/curia/venue-type-icon.tsx); map.web.tsx
 * (mapbox-gl, imperative DOM markers, no React tree to mount into) renders
 * them via `iconSvgMarkup` below, injected as raw innerHTML. One set of
 * shapes, two thin renderers — never hand-duplicate the paths themselves.
 */

export type VenueIconKey =
  | 'cocktail'
  | 'wine'
  | 'spirits'
  | 'beer'
  | 'coffee'
  | 'dining'
  | 'pizza'
  | 'bakery'
  | 'music'
  | 'culture'
  | 'museum'
  | 'books'
  | 'cinema'
  | 'art'
  | 'fitness'
  | 'wellness'
  | 'park'
  | 'market'
  | 'sport'
  | 'golf'
  | 'tennis'
  | 'padel'
  | 'shisha'
  | 'boutique'
  | 'beach'
  | 'boat'
  | 'generic';

export type IconPrimitive =
  | { shape: 'path'; d: string; fill?: boolean }
  | { shape: 'circle'; cx: number; cy: number; r: number; fill?: boolean }
  | { shape: 'line'; x1: number; y1: number; x2: number; y2: number };

/** Every icon is drawn on a 24x24 grid, stroke-only unless `fill: true` —
 * kept to simple primitives (not elaborate bezier art) on purpose: these
 * render at ~14px on a map, where a shape reading as "roughly a dumbbell"
 * matters far more than precise iconography. */
export const VENUE_ICON_PRIMITIVES: Record<VenueIconKey, IconPrimitive[]> = {
  cocktail: [
    { shape: 'path', d: 'M4 4 H20 L12 13 Z' },
    { shape: 'line', x1: 12, y1: 13, x2: 12, y2: 19 },
    { shape: 'line', x1: 8, y1: 20, x2: 16, y2: 20 },
  ],
  wine: [
    { shape: 'path', d: 'M7 3 C7 10 8 13 12 13 C16 13 17 10 17 3 Z' },
    { shape: 'line', x1: 12, y1: 13, x2: 12, y2: 19 },
    { shape: 'line', x1: 8, y1: 20, x2: 16, y2: 20 },
  ],
  // spirits — whisky/gin/bottle shops: a rocks tumbler with ice, distinct
  // from the stemmed cocktail/wine glass silhouettes above.
  spirits: [
    { shape: 'path', d: 'M6 5 H18 L16 20 H8 Z' },
    { shape: 'line', x1: 9, y1: 12.5, x2: 13.5, y2: 9 },
    { shape: 'line', x1: 9.5, y1: 16, x2: 14.5, y2: 12.5 },
  ],
  beer: [
    { shape: 'path', d: 'M7 4 H17 L15.5 20 H8.5 Z' },
    { shape: 'line', x1: 7.6, y1: 7.5, x2: 16.4, y2: 7.5 },
  ],
  coffee: [
    { shape: 'path', d: 'M5 8 H17 L16 18 C16 19.4 14.8 20 13.5 20 H8.5 C7.2 20 6 19.4 6 18 Z' },
    { shape: 'path', d: 'M17 10 C21.5 10 21.5 15 17 15' },
    { shape: 'path', d: 'M9 6 C9 6 8.2 4.4 9 3' },
    { shape: 'path', d: 'M13 6 C13 6 12.2 4.4 13 3' },
  ],
  dining: [
    { shape: 'line', x1: 6, y1: 3, x2: 6, y2: 9 },
    { shape: 'line', x1: 8, y1: 3, x2: 8, y2: 9 },
    { shape: 'line', x1: 10, y1: 3, x2: 10, y2: 9 },
    { shape: 'line', x1: 8, y1: 9, x2: 8, y2: 21 },
    { shape: 'path', d: 'M14 3 L18 3 L16 10 Z' },
    { shape: 'line', x1: 16, y1: 10, x2: 16, y2: 21 },
  ],
  pizza: [
    { shape: 'path', d: 'M12 4 L20 20 L4 20 Z' },
    { shape: 'circle', cx: 11, cy: 14, r: 1.1, fill: true },
    { shape: 'circle', cx: 14, cy: 16.5, r: 1.1, fill: true },
  ],
  bakery: [
    {
      shape: 'path',
      d: 'M4 12 C4 7 8 6 12 6 C16 6 20 7 20 12 V17 C20 19 18 20 16 20 H8 C6 20 4 19 4 17 Z',
    },
    { shape: 'line', x1: 8, y1: 9, x2: 10, y2: 13 },
    { shape: 'line', x1: 14, y1: 9, x2: 16, y2: 13 },
  ],
  music: [
    { shape: 'circle', cx: 8, cy: 18, r: 3 },
    { shape: 'line', x1: 11, y1: 18, x2: 11, y2: 4 },
    { shape: 'path', d: 'M11 4 C16 5 17 8 16 11' },
  ],
  // culture — trimmed 2026-09-18 to a real, coherent register: a booked,
  // scheduled experience (live performance or a hands-on workshop), not
  // museums/books anymore (see museum/books below). A ticket stub — a
  // perforated card with a stub divider — reads as "something you book
  // into" for both a comedy show and a cookery class.
  culture: [
    { shape: 'path', d: 'M4 8 H20 V17 H4 Z' },
    { shape: 'circle', cx: 4, cy: 12.5, r: 1.3 },
    { shape: 'circle', cx: 20, cy: 12.5, r: 1.3 },
    { shape: 'line', x1: 9, y1: 8, x2: 9, y2: 17 },
  ],
  // museum — a columned, pedimented building front. Split out from the old
  // broad `culture` bucket 2026-09-18, at explicit user report: "i click on
  // one and its a historic house, i click on the next and its a bookshop,
  // the next is a museum. can be confusing." Institutional/heritage venues
  // (museums, heritage centres, historic houses/churches) — a real, walk-
  // through-an-exhibit-or-a-building-with-history register, distinct from
  // `books` below.
  museum: [
    { shape: 'path', d: 'M4 10 L12 4 L20 10 Z' },
    { shape: 'line', x1: 5, y1: 10, x2: 5, y2: 19 },
    { shape: 'line', x1: 9.5, y1: 10, x2: 9.5, y2: 19 },
    { shape: 'line', x1: 14.5, y1: 10, x2: 14.5, y2: 19 },
    { shape: 'line', x1: 19, y1: 10, x2: 19, y2: 19 },
    { shape: 'line', x1: 3, y1: 20, x2: 21, y2: 20 },
  ],
  // books — the exact shape `culture` used to use, now dedicated
  // exclusively to things that actually are books (bookshops, libraries) —
  // split out 2026-09-18, same report as `museum` above.
  books: [
    {
      shape: 'path',
      d: 'M12 6 C9 4 5 4 3 5 V18 C5 17 9 17 12 19 C15 17 19 17 21 18 V5 C19 4 15 4 12 6 Z',
    },
    { shape: 'line', x1: 12, y1: 6, x2: 12, y2: 19 },
  ],
  // cinema — a screen frame with a play mark, split out from `culture`
  // 2026-09-18 at explicit user request ("cinema should have its own").
  cinema: [
    { shape: 'path', d: 'M4 5 H20 V19 H4 Z' },
    { shape: 'path', d: 'M10 9 L16 12 L10 15 Z', fill: true },
  ],
  art: [
    { shape: 'path', d: 'M3 4 H21 V19 H3 Z' },
    { shape: 'path', d: 'M5 15 L9 9 L13 13 L16 8 L19 15' },
    { shape: 'circle', cx: 16, cy: 8, r: 1.4, fill: true },
  ],
  fitness: [
    { shape: 'path', d: 'M2 9 H6 V15 H2 Z', fill: true },
    { shape: 'path', d: 'M18 9 H22 V15 H18 Z', fill: true },
    { shape: 'line', x1: 6, y1: 12, x2: 18, y2: 12 },
  ],
  wellness: [
    {
      shape: 'path',
      d: 'M12 3 C12 3 19 12 19 16 C19 19.3 15.9 22 12 22 C8.1 22 5 19.3 5 16 C5 12 12 3 12 3 Z',
    },
  ],
  park: [
    { shape: 'path', d: 'M20 4 C10 4 4 10 4 20 C14 20 20 14 20 4 Z' },
    { shape: 'line', x1: 6, y1: 18, x2: 18, y2: 6 },
  ],
  market: [
    { shape: 'path', d: 'M6 8 H18 L17 21 H7 Z' },
    { shape: 'path', d: 'M9 8 C9 3 15 3 15 8' },
  ],
  // sport — spectator sport specifically (watching, not playing): rugby
  // and cricket clubs. Golf split out below 2026-09-18 — a private members'
  // course is somewhere you play, not spectator infrastructure, and its
  // old shared icon here never distinguished the two registers visually.
  sport: [
    {
      shape: 'path',
      d: 'M8 3 H16 L15 12 C15 14.5 13.5 15 12 15 C10.5 15 9 14.5 9 12 Z',
    },
    { shape: 'path', d: 'M8 5 C4 5 4 9 8 10' },
    { shape: 'path', d: 'M16 5 C20 5 20 9 16 10' },
    { shape: 'line', x1: 12, y1: 15, x2: 12, y2: 18 },
    { shape: 'line', x1: 9, y1: 19, x2: 15, y2: 19 },
  ],
  // golf — flag, pole, green. Split out from `sport` 2026-09-18 at explicit
  // user request ("golf and tennis and padel should have different icons").
  golf: [
    { shape: 'line', x1: 8, y1: 20, x2: 8, y2: 4 },
    { shape: 'path', d: 'M8 4 L17 6.5 L8 9 Z', fill: true },
    { shape: 'path', d: 'M3 20 C3 17.5 5.5 16 8 16 C10.5 16 13 17.5 13 20 Z' },
  ],
  // tennis — an open, strung racquet head (hollow circle + crossed
  // strings), deliberately the visual opposite of padel's solid paddle
  // below so the two read as different sports, not variations of one icon.
  // Mapped ahead of real venues 2026-09-18; 7 real ones landed the same
  // night (see docs/data/venues.json's own _padelTennisVenueSource note).
  tennis: [
    { shape: 'circle', cx: 9, cy: 9, r: 5 },
    { shape: 'line', x1: 9, y1: 4, x2: 9, y2: 14 },
    { shape: 'line', x1: 4, y1: 9, x2: 14, y2: 9 },
    { shape: 'line', x1: 9, y1: 14, x2: 9, y2: 21 },
    { shape: 'circle', cx: 18, cy: 17, r: 2, fill: true },
  ],
  // padel — a solid paddle (no strings), the real physical difference from
  // a tennis racquet. Mapped ahead of real venues 2026-09-18; 4 real
  // standalone ones (plus 3 golf clubs with real padel courts, tagged
  // rather than added as new venues) landed the same night.
  padel: [
    {
      shape: 'path',
      d: 'M9 3.5 C13.5 3.5 15 7.5 13.8 11 C12.8 13.8 10 14.5 9 14.5 C8 14.5 5.2 13.8 4.2 11 C3 7.5 4.5 3.5 9 3.5 Z',
      fill: true,
    },
    { shape: 'line', x1: 9, y1: 14.5, x2: 9, y2: 21 },
    { shape: 'circle', cx: 18, cy: 8, r: 2, fill: true },
  ],
  // shisha — hookah base, stem, bowl and hose. Distinct enough (Riyadh
  // Drink catalog) to warrant its own icon rather than folding into
  // `cocktail`, which reads as an alcohol register this explicitly isn't.
  shisha: [
    { shape: 'path', d: 'M8 20 C6 20 5.5 16 7.5 14.5 H16.5 C18.5 16 18 20 16 20 Z' },
    { shape: 'line', x1: 12, y1: 14.5, x2: 12, y2: 5 },
    { shape: 'circle', cx: 12, cy: 3.6, r: 1.8 },
    { shape: 'path', d: 'M12 11 C16 11 18 13 16.5 17' },
  ],
  // boutique — a hanger. Retail/fashion is visually distinct from every
  // food/drink/culture bucket above it, worth its own glyph.
  boutique: [
    { shape: 'circle', cx: 12, cy: 4, r: 1.5 },
    { shape: 'path', d: 'M12 5.5 L4 12.5 H20 Z' },
    { shape: 'line', x1: 4, y1: 12.5, x2: 20, y2: 12.5 },
  ],
  // beach — an umbrella. Santorini/Holiday-catalog specific.
  beach: [
    { shape: 'path', d: 'M12 3 C17 3 20 8 20 10 H4 C4 8 7 3 12 3 Z', fill: true },
    { shape: 'line', x1: 12, y1: 10, x2: 12, y2: 21 },
    { shape: 'path', d: 'M6 21 C8 19 16 19 18 21' },
  ],
  // boat — a hull and sail. Santorini/Holiday-catalog specific.
  boat: [
    { shape: 'path', d: 'M4 15 H20 L17 20 H7 Z' },
    { shape: 'line', x1: 11, y1: 15, x2: 11, y2: 4 },
    { shape: 'path', d: 'M11 4 L17 14 H11 Z', fill: true },
  ],
  generic: [{ shape: 'circle', cx: 12, cy: 12, r: 3, fill: true }],
};

/**
 * Real venue.type -> icon bucket. Every type live in Supabase as of this
 * writing is mapped explicitly (audited 2026-09-18 by querying the real
 * `venues` table directly, not assumed from docs/data/venues.json — 114
 * distinct types found, 56 were silently falling through to `generic`
 * before this pass) — `generic` is the fallback for whatever new type the
 * daily research pipeline or a future pass introduces next, not a dumping
 * ground for types that were simply never checked.
 */
const ICON_BY_TYPE: Record<string, VenueIconKey> = {
  // cocktail — spirit-led bars and late-night lounges
  'COCKTAIL BAR': 'cocktail',
  SPEAKEASY: 'cocktail',
  'HOTEL BAR': 'cocktail',
  'HOTEL LOUNGE': 'cocktail',
  CELEBRATORY: 'cocktail',
  'LATE-NIGHT LOUNGE': 'cocktail',
  'KARAOKE BAR': 'cocktail',
  ROOFTOP: 'cocktail',
  NIGHTCLUB: 'cocktail',
  'MEMBERS CLUB': 'cocktail',
  'SUNSET BAR': 'cocktail',

  // wine — wine, champagne, sherry, winery
  'WINE BAR': 'wine',
  'CHAMPAGNE BAR': 'wine',
  'SHERRY BAR': 'wine',
  'WINE MERCHANT': 'wine',
  WINERY: 'wine',

  // spirits — whisky, gin, bottle shops (retail/bar, no mixed drink)
  'WHISKY BAR': 'spirits',
  'GIN BAR': 'spirits',
  'BOTTLE SHOP': 'spirits',

  // beer — pubs
  'COUNTRY PUB': 'beer',
  GASTROPUB: 'beer',
  'ALE HOUSE': 'beer',
  'TRADITIONAL PUB': 'beer',
  'DIVE BAR': 'beer',
  'IRISH BAR': 'beer',
  'SPORTS BAR': 'beer',
  'BEER GARDEN': 'beer',

  // coffee
  'COFFEE ROOM': 'coffee',
  'TEA HOUSE': 'coffee',

  // dining — the broad real-food-service bucket
  'SMALL PLATES': 'dining',
  'FINE DINING': 'dining',
  'ITALIAN RESTAURANT': 'dining',
  'TASTING MENU': 'dining',
  'MIDDLE EASTERN': 'dining',
  'CANTONESE ROAST': 'dining',
  'GREEK TAVERNA': 'dining',
  'THAI RESTAURANT': 'dining',
  VIETNAMESE: 'dining',
  'INDIAN RESTAURANT': 'dining',
  'DIM SUM': 'dining',
  'JAPANESE RESTAURANT': 'dining',
  'MEDITERRANEAN RESTAURANT': 'dining',
  'BRUNCH SPOT': 'dining',
  BISTRO: 'dining',
  'FRENCH BISTRO': 'dining',
  'FRENCH BRASSERIE': 'dining',
  'BRITISH RESTAURANT': 'dining',
  'SEAFOOD RESTAURANT': 'dining',
  'LEBANESE RESTAURANT': 'dining',
  'TURKISH RESTAURANT': 'dining',
  'CARIBBEAN RESTAURANT': 'dining',
  'INDIAN-SOUTHERN FUSION': 'dining',
  'CREOLE-BRAZILIAN': 'dining',
  SENEGALESE: 'dining',
  'SOUL FOOD': 'dining',
  'SOUTHERN RESTAURANT': 'dining',
  'SOUVLAKI SPOT': 'dining',
  'FIRE GRILL': 'dining',
  SMOKEHOUSE: 'dining',
  'SAUDI HERITAGE CUISINE': 'dining',
  DINER: 'dining',
  CAFETERIA: 'dining',
  'CAMPUS DINING HALL': 'dining',

  // pizza
  PIZZERIA: 'pizza',

  // bakery — sweet/pastry register
  BAKERY: 'bakery',
  'DESSERT CAFE': 'bakery',

  // music
  'LIVE MUSIC': 'music',
  'JAZZ BAR': 'music',
  'LISTENING BAR': 'music',
  'LIVE MUSIC BAR': 'music',
  'RECORD SHOP': 'music',

  // culture — a booked, scheduled experience: live performance or a
  // hands-on workshop. Trimmed 2026-09-18 from a much broader bucket (see
  // this icon's own note) — museums/heritage and books split out below.
  'PERFORMING ARTS': 'culture',
  'COOKERY SCHOOL': 'culture',
  'POTTERY STUDIO': 'culture',
  'COMEDY CLUB': 'culture',

  // museum — institutional/heritage, walk-through-an-exhibit-or-a-
  // building-with-history. Split out from `culture` 2026-09-18.
  'HERITAGE CENTRE': 'museum',
  MUSEUM: 'museum',
  'CONTEMPORARY ART MUSEUM': 'museum',
  'HISTORIC HOUSE': 'museum',
  'HISTORIC CHURCH': 'museum',

  // books — literally book-related (bookshops, libraries). Split out from
  // `culture` 2026-09-18.
  'RARE BOOKSHOP': 'books',
  'ACADEMIC LIBRARY': 'books',
  'PUBLIC LIBRARY': 'books',
  BOOKSHOP: 'books',
  'INDEPENDENT BOOKSHOP': 'books',
  'COOKBOOK SHOP': 'books',

  // cinema — its own icon, not lumped into `culture` (see that icon above)
  'INDEPENDENT CINEMA': 'cinema',

  // art
  'ART GALLERY': 'art',
  'DESIGN GALLERY': 'art',
  'ART STUDIO': 'art',

  // fitness
  'FITNESS STUDIO': 'fitness',
  'CAMPUS GYM': 'fitness',

  // wellness
  SPA: 'wellness',
  'WELLNESS STUDIO': 'wellness',
  'BEAUTY SALON': 'wellness',

  // park — green space and outdoor/rural
  'TOWN PARK': 'park',
  'RIVERSIDE PARK': 'park',
  'BOTANICAL GARDEN': 'park',
  'FARM SHOP': 'park',
  'FARM EXPERIENCE': 'park',
  'WALKING TOUR': 'park',
  'NATURE RESERVE': 'park',

  // market
  'MARKET HALL': 'market',
  'ARTISAN MARKET': 'market',

  // sport — watch, not play (see that icon's own note)
  'RUGBY CLUB': 'sport',
  'CRICKET CLUB': 'sport',

  // golf / tennis / padel — play-it-yourself sport, each with its own icon
  'GOLF CLUB': 'golf',
  'TENNIS CLUB': 'tennis',
  'PADEL CLUB': 'padel',

  // shisha
  'SHISHA LOUNGE': 'shisha',
  'MOROCCAN LOUNGE': 'shisha',

  // boutique — retail/fashion
  BOUTIQUE: 'boutique',
  'FASHION BOUTIQUE': 'boutique',
  'JEWELLERY BOUTIQUE': 'boutique',

  // beach / boat — Holiday catalog (Santorini)
  'BEACH CLUB': 'beach',
  'BOAT TOUR': 'boat',
};

export function iconForVenueType(type: string): VenueIconKey {
  return ICON_BY_TYPE[type] ?? 'generic';
}

/** Renders one icon as a raw, self-contained <svg> markup string — for
 * map.web.tsx's imperative mapboxgl.Marker elements, which build real DOM
 * nodes directly (no React tree to mount a component into). Native's
 * equivalent is src/components/curia/venue-type-icon.tsx, built from the
 * exact same VENUE_ICON_PRIMITIVES. */
export function iconSvgMarkup(key: VenueIconKey, sizePx: number, color: string): string {
  const parts = VENUE_ICON_PRIMITIVES[key].map((p) => {
    const filled = p.shape !== 'line' && p.fill;
    const common = `stroke="${color}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" fill="${filled ? color : 'none'}"`;
    if (p.shape === 'path') return `<path d="${p.d}" ${common} />`;
    if (p.shape === 'circle') return `<circle cx="${p.cx}" cy="${p.cy}" r="${p.r}" ${common} />`;
    return `<line x1="${p.x1}" y1="${p.y1}" x2="${p.x2}" y2="${p.y2}" ${common} />`;
  });
  return `<svg width="${sizePx}" height="${sizePx}" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">${parts.join('')}</svg>`;
}
