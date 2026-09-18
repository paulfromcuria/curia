-- 20 real Cheshire golf clubs, at explicit user request ("the 20 best,
-- including dunham forest"). Full sourcing, district-assignment reasoning
-- and Gate 1/Gate 2 ownership/distinctiveness reasoning in
-- docs/data/venues.json's own _cheshireGolfClubsSource note.

insert into venues (
  id, name, type, sub_preference_tags, spend_level, district_id, metro,
  lat, lon, pet_friendly, dietary_options, photos, description, bands,
  base, status, tier, source_confidence,
  distinctiveness, ownership, ownership_notes, copy_status
) values
  (
    'warrington-golf-club', 'Warrington Golf Club', 'GOLF CLUB', '{}', 4, 'northwich', 'cheshire',
    53.353972, -2.578098, false, '{}', '{}',
    'James Braid''s original heathland routing, reworked by Ken Moodie in 2008, set high enough on its ridge that the view runs clear to the Welsh hills on a good day.',
    '{morning,afternoon}', 68, 'live', 'texture', 1,
    3, 'independent', 'No second site found. Note: sits in the separate Warrington unitary authority, not Cheshire East/West, but within the ceremonial county and universally described as a Cheshire club. Verified 2026-09-18.', 'live'
  ),
  (
    'chester-golf-club', 'Chester Golf Club', 'GOLF CLUB', '{}', 4, 'chester', 'cheshire',
    53.18314, -2.902991, false, '{}', '{}',
    'One of Cheshire''s oldest, founded in 1901 on land by the Bache Hall estate before settling beside the Dee at Curzon Park — a proper parkland round inside the old city''s own boundary.',
    '{morning,afternoon}', 74, 'live', 'texture', 1,
    4, 'independent', 'No second site found. Verified 2026-09-18.', 'live'
  ),
  (
    'alderley-edge-golf-club', 'Alderley Edge Golf Club', 'GOLF CLUB', '{}', 4, 'alderley-edge', 'cheshire',
    53.309757, -2.252844, false, '{}', '{}',
    'Laid out in 1907 on the site of an earlier, abandoned course, in one of Cheshire''s most expensive postcodes — the clubhouse is the least showy thing about the village around it.',
    '{morning,afternoon}', 70, 'live', 'texture', 1,
    3, 'independent', 'No second site found. Verified 2026-09-18.', 'live'
  ),
  (
    'congleton-golf-club', 'Congleton Golf Club', 'GOLF CLUB', '{}', 4, 'macclesfield', 'cheshire',
    53.151209, -2.181544, false, '{}', '{}',
    'Founded over a pub meeting at the Lion and Swan in 1898, moved to its present Mossley Hall ground six years later — a proper old Cheshire club that''s never needed to be anything else.',
    '{morning,afternoon}', 66, 'live', 'texture', 1,
    3, 'independent', 'No second site found. Verified 2026-09-18.', 'live'
  ),
  (
    'malkins-bank-golf-club', 'Malkins Bank Golf Club', 'GOLF CLUB', '{}', 2, 'nantwich', 'cheshire',
    53.129154, -2.354785, false, '{}', '{}',
    'Council-owned and genuinely pay-and-play — no membership, no waiting list, a Hawtree-designed course from 1976 alongside a bar, mini-golf and a zip line most private clubs wouldn''t dream of.',
    '{morning,afternoon}', 62, 'live', 'texture', 1,
    2, 'independent', 'Owned by Cheshire East Council, operated on its behalf by R.M. Estates Ltd — genuinely public pay-and-play, not a commercial chain of any kind. Verified 2026-09-18.', 'live'
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
