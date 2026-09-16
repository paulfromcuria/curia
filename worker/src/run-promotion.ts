/**
 * Entrypoint for the 06:00 UK promotion cron (a SECOND Railway service —
 * see the README's Railway setup section for why this needs its own
 * service rather than a second cronSchedule in the same railway.json).
 *
 * Promotes human-approved candidates into the real content tables — the
 * only place in this entire worker that touches `venues`/`districts`
 * directly, via its own separate client (promotionClient below), never
 * supabase.ts's client (which is deliberately scoped to the four
 * growth-engine tables only — see that file's own header comment).
 *
 * Then clones the main repo fresh with a deploy key, runs
 * scripts/export-db-to-json.mjs against the now-updated database, and
 * commits the result to DATA_EXPORTS_BRANCH — this runs against a real
 * git checkout rather than trying to bundle the monorepo into this
 * worker's own Docker image (see Dockerfile's own comment on why its
 * build context is deliberately just /worker).
 */
import { createClient } from '@supabase/supabase-js';
import { execFile } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { config } from './config.js';

const exec = promisify(execFile);

function promotionClient() {
  // Separate client instance from supabase.ts on purpose — this file is
  // the one narrow exception allowed to touch venues/districts, and
  // keeping that in its own client makes the exception visible at the
  // file/import boundary rather than buried in a shared module.
  return createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

const REPO_URL = 'https://github.com/paulfromcuria/curia.git';

async function promoteApprovedVenues(): Promise<number> {
  const supabase = promotionClient();

  const { data: approved, error } = await supabase
    .from('venue_candidates')
    .select('*')
    .eq('status', 'approved');
  if (error) throw new Error(`promoteApprovedVenues (fetch): ${error.message}`);
  if (!approved || approved.length === 0) return 0;

  let promoted = 0;
  for (const c of approved) {
    // A CLOSURE? flag (Audit stage, worker/src/pipeline/audit.ts) approved
    // by a reviewer means "yes, this existing venue really has closed" —
    // handled as a status update on the real row, not a new venue insert.
    // Uses the `status` enum's new 'closed' value (migration 0011) rather
    // than a separate is_active column, matching the existing
    // 'live'/'coming-soon' pattern instead of introducing a parallel one.
    if (c.reject_reason?.startsWith('CLOSURE?')) {
      const { error: closeError } = await supabase
        .from('venues')
        .update({ status: 'closed' })
        .eq('name', c.name)
        .eq('district_id', c.district_id);
      if (closeError) throw new Error(`close venue "${c.name}": ${closeError.message}`);
      await supabase.from('venue_candidates').update({ status: 'promoted' }).eq('id', c.id);
      promoted += 1;
      continue;
    }

    const slug = c.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const { error: insertError } = await supabase.from('venues').upsert(
      {
        id: slug,
        name: c.name,
        type: c.type,
        sub_preference_tags: c.sub_preference_tags ?? [],
        spend_level: c.spend_level,
        district_id: c.district_id,
        metro: c.metro,
        lat: c.lat,
        lon: c.lon,
        pet_friendly: c.pet_friendly,
        dietary_options: c.dietary_options ?? ['none'],
        photos: [],
        description: c.editor_copy_override ?? c.description,
        bands: c.bands ?? [],
        base: c.base ?? 60,
        status: 'live',
        distinctiveness: c.distinctiveness_proposed ?? 4,
        ownership: c.ownership ?? 'independent',
        ownership_notes: c.ownership_evidence ? JSON.stringify(c.ownership_evidence) : null,
        copy_status: 'live',
        tier: 'texture',
        source_confidence: 1,
      },
      { onConflict: 'id' }
    );
    if (insertError) throw new Error(`promote venue "${c.name}": ${insertError.message}`);

    await supabase.from('venue_candidates').update({ status: 'promoted' }).eq('id', c.id);
    promoted += 1;
  }
  return promoted;
}

async function promoteApprovedDistricts(): Promise<number> {
  const supabase = promotionClient();

  const { data: approved, error } = await supabase
    .from('district_candidates')
    .select('*')
    .eq('status', 'approved');
  if (error) throw new Error(`promoteApprovedDistricts (fetch): ${error.message}`);
  if (!approved || approved.length === 0) return 0;

  let promoted = 0;
  for (const d of approved) {
    const slug = d.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    // lat/lon aren't collected by discoverNewDistrict (src/pipeline/
    // discover.ts) today — a real gap, flagged rather than guessed: this
    // promotion inserts 0/0 and a reviewer must correct it via
    // /admin/review or a direct SQL update before the district is
    // genuinely usable (a 0,0 coordinate would break every distance
    // calculation for venues seeded under it).
    const { error: insertError } = await supabase.from('districts').upsert(
      {
        id: slug,
        name: d.name,
        metro: d.region,
        lat: 0,
        lon: 0,
        base: 50,
        kind: 'city',
        accent_color: '#8B8175',
        editorial_description: d.character ?? null,
      },
      { onConflict: 'id' }
    );
    if (insertError) throw new Error(`promote district "${d.name}": ${insertError.message}`);

    await supabase.from('district_candidates').update({ status: 'promoted' }).eq('id', d.id);
    promoted += 1;
  }
  return promoted;
}

async function exportAndCommit(): Promise<void> {
  if (!config.gitDeployKeyPath) {
    console.log('[export] GIT_DEPLOY_KEY_PATH not set — skipping export/commit step.');
    return;
  }

  const workDir = await mkdtemp(path.join(tmpdir(), 'curia-export-'));
  const gitEnv = {
    ...process.env,
    GIT_SSH_COMMAND: `ssh -i ${config.gitDeployKeyPath} -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new`,
  };

  try {
    await exec('git', ['clone', '--depth', '1', REPO_URL, workDir], { env: gitEnv });
    await exec('npm', ['install'], { cwd: workDir });
    await exec('node', ['scripts/export-db-to-json.mjs'], {
      cwd: workDir,
      env: { ...gitEnv, SUPABASE_URL: config.supabaseUrl, SUPABASE_SERVICE_ROLE_KEY: config.supabaseServiceRoleKey },
    });

    const { stdout: statusOut } = await exec('git', ['status', '--porcelain'], { cwd: workDir });
    if (!statusOut.trim()) {
      console.log('[export] No changes after export — nothing to commit.');
      return;
    }

    await exec('git', ['checkout', '-B', config.dataExportsBranch], { cwd: workDir });
    await exec('git', ['add', 'docs/data/districts.json', 'docs/data/venues.json'], { cwd: workDir });
    await exec(
      'git',
      ['commit', '-m', `Export promoted candidates (${new Date().toISOString().slice(0, 10)})`],
      { cwd: workDir }
    );
    await exec('git', ['push', '--force', 'origin', config.dataExportsBranch], { cwd: workDir, env: gitEnv });
    console.log(`[export] Pushed to ${config.dataExportsBranch}.`);
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}

async function main() {
  if (!config.curatorEnabled) {
    console.log('CURATOR_ENABLED=false — promotion cron does nothing. Set it to true to enable.');
    return;
  }

  const venuesPromoted = await promoteApprovedVenues();
  const districtsPromoted = await promoteApprovedDistricts();
  console.log(`[Promote] venues=${venuesPromoted} districts=${districtsPromoted}`);

  await exportAndCommit();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
