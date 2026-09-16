-- Curia — HomeRegion: onboarding Riyadh (2026-09, at explicit user request).
--
-- Alcohol is prohibited nationwide in Saudi Arabia, so Manchester/Cheshire's
-- Drink catalog (cocktail bars, wine bars, pubs) has zero real applicability
-- there, and the reverse is true of a Riyadh-flavoured catalog (specialty
-- coffee, mocktail lounges, tea houses, shisha) for a UK member. Rather than
-- fork the product into two separate sites over one category, members now
-- pick a home region once, early in onboarding (src/app/onboarding.tsx's
-- new 'Region' step), and only the Drink tile catalog they're offered
-- branches on it — Do/Eat/You and the entire rest of the app (Map/List/
-- Moments/Journeys/the scoring engine/the venue data model) stay fully
-- shared. See HomeRegion's own doc comment (src/types/models.ts) for the
-- full reasoning.
--
-- `home_region` is nullable, no default: every profile row created before
-- this migration (and any new row until the member actually answers the
-- onboarding step) has no real answer yet, and the app's own tile-catalog
-- filter (src/lib/data/seed.ts) treats null as 'uk' at read time rather
-- than baking that assumption into the schema — every real member before
-- this feature existed is UK-based, so that fallback is correct, but it's
-- an application-level judgment call, not a database default that would
-- silently claim a stated answer nobody actually gave.
alter table profiles
  add column home_region text check (home_region in ('uk', 'riyadh'));

-- `tiles.region` mirrors the same nullable/no-default shape: null means
-- universal (shown to every member during onboarding, same as every
-- Do/Eat tile today), a real value restricts a tile to just that
-- HomeRegion. Only Drink tiles use this so far — see the seed data this
-- migration doesn't itself contain (docs/data/tiles.json, applied via
-- scripts/generate-seed-sql.mjs same as every other content table).
alter table tiles
  add column region text check (region in ('uk', 'riyadh'));
