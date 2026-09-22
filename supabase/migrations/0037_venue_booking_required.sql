-- Direct follow-up to 0036 (occasional-schedule fix) — user asked "do we
-- have other venues similar to that." Checked every venue type in the
-- catalog, not just the one reported case. Found one real, different-but-
-- related problem: White Peak Alpaca Farm's own curated copy says
-- "pre-booked walks only" outright. Different mechanism from `occasional`
-- (this venue likely does run a normal weekly schedule — the problem is a
-- member showing up unannounced simply cannot get in, not that there's no
-- predictable schedule at all), but the same real harm: recommended as a
-- confident "go now" match when it structurally isn't one.
--
-- `booking_required` defaults false for every existing row (no behavior
-- change) — only ever set true on explicit evidence in the venue's own
-- copy, never inferred from venue type (a farm experience or a cookery
-- class isn't assumed booking-only just because that's plausible).
--
-- Checked the rest of the catalog for the same explicit-evidence bar:
-- Greek Cooking Class and Lunch with Areti (Oia) and Wilmslow Kitchen
-- (cookery school) both plausibly require booking but neither's copy
-- states it outright the way White Peak Alpaca Farm's does — left
-- unflagged rather than guessed. Wilmslow History Tours ("departs the
-- library at eleven") is a separate open question about whether that's a
-- daily or day-specific tour — genuinely unclear from the copy, flagged to
-- the user as needing real research, not marked either way here.

alter table venues
  add column booking_required boolean not null default false;

update venues set booking_required = true where id = 'white-peak-alpaca-farm';
