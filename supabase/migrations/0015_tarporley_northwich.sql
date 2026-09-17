-- Adds Tarporley and Northwich (Cheshire) plus 3 real first venues each.
-- See docs/data/districts.json's own _tarporleyNorthwichCorridorSource note
-- for why: Chester and Nantwich rendered as isolated islands on the map's
-- coverage-territory shape (a real 17.5-mile gap to the nearest other
-- district), and these two genuinely worthwhile towns happen to sit almost
-- exactly in that gap — closing it as a side effect of a real expansion,
-- not a fake bridge. Full sourcing/Gate 1/Gate 2 reasoning in that note and
-- venues.json's own _tarporleyNorthwichVenueSource note.

insert into districts (id, name, metro, lat, lon, base, kind, accent_color, editorial_description)
values
  ('tarporley', 'Tarporley', 'cheshire', 53.160043, -2.669352, 48, 'county', '#5E6E4F', 'The Cheshire village that resisted the chain-store drift entirely — butchers and a bookshop on the high street, a coaching inn that''s poured drinks since 1565, and a farm shop a few minutes out that''s fed the same family''s customers since 1959.'),
  ('northwich', 'Northwich', 'cheshire', 53.26211, -2.512439, 58, 'county', '#4A6B6E', 'Another salt town on the same river as Nantwich, rebuilding its own high street on its own terms — a rooftop bar over the water where the old quayside warehouses stood, and a bistro that''s been quietly good since 2004.')
on conflict (id) do update set
  name = excluded.name,
  metro = excluded.metro,
  lat = excluded.lat,
  lon = excluded.lon,
  base = excluded.base,
  kind = excluded.kind,
  accent_color = excluded.accent_color,
  editorial_description = excluded.editorial_description;

insert into venues (
  id, name, type, sub_preference_tags, spend_level, district_id, metro,
  lat, lon, pet_friendly, dietary_options, photos, description, bands,
  base, status, tier, source_confidence,
  distinctiveness, ownership, ownership_notes, copy_status
) values
  (
    'ginger-and-pickles-bakehouse', 'Ginger and Pickles Bakehouse', 'BAKERY', '{}', 2, 'tarporley', 'cheshire',
    53.160155, -2.668666, false, '{vegetarian}', '{}',
    'A proper bakehouse on the High Street, opposite the original tearoom of the same name — scratch pastries and sourdough, not a display case for something baked off-site.',
    '{morning,afternoon}', 72, 'live', 'texture', 1,
    4, 'small_group', 'Confirmed via the operator''s own site to also run a Nantwich bakehouse — a real 2-site sibling pair. Verified 2026-09-18.', 'live'
  ),
  (
    'the-swan-tarporley', 'The Swan', 'GASTROPUB', '{}', 3, 'tarporley', 'cheshire',
    53.158222, -2.668681, false, '{vegetarian}', '{}',
    'A coaching inn since 1565, on the old London-to-Chester road — sixteen rooms upstairs, real ale and proper cooking below, under the same ownership for twenty-five years.',
    '{afternoon,evening}', 78, 'live', 'texture', 1,
    4, 'independent', 'Owned by Si and Chrissie Lees Jones for 25+ years; day-to-day run by Cheshire operator Bear Inns. Ownership itself reads independent (one long-tenured owning couple, a single historic identity) — management relationship noted, not hidden. Verified 2026-09-18.', 'live'
  ),
  (
    'the-hollies-farm-shop', 'The Hollies Farm Shop', 'FARM SHOP', '{}', 2, 'tarporley', 'cheshire',
    53.203841, -2.627381, false, '{vegetarian}', '{}',
    'The Cowap family''s own farm shop, a few minutes out at Little Budworth — a butchery, a deli counter, and a takeaway window that''s opened at eight every morning since 1959.',
    '{morning,afternoon}', 68, 'live', 'texture', 1,
    3, 'small_group', 'Cowap family-run since 1959; sourcing found a second ''on the High Street'' location alongside the main Little Budworth site. Verified 2026-09-18.', 'live'
  ),
  (
    'kanya-bistro-bar', 'Kanya Bistro Bar', 'BRITISH RESTAURANT', '{}', 3, 'northwich', 'cheshire',
    53.261345, -2.514649, false, '{vegetarian}', '{}',
    'On the High Street since 2004, long enough to have outlasted several of its neighbours — modern bistro plates, sourced from Cheshire producers where it can manage it.',
    '{afternoon,evening}', 74, 'live', 'texture', 1,
    3, 'independent', 'Trading since 2004; no second site found. Verified 2026-09-18.', 'live'
  ),
  (
    'the-salthouse-nw', 'The Salthouse NW', 'ALE HOUSE', '{}', 2, 'northwich', 'cheshire',
    53.258826, -2.515083, false, '{vegetarian}', '{}',
    'A family-run craft ale and gin bar at Hayhurst Quay, wedged between Waitrose and the water — a drinks list that actually rotates, not a chalkboard for show.',
    '{afternoon,evening}', 76, 'live', 'texture', 1,
    4, 'small_group', 'Confirmed sister venue, The BullRing NW, both under the same family. Verified 2026-09-18.', 'live'
  ),
  (
    'barons-quay-social', 'Barons Quay Social', 'ROOFTOP', '{}', 2, 'northwich', 'cheshire',
    53.262401, -2.513627, false, '{vegetarian}', '{}',
    'A rooftop terrace over the River Weaver where a run-down quayside used to be — street food stalls, live music most weekends, and a view the town didn''t have anywhere else until this opened.',
    '{afternoon,evening}', 80, 'live', 'texture', 1,
    4, 'independent', 'Owner Carl Thomas; no second site found. Verified 2026-09-18.', 'live'
  )
on conflict (id) do update set
  name = excluded.name,
  type = excluded.type,
  spend_level = excluded.spend_level,
  district_id = excluded.district_id,
  metro = excluded.metro,
  lat = excluded.lat,
  lon = excluded.lon,
  dietary_options = excluded.dietary_options,
  description = excluded.description,
  bands = excluded.bands,
  base = excluded.base,
  distinctiveness = excluded.distinctiveness,
  ownership = excluded.ownership,
  ownership_notes = excluded.ownership_notes,
  copy_status = excluded.copy_status;
