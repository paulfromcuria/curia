-- Bob's Pizza (Hyde Park, Chicago) permanently closed in March 2026 —
-- found not from a user report but as a side effect of researching real
-- opening hours for the whole metro. Confirmed by three independent local
-- news outlets (Block Club Chicago, Hyde Park Herald, Hoodline, all
-- dated March 2026) plus Yelp marking its own listing "CLOSED" — not a
-- single-source claim.
--
-- status = 'closed' is the real, existing hard-exclusion mechanism
-- (Venue.status, migration 0011) — this venue now never ranks or
-- appears anywhere in the app, the same treatment any growth-engine
-- closure-audit finding gets, just found by a research pass instead of
-- the audit worker. It had already been added to a new Big Group of
-- Friends moment pick in the same session (migration 0031) before this
-- was discovered — pulled from that pick before it ever shipped, not
-- after.

update venues set status = 'closed' where id = 'bob-s-pizza';
