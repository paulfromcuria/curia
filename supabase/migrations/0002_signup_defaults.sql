-- Extends the signup trigger from 0001_init.sql: pull `name` from the
-- signup call's metadata (supabase.auth.signUp({ options: { data: { name }}
-- }) — src/lib/state/session.tsx) straight into profiles.name, and give
-- every new member their default "Saved" collection (matching CLAUDE.md's
-- SavedCollection model — "every member starts with one default,
-- un-deletable Saved collection", src/lib/state/session.tsx's own
-- defaultSavedCollections() comment) so the app never has to create one
-- lazily client-side.
--
-- Doing both here, atomically with the profile row's creation, means it
-- works the same way regardless of whether email confirmation is on (no
-- client-side session is needed at this point either way).

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', ''));

  insert into public.saved_collections (user_id, name)
  values (new.id, 'Saved');

  return new;
end;
$$;
