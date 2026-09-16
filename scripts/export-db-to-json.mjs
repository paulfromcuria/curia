/**
 * Exports the live Supabase `districts`/`venues` tables back into
 * docs/data/districts.json / docs/data/venues.json — the reverse of
 * scripts/seed-supabase.mjs, and the flip side of the source-of-truth
 * change the growth engine brings: once the Curator worker and the
 * promotion cron are live, Supabase becomes canonical and these JSON
 * files become a generated backup/bootstrap snapshot, not the master copy
 * (see scripts/generate-seed-sql.mjs's own updated header comment).
 *
 * Preserves every `_...`-prefixed provenance-note key already in each
 * file (and, for districts.json, the global dayMultiplier/bandMultiplier/
 * metroWholeSetLabel config and districtGroups — none of that lives
 * per-row in the DB, so it's kept from the existing file rather than
 * reconstructed) — this script only replaces the `districts`/`metros` and
 * `venues` arrays themselves. `moments`/`journeys` in venues.json are
 * untouched; they come from separate tables this script doesn't read.
 *
 * Needs the SERVICE ROLE key, same as seed-supabase.mjs — content tables'
 * RLS only grants public SELECT. Run with `node scripts/export-db-to-json.mjs`
 * after editing venues/districts via /admin/review or the promotion cron,
 * whenever you want docs/data/*.json to reflect the real current catalog
 * (e.g. before regenerating supabase/seed.sql for a fresh environment).
 */
import { createClient } from '@supabase/supabase-js';
import { config as loadEnv } from 'dotenv';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'docs', 'data');
const ROOT_DIR = path.join(__dirname, '..');

loadEnv({ path: path.join(ROOT_DIR, '.env') });
loadEnv({ path: path.join(ROOT_DIR, '.env.local'), override: true });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    'Missing config. Need EXPO_PUBLIC_SUPABASE_URL (already in .env) and ' +
      'SUPABASE_SERVICE_ROLE_KEY (add it to a new .env.local — see scripts/seed-supabase.mjs\'s own header comment).'
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function readJson(file) {
  return JSON.parse(readFileSync(path.join(DATA_DIR, file), 'utf8'));
}
function writeJson(file, data) {
  writeFileSync(path.join(DATA_DIR, file), JSON.stringify(data, null, 2) + '\n', 'utf8');
}

// Only emit a field when it differs from the migration 0009/0001 column
// default — matches this file's own established convention (`status` is
// already omitted whenever it's the default 'live'; see venues.json).
// Emitting the distinctiveness-model defaults on all ~300+ existing rows
// the first time this script runs would bloat every line for no reason.
const VENUE_DEFAULTS = { status: 'live', distinctiveness: 4, ownership: 'independent', copyStatus: 'live' };

async function fetchAll(table, columns) {
  const { data, error } = await supabase.from(table).select(columns);
  if (error) throw new Error(`${table}: ${error.message}`);
  return data;
}

async function main() {
  console.log('Fetching cities, districts, district groups, venues from Supabase...');
  const [cities, districts, districtGroups, districtGroupMembers, venues] = await Promise.all([
    fetchAll('cities', 'id, name'),
    fetchAll(
      'districts',
      'id, name, metro, lat, lon, base, kind, accent_color, editorial_description'
    ),
    fetchAll('district_groups', 'name'),
    fetchAll('district_group_members', 'group_name, district_id'),
    fetchAll(
      'venues',
      'name, type, spend_level, district_id, lat, lon, pet_friendly, dietary_options, description, bands, base, status, distinctiveness, ownership, ownership_notes, copy_status'
    ),
  ]);

  // --- districts.json ---------------------------------------------------
  const districtsFile = readJson('districts.json');
  districtsFile.metros = cities;
  districtsFile.districts = districts.map((d) => ({
    id: d.id,
    name: d.name,
    metro: d.metro,
    lat: d.lat,
    lon: d.lon,
    base: d.base,
    kind: d.kind,
    accentColor: d.accent_color,
    ...(d.editorial_description ? { editorialDescription: d.editorial_description } : {}),
  }));
  const membersByGroup = new Map();
  for (const m of districtGroupMembers) {
    if (!membersByGroup.has(m.group_name)) membersByGroup.set(m.group_name, []);
    membersByGroup.get(m.group_name).push(m.district_id);
  }
  districtsFile.districtGroups = districtGroups.map((g) => ({
    name: g.name,
    of: membersByGroup.get(g.name) ?? [],
  }));
  writeJson('districts.json', districtsFile);
  console.log(`  districts.json: ${districts.length} districts, ${cities.length} metros, ${districtGroups.length} groups`);

  // --- venues.json --------------------------------------------------------
  const venuesFile = readJson('venues.json');
  venuesFile.venues = venues.map((v) => {
    const row = {
      name: v.name,
      district: v.district_id,
      type: v.type,
      spend: '£'.repeat(v.spend_level ?? 1),
      lat: v.lat,
      lon: v.lon,
      base: v.base,
      bands: v.bands,
      reason: v.description,
      petFriendly: v.pet_friendly,
      dietaryOptions: v.dietary_options,
    };
    if (v.status && v.status !== VENUE_DEFAULTS.status) row.status = v.status;
    if (v.distinctiveness != null && v.distinctiveness !== VENUE_DEFAULTS.distinctiveness) {
      row.distinctiveness = v.distinctiveness;
    }
    if (v.ownership && v.ownership !== VENUE_DEFAULTS.ownership) row.ownership = v.ownership;
    if (v.ownership_notes) row.ownershipNotes = v.ownership_notes;
    if (v.copy_status && v.copy_status !== VENUE_DEFAULTS.copyStatus) row.copyStatus = v.copy_status;
    return row;
  });
  writeJson('venues.json', venuesFile);
  console.log(`  venues.json: ${venues.length} venues`);

  console.log('Done. Review the diff before committing — this overwrites the districts/venues arrays.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
