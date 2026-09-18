-- 11 real standalone padel/tennis venues + real facility tagging on 4
-- existing golf clubs, at explicit user follow-up on last night's Play
-- sport tile ("we should keep padel and tennis but we should source some
-- venues"). Full sourcing and reasoning in docs/data/venues.json's own
-- _padelTennisVenueSource note.
--
-- Metro is 'manchester' for the two city-centre padel clubs (Deansgate/
-- Spinningfields) and 'cheshire' for the rest — matches each one's real
-- district assignment, not a blanket guess.

insert into venues (
  id, name, type, sub_preference_tags, spend_level, district_id, metro,
  lat, lon, pet_friendly, dietary_options, photos, description, bands,
  base, status, tier, source_confidence,
  distinctiveness, ownership, ownership_notes, copy_status
) values
  (
    'the-pollen-club', 'The Pollen Club', 'PADEL CLUB', '{}', 5, 'spinningfields', 'manchester',
    53.483530, -2.246775, false, '{"none"}', '{}',
    'Two courts under a canopy engineered like a piece of architecture, coffee from Pot Kettle Black instead of a vending machine. Padel with a hotel lobby attached, not the other way round.',
    '{morning,afternoon,evening}', 82, 'live', 'texture', 1,
    4, 'independent', 'Single-site venue adjoining Treehouse Hotel Manchester (a small boutique hotel brand, not a mass operator); corporate entity tied to the hotel''s own property structure rather than a padel-chain operator. Verified 2026-09-18.', 'live'
  ),
  (
    'club-de-padel', 'Club de Padel', 'PADEL CLUB', '{}', 4, 'spinningfields', 'manchester',
    53.479662, -2.248108, false, '{"none"}', '{}',
    'Turfed out of Deansgate Square for more glass towers, rebuilt under Queen Street''s high ceilings with Federal on the coffee. The original, refusing to act like it.',
    '{morning,afternoon,evening}', 80, 'live', 'texture', 1,
    4, 'small_group', 'Founder-led (four named co-founders), two sites total (Manchester + Sheffield) — no evidence of PE/institutional backing beyond a standard founder holding company. Verified 2026-09-18.', 'live'
  ),
  (
    'adlington-padel', 'Adlington Padel', 'PADEL CLUB', '{}', 3, 'bramhall', 'cheshire',
    53.332545, -2.140935, false, '{"none"}', '{}',
    'Limestone terracing and Mediterranean planting on a family golf centre outside Macclesfield — closer to a beach club in Marbella than a leisure centre, and priced with one number, no small print.',
    '{morning,afternoon,evening}', 78, 'live', 'texture', 1,
    4, 'independent', 'Family-owned since 1992 (David & Sandra Moss, now run by sons James, Tim and Nick Moss), single site. Verified 2026-09-18.', 'live'
  ),
  (
    'manchester-padel-club', 'Manchester Padel Club', 'PADEL CLUB', '{}', 4, 'cheadle-hulme', 'cheshire',
    53.382292, -2.225118, false, '{"none"}', '{}',
    'A former world top-ten player teaching out of a Heald Green sports centre — the credentials are real, the room around them is not the point.',
    '{morning,afternoon,evening}', 64, 'live', 'texture', 1,
    2, 'independent', 'Founder-led by Leo Padovani (former world top-10 player, coach to Juan Martin Diaz) with David and Rachel Thomas. Single site, inside South Manchester Sports Club. Verified 2026-09-18.', 'live'
  ),
  (
    'the-northern-lawn-tennis-club', 'The Northern Lawn Tennis Club', 'TENNIS CLUB', '{}', 4, 'didsbury', 'manchester',
    53.425035, -2.236888, false, '{"none"}', '{}',
    'Moved brick by brick from Old Trafford in 1909 when the soot got into the flannels. Sampras won his first grass title here; nobody''s mentioning it at the bar.',
    '{morning,afternoon,evening}', 90, 'live', 'texture', 1,
    5, 'independent', 'Founded 1879, single-site member-governed private limited company, no franchise. Hosted Davis Cup ties; Connors, McEnroe and Sampras all played there. Verified 2026-09-18.', 'live'
  ),
  (
    'lymm-lawn-tennis-and-croquet-club', 'Lymm Lawn Tennis and Croquet Club', 'TENNIS CLUB', '{}', 2, 'altrincham', 'cheshire',
    53.379911, -2.480831, false, '{"none"}', '{}',
    'Grass courts hidden in woodland above the village — most of Lymm doesn''t know it''s there, which is rather the point.',
    '{morning,afternoon,evening}', 72, 'live', 'texture', 1,
    3, 'independent', 'Member-owned company (Lymm Lawn Tennis and Croquet Company Ltd, founded 1881). Verified 2026-09-18.', 'live'
  ),
  (
    'alderley-edge-tennis-club', 'Alderley Edge Tennis Club', 'TENNIS CLUB', '{}', 3, 'alderley-edge', 'cheshire',
    53.302993, -2.230577, false, '{"none"}', '{}',
    'Croquet lawns turned to tennis courts in the 1880s, mostly so young Cheshire could flirt without a chaperone. The kitchen''s still open seven nights a week.',
    '{morning,afternoon,evening}', 74, 'live', 'texture', 1,
    3, 'independent', 'Tennis section of Alderley Edge Cricket Club (est. 1870), member club, not a franchise. Verified 2026-09-18.', 'live'
  ),
  (
    'bowdon-bowling-and-lawn-tennis-club', 'Bowdon Bowling and Lawn Tennis Club', 'TENNIS CLUB', '{}', 2, 'altrincham', 'cheshire',
    53.378824, -2.361021, false, '{"none"}', '{}',
    '1873, on the local heritage register, and still just bowls and tennis — Bowdon never felt the need to add anything else.',
    '{morning,afternoon,evening}', 72, 'live', 'texture', 1,
    3, 'independent', 'Member club, incorporated 1873, on the local heritage list. Verified 2026-09-18.', 'live'
  ),
  (
    'bramhall-park-lawn-tennis-club', 'Bramhall Park Lawn Tennis Club', 'TENNIS CLUB', '{}', 2, 'bramhall', 'cheshire',
    53.376936, -2.168022, false, '{"none"}', '{}',
    'A hundred years next to the park it''s named after — Bramhall''s version of old money doesn''t shout about it.',
    '{morning,afternoon,evening}', 72, 'live', 'texture', 1,
    3, 'independent', 'Member club celebrating its centenary in 2026, on the same plot beside Bramhall Park since founding. Verified 2026-09-18.', 'live'
  ),
  (
    'hale-lawn-tennis-club', 'Hale Lawn Tennis Club', 'TENNIS CLUB', '{}', 3, 'hale', 'cheshire',
    53.375308, -2.333185, false, '{"none"}', '{}',
    'Grand clay in Hale — the kind of surface Cheshire usually has to travel abroad for.',
    '{morning,afternoon,evening}', 76, 'live', 'texture', 1,
    3, 'independent', 'Member club, nine courts including three premium ''Lano'' grand clay courts. Note: the operating company (Hale Lawn Tennis Club Ltd) shows as dissolved 20 January 2026 on Companies House, but the club''s own site confirms live 26/27 membership sales and 2024-25 league results — clearly still trading, likely under a reorganised entity. Flagged transparently rather than silently assumed. Verified 2026-09-18.', 'live'
  ),
  (
    'knutsford-tennis-club', 'Knutsford Tennis Club', 'TENNIS CLUB', '{}', 2, 'knutsford', 'cheshire',
    53.313347, -2.379675, false, '{"none"}', '{}',
    'Five minutes from the Tatton Park gate, and otherwise exactly what a well-run seven-court club looks like — no pretensions, no history lesson, just tennis.',
    '{morning,afternoon,evening}', 64, 'live', 'texture', 1,
    2, 'independent', 'Member club sharing a multi-sport site (Knutsford Sports Club). Verified 2026-09-18.', 'live'
  )
on conflict (id) do update set
  name = excluded.name, type = excluded.type, spend_level = excluded.spend_level,
  district_id = excluded.district_id, metro = excluded.metro, lat = excluded.lat, lon = excluded.lon,
  pet_friendly = excluded.pet_friendly, dietary_options = excluded.dietary_options,
  description = excluded.description, bands = excluded.bands, base = excluded.base,
  distinctiveness = excluded.distinctiveness, ownership = excluded.ownership,
  ownership_notes = excluded.ownership_notes;

-- Real padel/tennis facilities found at 4 existing golf clubs — tagged
-- directly rather than added as new venues, full replacement of
-- sub_preference_tags (not an array append) so this is correct regardless
-- of whether migration 0020's Golf tagging has already run.
update venues set sub_preference_tags = '{"Golf","Padel"}' where id = 'dunham-forest-golf-country-club';
update venues set sub_preference_tags = '{"Golf","Padel"}' where id = 'fairmont-cheshire-the-mere';
update venues set sub_preference_tags = '{"Golf","Padel"}' where id = 'champneys-mottram-hall';
update venues set sub_preference_tags = '{"Golf","Tennis"}' where id = 'carden-park';
