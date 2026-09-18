-- Tile simplification pass, 2026-09-18, at explicit user request: "these
-- refinements should be a real value added, not unnecessary fluff... i
-- also want to make it more normal". Full reasoning in docs/data/tiles.json's
-- own _tileSimplificationSource note and src/lib/scoring/tile-catalog-map.ts.
--
-- Three real changes to the live `tiles` table (docs/data/tiles.json is the
-- source of truth this mirrors, but editing that JSON alone never touches
-- Supabase — same as every other tile/venue change this project has made):
--   1. Delete the 17 tiles cut outright (0-1 real matching venues each).
--   2. Empty subPreferences on every tile that's kept but whose refinements
--      were purely decorative (no venue anywhere has ever been tagged to
--      back them).
--   3. Keep (or newly set) subPreferences only on the three tiles with a
--      real, structurally-distinct venue subset behind them: Markets,
--      Cocktail bars, Upmarket pubs — tagged for real in the venues UPDATEs
--      below, same standard the golf-club Play sport tagging already set
--      (migration 0020).
--
-- Cutting/merging a tile never touches a venue's own row (type, district,
-- description, etc.) — a venue's visibility in Map/List/mood-filter is
-- governed by CATEGORY_BY_VENUE_TYPE (tile-catalog-map.ts), never by
-- whether an onboarding tile happens to point at it. The only thing lost
-- for a cut tile's venues is the dedicated onboarding pick.

delete from tiles where id in (
  'Do|Ballet & opera',
  'Do|Comedy',
  'Do|Walking tours',
  'Do|Antiques & design',
  'Do|Cookery & craft',
  'Drink|Members'' clubs',
  'Drink|Whisky & spirits',
  'Drink|Beer gardens',
  'Drink|Waterside bars',
  'Drink|Wellness bars',
  'Eat|Romantic',
  'Eat|Business lunch',
  'Eat|Al fresco',
  'Eat|Private dining',
  'Eat|Wine-led dining',
  'Eat|Late-night eats',
  'Eat|Chef''s counter'
);

update tiles set sub_preferences = '{}' where id in (
  'Do|Culture',
  'Do|Parks & green space',
  'Do|Independent cinema',
  'Do|Theatre',
  'Do|Clothes shopping',
  'Do|Live music',
  'Do|Art galleries',
  'Do|Spa & wellness',
  'Do|Spectator sport',
  'Drink|Wine bars',
  'Drink|Nightclubs',
  'Drink|Jazz bars',
  'Drink|Rooftop & scenic',
  'Drink|Hotel bars',
  'Drink|Champagne bars',
  'Drink|Late-night lounges',
  'Drink|Cafés (late)',
  'Eat|Tasting menu',
  'Eat|Fine dining',
  'Eat|Scenic',
  'Eat|Lively & loud',
  'Eat|Brunch',
  'Eat|Small plates',
  'Eat|Hidden gem',
  'Eat|Celebratory',
  'Eat|Neighbourhood favourite'
);

update tiles set sub_preferences = '{"Speakeasy-style"}' where id = 'Drink|Cocktail bars';
update tiles set sub_preferences = '{"Beer garden"}' where id = 'Drink|Upmarket pubs';

-- Markets ('Do|Markets') and Play sport ('Do|Play sport') keep their
-- existing subPreferences unchanged — both already real. Play sport's
-- Padel/Tennis were kept in full at explicit user request even though
-- Golf is currently the only tagged one; see venues.json for whatever
-- real padel/tennis venues have landed by the time this runs.

update venues set sub_preference_tags = '{"Food markets"}' where type = 'MARKET HALL';
update venues set sub_preference_tags = '{"Artisan stalls"}' where type = 'ARTISAN MARKET';
update venues set sub_preference_tags = '{"Speakeasy-style"}' where type = 'SPEAKEASY';
-- Only the one venue whose own type is literally BEER GARDEN (Port Street
-- Beer House) gets tagged — no verified data on which country-pub/gastropub
-- venues also happen to have a beer garden as a secondary feature, so
-- guessing was avoided rather than over-tagging on an assumption.
update venues set sub_preference_tags = '{"Beer garden"}' where type = 'BEER GARDEN';
