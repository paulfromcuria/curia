/**
 * Category-matched placeholder venue photography (2026-09, at explicit user
 * request: "lets add placeholder photos in the meantime but nice ones").
 * Deliberately NOT written to `Venue.photos` or the database — that field's
 * whole meaning is "a real, curated photo of this specific venue" (see
 * VenueForm's own doc comment on the field), and writing a stock photo into
 * it would blur that into a lie the moment someone reads the data directly.
 * This stays a pure presentation-layer fallback: `photoFor(venue)` in the
 * render sites (src/app/venue/[id].tsx, src/app/(tabs)/list.tsx,
 * src/components/curia/top-picks-rail.tsx) only ever calls this when
 * `venue.photos` is empty, and stops calling it the instant a real photo is
 * added — no migration, no cleanup, nothing to "undo" later if these are
 * dropped.
 *
 * Each URL is a real, verified Unsplash photo (free license, no attribution
 * required), matched to venue `type` by keyword — not random, so a spa
 * doesn't get a cocktail bar photo. Ordered most-specific-first in
 * CATEGORY_RULES since some types contain more than one keyword's
 * substring (e.g. "Sunset bar" contains "bar" but reads more like
 * nightlife than a generic bar). Falls back to the dining category, the
 * most broadly-neutral of the set, for any type that matches nothing below
 * — which in practice is most real cuisine-specific restaurant types
 * (SMALL PLATES, FINE DINING, TASTING MENU, every *_RESTAURANT type, etc.),
 * since none of those match a keyword rule of their own.
 *
 * Found live 2026-09-22 walking through a real ranked List (Erst, a small
 * plates venue, and Pip, a fine dining venue, ranked #1 and #2 back to
 * back showing the IDENTICAL photo): with `dining` as a single URL, every
 * one of those unmatched restaurant types collapsed onto one photo, so a
 * member scrolling a ranked list would routinely see the same stock image
 * repeated for multiple different top-ranked venues in a row — reads as
 * broken, not premium. `dining` (and only `dining`, since it's the
 * catch-all bucket the vast majority of restaurant types fall into) is now
 * an array; `placeholderPhotoFor` picks deterministically per VENUE (via a
 * simple string hash on `venueId`, not `type`) so the same venue always
 * shows the same placeholder across reloads/sessions, but two different
 * venues sharing the dining fallback are very likely to get two different
 * photos. The other categories stay single-photo — thin enough (usually a
 * handful of venues each) that collisions there are rare in practice, and
 * adding rotation everywhere would be complexity without a real payoff.
 */

const DINING_PHOTOS = [
  'https://images.unsplash.com/photo-1646473315764-c6cd47fe74c3?w=900&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1759866614069-e5b93d17e663?w=900&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1769775555435-206cb7b9e8c1?w=900&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1680209668002-924ffe3f1952?w=900&q=80&auto=format&fit=crop',
] as const;

const PLACEHOLDER_PHOTOS = {
  bar: 'https://images.unsplash.com/photo-1514359652734-6205dd477a1e?w=900&q=80&auto=format&fit=crop',
  coffee: 'https://images.unsplash.com/photo-1752756992329-961db6366376?w=900&q=80&auto=format&fit=crop',
  nightlife: 'https://images.unsplash.com/photo-1756072226051-f6835aec4f9a?w=900&q=80&auto=format&fit=crop',
  culture: 'https://images.unsplash.com/photo-1762928289094-197055a5d5c3?w=900&q=80&auto=format&fit=crop',
  beach: 'https://images.unsplash.com/photo-1550597186-61e0fc2a77bc?w=900&q=80&auto=format&fit=crop',
  wellness: 'https://images.unsplash.com/photo-1761470575018-135c213340eb?w=900&q=80&auto=format&fit=crop',
  market: 'https://images.unsplash.com/photo-1751139778783-a8c6ac155bc5?w=900&q=80&auto=format&fit=crop',
  park: 'https://images.unsplash.com/photo-1780185223024-4e085580d1fb?w=900&q=80&auto=format&fit=crop',
} as const;

type PlaceholderCategory = keyof typeof PLACEHOLDER_PHOTOS;

const CATEGORY_RULES: { keywords: string[]; category: PlaceholderCategory }[] = [
  { keywords: ['beach'], category: 'beach' },
  { keywords: ['park', 'garden'], category: 'park' },
  { keywords: ['spa', 'wellness', 'fitness', 'golf'], category: 'wellness' },
  { keywords: ['market', 'boutique'], category: 'market' },
  { keywords: ['gallery', 'cinema', 'theatre', 'performing', 'bookshop', 'design', 'pottery'], category: 'culture' },
  { keywords: ['rooftop', 'live music', 'karaoke', 'sunset'], category: 'nightlife' },
  { keywords: ['coffee', 'bakery', 'brunch'], category: 'coffee' },
  { keywords: ['bar', 'speakeasy', 'winery', 'pub'], category: 'bar' },
];

/** Tiny, deterministic string hash — no crypto needed, just needs to spread
 * different venue ids across DINING_PHOTOS' indices reasonably evenly and
 * return the same result every time for the same id. */
function stableHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/**
 * Real venue `type` strings (e.g. "COCKTAIL BAR", "FINE DINING") keyword-
 * match into one of the categories above; anything unmatched gets a dining
 * photo. `venueId` picks which one when the dining bucket is hit — pass
 * the real venue id so the same venue is stable across reloads; any other
 * unique-enough string works too (falls back to DINING_PHOTOS[0] if
 * omitted, matching this function's old single-photo behavior).
 */
export function placeholderPhotoFor(type: string, venueId = ''): string {
  const lower = type.toLowerCase();
  const rule = CATEGORY_RULES.find((r) => r.keywords.some((k) => lower.includes(k)));
  if (!rule) {
    return DINING_PHOTOS[stableHash(venueId) % DINING_PHOTOS.length];
  }
  return PLACEHOLDER_PHOTOS[rule.category];
}
