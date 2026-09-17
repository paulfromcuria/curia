-- A tiny key/value store for admin-set targets on the new dashboard KPI
-- section (2026-09-18, at explicit user request: "some metrics tracking
-- development progress and database depth etc with some targets").
--
-- Deliberately NOT seeded with any starting values here — a member-growth
-- or venue-count target is a real business decision, not something to
-- invent on the app's behalf. Starts empty; the dashboard shows "Set a
-- target" until the user fills one in, per-metric, from the UI itself.
--
-- Direct RLS, not a SECURITY DEFINER RPC like the member-activity
-- functions (0017_member_activity.sql): this table holds no user PII and
-- no auth.users join is needed, so a plain admin_users-gated policy is
-- enough — same idiom migration 0012 already used for the growth-engine
-- tables' review access.

create table admin_targets (
  key text primary key,
  target_value numeric not null,
  updated_at timestamptz not null default now()
);

alter table admin_targets enable row level security;

create policy "admins can read targets" on admin_targets
  for select using (exists (select 1 from admin_users a where a.id = auth.uid()));

create policy "admins can write targets" on admin_targets
  for all using (exists (select 1 from admin_users a where a.id = auth.uid()))
  with check (exists (select 1 from admin_users a where a.id = auth.uid()));
