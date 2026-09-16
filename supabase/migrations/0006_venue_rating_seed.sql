-- Curia — demo rating baseline, unioned into the real aggregate.
--
-- 2026-09, at explicit user request ("seed some demo data, at least 3
-- ratings for each venue with busy ones having 15+ for the sake of a demo
-- and testing"). One row per demo rating, shaped like venue_ratings itself
-- minus user_id/FK (a demo rating has no real "who"), so venue_rating_stats
-- can just union real + demo rows and let a plain avg()/count() do the
-- math — no hand-rolled blend formula to get wrong. venue_ratings itself
-- is untouched and stays 100% real; real ratings simply land in the same
-- union as they accumulate, so this fades into the background rather than
-- needing a cutover. Removing the demo layer later is one line
-- (`drop table venue_rating_demo cascade;` + recreating the plain view
-- from 0005) and touches zero real data.

create table venue_rating_demo (
  id bigserial primary key,
  venue_id text not null references venues(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5)
);

create index venue_rating_demo_venue_idx on venue_rating_demo(venue_id);

alter table venue_rating_demo enable row level security;
create policy "demo ratings are publicly readable" on venue_rating_demo for select using (true);

-- Replaces 0005's plain aggregate with one that unions real ratings and
-- demo rows before averaging, so the two sources behave identically.
drop view venue_rating_stats;
create view venue_rating_stats as
select
  venue_id,
  avg(rating)::numeric(3, 2) as avg_rating,
  count(*)::int as rating_count
from (
  select venue_id, rating from venue_ratings
  union all
  select venue_id, rating from venue_rating_demo
) combined
group by venue_id;

grant select on venue_rating_stats to authenticated;
