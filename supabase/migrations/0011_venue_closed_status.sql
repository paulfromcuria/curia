-- Curia — adds 'closed' to venues.status (2026-09-16, alongside the
-- growth-engine promotion cron, worker/src/run-promotion.ts).
--
-- The growth-engine plan's original spec described closure handling as an
-- `is_active` soft-delete column — checked against the real schema, that
-- column doesn't exist, and inventing a second, parallel boolean next to
-- the existing `status: 'live' | 'coming-soon'` enum (0001_init.sql) would
-- let the two disagree with each other for no reason. Extending the
-- existing enum instead keeps one status field, one source of truth.
-- Postgres has no `alter constraint`, so this drops and recreates it.
alter table venues drop constraint venues_status_check;
alter table venues add constraint venues_status_check
  check (status in ('live', 'coming-soon', 'closed'));

-- applyHardFilters (src/lib/scoring/rank-venues.ts) now excludes
-- status='closed' from ranking outright, alongside this migration — a
-- closed venue must never appear anywhere in the member app, unlike
-- 'coming-soon' which still ranks normally.
