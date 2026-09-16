/**
 * Env loading + feature flags. `.env.local` (gitignored) overrides `.env`
 * (checked-in example only — see .env.example), same layering as the main
 * app's scripts/seed-supabase.mjs. All secrets here are unprefixed, no
 * EXPO_PUBLIC_-style naming — this is a server-side-only service, nothing
 * here is ever bundled into client JS.
 */
import { config as loadEnv } from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.join(__dirname, '..');

loadEnv({ path: path.join(ROOT_DIR, '.env') });
loadEnv({ path: path.join(ROOT_DIR, '.env.local'), override: true });

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

function optionalEnv(name: string, fallback: string): string {
  return process.env[name] ?? fallback;
}

export const config = {
  anthropicApiKey: requireEnv('ANTHROPIC_API_KEY'),
  supabaseUrl: requireEnv('SUPABASE_URL'),
  supabaseServiceRoleKey: requireEnv('SUPABASE_SERVICE_ROLE_KEY'),

  // Off by default at every layer — CURATOR_ENABLED gates whether a
  // discovery run does anything at all (see run-discovery.ts's very first
  // check), independent of CURATOR_DRY_RUN below. Both must be considered
  // before this worker can touch a real environment.
  curatorEnabled: optionalEnv('CURATOR_ENABLED', 'false') === 'true',

  // Dry run: exercises the full 8-stage pipeline against exactly one real
  // district, writes exactly DRY_RUN_CANDIDATE_COUNT candidates, and never
  // reads/writes worker_runs' real run-count semantics in a way that would
  // pollute the digest /admin/review shows. This is what gets run locally
  // before CURATOR_ENABLED is ever seriously considered for Railway.
  dryRun: optionalEnv('CURATOR_DRY_RUN', 'true') === 'true',
  dryRunCandidateCount: Number(optionalEnv('DRY_RUN_CANDIDATE_COUNT', '10')),
  dryRunDistrict: optionalEnv('DRY_RUN_DISTRICT', 'mobberley'),

  dailyUsdBudget: Number(optionalEnv('DAILY_USD_BUDGET', '40')),
  dailyCandidateTarget: Number(optionalEnv('DAILY_CANDIDATE_TARGET', '400')),

  anthropicModel: optionalEnv('CURATOR_MODEL', 'claude-sonnet-5'),

  // Promotion cron only (run-promotion.ts) — a deploy key with push access
  // to this repo, used to commit scripts/export-db-to-json.mjs's output to
  // a data-exports branch after promoting candidates. Not required for the
  // discovery cron, so it's read lazily by run-promotion.ts itself rather
  // than validated here.
  gitDeployKeyPath: process.env.GIT_DEPLOY_KEY_PATH,
  dataExportsBranch: optionalEnv('DATA_EXPORTS_BRANCH', 'data-exports'),
};

export const BANNED_REASON_WORDS = [
  'vibrant',
  'hidden gem',
  'nestled',
  'boasts',
  'must-try',
  'foodie',
  'delicious',
  'stunning',
  'cosy',
];
