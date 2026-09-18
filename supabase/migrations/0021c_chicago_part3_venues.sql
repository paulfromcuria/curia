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
    'ja-grill', 'Ja'' Grill', 'CARIBBEAN RESTAURANT', '{}', 2, 'hyde-park', 'chicago',
    41.800453, -87.588764, false, '{"none"}', '{}',
    'Jerk chicken and curry goat from a Jamaican kitchen that left Lincoln Park for Hyde Park and never looked back — ten years in and the jerk still comes off a real fire.',
    '{afternoon,evening}', 73, 'live', 'texture', 1,
    3, 'independent', 'Owner Tony Coates; relocated from Lincoln Park, a former Ogden Commons outpost has since closed, leaving this as the sole location. Verified 2026-09-18.', 'live'
  ),
  (
    'nella-pizza-e-pasta', 'Nella Pizza e Pasta', 'PIZZERIA', '{}', 3, 'hyde-park', 'chicago',
    41.794875, -87.598764, false, '{"vegetarian"}', '{}',
    'Nella Grassano''s Neapolitan dough earns a Michelin nod most pizzerias would kill for — the kind of place you''d take a visiting food-obsessed colleague without hedging.',
    '{evening}', 90, 'live', 'texture', 1,
    5, 'independent', 'Chef/owner Nella Grassano. Michelin Guide-recognized. Single location. Verified 2026-09-18.', 'live'
  ),
  (
    'virtue-restaurant-bar', 'Virtue Restaurant & Bar', 'SOUTHERN RESTAURANT', '{}', 4, 'hyde-park', 'chicago',
    41.799668, -87.589300, false, '{"vegetarian","gluten-free"}', '{}',
    'James Beard-winning Southern cooking two blocks from campus, with a Michelin Bib Gourmand to back up what the room already knows — book ahead.',
    '{evening}', 92, 'live', 'texture', 1,
    5, 'small_group', 'Chef-owned by Erick Williams, James Beard Award winner, Michelin Bib Gourmand. Williams also owns Cantina Rosa (below) — two sites under one small local group. Verified 2026-09-18.', 'live'
  ),
  (
    'jimmy-s-woodlawn-tap', 'Jimmy''s (Woodlawn Tap)', 'DIVE BAR', '{}', 1, 'hyde-park', 'chicago',
    41.795198, -87.596852, false, '{"none"}', '{}',
    'A tavern that''s outlasted six decades of faculty arguments and undergrad heartbreak alike — cheap pitchers, no pretensions, and a booth Obama used to actually sit in.',
    '{evening,late}', 82, 'live', 'texture', 1,
    5, 'independent', 'Single location since 1948, opened by Jimmy Wilson, now family/staff-run. Verified 2026-09-18.', 'live'
  ),
  (
    'cantina-rosa', 'Cantina Rosa', 'COCKTAIL BAR', '{}', 3, 'hyde-park', 'chicago',
    41.800033, -87.589298, false, '{"vegetarian"}', '{}',
    'Virtue''s Erick Williams turned his attention to agave — the neighbourhood''s only real craft cocktail bar, and it didn''t need to try hard to become the best one.',
    '{evening}', 85, 'live', 'texture', 1,
    5, 'small_group', 'Chef Erick Williams with Jesus Garcia (Virtue''s spirits director) — same small group as Virtue. Verified 2026-09-18.', 'live'
  ),
  (
    'bardavid', 'BarDavid', 'WINE BAR', '{}', 3, 'hyde-park', 'chicago',
    41.785763, -87.595806, false, '{"vegetarian"}', '{}',
    'A curated wine list and Mediterranean small plates inside the university''s own conference forum — sophisticated enough that it''s easy to forget it''s technically a campus building.',
    '{evening}', 78, 'live', 'texture', 1,
    4, 'independent', 'Single-site venue inside the University of Chicago''s David Rubenstein Forum; food/bev run by hospitality operator Benchmark, not a commercial chain. Verified 2026-09-18.', 'live'
  )
on conflict (id) do update set
  name = excluded.name, type = excluded.type, spend_level = excluded.spend_level,
  district_id = excluded.district_id, metro = excluded.metro, lat = excluded.lat, lon = excluded.lon,
  pet_friendly = excluded.pet_friendly, dietary_options = excluded.dietary_options,
  description = excluded.description, bands = excluded.bands, base = excluded.base,
  distinctiveness = excluded.distinctiveness, ownership = excluded.ownership,
  ownership_notes = excluded.ownership_notes;
