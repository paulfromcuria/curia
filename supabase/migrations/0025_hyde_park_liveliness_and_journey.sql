-- Two things for the same "make Chicago more useful for the specific
-- member it was built for" request, 2026-09-18:
--
-- 1. A real bug found while building the second half of this migration:
--    Hyde Park/Kenwood/Woodlawn's day_multiplier and band_multiplier
--    columns were both null — migration 0021a's districts INSERT never
--    included those columns at all, so all three Chicago districts have
--    been scoring a flat neutral 0.5 on both liveliness signals since
--    Chicago went live, not even falling back to the generic per-kind
--    curve every other district gets (that fallback only ever happens at
--    seed.sql generation time, never as a live app-runtime default). Fixed
--    for all three here. Full reasoning in docs/data/districts.json's own
--    _hydeParkLivelinessSource note.
--
-- 2. A real Journey — "A Day Off the Quad" — for the same member: Valois
--    breakfast, Regenstein to study, a pint at Jimmy's. Tagged 'solo-reset'
--    (an existing Moment, not a new one — see docs/data/venues.json's own
--    _dayOffTheQuadSource note for why that's the genuine fit).

-- Kenwood and Woodlawn: the same shared dayMultiplier and generic 'city'
-- bandMultiplier every other city-kind UK district already has.
update districts set
  day_multiplier = '{"monday":0.78,"tuesday":0.82,"wednesday":0.88,"thursday":0.96,"friday":1.16,"saturday":1.22,"sunday":0.86}',
  band_multiplier = '{"morning":0.34,"afternoon":0.6,"evening":1,"late":1.12}'
where id in ('kenwood', 'woodlawn');

-- Hyde Park: the same real dayMultiplier, plus its own genuine campus-
-- rhythm bandMultiplier override — the actual feature requested, not just
-- the bug backfill.
update districts set
  day_multiplier = '{"monday":0.78,"tuesday":0.82,"wednesday":0.88,"thursday":0.96,"friday":1.16,"saturday":1.22,"sunday":0.86}',
  band_multiplier = '{"morning":0.55,"afternoon":1.3,"evening":1.25,"late":0.75}'
where id = 'hyde-park';

insert into journeys (id, moment_id, title, blurb, meta)
values (
  'a-day-off-the-quad',
  'solo-reset',
  'A Day Off the Quad',
  'Steam-table eggs at Valois, the Reg''s reading rooms for however long the reading takes, then a pint at Jimmy''s with nobody checking the time.',
  'HYDE PARK · 3 STOPS · 4 HOURS'
)
on conflict (id) do update set
  moment_id = excluded.moment_id, title = excluded.title, blurb = excluded.blurb, meta = excluded.meta;

insert into journey_stops (journey_id, venue_id, stop_order, walk_time_to_next_minutes)
values
  ('a-day-off-the-quad', 'valois', 0, 16),
  ('a-day-off-the-quad', 'joseph-regenstein-library', 1, 5),
  ('a-day-off-the-quad', 'jimmy-s-woodlawn-tap', 2, null)
on conflict (journey_id, stop_order) do update set
  venue_id = excluded.venue_id, walk_time_to_next_minutes = excluded.walk_time_to_next_minutes;
