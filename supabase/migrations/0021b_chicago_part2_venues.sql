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
    'valois', 'Valois', 'CAFETERIA', '{}', 1, 'hyde-park', 'chicago',
    41.799823, -87.588297, false, '{"vegetarian"}', '{}',
    'A steam-table cafeteria running the same ''see your food'' line since 1921 — the Mediterranean omelette Obama used to order is still on the board, and nobody''s dressed for the room, which is the point.',
    '{morning,afternoon}', 88, 'live', 'texture', 1,
    5, 'independent', 'Argiris family-run for ~50 years, founded 1921 by William Valois. Single location. Verified 2026-09-18.', 'live'
  ),
  (
    'medici-on-57th', 'Medici on 57th', 'BAKERY', '{}', 2, 'hyde-park', 'chicago',
    41.791218, -87.593747, false, '{"vegetarian"}', '{}',
    'Same family since 1962, and the booths still carry six decades of carved initials — burgers and deep-dish from a kitchen that''s never once chased a trend off 57th Street.',
    '{afternoon,evening}', 80, 'live', 'texture', 1,
    4, 'small_group', 'Morsbach family-owned since 1962; the family historically ran up to six Medici-branded locations across Chicagoland, though this 57th St flagship is the original site. Verified 2026-09-18.', 'live'
  ),
  (
    'cedars-mediterranean-kitchen', 'Cedars Mediterranean Kitchen', 'MIDDLE EASTERN', '{}', 2, 'hyde-park', 'chicago',
    41.799999, -87.596122, false, '{"vegetarian","vegan"}', '{}',
    'Sudki Abdullah''s falafel recipe from 1992, now carried by his son Amer — a Hyde Park fixture that survived a change of hands without changing its character.',
    '{afternoon,evening}', 73, 'live', 'texture', 1,
    3, 'independent', 'Sudki Abdullah opened 1992; son Amer Abdullah runs it today. Single location. Verified 2026-09-18.', 'live'
  ),
  (
    'the-snail-thai-cuisine', 'The Snail Thai Cuisine', 'THAI RESTAURANT', '{}', 2, 'hyde-park', 'chicago',
    41.795129, -87.584784, false, '{"vegetarian"}', '{}',
    'Run by a former nurse who traded hospital shifts in Thailand and Switzerland for a stove on 55th Street — traditional Thai cooking with no interest in being anyone''s concept.',
    '{evening}', 72, 'live', 'texture', 1,
    3, 'independent', 'Single location, owner formerly a nurse in Thailand/Switzerland. Verified 2026-09-18.', 'live'
  ),
  (
    'the-nile-of-hyde-park', 'The Nile of Hyde Park', 'MIDDLE EASTERN', '{}', 2, 'hyde-park', 'chicago',
    41.795180, -87.597126, false, '{"vegetarian","halal"}', '{}',
    'Family-run since 1991, doing unfussy Middle Eastern plates at prices that haven''t chased the neighbourhood''s gentrification upward.',
    '{afternoon,evening}', 72, 'live', 'texture', 1,
    3, 'independent', 'Founded 1991 by chef/owner Abed Moughrabi, family-run. Single location. Verified 2026-09-18.', 'live'
  ),
  (
    'rajun-cajun', 'Rajun Cajun', 'INDIAN-SOUTHERN FUSION', '{}', 2, 'hyde-park', 'chicago',
    41.799425, -87.589506, false, '{"vegetarian"}', '{}',
    'Indian specialties sitting on the same menu as Southern soul food since 1993 — a combination nobody else in the city has bothered to attempt, let alone for three decades running.',
    '{afternoon,evening}', 87, 'live', 'texture', 1,
    5, 'independent', 'Trushar & Anila Patel, opened 1993. Single location. Verified 2026-09-18.', 'live'
  )
on conflict (id) do update set
  name = excluded.name, type = excluded.type, spend_level = excluded.spend_level,
  district_id = excluded.district_id, metro = excluded.metro, lat = excluded.lat, lon = excluded.lon,
  pet_friendly = excluded.pet_friendly, dietary_options = excluded.dietary_options,
  description = excluded.description, bands = excluded.bands, base = excluded.base,
  distinctiveness = excluded.distinctiveness, ownership = excluded.ownership,
  ownership_notes = excluded.ownership_notes;
