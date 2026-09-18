/**
 * Soft-disable toggle for the Santorini test city and its "Holiday"
 * onboarding/preferences category. Added 2026-09, at explicit user
 * request — this was seeded for a friend trying the app while actually in
 * Santorini, not a committed product decision, and may come back as a real
 * feature later.
 *
 * Nothing is deleted when this is false: the real Santorini districts,
 * venues, journeys and moment picks, plus the Holiday tile category, still
 * live in the database and docs/data/*.json exactly as before —
 * `loadContentData()` (src/lib/data/seed.ts) just filters them out of what
 * the app exposes, and onboarding drops the Holiday step from its flow.
 * Flip this back to true to bring the whole thing back live with zero data
 * re-entry.
 *
 * Does NOT affect the separate "suggested travel destinations" feature
 * (src/app/travel.tsx, src/lib/scoring/rank-destinations.ts) — that reads
 * its own `destinations` table/docs/data/destinations.json, which has no
 * relationship to Santorini-as-a-live-metro or the Holiday tile category.
 */
export const HOLIDAY_FEATURE_ENABLED = false;

/**
 * Soft-disable toggle for the Map screen's "Top picks" rail (a collapsed
 * left-edge tab that expands to show the top 4 currently-ranked venues
 * without leaving Map). Added 2026-09-18, at explicit user request — "just
 * go ahead and build it in a cool manner but make sure we can revert it if
 * we dont like it." A real `git revert` of the commit that introduced it
 * also works (it's one self-contained component,
 * src/components/curia/top-picks-rail.tsx, plus a few lines wiring it into
 * map.tsx/map.web.tsx) — this flag is the faster, no-redeploy-needed lever
 * for "try it live, then decide," same role HOLIDAY_FEATURE_ENABLED plays
 * above. Flip to false to hide it instantly; nothing is deleted.
 */
export const TOP_PICKS_RAIL_ENABLED = true;

/**
 * Soft-disable toggle for the Map screen's collision-aware match-pin count
 * (src/lib/map/geo.ts's selectCollisionFreePins). Added 2026-09-18, at
 * explicit user request: "our number of recommendations aka glowing pulses
 * on the map view really should be dependant on zoom level... but with a
 * maximum amount as to not overcrowd the map... make sure we can undo it if
 * we dont like." When true, the gold "match" pins are however many of the
 * top-ranked venues fit on screen without overlapping (capped at
 * MAX_MATCH_PINS). When false, falls back to the flat top-4 slice this
 * replaced — the exact previous behavior, not an approximation of it. A
 * real `git revert` of the commit that introduced this also works and is
 * the more thorough undo (it touches geo.ts, map.tsx and map.web.tsx); this
 * flag is the faster, no-redeploy lever for "try it live, then decide."
 */
export const FLEXIBLE_MATCH_PIN_COUNT_ENABLED = true;
