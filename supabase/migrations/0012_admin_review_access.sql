-- Curia — admin_users read/write access to the growth-engine tables
-- (2026-09-16, for /admin/review, src/app/admin/review.tsx).
--
-- Migration 0010 made venue_candidates/district_candidates/worker_runs/
-- review_feedback service-role-only (RLS enabled, zero policies) — correct
-- for the Curator worker itself, but it quietly assumed /admin/review would
-- have some server-side place to hold a service-role key. Checked against
-- the real app: this is a static SPA (`expo export --platform web`,
-- deployed to Vercel as static files — see package.json's build:web/
-- deploy:web scripts), with no API routes or serverless functions
-- anywhere in this repo. /admin/review runs entirely in the browser, using
-- src/lib/data/supabase-admin-client.ts's anon-key client, same as every
-- other admin screen — there is no server-side place to keep a
-- service-role key for it to call through.
--
-- Resolved the same way admin_users itself already solves this exact
-- problem (see migration 0004_admin_access.sql's own header comment): a
-- narrow RLS policy that checks `exists (select 1 from admin_users where
-- id = auth.uid())` before granting access, not a service-role secret in
-- client code. This is a real, deliberate narrowing of 0010's original
-- "nothing here is ever readable or writable by anon/authenticated" — an
-- admin_users member now can, which is the whole point of /admin/review
-- existing. The Curator worker's own access is unaffected (it still uses
-- SUPABASE_SERVICE_ROLE_KEY, which bypasses RLS entirely).

create policy "admins manage venue candidates" on venue_candidates
  for all
  using (exists (select 1 from admin_users a where a.id = auth.uid()))
  with check (exists (select 1 from admin_users a where a.id = auth.uid()));

create policy "admins manage district candidates" on district_candidates
  for all
  using (exists (select 1 from admin_users a where a.id = auth.uid()))
  with check (exists (select 1 from admin_users a where a.id = auth.uid()));

create policy "admins manage review feedback" on review_feedback
  for all
  using (exists (select 1 from admin_users a where a.id = auth.uid()))
  with check (exists (select 1 from admin_users a where a.id = auth.uid()));

-- Read-only: /admin/review's header shows yesterday's digest, never edits
-- a worker_runs row directly — only the worker itself (service role)
-- writes these.
create policy "admins read worker runs" on worker_runs
  for select
  using (exists (select 1 from admin_users a where a.id = auth.uid()));
