/**
 * One-time (safe to re-run) import of docs/data/*.json into a real Supabase
 * project, matching supabase/migrations/0001_init.sql. Run this AFTER
 * applying that migration (via the Supabase SQL editor or `supabase db
 * push`), and after `npm install` has pulled in @supabase/supabase-js.
 *
 * Needs the SERVICE ROLE key (not the anon key) — content tables' RLS
 * policies only grant public SELECT, so an anon-key client can't write to
 * them. The service key bypasses RLS entirely, so:
 *   - never commit it, never paste it into chat
 *   - put ONE line in a new .env.local (already git-ignored, sits next to
 *     the existing .env): SUPABASE_SERVICE_ROLE_KEY=<paste it here>
 *   - run this script yourself, locally: `npm run db:seed`
 * .env.local is loaded automatically (see the dotenv calls below) — no
 * shell-specific export step needed on any platform. The project URL is
 * read from EXPO_PUBLIC_SUPABASE_URL, already set in .env, so .env.local
 * only needs that one new line.
 *
 * Uses `upsert` throughout, so re-running after editing docs/data/*.json is
 * exactly how you push data updates to the real database — same "edit the
 * JSON, commit, push" workflow the app already uses, just also mirrored
 * into Supabase.
 */
import { createClient } from '@supabase/supabase-js';
import { config as loadEnv } from 'dotenv';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'docs', 'data');
const ROOT_DIR = path.join(__dirname, '..');

// .env.local overrides/extends .env — service key lives only in the former.
loadEnv({ path: path.join(ROOT_DIR, '.env') });
loadEnv({ path: path.join(ROOT_DIR, '.env.local'), override: true });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    'Missing config. Need EXPO_PUBLIC_SUPABASE_URL (already in .env) and ' +
      'SUPABASE_SERVICE_ROLE_KEY (add it to a new .env.local — see this file\'s own header comment).'
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function readJson(file) {
  return JSON.parse(readFileSync(path.join(DATA_DIR, file), 'utf8'));
}

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

const MOMENT_TYPE_BY_TITLE = {
  'Best for Date Night': 'date-night',
  'Entertaining a Client': 'entertaining-a-client',
  'Big Group of Friends': 'big-group-of-friends',
  'Solo Reset': 'solo-reset',
};

async function upsert(table, rows, conflictCols = 'id') {
  if (rows.length === 0) return;
  const { error } = await supabase.from(table).upsert(rows, { onConflict: conflictCols });
  if (error) throw new Error(`${table}: ${error.message}`);
  console.log(`  ${table}: ${rows.length} rows`);
}

