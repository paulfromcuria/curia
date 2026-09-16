# Curia Curator

The autonomous venue/district research worker. Discovers candidates, verifies
them independently, drafts copy in Curia's brand voice, runs Voice QA and a
final Gate check, then submits them for human review — it never writes to
`venues`/`districts` directly (see `src/supabase.ts`'s own header comment).
A separate promotion cron (`src/run-promotion.ts`) is the one exception,
promoting only what a human has already approved via `/admin/review`.

Both `CURATOR_ENABLED` and `CURATOR_DRY_RUN` default to leaving this inert —
see `.env.example` and `src/config.ts` for exactly what each one gates.

## Local dry run — do this before anything else

1. `cd worker && npm install`
2. `cp .env.example .env` and fill in `ANTHROPIC_API_KEY`, `SUPABASE_URL`,
   `SUPABASE_SERVICE_ROLE_KEY`. Leave `CURATOR_ENABLED=false` and
   `CURATOR_DRY_RUN=true` (the defaults).
3. Migrations `0009_distinctiveness_model.sql`, `0010_growth_engine.sql` and
   `0011_venue_closed_status.sql` (`supabase/migrations/`) must already be
   applied in Supabase Studio — the worker's writes will fail otherwise.
4. `npm run dev:discover`

This runs the full 8-stage pipeline against exactly one real district
(`DRY_RUN_DISTRICT`, default `mobberley`) and writes at most
`DRY_RUN_CANDIDATE_COUNT` (default 10) real rows into `venue_candidates` —
review them directly in Supabase Studio's table editor, or once `/admin/review`
exists (Step 5 of the growth-engine plan), there. Look specifically at:

- Are the venues real? (Verify stage should have caught anything invented.)
- Does the copy sound like Curia, not a listings site? (Voice QA's banned-word
  list is a floor, not a substitute for reading it yourself.)
- Do the Gate 1/distinctiveness calls look sound?
- Check `worker_runs` for the run's `api_cost_usd` — this is what
  `DAILY_USD_BUDGET` paces against for a real run.

Only after reviewing a real dry-run digest does `CURATOR_ENABLED=true` become
a real option — this is the go/no-go the growth-engine plan calls for
explicitly, not something to flip on a hunch.

## Railway setup

This needs **two separate Railway services** from the same repo/Dockerfile —
Railway's config-as-code (`railway.json`) describes one service's build +
deploy config, including one `cronSchedule`, so two different cron times need
two services, not two schedules in one file.

**Cron times are UTC.** "02:00 UK" and "06:00 UK" aren't fixed UTC times
year-round — the UK shifts an hour for BST roughly late March to late
October. Check whether Railway's cron scheduling supports a timezone
parameter before relying on the schedules below being exactly right in
summer; if not, the honest fix is two cron expressions swapped around the
DST boundary, not a "close enough" schedule left as-is.

### Service 1 — discovery (`curia-curator-discover`)

1. New Railway service, deploy from this repo, root directory `/worker`.
2. Railway should pick up `worker/railway.json` automatically (Dockerfile
   build, `node dist/run-discovery.js`, cron `0 2 * * *` — 02:00 UTC).
3. Set environment variables from `.env.example`: `ANTHROPIC_API_KEY`,
   `CURATOR_MODEL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
   `CURATOR_ENABLED`, `CURATOR_DRY_RUN`, `DAILY_USD_BUDGET`,
   `DAILY_CANDIDATE_TARGET`. Leave `CURATOR_ENABLED=false` until the dry-run
   go/no-go above is done.
4. Deploy. Check the first run's logs manually before trusting the cron.

### Service 2 — promotion (`curia-curator-promote`)

1. New Railway service, same repo, same root directory `/worker`, same
   Dockerfile.
2. Override the start command to `node dist/run-promotion.js` and the cron
   schedule to `0 6 * * *` (06:00 UTC) — this service needs its OWN
   `railway.json`-equivalent config; if Railway's dashboard doesn't expose a
   per-service override for a shared `railway.json`, duplicate
   `worker/railway.json` under a Railway-recognized per-service path instead
   of editing the shared one (check Railway's current docs for the exact
   mechanism — config-as-code multi-service support may have changed since
   this was written).
3. Set the same Supabase/Anthropic env vars as service 1, plus
   `GIT_DEPLOY_KEY_PATH` and `DATA_EXPORTS_BRANCH`. Generate a dedicated
   SSH deploy key scoped to just this repo (GitHub repo Settings > Deploy
   keys, with write access) — do NOT reuse a personal key. Mount it as a
   Railway secret file and point `GIT_DEPLOY_KEY_PATH` at its path.
4. Deploy.

## What each stage actually does

| Stage | File | Model call? |
|---|---|---|
| Plan | `src/pipeline/plan.ts` | No — pure selection against `markets.yaml` + live venue counts |
| Discover | `src/pipeline/discover.ts` | Yes, web search enabled |
| Verify | `src/pipeline/verify.ts` | Yes, web search enabled, independent of Discover's own find |
| Copy | `src/pipeline/copy.ts` | Yes |
| Voice QA | `src/pipeline/voice-qa.ts` | Real string match (`src/banned-words.ts`), retries Copy once on failure |
| Gate check | `src/pipeline/gate-check.ts` | Yes, independent final judgment |
| Submit | `src/pipeline/submit.ts` | No — the only stage that writes |
| Audit | `src/pipeline/audit.ts` | Yes, web search enabled, checks a rotating slice of already-live venues for closure signals |

## Known gaps, flagged rather than silently assumed fixed

- `discoverNewDistrict` (`src/pipeline/discover.ts`) doesn't collect real
  lat/lon — `run-promotion.ts` promotes a new district at `0,0` until a
  human corrects it. Don't approve a district_candidate without fixing its
  coordinates first.
- Cost tracking in `src/anthropic.ts` is a close per-token estimate, not an
  invoice-accurate figure — Anthropic's own usage dashboard is the source of
  truth if `DAILY_USD_BUDGET` pacing ever looks off.
