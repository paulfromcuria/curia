-- Closes 3 of the 17 real zero-coverage onboarding tiles found via the
-- admin dashboard's tile-coverage stat (Comedy, Whisky & spirits, Beer
-- gardens) with one real, individually-verified Manchester venue each.
-- The other 3 zero-coverage tiles fixed in this same pass (Culture,
-- Clothes shopping, Nightclubs) needed no new venues — real, live venues
-- already existed, just weren't wired to their tile (a code-only fix, see
-- src/lib/scoring/tile-catalog-map.ts). Full sourcing and Gate 1/Gate 2
-- reasoning in docs/data/venues.json's own _tileCoverageGapSource note.

insert into venues (
  id, name, type, sub_preference_tags, spend_level, district_id, metro,
  lat, lon, pet_friendly, dietary_options, photos, description, bands,
  base, status, tier, source_confidence,
  distinctiveness, ownership, ownership_notes, copy_status
) values
  (
    'the-frog-and-bucket', 'The Frog and Bucket', 'COMEDY CLUB', '{}', 2, 'northern-quarter', 'manchester',
    53.484329, -2.232874, false, '{}', '{}',
    'Dave Perkin has run this from the same Oldham Street room since 1994 — new-material nights midweek, the big names still working out a new hour rather than touring the finished one.',
    '{evening}', 76, 'live', 'texture', 1,
    4, 'independent', 'Founded and still run by Dave Perkin since 1993/94; no second site found. Verified 2026-09-18.', 'live'
  ),
  (
    'the-whiskey-jar', 'The Whiskey Jar', 'WHISKY BAR', '{}', 2, 'northern-quarter', 'manchester',
    53.481435, -2.232572, false, '{}', '{}',
    'Two floors of a Grade I-listed mill on Tariff Street — Japanese and bourbon bottles upstairs, a proper sound system in the basement once the room''s warmed up.',
    '{evening}', 74, 'live', 'texture', 1,
    4, 'independent', 'No second site found. Verified 2026-09-18.', 'live'
  ),
  (
    'port-street-beer-house', 'Port Street Beer House', 'BEER GARDEN', '{}', 1, 'northern-quarter', 'manchester',
    53.48185, -2.231896, false, '{}', '{}',
    'Seven handpumps of mostly Northern beer and a garden that empties the indoor room the moment the sun''s out. No food menu — that was never really the point.',
    '{afternoon,evening}', 78, 'live', 'texture', 1,
    4, 'group', 'Opened 2011 by Jonny and Charlotte Heyes; confirmed via Companies House as part of Common & Co (MCR) Ltd, a real 6-venue independent Manchester craft-beer group (Common, Port Street Beer House, The Beagle, The Pilcrow, Indy Man Beer Con, Summer Beer Thing). Genuinely local and characterful, but a real enough footprint to warrant ''group'' rather than ''small_group''. Verified 2026-09-18.', 'live'
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
