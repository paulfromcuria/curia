/**
 * Subtle per-venue-type map icons (2026-09, at explicit user request: "use
 * icons based on venue type, e.g a gym has a subtle dumbbell on the map,
 * and a bar has a cocktail glass"). Real venue.type strings (58 distinct
 * ones as of this writing, docs/data/venues.json) are grouped into a
 * compact set of ~16 icon concepts — enough to read as genuinely
 * different at a glance without inventing a bespoke glyph per type, the
 * same "reuse an existing bucket, only add one when nothing fits"
 * discipline src/lib/scoring/tile-catalog-map.ts already applies to
 * category mapping.
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
  | 'beer'
  | 'coffee'
  | 'dining'
  | 'pizza'
  | 'bakery'
  | 'music'
  | 'culture'
  | 'art'
  | 'fitness'
  | 'wellness'
  | 'park'
  | 'market'
  | 'sport'
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
  culture: [
    {
      shape: 'path',
      d: 'M12 6 C9 4 5 4 3 5 V18 C5 17 9 17 12 19 C15 17 19 17 21 18 V5 C19 4 15 4 12 6 Z',
    },
    { shape: 'line', x1: 12, y1: 6, x2: 12, y2: 19 },
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
  generic: [{ shape: 'circle', cx: 12, cy: 12, r: 3, fill: true }],
};

/**
 * Real venue.type -> icon bucket. Every type currently in
 * docs/data/venues.json is mapped explicitly (checked against that file
 * 2026-09-08, 58 distinct types) — `generic` is the fallback for whatever
 * new type the daily research pipeline introduces next, not a dumping
 * ground for types that were simply never checked.
 */
const ICON_BY_TYPE: Record<string, VenueIconKey> = {
  // cocktail — spirit-led bars and late-night lounges
  'COCKTAIL BAR': 'cocktail',
  SPEAKEASY: 'cocktail',
  'HOTEL BAR': 'cocktail',
  CELEBRATORY: 'cocktail',
  'LATE-NIGHT LOUNGE': 'cocktail',
  'KARAOKE BAR': 'cocktail',
  ROOFTOP: 'cocktail',

  // wine — wine, champagne, sherry
  'WINE BAR': 'wine',
  'CHAMPAGNE BAR': 'wine',
  'SHERRY BAR': 'wine',
  'WINE MERCHANT': 'wine',

  // beer — pubs
  'COUNTRY PUB': 'beer',
  GASTROPUB: 'beer',
  'ALE HOUSE': 'beer',

  // coffee
  'COFFEE ROOM': 'coffee',

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

  // pizza
  PIZZERIA: 'pizza',

  // bakery
  BAKERY: 'bakery',

  // music
  'LIVE MUSIC': 'music',
  'JAZZ BAR': 'music',
  'LISTENING BAR': 'music',
  'LIVE MUSIC BAR': 'music',

  // culture — performance, screen, learning, heritage
  'PERFORMING ARTS': 'culture',
  'INDEPENDENT CINEMA': 'culture',
  'RARE BOOKSHOP': 'culture',
  'HERITAGE CENTRE': 'culture',
  'COOKERY SCHOOL': 'culture',
  'POTTERY STUDIO': 'culture',

  // art
  'ART GALLERY': 'art',
  'DESIGN GALLERY': 'art',

  // fitness
  'FITNESS STUDIO': 'fitness',

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

  // market
  'MARKET HALL': 'market',
  'ARTISAN MARKET': 'market',

  // sport
  'RUGBY CLUB': 'sport',
  'CRICKET CLUB': 'sport',
  'GOLF CLUB': 'sport',
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
