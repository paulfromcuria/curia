-- Adds the 'Play sport' onboarding tile (Do category), at explicit user
-- request: "lets add play sport, with refinements of golf, padel and
-- tennis". See docs/data/tiles.json's own _playSportSource note for full
-- reasoning, including why golf-club was removed from 'Spectator sport'
-- (tile-catalog-map.ts) in the same pass.
--
-- Also tags every real GOLF CLUB venue with sub_preference_tags = {Golf},
-- so this tile's Golf refinement actually functions. This surfaced a
-- bigger, separate finding worth restating here: no venue in the whole
-- dataset has ever had sub_preference_tags set, so every tile's
-- sub-preference toggle has been inert everywhere else — real, larger
-- scope, not fixed for the other 21 tiles/300+ venues in this migration.

insert into tiles (id, category, name, sub_preferences, region)
values ('Do|Play sport', 'Do', 'Play sport', '{Golf,Padel,Tennis}', null)
on conflict (id) do update set
  category = excluded.category,
  name = excluded.name,
  sub_preferences = excluded.sub_preferences,
  region = excluded.region;

update venues
set sub_preference_tags = '{Golf}'
where type = 'GOLF CLUB';
