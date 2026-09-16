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
