-- Adds Piccolino Grande and Cibo Gran Cafe to Wilmslow, and corrects the
-- existing Cibo row's ownership now that research for this pass found it's
-- part of a real 5-site regional group (Manchester, Hale, two Wilmslow
-- sites, Disley), not the independent single-site restaurant migration
-- 0009's blanket backfill assumed. See docs/data/venues.json's own
-- _wilmslowPiccolinoCiboSource note for full sourcing and Gate 1/Gate 2
-- reasoning on both new venues. This is a data update, not a schema
-- change — numbered to continue the existing supabase/migrations/
-- sequence, same convention as 0006/0007's own seed-data migrations.

insert into venues (
  id, name, type, sub_preference_tags, spend_level, district_id, metro,
  lat, lon, pet_friendly, dietary_options, photos, description, bands,
  base, status, tier, source_confidence,
  distinctiveness, ownership, ownership_notes, copy_status
) values
  (
    'cibo-gran-cafe', 'Cibo Gran Cafe', 'BRUNCH SPOT', '{}', 3, 'wilmslow', 'cheshire',
    53.326925, -2.231026, false, '{vegetarian,vegan,gluten-free}', '{}',
    'The grander sibling to Cibo''s Green Lane original, two minutes away in the Grove Arcade — a marble patisserie counter out front, a proper bar behind it, and a Sunday afternoon tea that runs to arancini and a tiered stand of tiramisu and mini cheesecake rather than just scones.',
    '{morning,afternoon}', 76, 'live', 'texture', 1,
    3, 'small_group', 'Sibling site to the existing Cibo (Green Lane, same district) under the real 5-site Cibo Restaurants group (Manchester, Hale, two Wilmslow sites, Disley) — verified via ciborestaurants.co.uk, 2026-09-18.', 'live'
  ),
  (
    'piccolino-grande', 'Piccolino Grande', 'ITALIAN RESTAURANT', '{}', 3, 'wilmslow', 'cheshire',
    53.327503, -2.229678, false, '{vegetarian,vegan,gluten-free}', '{}',
    'A £2m rebuild made this the most ambitious Piccolino outside London — marble, brass and a copper-clad pizza oven behind a winterised Tuscan terrace that runs straight through winter. The carbonara is finished tableside in a hollowed parmesan wheel, and the T-bone is proper Fassona Piedmontese rather than a supplier''s default cut.',
    '{afternoon,evening}', 82, 'live', 'texture', 1,
    3, 'group', 'National Piccolino chain (Individual Restaurants) — passes Gate 1 as an upscale premium-casual group, not mass-market high-street; CLAUDE.md''s own Hard rule 1 worked example ("a good Piccolino") anchors this at distinctiveness 3. Verified via piccolinorestaurants.com, confidentials.com, themanc.com, 2026-09-18.', 'live'
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

-- Correction: the existing Cibo (Green Lane) row's ownership was set to the
-- migration-0009 default ('independent') for all 244 pre-existing venues.
-- Real research for this pass found Cibo Restaurants is a genuine 5-site
-- regional group, not a single-site independent — corrected here rather
-- than left silently wrong now that it's known. distinctiveness is left at
-- its existing value deliberately (not part of this correction — a
-- separate judgment call, not implied by the ownership fix).
update venues
set
  ownership = 'small_group',
  ownership_notes = 'Real 5-site regional group (Manchester, Hale, two Wilmslow sites, Disley) — corrected from migration 0009''s blanket ''independent'' default. Verified via ciborestaurants.co.uk, 2026-09-18.'
where id = 'cibo' and district_id = 'wilmslow';
