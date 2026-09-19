-- Second-pass results for 3 of the 7 Wilmslow venues held back from
-- migration 0029, at explicit user follow-up. See migration 0035 for the
-- other real finding from this same pass — 3 venues showing strong
-- evidence of having actually closed, not just an hours gap.
--
-- cibo: the original Sunday-close conflict (21:00 vs 23:00/23:30) is
-- resolved to 22:00 — two independent, business-managed listings
-- (OpenTable's own "Hours of Operation" field and Cibo's Google Business
-- Profile) agree exactly, on a value distinct from all three original
-- conflicting figures.
--
-- symposium: confirmed genuinely Friday/Saturday-only, not a data gap —
-- the official site only ever stated Fri/Sat, and the "maybe more nights"
-- signal from the first pass traced to a likely mix-up with Aura Bar, a
-- separate, broader-hours venue sharing the same small block (72 Grove
-- St vs Symposium's 70a).
--
-- the-mucky-pup: Monday-Thursday and Sunday now corroborated by a real
-- second source (CAMRA's whatpub.com pub database, independent of the
-- first pass's aggregator). Friday/Saturday closing time still has a
-- genuine, disclosed conflict (CAMRA says 00:30, a live Google Maps
-- status check said 01:30) — used 01:30, the later/more generous figure,
-- same asymmetric-risk bias (fewer false "closed" readings if wrong)
-- used elsewhere in this feature.

update venues set opening_hours = '{"monday":[{"open":"12:00","close":"23:00"}],"tuesday":[{"open":"12:00","close":"23:00"}],"wednesday":[{"open":"12:00","close":"23:00"}],"thursday":[{"open":"12:00","close":"23:00"}],"friday":[{"open":"12:00","close":"23:00"}],"saturday":[{"open":"12:00","close":"23:00"}],"sunday":[{"open":"12:00","close":"22:00"}]}'::jsonb where id = 'cibo';

update venues set opening_hours = '{"monday":[],"tuesday":[],"wednesday":[],"thursday":[],"friday":[{"open":"23:00","close":"03:00"}],"saturday":[{"open":"23:00","close":"03:00"}],"sunday":[]}'::jsonb where id = 'symposium';

update venues set opening_hours = '{"monday":[{"open":"11:30","close":"23:00"}],"tuesday":[{"open":"11:30","close":"23:00"}],"wednesday":[{"open":"11:30","close":"23:00"}],"thursday":[{"open":"11:30","close":"23:00"}],"friday":[{"open":"11:30","close":"01:30"}],"saturday":[{"open":"11:00","close":"01:30"}],"sunday":[{"open":"11:30","close":"22:00"}]}'::jsonb where id = 'the-mucky-pup';
