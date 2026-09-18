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
    'institute-for-the-study-of-ancient-cultures-museum', 'Institute for the Study of Ancient Cultures Museum', 'MUSEUM', '{}', 1, 'hyde-park', 'chicago',
    41.789245, -87.597718, false, '{"none"}', '{}',
    'Ten thousand years of the ancient Near East, free to walk through, reservations required — the kind of collection that would charge admission anywhere else in the world.',
    '{afternoon}', 90, 'live', 'texture', 1,
    5, 'independent', 'University of Chicago''s own institute museum (formerly the Oriental Institute), single site. Verified 2026-09-18.', 'live'
  ),
  (
    'smart-museum-of-art', 'Smart Museum of Art', 'MUSEUM', '{}', 1, 'hyde-park', 'chicago',
    41.793512, -87.600187, false, '{"none"}', '{}',
    'The university''s own art museum, always free, with a collection deep enough that a lunchtime visit never quite covers all 15,000 objects.',
    '{afternoon}', 80, 'live', 'texture', 1,
    4, 'independent', 'University of Chicago''s own art museum, single site. Verified 2026-09-18.', 'live'
  ),
  (
    'norman-s-bistro', 'Norman''s Bistro', 'CREOLE-BRAZILIAN', '{}', 3, 'kenwood', 'chicago',
    41.816704, -87.601472, false, '{"vegetarian"}', '{}',
    'Norman Bolden built this stretch of 43rd Street out of his father''s old shop — Creole cooking with a Brazilian accent, and a Sunday-night jazz set that runs past last orders.',
    '{evening,late}', 88, 'live', 'texture', 1,
    5, 'independent', 'Single owner-operator Norman Bolden, a former WGCI radio host who bought back his father''s old commercial strip on 43rd St. Not a multi-site group. Verified 2026-09-18.', 'live'
  ),
  (
    'gor-e-cuisine', 'Gorée Cuisine', 'SENEGALESE', '{}', 3, 'kenwood', 'chicago',
    41.809746, -87.598113, false, '{"halal"}', '{}',
    'Adama Ba modeled the kitchen on his family''s own restaurant on Gorée Island — the yassa and dibi lamb arrive with a side you didn''t order and won''t mind.',
    '{evening}', 88, 'live', 'texture', 1,
    5, 'independent', 'Family-owned by Adama Ba, modeled directly on his family''s own restaurant on Gorée Island, Dakar. Single location, est. 2015. Verified 2026-09-18.', 'live'
  ),
  (
    'carver-47-food-wellness-market', 'Carver 47 Food & Wellness Market', 'COFFEE ROOM', '{}', 2, 'kenwood', 'chicago',
    41.809683, -87.600463, false, '{"vegetarian"}', '{}',
    'Coffee, quiche, and a shelf of spice jars and spa products inside Little Black Pearl''s arts campus — a neighbourhood market that happens to double as a gallery.',
    '{morning,afternoon}', 76, 'live', 'texture', 1,
    4, 'independent', 'Independent, nonprofit-embedded — operates inside/affiliated with Little Black Pearl, a South Side youth arts nonprofit. Not a franchise or chain. Verified 2026-09-18.', 'live'
  ),
  (
    'robust-coffee-lounge', 'Robust Coffee Lounge', 'COFFEE ROOM', '{}', 1, 'woodlawn', 'chicago',
    41.780362, -87.596382, false, '{"vegetarian"}', '{}',
    'A restored 1890 storefront that was betting on Woodlawn''s revival a decade before the Obama Center made it fashionable — the biscuits are the real reason regulars keep coming back.',
    '{morning,afternoon}', 80, 'live', 'texture', 1,
    4, 'independent', 'Co-owned by Jake Sapstein and Derek Cortelyou since ~2010; single location. Verified 2026-09-18.', 'live'
  )
on conflict (id) do update set
  name = excluded.name, type = excluded.type, spend_level = excluded.spend_level,
  district_id = excluded.district_id, metro = excluded.metro, lat = excluded.lat, lon = excluded.lon,
  pet_friendly = excluded.pet_friendly, dietary_options = excluded.dietary_options,
  description = excluded.description, bands = excluded.bands, base = excluded.base,
  distinctiveness = excluded.distinctiveness, ownership = excluded.ownership,
  ownership_notes = excluded.ownership_notes;
