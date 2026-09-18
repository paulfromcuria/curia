-- Real per-day opening hours, at explicit user request: a red closed
-- indicator on Map's local-zoom venue icons ("venues that are not
-- currently open... a red ring... or a red x over their icon"). Schema
-- only — no data here, since fabricating hours would be worse than not
-- having the field at all. A pilot batch of real, researched hours for
-- Wilmslow (the district this whole feature was prompted from) follows in
-- 0029_wilmslow_opening_hours.sql; every other venue stays null (unknown)
-- until researched the same way, same discipline as every other real-data
-- pass this session — see src/types/models.ts's OpeningHours doc comment
-- and src/lib/data/opening-hours.ts's isOpenAt for how null is read as
-- "unknown," never "closed."
--
-- Shape: { "monday": [{"open":"09:00","close":"17:00"}], ... } — a day key
-- absent, or present as an empty array, means closed that day. A day
-- entirely absent from the whole object (not just one day) is what null
-- on the column itself already means at the venue level, so this shape
-- only needs to distinguish "closed today" from "open these hours today,"
-- not a third "no data for this specific day" state — a venue with real
-- researched hours has all 7 days represented one way or the other.

alter table venues
  add column opening_hours jsonb null;
