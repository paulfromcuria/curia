-- Real bug report, 2026-09-22: "why am i being recomended the wilmslow
-- artisan market on a tuesday when that is only open on certain saturdays."
-- Wilmslow Artisan Market's own curated copy already says "close to
-- traffic once a month for a hundred stalls... Check the date before
-- building an evening around it" — but nothing in the ranking engine ever
-- read that. `bands`/`opening_hours` both assume a schedule that repeats
-- every day or every week; neither can express "the third Saturday of the
-- month," so a monthly market was scoring exactly like a normal daily
-- afternoon venue and could win a top recommendation on any of the ~29
-- days a month it's actually shut.
--
-- `occasional` is a new, separate hard-filter flag (passesRegularSchedule
-- Filter, src/lib/scoring/rank-venues.ts) rather than trying to force this
-- into opening_hours — setting opening_hours to "always closed" would be a
-- lie (it does open sometimes) and would wrongly show a permanent red
-- closed-ring on Map, implying the business has shut down rather than "this
-- is an occasional event." Defaults false for every existing row (a normal
-- venue, no behavior change) — only ever set true by deliberate curation.
--
-- Only one real venue needs this today: checked every venue's curated
-- `reason` copy for "once a month"/"monthly"/"check the date"/"pop-up"/
-- "seasonal" language describing the VENUE's own opening pattern (not a
-- seasonal menu or a monthly class at an otherwise-normal venue, both of
-- which turned up as false positives) and cross-checked venue type —
-- Wilmslow Artisan Market (type ARTISAN MARKET) is the only genuinely
-- occasional venue in the catalog; Mackie Mayor/Altrincham Market (type
-- MARKET HALL) are permanent daily food halls, not the same thing.

alter table venues
  add column occasional boolean not null default false;

update venues set occasional = true where id = 'wilmslow-artisan-market';
