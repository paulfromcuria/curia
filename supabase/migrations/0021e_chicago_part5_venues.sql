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
    '57th-street-books', '57th Street Books', 'INDEPENDENT BOOKSHOP', '{}', 2, 'hyde-park', 'chicago',
    41.791317, -87.594634, false, '{"none"}', '{}',
    'The Co-op''s general-interest sibling, tucked half underground on 57th — fiction and children''s books where the flagship keeps to scholarship.',
    '{afternoon}', 82, 'live', 'texture', 1,
    4, 'independent', 'Same nonprofit as Seminary Co-op (sister store, general-interest focus). Verified 2026-09-18.', 'live'
  ),
  (
    'powell-s-books-chicago', 'Powell''s Books Chicago', 'INDEPENDENT BOOKSHOP', '{}', 2, 'hyde-park', 'chicago',
    41.791314, -87.588874, false, '{"none"}', '{}',
    'Same address since a U of C grad student opened it in 1970, and still the city''s biggest independent dealer in used and antiquarian stock — no relation to the Portland namesake, just a shared instinct for the shelves.',
    '{afternoon}', 82, 'live', 'texture', 1,
    4, 'independent', 'Founded 1970 by a U of C grad student, current owner Bradley Jonas; unrelated to the Portland, OR Powell''s despite shared name. Verified 2026-09-18.', 'live'
  ),
  (
    'the-silver-room', 'The Silver Room', 'BOUTIQUE', '{}', 3, 'hyde-park', 'chicago',
    41.799694, -87.588838, false, '{"none"}', '{}',
    'Part jewelry counter, part gallery, part the closest thing Hyde Park has to a cultural living room — Eric Williams has run it as all three since 1997.',
    '{afternoon}', 81, 'live', 'texture', 1,
    4, 'independent', 'Founder Eric Williams, single location since relocating from Wicker Park in 2015 (business founded 1997). Verified 2026-09-18.', 'live'
  ),
  (
    'hyde-park-records', 'Hyde Park Records', 'RECORD SHOP', '{}', 2, 'hyde-park', 'chicago',
    41.799271, -87.592083, false, '{"none"}', '{}',
    'Dustys, old soul, jazz and hip-hop crates a decade deep, in a shop that''s been trading vinyl on 53rd since the 1970s under one name or another.',
    '{afternoon}', 79, 'live', 'texture', 1,
    4, 'independent', 'Owner Alexis Bouteville took over the 1970s-era Second Hand Tunes in 2011 and renamed it. Verified 2026-09-18.', 'live'
  ),
  (
    'bob-s-pizza', 'Bob''s Pizza', 'PIZZERIA', '{}', 2, 'hyde-park', 'chicago',
    41.800435, -87.588169, false, '{"vegetarian"}', '{}',
    'Pilsen-style dough built on Old Style beer and a pickle pizza that shouldn''t work — the fourth outpost of a pizza project that started three miles north in 2019.',
    '{evening}', 79, 'live', 'texture', 1,
    4, 'small_group', 'Chef/partner Matt Wilde, 4 Chicago-area locations (Pilsen original 2019, Old Town, Evanston, Hyde Park) — Chicago-only, chef-driven. Verified 2026-09-18.', 'live'
  ),
  (
    'frederick-c-robie-house', 'Frederick C. Robie House', 'HISTORIC HOUSE', '{}', 2, 'hyde-park', 'chicago',
    41.789789, -87.595994, false, '{"none"}', '{}',
    'A UNESCO World Heritage building and arguably Wright''s masterwork, still standing exactly where he built it — the guided tour is worth the ticket price alone.',
    '{afternoon}', 92, 'live', 'texture', 1,
    5, 'independent', 'Nonprofit Frank Lloyd Wright Trust (also stewards a few other FLW Chicago-area sites — a small nonprofit steward, not a commercial operator). UNESCO World Heritage Site. Verified 2026-09-18.', 'live'
  )
on conflict (id) do update set
  name = excluded.name, type = excluded.type, spend_level = excluded.spend_level,
  district_id = excluded.district_id, metro = excluded.metro, lat = excluded.lat, lon = excluded.lon,
  pet_friendly = excluded.pet_friendly, dietary_options = excluded.dietary_options,
  description = excluded.description, bands = excluded.bands, base = excluded.base,
  distinctiveness = excluded.distinctiveness, ownership = excluded.ownership,
  ownership_notes = excluded.ownership_notes;
