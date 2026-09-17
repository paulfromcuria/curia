-- Real user behaviour/usage for the admin Users screens (2026-09-18, at
-- explicit user request: "i want to be able to see user behaviour and
-- usage on the admin portal, and in detail when i click on an individual
-- user"). Built entirely from data that already exists — no new
-- event-tracking table, no new instrumentation in the member app. That's
-- a real, separate limit worth stating plainly: this surfaces what a
-- member has *done* (signed up, come back, saved, rated) and *told us*
-- (onboarding profile), not page views, searches run, or session length —
-- there's no event log anywhere in this app yet that would need.
--
-- Same SECURITY DEFINER pattern as admin_list_members() (0004_admin_access.sql)
-- throughout: every function here re-checks the caller is a real admin
-- itself, since supabaseAdmin is just the anon-key client under a separate
-- auth storage key, not an elevated credential (see that file's own
-- header comment) — RLS on profiles/saved_collections/venue_ratings would
-- otherwise only ever let an admin see their own rows.

-- Extends the existing member list with lightweight usage signal —
-- last_sign_in_at (real Supabase Auth column, already existed, just never
-- selected) plus saved/rated counts. Kept as counts, not full lists, so
-- the list screen's payload stays small; full detail is the three
-- functions below, fetched only once a specific member is opened.
--
-- Dropped first, not just CREATE OR REPLACE: Postgres won't let you
-- REPLACE a function's RETURNS TABLE column list in place, even to only
-- add columns — it errors with "cannot change return type of existing
-- function" and asks you to drop it first.
drop function if exists public.admin_list_members();

create function public.admin_list_members()
returns table (
  id uuid,
  email text,
  name text,
  subscription_status text,
  onboarding_complete boolean,
  spend_level smallint,
  selected_tile_ids text[],
  created_at timestamptz,
  last_sign_in_at timestamptz,
  saved_venue_count int,
  rated_venue_count int
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from admin_users a where a.id = auth.uid()) then
    raise exception 'not authorized';
  end if;

  return query
  select
    p.id,
    u.email::text,
    p.name,
    p.subscription_status,
    p.onboarding_complete,
    p.spend_level,
    coalesce(agg.tile_ids, '{}'::text[]) as selected_tile_ids,
    p.created_at,
    u.last_sign_in_at,
    coalesce(saved.cnt, 0)::int as saved_venue_count,
    coalesce(rated.cnt, 0)::int as rated_venue_count
  from profiles p
  join auth.users u on u.id = p.id
  left join (
    select up.user_id, array_agg(distinct t) as tile_ids
    from user_preferences up, unnest(up.selected_tile_ids) as t
    group by up.user_id
  ) agg on agg.user_id = p.id
  left join (
    select sc.user_id, count(*) as cnt
    from saved_collections sc
    join saved_collection_venues scv on scv.collection_id = sc.id
    group by sc.user_id
  ) saved on saved.user_id = p.id
  left join (
    select vr.user_id, count(*) as cnt
    from venue_ratings vr
    group by vr.user_id
  ) rated on rated.user_id = p.id
  order by p.created_at desc;
end;
$$;

grant execute on function public.admin_list_members() to authenticated;

-- Full profile for one member — the "You" onboarding answers
-- admin_list_members() doesn't carry (dietary, pet, religious observance,
-- gender, age range, relationship status), for the detail screen only.
create or replace function public.admin_get_member(member_id uuid)
returns table (
  id uuid,
  email text,
  name text,
  subscription_status text,
  onboarding_complete boolean,
  spend_level smallint,
  dietary text[],
  pet text,
  religious_observance text[],
  gender text,
  age_range text,
  relationship_status text,
  selected_tile_ids text[],
  created_at timestamptz,
  last_sign_in_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from admin_users a where a.id = auth.uid()) then
    raise exception 'not authorized';
  end if;

  return query
  select
    p.id,
    u.email::text,
    p.name,
    p.subscription_status,
    p.onboarding_complete,
    p.spend_level,
    p.dietary,
    p.pet,
    p.religious_observance,
    p.gender,
    p.age_range,
    p.relationship_status,
    coalesce(agg.tile_ids, '{}'::text[]) as selected_tile_ids,
    p.created_at,
    u.last_sign_in_at
  from profiles p
  join auth.users u on u.id = p.id
  left join (
    select up.user_id, array_agg(distinct t) as tile_ids
    from user_preferences up, unnest(up.selected_tile_ids) as t
    where up.user_id = member_id
    group by up.user_id
  ) agg on agg.user_id = p.id
  where p.id = member_id;
end;
$$;

grant execute on function public.admin_get_member(uuid) to authenticated;

-- Which real venues a member has actually saved, and to which named
-- collection — no saved-at timestamp: saved_collection_venues has no
-- created_at column of its own (only the collection row does, which is
-- "when the collection was made", not "when this venue was added to it"),
-- so showing one would misrepresent what's actually tracked.
create or replace function public.admin_member_saved_venues(member_id uuid)
returns table (
  venue_id text,
  venue_name text,
  district_name text,
  collection_name text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from admin_users a where a.id = auth.uid()) then
    raise exception 'not authorized';
  end if;

  return query
  select v.id, v.name, d.name, sc.name
  from saved_collections sc
  join saved_collection_venues scv on scv.collection_id = sc.id
  join venues v on v.id = scv.venue_id
  join districts d on d.id = v.district_id
  where sc.user_id = member_id
  order by v.name;
end;
$$;

grant execute on function public.admin_member_saved_venues(uuid) to authenticated;

-- Every real rating a member has given.
create or replace function public.admin_member_ratings(member_id uuid)
returns table (
  venue_id text,
  venue_name text,
  district_name text,
  rating smallint,
  rated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from admin_users a where a.id = auth.uid()) then
    raise exception 'not authorized';
  end if;

  return query
  select v.id, v.name, d.name, vr.rating, vr.created_at
  from venue_ratings vr
  join venues v on v.id = vr.venue_id
  join districts d on d.id = v.district_id
  where vr.user_id = member_id
  order by vr.created_at desc;
end;
$$;

grant execute on function public.admin_member_ratings(uuid) to authenticated;
