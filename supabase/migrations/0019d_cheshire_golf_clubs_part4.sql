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
