-- Curia — Hard Rule 1 two-gate model (2026-09-16, at explicit user request).
--
-- The original single "no chains, ever" veto was doing double duty as both
-- a quality bar and a chain-detection proxy, and it caught the wrong
-- things: a small, well-run premium group could fail it even when a Curia
-- member would be perfectly happy walking in. Replaced with two separate
-- checks (see CLAUDE.md's amended Hard rule 1 for the full reasoning):
-- Gate 1 (inclusion, still a hard, non-negotiable filter — mass-market
-- high-street brands never enter the catalogue) and Gate 2
-- (distinctiveness, a 1-5 editorial score that's a ranking discount, not
-- an exclusion — ownership research is now an input to the score rather
-- than an automatic veto).
--
-- distinctiveness defaults to 4 (a comfortably-above-average pick) rather
-- than 5, on the reasoning that every venue seeded before this migration
-- was hand-curated one at a time under the old single-veto rule, which
-- already filtered for real quality — 4, not the ceiling, leaves room for
-- an editor to actually use the 5 rating meaningfully going forward rather
-- than every existing venue defaulting to the top score. ownership
-- defaults to 'independent' since that was the old rule's implicit
-- assumption for anything that passed it. Applies to all rows in the
-- table, including the 52 Santorini venues soft-hidden behind
-- HOLIDAY_FEATURE_ENABLED (src/lib/config/features.ts) — this migration
-- doesn't filter by status, so re-enabling that flag later won't surface
-- venues with null/unscored distinctiveness.
--
-- copy_status defaults to 'live' here since every existing venue's copy is
-- already real, reviewed, and already shown to members — only new
-- candidates arriving via the future Curator worker start at 'draft' and
-- earn their way to 'live' through the review pipeline (separate,
-- not-yet-built tables — see migration 0010).
alter table venues
  add column distinctiveness smallint not null default 4 check (distinctiveness between 1 and 5),
  add column ownership text not null default 'independent'
    check (ownership in ('independent', 'small_group', 'group', 'high_street')),
  add column ownership_notes text,
  add column copy_status text not null default 'live'
    check (copy_status in ('draft', 'voice_qa_passed', 'live'));
