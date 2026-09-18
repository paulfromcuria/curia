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

-- cities must be inserted before districts — districts.metro has a foreign
-- key to cities(id) (see supabase/migrations/0001_init.sql). Original order
-- here was backwards (caught 2026-09-18 when this actually ran against a
-- real Postgres instance for the first time — never exercised before, since
-- nothing had tried to run 0021 until now).
insert into cities (id, name) values ('chicago', 'Chicago')
on conflict (id) do update set name = excluded.name;

insert into districts (id, name, metro, lat, lon, base, kind, accent_color, editorial_description)
values
  ('hyde-park', 'Hyde Park', 'chicago', 41.8010, -87.5872, 82, 'city', '#B8925A', 'A university town within a city, built around a Gothic quad and the stretch of 53rd and 57th that services it — secondhand bookshops that have outlasted their landlords twice over, a cafeteria line Obama used to queue in, and a Michelin Bib Gourmand two blocks from the lecture halls. Lake Michigan on one side, the Midway on the other, and just enough independent grit left in the storefronts that the neighbourhood still reads as lived-in, not curated.'),
  ('kenwood', 'Kenwood', 'chicago', 41.8090, -87.5965, 68, 'city', '#8C5A52', 'Chicago''s grandest surviving mansion district, and still mostly houses — Muddy Waters kept one here, so did Louis Farrakhan, and the greystones on Greenwood and Woodlawn Avenue don''t advertise who''s inside. What commercial life there is runs thin and specific along 47th and 43rd: a Senegalese kitchen built on a family recipe from Dakar, a jazz room made out of a father''s old TV-repair shop, nothing that needs a queue.'),
  ('woodlawn', 'Woodlawn', 'chicago', 41.781, -87.599, 72, 'city', '#C17A4E', 'Ninety years of disinvestment couldn''t quite finish Woodlawn off, and the Obama Presidential Center''s arrival in Jackson Park hasn''t rewritten it so much as given it a reason to be looked at again. What''s here now is a real mix: a lunch counter that''s fed the neighbourhood since 1892, a coffee shop a handful of regulars bought outright rather than watch it disappear, and a Saturday farmers market that was doing the work long before anyone called it a comeback.')
on conflict (id) do update set
  name = excluded.name, metro = excluded.metro, lat = excluded.lat, lon = excluded.lon,
  base = excluded.base, kind = excluded.kind, accent_color = excluded.accent_color,
  editorial_description = excluded.editorial_description;
