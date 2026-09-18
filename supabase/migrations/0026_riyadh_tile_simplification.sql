-- Riyadh Drink tile-simplification pass, 2026-09-18 — the same-night
-- follow-up the user asked for directly ("but what about the go do and go
-- eat tiles?" / confirmed Do+Eat already covered / "have we simplified...
-- for riyadh as well?"). Same standard as the UK pass (migration 0022):
-- cut tiles with 0-1 real matching venues, empty subPreferences on
-- everything else unless a real structurally-distinct venue subset backs
-- a refinement (none do here — every surviving tile maps to exactly one
-- venue type). Full reasoning in docs/data/tiles.json's own
-- _riyadhTileSimplificationSource note.

delete from tiles where id in (
  'Drink|Mocktail lounges',
  'Drink|Juice & smoothie bars',
  'Drink|Rooftop cafés',
  'Drink|Tea houses',
  'Drink|Hotel lounges'
);

update tiles set sub_preferences = '{}' where id in (
  'Drink|Specialty coffee',
  'Drink|Shisha lounges',
  'Drink|Dessert cafés'
);
