/**
 * Category-matched placeholder venue photography (2026-09, at explicit user
 * request: "lets add placeholder photos in the meantime but nice ones").
 * Deliberately NOT written to `Venue.photos` or the database — that field's
 * whole meaning is "a real, curated photo of this specific venue" (see
 * VenueForm's own doc comment on the field), and writing a stock photo into
 * it would blur that into a lie the moment someone reads the data directly.
 * This stays a pure presentation-layer fallback: `photoFor(venue)` in the
 * two render sites (src/app/venue/[id].tsx, src/app/(tabs)/list.tsx) only
 * ever calls this when `venue.photos` is empty, and stops calling it the
 * instant a real photo is added — no migration, no cleanup, nothing to
 * "undo" later if these are dropped.
 *
 * Each URL is a real, verified Unsplash photo (free license, no attribution
 * required), matched to venue `type` by keyword — not random, so a spa
 * doesn't get a cocktail bar photo. Ordered most-specific-first in
 * CATEGORY_RULES since some types contain more than one keyword's
 * substring (e.g. "Sunset bar" contains "bar" but reads more like
 * nightlife than a generic bar). Falls back to the dining photo, the most
 * broadly-neutral of the set, for any type that matches nothing below.
 */

const PLACEHOLDER_PHOTOS = {
  dining: 'https://images.unsplash.com/photo-1646473315764-c6cd47fe74c3?w=900&q=80&auto=format&fit=crop',
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

/** Real venue `type` strings (e.g. "COCKTAIL BAR", "FINE DINING") keyword-match
 * into one of the categories above; anything unmatched gets the dining photo. */
export function placeholderPhotoFor(type: string): string {
  const lower = type.toLowerCase();
  const rule = CATEGORY_RULES.find((r) => r.keywords.some((k) => lower.includes(k)));
  return PLACEHOLDER_PHOTOS[rule?.category ?? 'dining'];
}
