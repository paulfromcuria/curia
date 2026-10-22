-- Add Holmes Chapel as a new Cheshire village district, plus 3 real,
-- independently web-researched venue candidates for it (2026-10-22, direct
-- user request: "load in holmes chapel as a district and find some
-- venues"). The district goes straight into the live table — it's a
-- geographic/structural fact, not an editorial judgment call the way a
-- venue's Gate 1/Gate 2 fit is. Its venues still land as pending_review,
-- same discipline as 0045's cinema candidates, since these are brand-new
-- additions nobody's signed off on yet.
--
-- Candidates found and deliberately dropped during research, for the
-- record: The Old Red Lion (Holmes Chapel) is an Ember Inns/Mitchells &
-- Butlers managed pub — a real high-street chain, fails Gate 1 outright.
-- "Holmes Sweet Home" could not be confirmed to exist at all. The Fox and
-- Hounds and The Space Invader are both genuinely good pubs but are
-- actually in Sproston and Goostrey respectively, not Holmes Chapel
-- itself. Cobbles Tea Room (5 Church View) is real but had no reviews or
-- other quality signal to go on, so it was left out rather than guessed.

insert into districts (
  id, name, metro, kind, accent_color, lat, lon, base,
  editorial_description, day_multiplier, band_multiplier, group_id
) values (
  'holmes-chapel', 'Holmes Chapel', 'cheshire', 'county', '#8B5A6B',
  53.202065, -2.357107, 44,
  'London Road''s independent run — a 125-year-old family bakery, a converted bank now pouring rare bottles, and a village too small for a chain to bother setting up in.',
  '{"friday":1.16,"monday":0.78,"sunday":0.86,"tuesday":0.82,"saturday":1.22,"thursday":0.96,"wednesday":0.88}'::jsonb,
  '{"late":0.42,"evening":0.9,"morning":0.56,"afternoon":0.96}'::jsonb,
  null
);

insert into venue_candidates (
  name, type, sub_preference_tags, spend_level, district_id, metro,
  lat, lon, pet_friendly, dietary_options, photos, description, bands, base,
  gate1_reasoning, distinctiveness_proposed, distinctiveness_reasoning,
  ownership, ownership_evidence, sources, status, coordinate_method
) values
  ('Don Alberto', 'ITALIAN RESTAURANT', '{}', 2, 'holmes-chapel', 'cheshire', 53.202482, -2.355928, false, '{none}', '{}', 'Opened in 2015 by a family who named it after The Godfather''s Don Corleone — contemporary Italian cooking with enough of a following that they''ve since opened two more, in Middlewich and Leigh, without the original losing its crowd.', '{"afternoon","evening"}', 64, 'A small, family-run Italian restaurant group (three sites: Holmes Chapel, Middlewich, Leigh), genuinely independent rather than franchised, with a strong decade-long local following — the kind of small premium group the two-gate model exists to let in.', 3, 'A good, reliable neighbourhood Italian with real history and a loyal following — not generic, but not singular either; a strong mid-tier pick, same register as the model''s own ''a good Piccolino'' example.', 'small_group', '{"note":"Family-run; opened 2015, since expanded to two sister sites (Il Padrino, Middlewich, opened 2019; a third site in Leigh, Greater Manchester) — confirmed via a 2021 interview with the owners, no sign of chain/franchise ambition beyond family expansion."}'::jsonb, '[{"note":"Researched via live web search 2026-10-22, confirmed currently operating (2026 Tripadvisor reviews, 4.4/451). Added at user request: \"load in holmes chapel as a district and find some venues\". Address: 1 Macclesfield Rd, Holmes Chapel CW4 7NF."}]'::jsonb, 'pending_review', 'Geocoded postcode (CW4 7NF) via postcodes.io'),
  ('Beer Emporium Bottle Bank', 'ALE HOUSE', '{}', 2, 'holmes-chapel', 'cheshire', 53.20174, -2.357853, false, '{none}', '{}', 'A former NatWest branch on London Road, now a bar and off-licence with a bottled range that outlasts most pub visits and two rotating cask pumps alongside eight kegs — CAMRA Good Beer Guide listed, and exactly the kind of place a reviewer once called ''uber-Cheshire posh micro.''', '{"afternoon","evening","late"}', 60, 'A genuinely independent bottle shop and bar, free of any brewery tie, featured in the CAMRA Good Beer Guide — a specialist, characterful operation, not a high-street chain.', 4, 'The converted-bank setting and genuinely broad specialist bottle range make this a real, earned destination rather than an ordinary village pub.', 'independent', '{"note":"CAMRA lists it as independently operated, free of any brewery tie — not part of a pub company or managed chain."}'::jsonb, '[{"note":"Researched via live web search 2026-10-22, confirmed via CAMRA listing. Added at user request: \"load in holmes chapel as a district and find some venues\". Address: 24-26 London Road, Holmes Chapel CW4 7AJ."}]'::jsonb, 'pending_review', 'Geocoded postcode (CW4 7AJ) via postcodes.io'),
  ('W. Mandeville', 'BAKERY', '{}', 1, 'holmes-chapel', 'cheshire', 53.202308, -2.357004, false, '{none}', '{}', 'A family bakery and grocer on Macclesfield Road since around 1900, still run by the same family — craft bread and local deli goods sold from the same corner for four generations, long before the village had anywhere else worth walking to.', '{"morning","afternoon"}', 56, 'A genuine 125-year-old family-run bakery and grocer, the opposite of a high-street chain by any measure — comfortably clears Gate 1 on heritage and craft alone.', 4, 'A real multi-generational village institution with a specific, verifiable history.', 'independent', '{"note":"Family bakery dating to approximately 1900, still owned and managed by the Mandeville family per local directory records; no chain or franchise affiliation found."}'::jsonb, '[{"note":"Researched via live web search 2026-10-22. Added at user request: \"load in holmes chapel as a district and find some venues\". Address: 2 Macclesfield Road, Holmes Chapel CW4 7NE. One low-reliability entertainment source claims a teenage Harry Styles worked here on Saturdays before fame — plausible (he grew up in the village) but unverified against a primary source; left out of the live description, flagged here for the reviewer in case it''s worth confirming and using."}]'::jsonb, 'pending_review', 'Geocoded postcode (CW4 7NE) via postcodes.io');
