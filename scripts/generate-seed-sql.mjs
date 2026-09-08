/**
 * Generates a plain SQL file (INSERT ... ON CONFLICT DO UPDATE, so it's safe
 * to re-run) from docs/data/*.json, matching supabase/migrations/0001_init.sql
 * exactly — the paste-into-SQL-Editor equivalent of scripts/seed-supabase.mjs,
 * for whoever'd rather not touch a terminal/service-role-key at all.
 *
 * Run by Claude, not the end user: `node scripts/generate-seed-sql.mjs`
 * writes supabase/seed.sql, which then gets handed to the user as a file to
 * paste into Supabase's SQL Editor — the same motion as the migration.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'docs', 'data');
const OUT_FILE = path.join(__dirname, '..', 'supabase', 'seed.sql');

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

// --- SQL literal helpers ---------------------------------------------------

function sqlStr(v) {
  if (v === null || v === undefined) return 'null';
  return `'${String(v).replace(/'/g, "''")}'`;
}
function sqlNum(v) {
  if (v === null || v === undefined) return 'null';
  return String(v);
}
function sqlBool(v) {
  return v ? 'true' : 'false';
}
function sqlTextArray(arr) {
  if (!arr || arr.length === 0) return "'{}'";
  return `ARRAY[${arr.map(sqlStr).join(', ')}]::text[]`;
}
function sqlIntArray(arr) {
  if (!arr || arr.length === 0) return "'{}'";
  return `ARRAY[${arr.map(sqlNum).join(', ')}]::smallint[]`;
}
function sqlJsonb(obj) {
  if (obj === null || obj === undefined) return 'null';
  return `'${JSON.stringify(obj).replace(/'/g, "''")}'::jsonb`;
}

function insertStatement(table, columns, rows, conflictCols) {
  if (rows.length === 0) return `-- ${table}: nothing to insert\n`;
  const values = rows.map((row) => `  (${columns.map((c) => row[c]).join(', ')})`).join(',\n');
  const updates = columns
    .filter((c) => !conflictCols.includes(c))
    .map((c) => `${c} = excluded.${c}`)
    .join(', ');
  const onConflict = updates
    ? `on conflict (${conflictCols.join(', ')}) do update set ${updates}`
    : `on conflict (${conflictCols.join(', ')}) do nothing`;
  return `insert into ${table} (${columns.join(', ')})\nvalues\n${values}\n${onConflict};\n`;
}

// --- Build ------------------------------------------------------------------

const districtsRaw = readJson('districts.json');
const venuesRaw = readJson('venues.json');
const tilesRaw = readJson('tiles.json');
const destinationsRaw = readJson('destinations.json');

let sql = `-- Auto-generated from docs/data/*.json by scripts/generate-seed-sql.mjs.
-- Paste this whole file into Supabase's SQL Editor and Run, the same way you
-- ran supabase/migrations/0001_init.sql. Safe to re-run any time the source
-- JSON changes (every statement is an upsert).

`;

// cities
sql += insertStatement(
  'cities',
  ['id', 'name'],
  districtsRaw.metros.map((m) => ({ id: sqlStr(m.id), name: sqlStr(m.name) })),
  ['id']
);
sql += '\n';

// districts
sql += insertStatement(
  'districts',
  ['id', 'name', 'metro', 'lat', 'lon', 'base', 'kind', 'accent_color', 'editorial_description', 'day_multiplier', 'band_multiplier'],
  districtsRaw.districts.map((d) => ({
    id: sqlStr(d.id),
    name: sqlStr(d.name),
    metro: sqlStr(d.metro),
    lat: sqlNum(d.lat),
    lon: sqlNum(d.lon),
    base: sqlNum(d.base),
    kind: sqlStr(d.kind),
    accent_color: sqlStr(d.accentColor),
    editorial_description: sqlStr(d.editorialDescription),
    day_multiplier: sqlJsonb(districtsRaw.dayMultiplier),
    band_multiplier: sqlJsonb(d.bandMultiplier ?? districtsRaw.bandMultiplier[d.kind]),
  })),
  ['id']
);
sql += '\n';

// district_groups + members
sql += insertStatement(
  'district_groups',
  ['name'],
  districtsRaw.districtGroups.map((g) => ({ name: sqlStr(g.name) })),
  ['name']
);
sql += '\n';
const groupMembers = districtsRaw.districtGroups.flatMap((g) =>
  g.of.map((districtId) => ({ group_name: sqlStr(g.name), district_id: sqlStr(districtId) }))
);
sql += insertStatement('district_group_members', ['group_name', 'district_id'], groupMembers, [
  'group_name',
  'district_id',
]);
sql += '\n';

// tiles
const tileRows = [];
for (const category of ['Do', 'Drink', 'Eat']) {
  for (const t of tilesRaw.categories[category]) {
    tileRows.push({
      id: sqlStr(`${category}|${t.name}`),
      category: sqlStr(category),
      name: sqlStr(t.name),
      sub_preferences: sqlTextArray(t.subPreferences),
    });
  }
}
sql += insertStatement('tiles', ['id', 'category', 'name', 'sub_preferences'], tileRows, ['id']);
sql += '\n';

// venues
const districtById = new Map(districtsRaw.districts.map((d) => [d.id, d]));
const venueIdByName = new Map();
const venueRowsRaw = venuesRaw.venues.map((v, i) => {
  const id = slugify(v.name);
  venueIdByName.set(v.name, id);
  return {
    id,
    name: v.name,
    type: v.type,
    spend_level: v.spend.length,
    district_id: v.district,
    metro: districtById.get(v.district)?.metro ?? 'manchester',
    lat: v.lat,
    lon: v.lon,
    pet_friendly: v.petFriendly ?? false,
    dietary_options: v.dietaryOptions ?? ['none'],
    description: v.reason,
    bands: v.bands,
    base: v.base,
    status: v.status ?? 'live',
    tier: i < 8 ? 'signature' : 'texture',
  };
});
sql += insertStatement(
  'venues',
  [
    'id', 'name', 'type', 'sub_preference_tags', 'spend_level', 'district_id', 'metro',
    'lat', 'lon', 'pet_friendly', 'dietary_options', 'photos', 'description', 'bands',
    'base', 'status', 'tier', 'source_confidence',
  ],
  venueRowsRaw.map((v) => ({
    id: sqlStr(v.id),
    name: sqlStr(v.name),
    type: sqlStr(v.type),
    sub_preference_tags: sqlTextArray([]),
    spend_level: sqlNum(v.spend_level),
    district_id: sqlStr(v.district_id),
    metro: sqlStr(v.metro),
    lat: sqlNum(v.lat),
    lon: sqlNum(v.lon),
    pet_friendly: sqlBool(v.pet_friendly),
    dietary_options: sqlTextArray(v.dietary_options),
    photos: sqlTextArray([]),
    description: sqlStr(v.description),
    bands: sqlTextArray(v.bands),
    base: sqlNum(v.base),
    status: sqlStr(v.status),
    tier: sqlStr(v.tier),
    source_confidence: '1',
  })),
  ['id']
);
sql += '\n';

// moments
sql += insertStatement(
  'moments',
  ['id', 'title', 'curator', 'blurb'],
  venuesRaw.moments.map((m) => ({
    id: sqlStr(MOMENT_TYPE_BY_TITLE[m.title]),
    title: sqlStr(m.title),
    curator: sqlStr(m.curator),
    blurb: sqlStr(m.blurb),
  })),
  ['id']
);
sql += '\n';

const momentVenueRows = venuesRaw.moments.flatMap((m) =>
  m.picks
    .map((venueName, position) => ({ name: venueName, id: venueIdByName.get(venueName), position }))
    .filter((r) => r.id)
    .map((r) => ({
      moment_id: sqlStr(MOMENT_TYPE_BY_TITLE[m.title]),
      venue_id: sqlStr(r.id),
      position: sqlNum(r.position),
    }))
);
sql += insertStatement('moment_venues', ['moment_id', 'venue_id', 'position'], momentVenueRows, [
  'moment_id',
  'venue_id',
]);
sql += '\n';

// journeys
sql += insertStatement(
  'journeys',
  ['id', 'moment_id', 'title', 'blurb', 'meta'],
  venuesRaw.journeys.map((j) => ({
    id: sqlStr(slugify(j.title)),
    moment_id: sqlStr(j.moment),
    title: sqlStr(j.title),
    blurb: sqlStr(j.blurb),
    meta: sqlStr(j.meta),
  })),
  ['id']
);
sql += '\n';

const journeyStopRows = venuesRaw.journeys.flatMap((j) =>
  j.stops
    .map((s, i) => ({ id: venueIdByName.get(s.venue), order: i, walk: s.walkToNextMinutes }))
    .filter((r) => r.id)
    .map((r) => ({
      journey_id: sqlStr(slugify(j.title)),
      venue_id: sqlStr(r.id),
      stop_order: sqlNum(r.order),
      walk_time_to_next_minutes: sqlNum(r.walk),
    }))
);
sql += insertStatement(
  'journey_stops',
  ['journey_id', 'venue_id', 'stop_order', 'walk_time_to_next_minutes'],
  journeyStopRows,
  ['journey_id', 'stop_order']
);
sql += '\n';

// destinations
sql += insertStatement(
  'destinations',
  ['id', 'name', 'region', 'lat', 'lon', 'best_months', 'best_season_label', 'tile_ids', 'curator', 'editorial_description'],
  destinationsRaw.destinations.map((d) => ({
    id: sqlStr(d.id),
    name: sqlStr(d.name),
    region: sqlStr(d.region),
    lat: sqlNum(d.lat),
    lon: sqlNum(d.lon),
    best_months: sqlIntArray(d.bestMonths),
    best_season_label: sqlStr(d.bestSeasonLabel),
    tile_ids: sqlTextArray(d.tileIds),
    curator: sqlStr(d.curator),
    editorial_description: sqlStr(d.editorialDescription),
  })),
  ['id']
);

writeFileSync(OUT_FILE, sql);
console.log(`Wrote ${OUT_FILE} (${(sql.length / 1024).toFixed(0)} KB)`);
console.log(`Rows: ${venueRowsRaw.length} venues, ${districtsRaw.districts.length} districts, ${tileRows.length} tiles, ${venuesRaw.moments.length} moments, ${venuesRaw.journeys.length} journeys, ${destinationsRaw.destinations.length} destinations`);
