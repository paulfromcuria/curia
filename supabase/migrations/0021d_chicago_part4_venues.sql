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
    'sophy-hyde-park-mesler', 'Sophy Hyde Park (Mesler)', 'HOTEL BAR', '{}', 3, 'hyde-park', 'chicago',
    41.799272, -87.591405, false, '{"none"}', '{}',
    'The bar at Hyde Park''s first real boutique hotel — the kind of room you''d actually suggest meeting a professor for a drink, not just somewhere to park out-of-town guests.',
    '{evening}', 74, 'live', 'texture', 1,
    3, 'small_group', 'Olympia Companies/SMART Hotels boutique brand — this is their Hyde Park flagship, not a mass-market hotel chain. Verified 2026-09-18.', 'live'
  ),
  (
    'the-study-at-university-of-chicago-truth-be-told', 'The Study at University of Chicago (Truth Be Told)', 'HOTEL BAR', '{}', 3, 'hyde-park', 'chicago',
    41.785669, -87.595039, false, '{"none"}', '{}',
    'A British-pub-inspired kitchen and bar inside the campus''s own boutique hotel — tavern food done properly, open till the bar closes.',
    '{evening,late}', 74, 'live', 'texture', 1,
    3, 'small_group', 'Study Hotels brand — 3 properties total (Yale, Penn, UChicago), an academic-boutique hospitality group, not mass-market. Verified 2026-09-18.', 'live'
  ),
  (
    'la-boulangerie-co-hyde-park', 'La Boulangerie & Co (Hyde Park)', 'BAKERY', '{}', 2, 'hyde-park', 'chicago',
    41.795383, -87.588294, false, '{"vegetarian"}', '{}',
    'Paris-trained Vincent Colombet''s fourth Chicago outpost, in the storefront a beloved French bakery held for 27 years before it — the croissants are laminated on-site, not trucked in.',
    '{morning}', 76, 'live', 'texture', 1,
    3, 'small_group', 'Chef/owner Vincent Colombet, 4 Chicago locations (Logan Square, Humboldt Park, Ravenswood, Hyde Park) — Chicago-only, not national. Verified 2026-09-18.', 'live'
  ),
  (
    'sip-savor-53rd-street', 'Sip & Savor (53rd Street)', 'COFFEE ROOM', '{}', 1, 'hyde-park', 'chicago',
    41.799479, -87.583824, false, '{"vegetarian","vegan"}', '{}',
    'Trez Pugh opened the original on this stretch in 2012 before Sip & Savor became a five-location South Side name — this is still the one that started it.',
    '{morning,afternoon}', 71, 'live', 'texture', 1,
    3, 'small_group', 'Owner Trez Pugh III opened this original location in 2012 before expanding to 5 South Side/Chicago locations — still independently owned, not a franchise. Verified 2026-09-18.', 'live'
  ),
  (
    'sweet-drip-dessert-cafe', 'Sweet Drip Dessert Cafe', 'DESSERT CAFE', '{}', 1, 'hyde-park', 'chicago',
    41.799685, -87.584492, false, '{"vegetarian"}', '{}',
    'Boba and dessert plates on 53rd, run by two cousins who bought the name and the lease together in 2023 rather than let a neighbourhood fixture disappear.',
    '{afternoon,evening}', 65, 'live', 'texture', 1,
    2, 'independent', 'Cousins Zuhlil Khalil and Mohammad Zomot bought the lease and business name in 2023. Verified 2026-09-18.', 'live'
  ),
  (
    'seminary-co-op-bookstore', 'Seminary Co-op Bookstore', 'INDEPENDENT BOOKSHOP', '{}', 2, 'hyde-park', 'chicago',
    41.790129, -87.596079, false, '{"none"}', '{}',
    'A nonprofit since 1961 and still the first call for a serious academic text anywhere in the city — the basement stacks reward browsing more than searching.',
    '{afternoon}', 90, 'live', 'texture', 1,
    5, 'independent', 'Nonprofit since 1961 (converted from member co-op to 501(c)(3) in 2019). Verified 2026-09-18.', 'live'
  )
on conflict (id) do update set
  name = excluded.name, type = excluded.type, spend_level = excluded.spend_level,
  district_id = excluded.district_id, metro = excluded.metro, lat = excluded.lat, lon = excluded.lon,
  pet_friendly = excluded.pet_friendly, dietary_options = excluded.dietary_options,
  description = excluded.description, bands = excluded.bands, base = excluded.base,
  distinctiveness = excluded.distinctiveness, ownership = excluded.ownership,
  ownership_notes = excluded.ownership_notes;
