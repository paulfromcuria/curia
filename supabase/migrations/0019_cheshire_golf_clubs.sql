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
    'dunham-forest-golf-country-club', 'Dunham Forest Golf & Country Club', 'GOLF CLUB', '{}', 4, 'altrincham', 'cheshire',
    53.387364, -2.378895, false, '{}', '{}',
    'The original nine went in on a former WWII Italian POW camp in 1961; Dave Thomas — runner-up to Nicklaus at the ''66 Open — reshaped it into today''s eighteen not long after. Tight and tree-lined enough that straight still beats long.',
    '{morning,afternoon}', 74, 'live', 'texture', 1,
    4, 'independent', 'No second site found; genuinely independent members'' club. Note: administratively in the Metropolitan Borough of Trafford since 1974, not a current Cheshire local authority — retained on real historic-county identity and character, same judgment already made for Cheadle Hulme/Bramhall/Heaton Moor. Verified 2026-09-18.', 'live'
  ),
  (
    'delamere-forest-golf-club', 'Delamere Forest Golf Club', 'GOLF CLUB', '{}', 4, 'tarporley', 'cheshire',
    53.228095, -2.663627, false, '{}', '{}',
    'Herbert Fowler''s 1911 heathland course, opened with an exhibition round from James Braid and Sandy Herd, cut straight through the old Delamere hunting forest. Cheshire''s highest-rated golf club, and it plays like it knows it.',
    '{morning,afternoon}', 80, 'live', 'texture', 1,
    5, 'independent', 'No second site found. Independently the highest-rated Cheshire course found in this research (Top100GolfCourses, 5.0/6). Verified 2026-09-18.', 'live'
  ),
  (
    'sandiway-golf-club', 'Sandiway Golf Club', 'GOLF CLUB', '{}', 4, 'northwich', 'cheshire',
    53.234597, -2.574884, false, '{}', '{}',
    'Ted Ray laid the first holes out in 1920, Harry Colt rebuilt them five years later — a fast, bouncing test that''s hosted Open qualifying more than once, where precision beats power every time.',
    '{morning,afternoon}', 74, 'live', 'texture', 1,
    4, 'independent', 'No second site found. Verified 2026-09-18.', 'live'
  ),
  (
    'vale-royal-abbey-golf-club', 'Vale Royal Abbey Golf Club', 'GOLF CLUB', '{}', 4, 'northwich', 'cheshire',
    53.223435, -2.54379, false, '{}', '{}',
    'The clubhouse is a sixteenth-century abbey building standing on the site of a Cistercian house founded in the twelve-hundreds — the golf itself only arrived in 1998, on land that had been carrying real history for seven centuries first.',
    '{morning,afternoon}', 72, 'live', 'texture', 1,
    4, 'independent', 'No second site found. Verified 2026-09-18.', 'live'
  ),
  (
    'fairmont-cheshire-the-mere', 'Fairmont Cheshire, The Mere', 'GOLF CLUB', '{}', 5, 'knutsford', 'cheshire',
    53.332517, -2.405707, false, '{}', '{}',
    'James Braid had a hand in the original layout; a Dubai-backed rebuild and a Gordon Ramsay kitchen arrived in 2026. A resort now, in the way a private club used to be.',
    '{morning,afternoon,evening}', 82, 'live', 'texture', 1,
    3, 'group', 'Owned by Dubai developer Select Group (2023 acquisition), operated under the Fairmont brand — part of Accor, a large global hospitality group. Verified 2026-09-18.', 'live'
  ),
  (
    'wychwood-park-hotel-golf-club', 'Wychwood Park Hotel & Golf Club', 'GOLF CLUB', '{}', 4, 'nantwich', 'cheshire',
    53.0501, -2.393175, false, '{}', '{}',
    'European Tour Qualifying School has used this Hawtree-designed course twice over — a hotel golf resort with real tournament pedigree, not just a hotel that happens to have a course attached.',
    '{morning,afternoon}', 72, 'live', 'texture', 1,
    3, 'independent', 'Single-asset property owned by Mokan Hotels, day-to-day managed by Legacy Hotels & Resorts — one property under outside management, not a chain footprint. Verified 2026-09-18.', 'live'
  ),
  (
    'carden-park', 'Carden Park', 'GOLF CLUB', '{}', 5, 'tarporley', 'cheshire',
    53.074024, -2.807325, false, '{}', '{}',
    'Jack Nicklaus and his son Steve co-designed the championship course here — reportedly the first time father and son ever did — on a thousand-acre estate that spent fourteen years under De Vere before its owner took it fully independent again in 2014.',
    '{morning,afternoon,evening}', 82, 'live', 'texture', 1,
    4, 'independent', 'Owned outright by Steve Morgan CBE (Redrow Homes founder); ended a 14-year De Vere management contract in September 2014 to become fully independent. Verified 2026-09-18.', 'live'
  ),
  (
    'champneys-mottram-hall', 'Champneys Mottram Hall', 'GOLF CLUB', '{}', 4, 'prestbury', 'cheshire',
    53.308807, -2.17711, false, '{}', '{}',
    'A Georgian manor dating to 1721, turned into a course by Dave Thomas — the Ryder Cup player who also shaped the Brabazon at The Belfry — set in parkland that''s been a private estate since 1310.',
    '{morning,afternoon}', 76, 'live', 'texture', 1,
    3, 'small_group', 'Part of the Champneys Group (~6 UK properties: 4 spa resorts plus 2 hotels with golf). Verified 2026-09-18.', 'live'
  ),
  (
    'macdonald-portal-hotel-golf-spa', 'Macdonald Portal Hotel, Golf & Spa', 'GOLF CLUB', '{}', 4, 'tarporley', 'cheshire',
    53.166368, -2.660326, false, '{}', '{}',
    'Forty-five holes across three courses on one Tarporley estate — Championship, Premier and the original nine-hole Arderne — enough variety that a member could play a different round most weeks of the year.',
    '{morning,afternoon}', 74, 'live', 'texture', 1,
    3, 'group', 'Part of Macdonald Hotels & Resorts (35+ UK hotels, several with golf). Verified 2026-09-18.', 'live'
  ),
  (
    'the-tytherington-club', 'The Tytherington Club', 'GOLF CLUB', '{}', 4, 'prestbury', 'cheshire',
    53.279414, -2.127871, false, '{}', '{}',
    'Dave Thomas again, this time with over a hundred bunkers and eight water features worked into mature woodland — golf, spa and now padel all under one Macclesfield membership.',
    '{morning,afternoon}', 72, 'live', 'texture', 1,
    3, 'group', 'Part of The Club Company (~17 UK premium golf/health clubs). Verified 2026-09-18.', 'live'
  ),
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
  ),
  (
    'crewe-golf-club', 'Crewe Golf Club', 'GOLF CLUB', '{}', 4, 'nantwich', 'cheshire',
    53.092231, -2.385302, false, '{}', '{}',
    'Formed in 1911 on land leased from the Marquess of Crewe, a founding member whose own trophy is still played for every year — a James Braid course the club didn''t actually own outright until 1965.',
    '{morning,afternoon}', 68, 'live', 'texture', 1,
    3, 'independent', 'No second site found. Verified 2026-09-18.', 'live'
  ),
  (
    'helsby-golf-club', 'Helsby Golf Club', 'GOLF CLUB', '{}', 4, 'chester', 'cheshire',
    53.256101, -2.771746, false, '{}', '{}',
    'Started life in 1915 on top of Helsby Hill itself before James Braid drew up the present Towers Lane course in 1936 — a sandstone-outcrop pedigree most parkland clubs can''t claim.',
    '{morning,afternoon}', 70, 'live', 'texture', 1,
    4, 'independent', 'No second site found. Verified 2026-09-18.', 'live'
  ),
  (
    'knutsford-golf-club', 'Knutsford Golf Club', 'GOLF CLUB', '{}', 4, 'knutsford', 'cheshire',
    53.308214, -2.374666, false, '{}', '{}',
    'Lord Egerton laid this out as his own private course in 1891, on the highest ground of the Tatton Park estate, before opening it to the town later that same year — the deer are still visible over the boundary fence.',
    '{morning,afternoon}', 74, 'live', 'texture', 1,
    4, 'independent', 'No second site found. Verified 2026-09-18.', 'live'
  ),
  (
    'lymm-golf-club', 'Lymm Golf Club', 'GOLF CLUB', '{}', 4, 'altrincham', 'cheshire',
    53.389156, -2.484886, false, '{}', '{}',
    'Founded in 1907 by Manchester businessmen who dreamed it up on the morning train from Lymm — the same commute that built the village itself.',
    '{morning,afternoon}', 68, 'live', 'texture', 1,
    3, 'independent', 'No second site found. Note: sits in the separate Warrington unitary authority, not Cheshire East/West, but within the ceremonial county and universally described as a Cheshire club. Verified 2026-09-18.', 'live'
  ),
  (
    'macclesfield-golf-club', 'Macclesfield Golf Club', 'GOLF CLUB', '{}', 4, 'macclesfield', 'cheshire',
    53.252086, -2.113055, false, '{}', '{}',
    'The town''s third-oldest club, founded in 1889 and moved to its Hollins hillside site in 1901 — a moorland round with the whole Cheshire Plain laid out below it.',
    '{morning,afternoon}', 70, 'live', 'texture', 1,
    3, 'independent', 'No second site found. Verified 2026-09-18.', 'live'
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
