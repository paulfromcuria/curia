-- Curia's first US metro: Chicago, scoped to Hyde Park / Kenwood / Woodlawn
-- (roughly 2mi of the UChicago campus), at explicit user request — a real
-- pilot for a specific first member (a UChicago student, high disposable
-- income, testing/showing the app to professors), not a market-sizing
-- decision. Same two-gate curation rules as everywhere else — the member's
-- own age doesn't change what gets curated (alcohol is legal and normal
-- here, unlike Riyadh, so this stays fully 'uk' HomeRegion — the shared
-- global Drink catalog).
--
-- 36 venues: 26 Hyde Park, 3 Kenwood (genuinely thin — a quiet, historic
-- mansion district with little commercial footprint, same honest-yield
-- precedent as Mobberley/Hittin/KAFD), 7 Woodlawn (2 seasonal, noted in
-- their own descriptions). Full sourcing, per-venue ownership evidence and
-- Gate 1/Gate 2 reasoning in docs/data/venues.json's own
-- _chicagoVenueSource note — this migration carries the real, researched
-- distinctiveness/ownership values (same split as
-- 0019_cheshire_golf_clubs.sql).

insert into venues (
  id, name, type, sub_preference_tags, spend_level, district_id, metro,
  lat, lon, pet_friendly, dietary_options, photos, description, bands,
  base, status, tier, source_confidence,
  distinctiveness, ownership, ownership_notes, copy_status
) values
  (
    'build-coffee-books', 'Build Coffee & Books', 'COFFEE ROOM', '{}', 1, 'woodlawn', 'chicago',
    41.784210, -87.590494, false, '{"vegetarian","vegan"}', '{}',
    'Coffee, secondhand books, and a gallery wall sharing one converted bike-shop building — saved from sale in 2025 by a handful of regulars who refused to let it become something else.',
    '{morning,afternoon}', 90, 'live', 'texture', 1,
    5, 'independent', 'Community-owned — bought out of a for-sale listing in 2025 by a volunteer trio (Eve L. Ewing, trína reynolds-tyler, Andrea Faye Hart) specifically to keep it independent. Verified 2026-09-18.', 'live'
  ),
  (
    'daley-s-restaurant', 'Daley''s Restaurant', 'DINER', '{}', 2, 'woodlawn', 'chicago',
    41.780576, -87.605602, false, '{"none"}', '{}',
    'Chicago''s oldest restaurant, on its fourth address in Woodlawn since 1892 — chicken and waffles, salmon croquettes, and a counter that''s outlasted every trend the neighbourhood has been through.',
    '{morning,afternoon}', 86, 'live', 'texture', 1,
    5, 'independent', 'Chicago''s oldest continuously operating restaurant (opened 1892), family-owned since 1918, currently run by Mike Zar. Single location. Verified 2026-09-18.', 'live'
  ),
  (
    '7323-chicago-caf', '7323 Chicago Café', 'COFFEE ROOM', '{}', 1, 'woodlawn', 'chicago',
    41.774930, -87.596184, false, '{"vegetarian"}', '{}',
    'A shipping container in Flying Squirrel Park doing sun-dried-tomato paninis and honey-lavender lemonade — open May to October only, so it disappears every winter and nobody minds waiting for it.',
    '{afternoon}', 70, 'live', 'texture', 1,
    4, 'independent', 'Sole owner-operator Marquinn Gibson, one seasonal location. SEASONAL: open May 1–Oct 10 only, closed Nov–April. Verified 2026-09-18.', 'live'
  ),
  (
    'let-s-eat-to-live', 'Let’s Eat To Live', 'SOUL FOOD', '{}', 2, 'woodlawn', 'chicago',
    41.772900, -87.609752, false, '{"halal","vegetarian"}', '{}',
    'Escovitch snapper and halal lamb chops from a kitchen that grows some of its own vegetables on the same block — and gives away 150 meals every Sunday whether you''re a customer or not.',
    '{afternoon,evening}', 82, 'live', 'texture', 1,
    4, 'independent', 'Black women-owned and Muslim-owned; opened 2022 by owner Carmella Coq''mard. Single location. Verified 2026-09-18.', 'live'
  ),
  (
    'tafari-s-kitchen', 'Tafari''s Kitchen', 'CELEBRATORY', '{}', 2, 'woodlawn', 'chicago',
    41.786246, -87.585878, false, '{"none"}', '{}',
    'The only restaurant inside the Obama Presidential Center, named for the family''s own longtime chef — chili and ribs built for a room that''s already a landmark before you''ve ordered.',
    '{afternoon,evening}', 85, 'live', 'texture', 1,
    5, 'small_group', 'Creative concept curated by Chef Cliff Rome (Rome''s Joy Companies — a real South Side-only restaurant portfolio, one owner, no franchise ambition). Day-to-day food service is operated under contract by Bon Appétit Management Company (part of Compass Group, a large national contract caterer) — flagged transparently: the brand and menu are locally chef-driven and site-unique, the operator behind daily service is not small. Verified 2026-09-18.', 'live'
  ),
  (
    '61st-street-farmers-market', '61st Street Farmers Market', 'ARTISAN MARKET', '{}', 1, 'woodlawn', 'chicago',
    41.784210, -87.590494, false, '{"vegetarian","vegan"}', '{}',
    'Thirty-odd stalls outside the same building as Build Coffee, running LINK-match Saturdays since 2008 — the kind of market that was feeding the neighbourhood long before anyone was writing about Woodlawn''s comeback.',
    '{morning}', 76, 'live', 'texture', 1,
    4, 'independent', 'Run by Experimental Station (a nonprofit), 25–30 small vendor/farm stalls. SEASONAL: Saturdays only, 9am–2pm, May 16–Oct 31. Verified 2026-09-18.', 'live'
  )
on conflict (id) do update set
  name = excluded.name, type = excluded.type, spend_level = excluded.spend_level,
  district_id = excluded.district_id, metro = excluded.metro, lat = excluded.lat, lon = excluded.lon,
  pet_friendly = excluded.pet_friendly, dietary_options = excluded.dietary_options,
  description = excluded.description, bands = excluded.bands, base = excluded.base,
  distinctiveness = excluded.distinctiveness, ownership = excluded.ownership,
  ownership_notes = excluded.ownership_notes;
