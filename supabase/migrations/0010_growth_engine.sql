-- Curia — growth engine: autonomous curation worker schema (2026-09-16, at
-- explicit user request).
--
-- Four new tables back the "Curator" worker service (/worker, not yet
-- built as of this migration) and the /admin/review surface it feeds:
-- venue_candidates/district_candidates hold proposals awaiting a human
-- decision, worker_runs is the daily digest/audit trail, and
-- review_feedback is the learning-loop record of every approve/reject
-- decision, fed back into the worker's next Discover-stage prompt.
--
-- The worker only ever writes to these four tables — never `venues` or
-- `districts` directly. That's enforced by which credentials/queries the
-- worker's code path actually uses, not by anything in this schema, but
-- the RLS shape below still helps: like `admin_users` in 0001_init.sql,
-- all four tables are service-role-only (RLS enabled, zero policies) —
-- there is deliberately no anon/authenticated access of any kind, since
-- unreviewed candidate data and per-run cost figures have no business
-- being member-readable, and every real write path (the worker, the
-- promotion cron, /admin/review) already authenticates as service_role.
--
-- No `updated_at` trigger: this repo has no existing trigger convention
-- for that (only the one auth-signup trigger in 0001_init.sql), so
-- `updated_at` is a plain column the writing code sets explicitly on
-- every update, not a DB-side default-on-insert-only value.
--
-- Table order below matters: worker_runs is created first since both
-- candidate tables carry a worker_run_id foreign key into it.

create table worker_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  market text not null,
  districts_targeted text[] not null default '{}',
  candidates_discovered integer not null default 0,
  verified integer not null default 0,
  copy_passed integer not null default 0,
  submitted_for_review integer not null default 0,
  api_cost_usd numeric(10, 4) not null default 0,
  notes text
);
create index worker_runs_started_at_idx on worker_runs(started_at desc);

create table venue_candidates (
  id uuid primary key default gen_random_uuid(),

  -- Mirrors the live venues table's shape (see 0001_init.sql) so a
  -- promoted candidate maps onto a real venue row with no reshaping.
  name text not null,
  type text not null,
  sub_preference_tags text[] not null default '{}',
  spend_level smallint check (spend_level between 1 and 5),
  -- Not a foreign key: a candidate may target a brand-new district that
  -- only exists as a district_candidates row until promoted, so this
  -- can't be constrained to districts(id) the way venues.district_id is.
  district_id text not null,
  metro text not null,
  lat double precision,
  lon double precision,
  pet_friendly boolean not null default false,
  dietary_options text[] not null default '{none}',
  photos text[] not null default '{}',
  description text,
  bands text[] not null default '{}',
  base integer,

  -- Two-gate model (CLAUDE.md Hard rule 1, migration 0009) — "_proposed"/
  -- "_reasoning"/"_evidence" naming throughout this table distinguishes an
  -- unreviewed worker proposal from a confirmed live-venue value.
  gate1_reasoning text,
  distinctiveness_proposed smallint check (distinctiveness_proposed between 1 and 5),
  distinctiveness_reasoning text,
  ownership text check (ownership in ('independent', 'small_group', 'group', 'high_street')),
  ownership_evidence jsonb,

  -- Pipeline bookkeeping.
  status text not null default 'discovered' check (
    status in (
      'discovered', 'verified', 'copy_drafted', 'voice_qa_passed',
      'pending_review', 'approved', 'rejected', 'promoted', 'needs_new_type'
    )
  ),
  sources jsonb not null default '[]',
  coordinate_method text,
  -- Used to skip re-proposing the same real-world venue across runs —
  -- application-level dedupe key (e.g. a normalized name+district string),
  -- not database-enforced uniqueness, since two legitimately different
  -- venues could share a naive key and the worker's own dedupe logic
  -- needs the freedom to judge that, not have Postgres reject the insert.
  dedupe_key text,
  worker_run_id uuid references worker_runs(id),
  reject_reason text,
  -- An editor's rewrite of the worker's own `description`, kept separate
  -- so the original proposal stays intact for the review-feedback loop
  -- even after an editor improves the copy.
  editor_copy_override text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index venue_candidates_status_idx on venue_candidates(status);
create index venue_candidates_worker_run_idx on venue_candidates(worker_run_id);
create index venue_candidates_dedupe_key_idx on venue_candidates(dedupe_key);

create table district_candidates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  -- "region" rather than "metro": a district candidate may propose a
  -- genuinely new metro (per worker/markets.yaml's expansion list —
  -- Edinburgh, Bath, Dubai, etc.) that doesn't exist in `cities` yet, so
  -- this can't be an FK either, same reasoning as venue_candidates.district_id.
  region text not null,
  bounds jsonb,
  character text,
  rationale text,
  status text not null default 'discovered' check (
    status in ('discovered', 'verified', 'pending_review', 'approved', 'rejected', 'promoted')
  ),
  sources jsonb not null default '[]',
  worker_run_id uuid references worker_runs(id),
  reject_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index district_candidates_status_idx on district_candidates(status);

-- The learning-loop record: every /admin/review decision, fed back into
-- the worker's next Discover-stage prompt (see the worker's own plan) so
-- it stops repeating rejected patterns rather than re-learning them cold
-- each run. Deliberately outlives the candidate row it references — no FK
-- cascade-deletes it — a candidate could in principle be cleaned up later
-- without losing the decision history that trained future runs.
create table review_feedback (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null,
  candidate_table text not null check (candidate_table in ('venue_candidates', 'district_candidates')),
  decision text not null check (decision in ('approved', 'rejected')),
  reason text,
  editor_copy text,
  created_at timestamptz not null default now()
);
create index review_feedback_created_at_idx on review_feedback(created_at desc);

alter table worker_runs enable row level security;
alter table venue_candidates enable row level security;
alter table district_candidates enable row level security;
alter table review_feedback enable row level security;
-- No create policy statements on any of the four above — service-role
-- only, same idiom as admin_users in 0001_init.sql. Nothing here is ever
-- meant to be readable or writable by anon/authenticated.