async function main() {
  const districtsRaw = readJson('districts.json');
  const venuesRaw = readJson('venues.json');
  const tilesRaw = readJson('tiles.json');
  const destinationsRaw = readJson('destinations.json');

  console.log('Seeding cities...');
  await upsert(
    'cities',
    districtsRaw.metros.map((m) => ({ id: m.id, name: m.name }))
  );

  console.log('Seeding districts...');
  await upsert(
    'districts',
    districtsRaw.districts.map((d) => ({
      id: d.id,
      name: d.name,
      metro: d.metro,
      lat: d.lat,
      lon: d.lon,
      base: d.base,
      kind: d.kind,
      accent_color: d.accentColor,
      editorial_description: d.editorialDescription ?? null,
      day_multiplier: districtsRaw.dayMultiplier,
      band_multiplier: d.bandMultiplier ?? districtsRaw.bandMultiplier[d.kind],
    }))
  );

  console.log('Seeding district groups...');
  await upsert(
    'district_groups',
    districtsRaw.districtGroups.map((g) => ({ name: g.name })),
    'name'
  );
  const groupMembers = districtsRaw.districtGroups.flatMap((g) =>
    g.of.map((districtId) => ({ group_name: g.name, district_id: districtId }))
  );
  await upsert('district_group_members', groupMembers, 'group_name,district_id');

  console.log('Seeding tiles...');
  const tileRows = [];
  for (const category of ['Do', 'Drink', 'Eat']) {
    for (const t of tilesRaw.categories[category]) {
      tileRows.push({
        id: `${category}|${t.name}`,
        category,
        name: t.name,
        sub_preferences: t.subPreferences,
      });
    }
  }
  await upsert('tiles', tileRows);

  console.log('Seeding venues...');
  const districtById = new Map(districtsRaw.districts.map((d) => [d.id, d]));
  const venueIdByName = new Map();
  const venueRows = venuesRaw.venues.map((v) => {
    const id = slugify(v.name);
    venueIdByName.set(v.name, id);
    return {
      id,
      name: v.name,
      type: v.type,
      sub_preference_tags: [],
      spend_level: v.spend.length,
      district_id: v.district,
      metro: districtById.get(v.district)?.metro ?? 'manchester',
      lat: v.lat,
      lon: v.lon,
      pet_friendly: v.petFriendly ?? false,
      dietary_options: v.dietaryOptions ?? ['none'],
      photos: [],
      description: v.reason,
      bands: v.bands,
      base: v.base,
      status: v.status ?? 'live',
      tier: 'texture',
      source_confidence: 1,
    };
  });
  // First 8 venues in the seed file are the prototype's own "signature" set —
  // mirrors src/lib/data/seed.ts's `i < 8 ? 'signature' : 'texture'` rule.
  venueRows.slice(0, 8).forEach((r) => (r.tier = 'signature'));
  await upsert('venues', venueRows);

  console.log('Seeding moments...');
  const momentRows = venuesRaw.moments.map((m) => ({
    id: MOMENT_TYPE_BY_TITLE[m.title],
    title: m.title,
    curator: m.curator,
    blurb: m.blurb,
  }));
  await upsert('moments', momentRows);

  const momentVenueRows = venuesRaw.moments.flatMap((m) =>
    m.picks.map((venueName, position) => ({
      moment_id: MOMENT_TYPE_BY_TITLE[m.title],
      venue_id: venueIdByName.get(venueName),
      position,
    }))
  );
  const missingMomentVenues = momentVenueRows.filter((r) => !r.venue_id);
  if (missingMomentVenues.length) {
    console.warn('  WARNING: moment picks referencing unknown venues:', missingMomentVenues);
  }
  await upsert(
    'moment_venues',
    momentVenueRows.filter((r) => r.venue_id),
    'moment_id,venue_id'
  );

  console.log('Seeding journeys...');
  const journeyRows = venuesRaw.journeys.map((j) => ({
    id: slugify(j.title),
    moment_id: j.moment,
    title: j.title,
    blurb: j.blurb ?? null,
    meta: j.meta ?? null,
  }));
  await upsert('journeys', journeyRows);

  const journeyStopRows = venuesRaw.journeys.flatMap((j) =>
    j.stops.map((s, i) => ({
      journey_id: slugify(j.title),
      venue_id: venueIdByName.get(s.venue),
      stop_order: i,
      walk_time_to_next_minutes: s.walkToNextMinutes ?? null,
    }))
  );
  const missingJourneyVenues = journeyStopRows.filter((r) => !r.venue_id);
  if (missingJourneyVenues.length) {
    console.warn('  WARNING: journey stops referencing unknown venues:', missingJourneyVenues);
  }
  await upsert(
    'journey_stops',
    journeyStopRows.filter((r) => r.venue_id),
    'journey_id,stop_order'
  );

  console.log('Seeding destinations...');
  await upsert(
    'destinations',
    destinationsRaw.destinations.map((d) => ({
      id: d.id,
      name: d.name,
      region: d.region,
      lat: d.lat,
      lon: d.lon,
      best_months: d.bestMonths,
      best_season_label: d.bestSeasonLabel,
      tile_ids: d.tileIds,
      curator: d.curator,
      editorial_description: d.editorialDescription,
    }))
  );

  console.log('\nDone.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
