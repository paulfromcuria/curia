-- The Bubble Room, Alderley Edge — real, direct user report ("i dont see
-- the bubble room in alderley edge, is it there?"). Confirmed absent from
-- both docs/data/venues.json and live Supabase before researching it.
--
-- Real, currently-trading bar & restaurant, est. 2005, 45-47 London Road,
-- Alderley Edge, SK9 7JT (thebubbleroom.co.uk, own site visited directly).
-- Breakfast/brunch through to late-night DJs and live music, private
-- dining in "the Monkey Lounge" (up to 40 guests). ownership='small_group'
-- (not 'independent'): a genuine 3-site operation — Alderley Edge,
-- Bramhall, Sale — all Greater Manchester/Cheshire, one operator since
-- 2005, no stated regional/national expansion ambition found. Passes Gate
-- 1 under the same small-group precedent as Wallop (3-site,
-- Knutsford/Prestwich/Didsbury) and Piste Wine Bar & Restaurant (migration
-- 0038) — a confined-to-one-region small group, not a chain.
-- distinctiveness=4: real, specific character (Monkey Lounge, 20 years
-- trading, its own live-entertainment programming), not a generic
-- competent format.
--
-- Coordinates via postcodes.io geocoding on the venue's own postcode
-- (SK9 7JT) — the same coordinate already used for two existing Alderley
-- Edge venues on the same postcode/road (Tuula, Peppery Rose), per this
-- session's established venue coordinate methodology.
--
-- opening_hours are the real, published hours for the Alderley Edge site
-- specifically (thebubbleroom.co.uk), not estimated: closed Monday,
-- 11am-midnight Tue/Wed, 11am-1am Thu/Fri, 10am-1am Sat, 10am-midnight
-- Sun. Spend level (££) from a £20-30pp estimate (Tripadvisor/aggregator
-- listings) plus the venue's own published set-menu pricing (two courses
-- £18 / three courses £22).
--
-- dietaryOptions left at '{"none"}' — the site publishes a dedicated
-- allergens menu, confirming they handle dietary requests, but no
-- specific vegetarian/vegan/gluten-free confirmation was found to claim
-- as a filterable option.

insert into venues (
  id, name, type, sub_preference_tags, spend_level, district_id, metro,
  lat, lon, pet_friendly, dietary_options, photos, description, bands,
  base, status, tier, source_confidence,
  distinctiveness, ownership, ownership_notes, copy_status, occasional
) values (
  'the-bubble-room', 'The Bubble Room', 'GASTROPUB', '{}', 2, 'alderley-edge', 'cheshire',
  53.302439, -2.23607, true, '{"none"}', '{}',
  'Est. 2005 on London Road, still running Steak Wednesday and a resident DJ through to 1am on the nights it matters. The Monkey Lounge in the back seats forty and nobody is rushing you out of it.',
  '{morning,afternoon,evening,late}', 74, 'live', 'texture', 1,
  4, 'small_group', 'Genuine 3-site operation (Alderley Edge, Bramhall, Sale), all Greater Manchester/Cheshire, one operator since 2005, no wider expansion signs found. Verified via the operator''s own site (thebubbleroom.co.uk).', 'live', false
)
on conflict (id) do update set
  name = excluded.name, type = excluded.type, spend_level = excluded.spend_level,
  district_id = excluded.district_id, metro = excluded.metro, lat = excluded.lat, lon = excluded.lon,
  pet_friendly = excluded.pet_friendly, dietary_options = excluded.dietary_options,
  description = excluded.description, bands = excluded.bands, base = excluded.base,
  status = excluded.status, tier = excluded.tier, source_confidence = excluded.source_confidence,
  distinctiveness = excluded.distinctiveness, ownership = excluded.ownership,
  ownership_notes = excluded.ownership_notes, copy_status = excluded.copy_status,
  occasional = excluded.occasional;

update venues set opening_hours = '{"monday":[],"tuesday":[{"open":"11:00","close":"00:00"}],"wednesday":[{"open":"11:00","close":"00:00"}],"thursday":[{"open":"11:00","close":"01:00"}],"friday":[{"open":"11:00","close":"01:00"}],"saturday":[{"open":"10:00","close":"01:00"}],"sunday":[{"open":"10:00","close":"00:00"}]}'::jsonb where id = 'the-bubble-room';
