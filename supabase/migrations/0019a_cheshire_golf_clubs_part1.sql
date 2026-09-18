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
