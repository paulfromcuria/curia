-- Curia — venue ratings + aggregate crowd signal.
--
-- 2026-09, at explicit user request ("a feedback loop e.g how was smoke,
-- i rate it 2 stars, it remembers that, takes it on board for other
-- similar users"). Two halves: `venue_ratings` remembers what THIS member
-- rated (read back in src/app/venue/[id].tsx as their own rating, and
-- feeds their own future ranking indirectly via the aggregate below —
-- there's no per-user personalized weighting yet, that needs real
-- collaborative-filtering volume this app doesn't have); the
-- `venue_rating_stats` view aggregates across every member and feeds the
-- crowd-signal boost everyone's ranking gets (see
-- src/lib/scoring/rank-venues.ts's scoreRatings()), and doubles as the
-- social-proof number the app had nowhere else.

create table venue_ratings (
  user_id uuid not null references profiles(id) on delete cascade,
  venue_id text not null references venues(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  created_at timestamptz not null default now(),
  primary key (user_id, venue_id)
);
create index venue_ratings_venue_idx on venue_ratings(venue_id);

alter table venue_ratings enable row level security;

create policy "users manage their own venue ratings" on venue_ratings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Aggregate-only view: Postgres views run with the view owner's
-- privileges by default, so this sees every row regardless of
-- venue_ratings' own per-user RLS above — but only ever exposes
-- venue_id/avg/count, never who rated what. This is the standard, correct
-- way to surface a safe aggregate over a privately-scoped table without
-- widening that table's own policy.
create view venue_rating_stats as
select venue_id, avg(rating)::numeric(3, 2) as avg_rating, count(*)::int as rating_count
from venue_ratings
group by venue_id;

grant select on venue_rating_stats to authenticated;
