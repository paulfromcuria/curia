/**
 * Hard rule 1 (CLAUDE.md): "Chain/fast-food venues (McDonald's, Wetherspoons,
 * etc.) must never be seeded, imported, or hardcoded anywhere, ever." This
 * applies to admin-curated entries just as much as seed data
 * (.claude/agents/curia-admin.md).
 *
 * This is deliberately a simple, non-exhaustive substring denylist — a
 * curator's own judgment is still the real gate — not a brand-detection
 * system. Per the M8 brief: "a simple denylist check or at minimum a clear
 * inline warning is fine — don't over-engineer this."
 */
export const CHAIN_DENYLIST: readonly string[] = [
  "mcdonald's",
  'mcdonalds',
  'burger king',
  'kfc',
  "wendy's",
  'wendys',
  'wetherspoon',
  'starbucks',
  'costa coffee',
  'caffe nero',
  'caffè nero',
  'subway',
  'greggs',
  "domino's",
  'dominos',
  'pizza hut',
  "papa john's",
  'papa johns',
  'five guys',
  "nando's",
  'nandos',
  'pret a manger',
  'itsu',
  'wagamama',
  'tgi fridays',
  "frankie & benny's",
  'harvester',
  'toby carvery',
  'premier inn',
  'travelodge',
  'pizza express',
  'yo! sushi',
  'byron burger',
];

/**
 * Returns the matched denylist entry (for the warning copy) if `venueName`
 * looks like a known chain/fast-food brand, or `null` if it doesn't trip
 * any entry. A case-insensitive substring match, so "Nando's Deansgate"
 * still matches "nando's".
 */
export function matchesChainDenylist(venueName: string): string | null {
  const normalized = venueName.trim().toLowerCase();
  if (!normalized) return null;
  return CHAIN_DENYLIST.find((entry) => normalized.includes(entry)) ?? null;
}
