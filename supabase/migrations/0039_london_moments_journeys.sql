-- Real London picks for all 4 Moments, plus 2 real Journeys, at explicit
-- user request ("we need some moments and journey for london").
--
-- Found on inspection, not asked about directly: zero London venues
-- appeared in any of the 4 Moments (0 of 18/16/15/17 picks) and zero
-- Journeys touched a London district, despite London already carrying 32
-- real, curated venues across 6 districts (Knightsbridge, Chelsea,
-- Mayfair, Belgravia, Notting Hill, St James) — the exact same gap
-- already found and fixed once this session for Chicago (migration
-- 0031). Opening Moments or Journeys as a London member showed nothing.
--
-- Curated entirely from venues already in the catalog, no new sourcing
-- needed, same genuine per-venue-fit standard as every other Moments
-- pass. Bellamy's and Kitty Fisher's genuinely span both Date Night and
-- Entertaining a Client — an intimate Mayfair mews restaurant and a full
-- Georgian townhouse both work as an impressive-but-discreet client
-- dinner or a romantic one — the same real overlap Refuge already has in
-- the original Manchester set, not padding.
--
-- Deliberately left out: 5 Hertford Street (Mayfair) — invitation-only
-- members' club, a member literally cannot book or walk in without a
-- proposer/seconder, the same "genuine impossibility" standard
-- rank-venues.ts's own hard filters use. Spencer House (St James) — open
-- to the public one day a week only, the same occasional-schedule
-- concern Venue.occasional exists for (migration 0036), too unpredictable
-- for a casual editorial pick.
--
-- Positions append after each moment's real current max (checked live
-- against Supabase before writing this, not assumed from the JSON seed
-- file, which can drift — see this session's own repeated "verify, don't
-- trust the file" discipline): date-night was at 17, entertaining-a-
-- client and big-group-of-friends at 15, solo-reset at 16.
--
-- The 2 journeys are both single-district with genuine haversine-derived
-- walk times between the stops' real coordinates (not estimated):
-- "World's End, Properly Spent" (Chelsea: Chelsea Physic Garden -> The
-- March Hare -> Medlar) and "Shepherd Market, Bottle First" (Mayfair:
-- Hedonism Wines -> Kitty Fisher's).

insert into moment_venues (moment_id, venue_id, position) values
  ('date-night', 'medlar', 18),
  ('date-night', 'core-by-clare-smyth', 19),
  ('date-night', 'kitty-fisher-s', 20),
  ('date-night', 'bellamy-s', 21),
  ('date-night', 'la-poule-au-pot', 22),
  ('date-night', 'julie-s-restaurant', 23),

  ('entertaining-a-client', 'wiltons', 16),
  ('entertaining-a-client', 'bellamy-s', 17),
  ('entertaining-a-client', 'kitty-fisher-s', 18),
  ('entertaining-a-client', 'salloos', 19),
  ('entertaining-a-client', 'franco-s', 20),

  ('big-group-of-friends', 'harrods-food-halls', 16),
  ('big-group-of-friends', 'martino-s', 17),
  ('big-group-of-friends', 'the-march-hare', 18),
  ('big-group-of-friends', 'the-wee-sister', 19),
  ('big-group-of-friends', 'sova', 20),

  ('solo-reset', 'chisou', 17),
  ('solo-reset', 'books-for-cooks', 18),
  ('solo-reset', 'the-notting-hill-bookshop', 19),
  ('solo-reset', 'chelsea-physic-garden', 20),
  ('solo-reset', 'saatchi-gallery', 21)
on conflict do nothing;

insert into journeys (id, moment_id, title, blurb, meta)
values
  (
    'world-s-end-properly-spent',
    'date-night',
    'World''s End, Properly Spent',
    'A walled garden with the gates nearly to yourselves, oysters and Champagne on the terrace, then a Bib Gourmand kitchen that''s held its nerve for two years running.',
    'CHELSEA · 3 STOPS · 4 HOURS'
  ),
  (
    'shepherd-market-bottle-first',
    'entertaining-a-client',
    'Shepherd Market, Bottle First',
    'Six thousand bottles to pick an opener from at the tasting wall, then a Georgian townhouse that''s been full since 2014.',
    'MAYFAIR · 2 STOPS · 3 HOURS'
  )
on conflict (id) do update set
  moment_id = excluded.moment_id, title = excluded.title, blurb = excluded.blurb, meta = excluded.meta;

insert into journey_stops (journey_id, venue_id, stop_order, walk_time_to_next_minutes)
values
  ('world-s-end-properly-spent', 'chelsea-physic-garden', 0, 9),
  ('world-s-end-properly-spent', 'the-march-hare', 1, 4),
  ('world-s-end-properly-spent', 'medlar', 2, null),

  ('shepherd-market-bottle-first', 'hedonism-wines', 0, 6),
  ('shepherd-market-bottle-first', 'kitty-fisher-s', 1, null)
on conflict (journey_id, stop_order) do update set
  venue_id = excluded.venue_id, walk_time_to_next_minutes = excluded.walk_time_to_next_minutes;
