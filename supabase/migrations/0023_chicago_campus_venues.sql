-- 10 real UChicago campus venues, at explicit user request — a personal
-- customization of the Chicago metro for the specific member it was built
-- for (a real UChicago student): "lots of libraries and bookstores as well
-- as college campus venues like the food hall and the library and the gym".
--
-- Deliberately scoped: 4 new venue types (ACADEMIC LIBRARY, PUBLIC LIBRARY,
-- CAMPUS DINING HALL, CAMPUS GYM) are category-only in tile-catalog-map.ts
-- — never added to any onboarding tile, so no member anywhere sees a new
-- tile because of this migration. Full sourcing and the one honest Gate 1
-- nuance (the two CAMPUS GYM venues require membership/guest-pass access,
-- unlike the libraries and dining halls which are genuinely walk-in) in
-- docs/data/venues.json's own _chicagoCampusVenueSource note.

insert into venues (
  id, name, type, sub_preference_tags, spend_level, district_id, metro,
  lat, lon, pet_friendly, dietary_options, photos, description, bands,
  base, status, tier, source_confidence,
  distinctiveness, ownership, ownership_notes, copy_status
) values
  (
    'joseph-regenstein-library', 'Joseph Regenstein Library', 'ACADEMIC LIBRARY', '{}', 1, 'hyde-park', 'chicago',
    41.792162, -87.599970, false, '{"none"}', '{}',
    'Built on the exact ground where Fermi''s team split the atom in 1942 — Henry Moore''s bronze marks the spot outside — and now holds 4.5 million volumes under Walter Netsch''s grooved limestone. Next door, the Mansueto''s glass dome and five robotic cranes can fetch any of 3.5 million more in about three minutes. A free visitor pass at the desk gets you into both.',
    '{morning,afternoon,evening}', 90, 'live', 'texture', 1,
    5, 'independent', 'University of Chicago''s own library system, single site (the adjoining Mansueto Library shares the same entrance and access policy). Open to the public with a free ID-verified pass at the entry desk. Verified 2026-09-18.', 'live'
  ),
  (
    'baker-dining-commons', 'Baker Dining Commons', 'CAMPUS DINING HALL', '{}', 2, 'hyde-park', 'chicago',
    41.793425, -87.600939, false, '{"vegetarian","vegan","halal","gluten-free"}', '{}',
    'Jeanne Gang''s floor-to-ceiling glass hall over the north quad, nine made-to-order stations running halal, kosher, vegan and gluten-free side by side — pay at the door with a card, no meal plan required.',
    '{morning,afternoon,evening}', 76, 'live', 'texture', 1,
    4, 'independent', 'University of Chicago dining facility (Studio Gang, 2016), single site. Walk-in visitors pay at the door — genuinely open, not meal-plan-gated. Verified 2026-09-18.', 'live'
  ),
  (
    'bartlett-dining-commons', 'Bartlett Dining Commons', 'CAMPUS DINING HALL', '{}', 2, 'hyde-park', 'chicago',
    41.791934, -87.598458, false, '{"vegetarian","vegan"}', '{}',
    'A 1901 gymnasium built as a dead son''s memorial, its Gothic arched bays converted to a 550-seat dining hall in 2002 without losing the bones of what it was.',
    '{morning,afternoon,evening}', 78, 'live', 'texture', 1,
    4, 'independent', 'University of Chicago dining facility (converted 1901 Bartlett Gymnasium), single site. Walk-in visitors pay at the door. Verified 2026-09-18.', 'live'
  ),
  (
    'arley-d-cathey-dining-commons', 'Arley D. Cathey Dining Commons', 'CAMPUS DINING HALL', '{}', 2, 'woodlawn', 'chicago',
    41.785073, -87.600384, false, '{"vegetarian","vegan"}', '{}',
    'South campus''s late kitchen — running fresh fruit and fair-trade coffee into the evening on weekdays and straight through the weekend, after the others have already locked up.',
    '{afternoon,evening,late}', 70, 'live', 'texture', 1,
    3, 'independent', 'University of Chicago dining facility, single site. Walk-in visitors pay at the door. Verified 2026-09-18.', 'live'
  ),
  (
    'international-house-dining-commons', 'International House Dining Commons', 'CAMPUS DINING HALL', '{}', 2, 'hyde-park', 'chicago',
    41.788243, -87.591072, false, '{"vegetarian","vegan"}', '{}',
    'The dining room inside International House, founded in 1932 on Rockefeller money to put students from dozens of countries under one roof — still the most international table on campus.',
    '{morning,afternoon,evening}', 74, 'live', 'texture', 1,
    4, 'independent', 'University of Chicago dining facility inside International House (1932), single site. Walk-in visitors pay at the door. Verified 2026-09-18.', 'live'
  ),
  (
    'gerald-ratner-athletics-center', 'Gerald Ratner Athletics Center', 'CAMPUS GYM', '{}', 2, 'hyde-park', 'chicago',
    41.794106, -87.602022, false, '{"none"}', '{}',
    'Cesar Pelli''s asymmetric red-brick rotunda under a suspended steel roof — a fifty-metre pool and a full fitness floor built into what one critic called a shipwrecked galleon. Membership or a student''s guest pass gets you in.',
    '{morning,afternoon,evening}', 74, 'live', 'texture', 1,
    4, 'independent', 'University of Chicago athletics facility (Cesar Pelli, 2003), single site. Access note (unlike this pass''s other campus venues): membership or a student-sponsored guest pass required, not open-door walk-in — flagged honestly rather than implied otherwise. Verified 2026-09-18.', 'live'
  ),
  (
    'henry-crown-field-house', 'Henry Crown Field House', 'CAMPUS GYM', '{}', 2, 'hyde-park', 'chicago',
    41.793563, -87.598932, false, '{"none"}', '{}',
    'Built Christmas Day 1931 to replace the university''s first gymnasium — still the campus''s real intramural home, courts and an indoor track running most of the day. Same guest-pass access as Ratner, a five-minute walk south.',
    '{morning,afternoon,evening}', 66, 'live', 'texture', 1,
    3, 'independent', 'University of Chicago athletics facility (Holabird & Root, 1931), single site. Same membership/guest-pass access policy as Ratner Athletics Center — not open-door walk-in. Verified 2026-09-18.', 'live'
  ),
  (
    'blackstone-branch-chicago-public-library', 'Blackstone Branch, Chicago Public Library', 'PUBLIC LIBRARY', '{}', 1, 'kenwood', 'chicago',
    41.805744, -87.590337, false, '{"none"}', '{}',
    'The first Chicago Public Library branch ever purpose-built, and the only one paid for privately rather than by the city — modelled on the Erechtheion in Athens, stained glass and mahogany, funded in 1904 by a widow in her husband''s memory.',
    '{morning,afternoon}', 85, 'live', 'texture', 1,
    5, 'independent', 'City of Chicago public library branch (Solon S. Beman, 1904), single site, free and open to all. Verified 2026-09-18.', 'live'
  ),
  (
    'bessie-coleman-branch-chicago-public-library', 'Bessie Coleman Branch, Chicago Public Library', 'PUBLIC LIBRARY', '{}', 1, 'woodlawn', 'chicago',
    41.780132, -87.606835, false, '{"none"}', '{}',
    'Named for Bessie Coleman, the first Black woman anywhere to hold a pilot''s licence — a real neighbourhood branch, not yet the replacement Chicago''s talked about building.',
    '{morning,afternoon}', 68, 'live', 'texture', 1,
    3, 'independent', 'City of Chicago public library branch, single site, free and open to all. Chicago Public Library has discussed replacing this branch since 2023-24 with no confirmed location, budget or timeline as of this research — confirmed still open and operating (CPL''s own 2026 hours listing). Verified 2026-09-18.', 'live'
  ),
  (
    'john-crerar-library', 'John Crerar Library', 'ACADEMIC LIBRARY', '{}', 1, 'hyde-park', 'chicago',
    41.790651, -87.602819, false, '{"none"}', '{}',
    'The university''s science and medicine library, born in 1984 when a nineteenth-century independent research library gave its entire collection away rather than see it broken up. Ask at the desk — no appointment needed.',
    '{afternoon}', 74, 'live', 'texture', 1,
    4, 'independent', 'University of Chicago''s own library system, single site. Open to unaffiliated visitors at the circulation desk. Verified 2026-09-18.', 'live'
  )
on conflict (id) do update set
  name = excluded.name, type = excluded.type, spend_level = excluded.spend_level,
  district_id = excluded.district_id, metro = excluded.metro, lat = excluded.lat, lon = excluded.lon,
  pet_friendly = excluded.pet_friendly, dietary_options = excluded.dietary_options,
  description = excluded.description, bands = excluded.bands, base = excluded.base,
  distinctiveness = excluded.distinctiveness, ownership = excluded.ownership,
  ownership_notes = excluded.ownership_notes;
