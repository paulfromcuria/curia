-- Real Chicago picks for all 4 Moments, at explicit user request ("lets
-- further seed chicago for my brother"). Found on inspection, not asked
-- about directly: zero Chicago venues appeared in any of the 4 Moments
-- (moment_venues had 49 rows total, none pointing at a chicago-metro
-- venue) — every other metro has 12-13 real curated picks per moment,
-- Chicago had none. Opening Moments as a Chicago member showed nothing
-- for 3 of 4 moments and only the one existing Journey stop for the
-- fourth.
--
-- Curated from the 48 real venues already in the catalog (see migrations
-- 0021-0027) — no new venue sourcing needed here, just genuine editorial
-- fit per each moment's real character, same standard as the original
-- moments-expansion pass (docs/data/venues.json's own
-- _momentsExpansionSource note). A venue appearing in more than one
-- moment (Virtue Restaurant & Bar, Sophy Hyde Park/Mesler and BarDavid
-- all sit in both Date Night and Entertaining a Client) matches that same
-- established pattern, not a new one — each is genuinely both a real
-- date spot and a real client-meeting spot, the same real overlap Refuge
-- has in the original Manchester set.
--
-- Valois, Joseph Regenstein Library and Jimmy's (Woodlawn Tap) are also
-- the three real stops on the existing "A Day Off the Quad" Journey
-- (migration 0025) — being a Journey stop and a Moment pick are two
-- separate mechanisms, so they're added here directly rather than
-- assumed to already count.
--
-- Positions append after each moment's existing max (date-night was at
-- 12, the other three at 11) rather than renumbering anything that
-- already exists. Bob's Pizza was cut from Big Group of Friends before
-- this ever shipped — a same-night opening-hours research pass found it
-- permanently closed as of March 2026 (Block Club Chicago, Hyde Park
-- Herald, Hoodline, Yelp all confirm) — see migration 0032, which marks
-- the venue itself closed. Left a real gap in the position numbering
-- (13) rather than renumbering everything after it.

insert into moment_venues (moment_id, venue_id, position) values
  ('date-night', 'cantina-rosa', 13),
  ('date-night', 'sophy-hyde-park-mesler', 14),
  ('date-night', 'virtue-restaurant-bar', 15),
  ('date-night', 'norman-s-bistro', 16),
  ('date-night', 'bardavid', 17),

  ('entertaining-a-client', 'nella-pizza-e-pasta', 12),
  ('entertaining-a-client', 'virtue-restaurant-bar', 13),
  ('entertaining-a-client', 'sophy-hyde-park-mesler', 14),
  ('entertaining-a-client', 'bardavid', 15),

  ('big-group-of-friends', 'medici-on-57th', 12),
  ('big-group-of-friends', 'ja-grill', 14),
  ('big-group-of-friends', 'tafari-s-kitchen', 15),

  ('solo-reset', 'valois', 12),
  ('solo-reset', 'joseph-regenstein-library', 13),
  ('solo-reset', 'jimmy-s-woodlawn-tap', 14),
  ('solo-reset', 'build-coffee-books', 15),
  ('solo-reset', 'hyde-park-records', 16)
on conflict do nothing;
