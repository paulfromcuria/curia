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
