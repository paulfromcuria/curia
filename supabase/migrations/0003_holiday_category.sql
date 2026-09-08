-- Adds the 'Holiday' TileCategory (src/types/models.ts) to the two tables
-- whose `category` column was CHECK-constrained to the original three
-- (Do/Drink/Eat) in 0001_init.sql. See TileCategory's own doc comment for
-- why: a member travelling somewhere Curia doesn't have Do/Drink/Eat
-- coverage for yet (the Santorini pass) needs a way to express real,
-- holiday-specific taste (beach clubs) the existing catalog was never built
-- to capture. Holiday is optional and never gates onboarding completion —
-- this migration only widens what the database will accept, it doesn't
-- change any app-level gating logic.

alter table tiles drop constraint tiles_category_check;
alter table tiles add constraint tiles_category_check
  check (category in ('Do', 'Drink', 'Eat', 'Holiday'));

alter table user_preferences drop constraint user_preferences_category_check;
alter table user_preferences add constraint user_preferences_category_check
  check (category in ('Do', 'Drink', 'Eat', 'Holiday'));
