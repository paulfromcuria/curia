-- Real admin auth + a real member list for the admin Users screen.
--
-- Until now the admin surface (src/app/admin/*) was entirely mocked: login
-- accepted any well-formed email (src/lib/admin/admin-session.tsx) and the
-- Users screen showed fabricated placeholder data (src/lib/admin/demo-users.ts)
-- because there was no way to check "is this a real admin" or "who are the
-- real members" from the client. admin_users already existed (0001_init.sql)
-- but had no policies at all, so nothing — not even a signed-in user checking
-- their own row — could read it.
--
-- This migration adds exactly two things, both narrowly scoped to what the
-- admin surface actually needs:
--   1. A policy letting a signed-in user check ONLY their own admin_users
--      row (never anyone else's) — enough for the admin login flow to
--      answer "is the account that just signed in an admin?" without
--      granting any broader visibility into who else administers Curia.
--   2. admin_list_members(): a SECURITY DEFINER function that first checks
--      the caller is a real admin (same admin_users check), then returns
--      real member rows (profile fields + auth.users.email, which
--      PostgREST/RLS never exposes directly) for the Users screen. This is
--      the standard Supabase pattern for surfacing a narrow slice of
--      auth.users safely, instead of widening RLS on profiles itself or
--      duplicating email into a public table.
--
-- Bootstrapping who actually IS an admin (inserting into admin_users) stays
-- a manual, service-role-only step — see the project owner's own setup
-- notes, not this migration. admin_users still has no insert/update/delete
-- policy for anon/authenticated, unchanged from 0001_init.sql.

create policy "users can check their own admin status" on admin_users
  for select using (auth.uid() = id);

create or replace function public.admin_list_members()
returns table (
  id uuid,
  email text,
  name text,
  subscription_status text,
  onboarding_complete boolean,
  spend_level smallint,
  selected_tile_ids text[],
  created_at timestamptz
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
    -- auth.users.email is varchar(255), not text — the RETURNS TABLE above
    -- declares text, and plpgsql checks the match exactly, so this cast is
    -- required or the whole function fails at call time with "structure of
    -- query does not match function result type".
    u.email::text,
    p.name,
    p.subscription_status,
    p.onboarding_complete,
    p.spend_level,
    coalesce(agg.tile_ids, '{}'::text[]) as selected_tile_ids,
    p.created_at
  from profiles p
  join auth.users u on u.id = p.id
  left join (
    select up.user_id, array_agg(distinct t) as tile_ids
    from user_preferences up, unnest(up.selected_tile_ids) as t
    group by up.user_id
  ) agg on agg.user_id = p.id
  order by p.created_at desc;
end;
$$;

grant execute on function public.admin_list_members() to authenticated;
