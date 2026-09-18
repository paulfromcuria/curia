-- Real, researched opening hours for 8 Wilmslow venues — the pilot batch
-- for the closed-now map indicator (0028_venue_opening_hours_schema.sql),
-- at explicit user request. Wilmslow chosen deliberately: it's the
-- district every screenshot and test session this feature was built
-- around has actually been in, including Rex Cinema, the venue that
-- prompted the "why this works right now" feature a few commits ago.
--
-- Researched via WebSearch against each venue's own website first,
-- third-party listings only as a cross-check — same discipline as every
-- other real-data pass this session. All 24 Wilmslow venues were
-- researched; only these 8 made it in, on purpose: a wrong "closed" badge
-- on a venue that's actually open is worse than no badge at all, so
-- anything short of confident, source-backed, standard weekly hours was
-- left out rather than approximated. Specifically NOT included in this
-- pass (real reasons, not an oversight):
--   - Cibo / Cibo Gran Cafe: mostly solid, but Cibo's Sunday close time
--     conflicts across sources (21:00 vs 23:00/23:30) — held back for a
--     second-source check rather than guessing.
--   - Heddy's, Caramello, Vietbowl, The Mucky Pup: real hours found, but
--     only via third-party aggregators (none of these venues' own sites
--     publish hours) — plausible but not confidently current.
--   - Symposium: its own website states Friday/Saturday only, but other
--     sources imply more nights are sometimes open (event-dependent) —
--     genuinely conflicting, not just imprecise.
--   - Ricardo Van Parmar Gallery: the venue's own site is a non-functional
--     placeholder; the only hours found were a single third-party listing.
--   - Rex Cinema, Wilmslow Kitchen, Wilmslow RUFC, Wilmslow Pilates &
--     Wellness, Wilmslow History Tours: don't have standard daily "open"
--     hours at all (showtime/class/event-scheduled or members-only) — the
--     concept doesn't apply, not a data gap.
--   - Wilmslow Artisan Market: real hours found, but monthly (third
--     Saturday only), not a weekly cadence — forcing it into the
--     Mon-Sun-per-week shape below would make it read as "closed" 29-30
--     days out of every month, which is technically true but needs
--     different UI treatment than this migration's shape supports.
--   - Green Room Theatre: real hours found (Saturday box office,
--     production-night bar), but production-dependent, not standard daily
--     hours.
--   - The Carrs: a real, unfenced riverside park with no evidence of
--     gates or a closing time anywhere findable (Cheshire East's own page
--     for it is dead) — better treated as always-open than assigned an
--     invented dawn/dusk figure.
-- Every one of the 16 excluded venues stays null (unknown, never shown as
-- closed) until a stronger source turns up — this is a real, ongoing
-- effort, not a one-time backfill, see OpeningHours' own doc comment
-- (src/types/models.ts).
--
-- Where a venue's site quoted a bar vs. kitchen split (Suburban Green,
-- Piccolino Grande), the wider bar hours are used here — a member
-- checking "is this place open" cares about the room being open, not
-- specifically the kitchen. Where a source used an imprecise "'til late"
-- (The Wine Cellar, Fri/Sat), 23:00 is used as a stated, documented
-- approximation, not a guess.

update venues set opening_hours = '{
  "monday": [], "tuesday": [],
  "wednesday": [{"open":"15:00","close":"22:00"}],
  "thursday": [{"open":"15:00","close":"23:00"}],
  "friday": [{"open":"12:00","close":"23:00"}],
  "saturday": [{"open":"12:00","close":"23:00"}],
  "sunday": [{"open":"12:00","close":"21:00"}]
}'::jsonb where id = 'the-wine-cellar';

update venues set opening_hours = '{
  "monday": [],
  "tuesday": [{"open":"12:00","close":"22:00"}],
  "wednesday": [{"open":"12:00","close":"22:00"}],
  "thursday": [{"open":"12:00","close":"22:00"}],
  "friday": [{"open":"12:00","close":"22:00"}],
  "saturday": [{"open":"12:00","close":"22:00"}],
  "sunday": [{"open":"12:00","close":"21:00"}]
}'::jsonb where id = 'the-stolen-lamb';

update venues set opening_hours = '{
  "monday": [],
  "tuesday": [{"open":"09:30","close":"23:00"}],
  "wednesday": [{"open":"09:30","close":"23:00"}],
  "thursday": [{"open":"09:30","close":"23:00"}],
  "friday": [{"open":"09:30","close":"00:00"}],
  "saturday": [{"open":"09:30","close":"00:00"}],
  "sunday": [{"open":"09:30","close":"22:30"}]
}'::jsonb where id = 'suburban-green';

update venues set opening_hours = '{
  "monday": [{"open":"08:00","close":"22:00"}],
  "tuesday": [{"open":"08:00","close":"22:00"}],
  "wednesday": [{"open":"08:00","close":"22:00"}],
  "thursday": [{"open":"08:00","close":"23:00"}],
  "friday": [{"open":"08:00","close":"00:00"}],
  "saturday": [{"open":"08:00","close":"00:00"}],
  "sunday": [{"open":"09:00","close":"22:00"}]
}'::jsonb where id = 'smoke-wilmslow';

update venues set opening_hours = '{
  "monday": [{"open":"12:00","close":"22:00"}],
  "tuesday": [{"open":"12:00","close":"22:00"}],
  "wednesday": [{"open":"12:00","close":"22:00"}],
  "thursday": [{"open":"12:00","close":"22:00"}],
  "friday": [{"open":"12:00","close":"00:00"}],
  "saturday": [{"open":"12:00","close":"00:00"}],
  "sunday": [{"open":"12:00","close":"22:00"}]
}'::jsonb where id = 'piccolino-grande';

update venues set opening_hours = '{
  "monday": [{"open":"12:00","close":"00:00"}],
  "tuesday": [{"open":"12:00","close":"00:00"}],
  "wednesday": [{"open":"12:00","close":"00:00"}],
  "thursday": [{"open":"12:00","close":"00:00"}],
  "friday": [{"open":"12:00","close":"01:00"}],
  "saturday": [{"open":"12:00","close":"01:00"}],
  "sunday": [{"open":"12:00","close":"00:00"}]
}'::jsonb where id = 'wilmslow-tavern';

update venues set opening_hours = '{
  "monday": [],
  "tuesday": [{"open":"17:30","close":"23:00"}],
  "wednesday": [{"open":"12:00","close":"15:00"},{"open":"17:30","close":"23:00"}],
  "thursday": [{"open":"12:00","close":"15:00"},{"open":"17:30","close":"23:00"}],
  "friday": [{"open":"12:00","close":"15:00"},{"open":"17:30","close":"23:00"}],
  "saturday": [{"open":"12:00","close":"15:00"},{"open":"17:30","close":"23:00"}],
  "sunday": [{"open":"12:00","close":"21:00"}]
}'::jsonb where id = 'phanthong-thai';

update venues set opening_hours = '{
  "monday": [{"open":"06:00","close":"21:00"}],
  "tuesday": [{"open":"06:00","close":"21:00"}],
  "wednesday": [{"open":"06:00","close":"21:00"}],
  "thursday": [{"open":"06:00","close":"21:00"}],
  "friday": [{"open":"06:00","close":"21:00"}],
  "saturday": [{"open":"06:00","close":"21:00"}],
  "sunday": [{"open":"06:00","close":"21:00"}]
}'::jsonb where id = 'alchemy-personal-training';
