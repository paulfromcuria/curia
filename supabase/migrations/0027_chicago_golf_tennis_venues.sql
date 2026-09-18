-- 2 real golf/tennis venues for Chicago, at explicit user follow-up after
-- being asked directly whether the 'Play sport' tile (golf/padel/tennis)
-- actually applies there — it didn't: all 33 golf/padel/tennis venues in
-- the dataset were Manchester/Cheshire-only, so selecting it during
-- onboarding was a dead pick for the specific member Chicago was built
-- for. Researched within Chicago's own established ~2mi campus scope, not
-- the whole city. Full sourcing in docs/data/venues.json's own
-- _chicagoPlaySportVenuesSource note, including why padel is deliberately
-- NOT added here (nearest real club is ~4mi away, outside that scope).
--
-- Both venues get real GOLF CLUB / TENNIS CLUB types, already wired into
-- the 'Play sport' tile (tile-catalog-map.ts) and their own map icons —
-- no code change needed, this is pure data.

insert into venues (
  id, name, type, sub_preference_tags, spend_level, district_id, metro,
  lat, lon, pet_friendly, dietary_options, photos, description, bands,
  base, status, tier, source_confidence,
  distinctiveness, ownership, ownership_notes, copy_status
) values
  (
    'jackson-park-golf-course', 'Jackson Park Golf Course', 'GOLF CLUB', '{Golf}', 2, 'woodlawn', 'chicago',
    41.776248, -87.579595, false, '{"none"}', '{}',
    'Frederick Law Olmsted''s park, on the actual 1893 World''s Fair ground — Chicago''s first public golf course, opened in 1899, the first anywhere west of the Alleghenies. Pay-and-play at the Cecil A. Partee Clubhouse, no membership required.',
    '{morning,afternoon}', 72, 'live', 'texture', 1,
    4, 'independent', 'Chicago Park District-owned (contract-managed by Indigo Golf Partners, a multi-course operator, but the course itself has one location and no branded chain identity a member would recognize). Historic public course inside Olmsted/Burnham''s Jackson Park, first public course west of the Allegheny Mountains (1899). Pay-and-play, genuinely open to anyone. Verified 2026-09-18.', 'live'
  ),
  (
    'hyde-park-tennis-club', 'Hyde Park Tennis Club', 'TENNIS CLUB', '{}', 3, 'kenwood', 'chicago',
    41.809155, -87.593909, false, '{"none"}', '{}',
    'Five lit courts running since 1913, and a membership that''s mostly stayed for decades — no reservations, members just turn up. Chicago''s own old-money tennis club, minus the fuss about it.',
    '{morning,afternoon,evening}', 74, 'live', 'texture', 1,
    4, 'independent', 'Private membership club (est. 1913), single site. Access note: membership required, not open-door walk-in — flagged honestly, same disclosure precedent as the CAMPUS GYM venues in migration 0023. Verified 2026-09-18.', 'live'
  )
on conflict (id) do update set
  name = excluded.name, type = excluded.type, sub_preference_tags = excluded.sub_preference_tags,
  spend_level = excluded.spend_level, district_id = excluded.district_id, metro = excluded.metro,
  lat = excluded.lat, lon = excluded.lon, pet_friendly = excluded.pet_friendly,
  dietary_options = excluded.dietary_options, description = excluded.description,
  bands = excluded.bands, base = excluded.base,
  distinctiveness = excluded.distinctiveness, ownership = excluded.ownership,
  ownership_notes = excluded.ownership_notes;
