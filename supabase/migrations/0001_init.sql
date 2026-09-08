-- Curia — initial schema.
--
-- Mirrors src/types/models.ts exactly (that file is the authoritative shape
-- per CLAUDE.md's data model — refine there first, not ad hoc here). Content
-- tables (cities/districts/tiles/venues/moments/journeys/destinations) use
-- the same slugified text ids the seed JSON already uses, so
-- docs/data/*.json can be imported with zero id remapping (see
-- scripts/seed-supabase.mjs). User tables key off auth.users(id).
--
-- RLS model: content tables are readable by anyone (anon + authenticated)
-- and writable only by service_role (i.e. the seed script / a future admin
-- backend) — enforced by simply not granting insert/update/delete to the
-- public roles. User tables are scoped to auth.uid() on every operation.

-- ---------------------------------------------------------------------------
-- Content: cities, districts, district groups
-- ---------------------------------------------------------------------------

create table cities (
  id text primary key,
  name text not null
);

create table districts (
  id text primary key,
  name text not null,
  metro text not null references cities(id),
  lat double precision not null,
  lon double precision not null,
  base integer not null,
  kind text not null check (kind in ('city', 'county')),
  accent_color text not null,
  editorial_description text,
  -- Day-of-week / time-of-day liveliness curves — see
  -- docs/data/districts.json's own _dayMultiplierSource/_bandMultiplierSource
  -- notes. dayMultiplier is global in the seed JSON (identical on every
  -- district); stored per-row here since District.dayMultiplier is a
  -- per-row field on the TS type and a district can carry its own
  -- bandMultiplier override.
  day_multiplier jsonb,
  band_multiplier jsonb,
  group_id text
);
create index districts_metro_idx on districts(metro);

create table district_groups (
  name text primary key
);

create table district_group_members (
  group_name text not null references district_groups(name) on delete cascade,
  district_id text not null references districts(id) on delete cascade,
  primary key (group_name, district_id)
);

-- ---------------------------------------------------------------------------
-- Content: onboarding tiles
-- ---------------------------------------------------------------------------

create table tiles (
  -- Format "${category}|${name}" — matches Tile.id / src/lib/data/seed.ts.
  id text primary key,
  category text not null check (category in ('Do', 'Drink', 'Eat')),
  name text not null,
  sub_preferences text[] not null default '{}'
);
create index tiles_category_idx on tiles(category);

-- ---------------------------------------------------------------------------
-- Content: venues
-- ---------------------------------------------------------------------------

create table venues (
  id text primary key,
  name text not null,
  type text not null,
  sub_preference_tags text[] not null default '{}',
  spend_level smallint not null check (spend_level between 1 and 5),
  district_id text not null references districts(id),
  metro text not null references cities(id),
  lat double precision not null,
  lon double precision not null,
  pet_friendly boolean not null default false,
  dietary_options text[] not null default '{none}',
  photos text[] not null default '{}',
  description text not null,
  bands text[] not null default '{}',
  base integer not null,
  -- Editorial confidence marker, not a hard filter — see the Venue.status
  -- doc comment in src/types/models.ts.
  status text not null default 'live' check (status in ('live', 'coming-soon')),

  -- Internal-only — Hard rule 8: never surfaced in the member app's UI or
  -- API responses. Admin/back-office only.
  tier text not null default 'texture' check (tier in ('signature', 'texture')),
  source_confidence real not null default 1,
  notes text
);
create index venues_district_idx on venues(district_id);
create index venues_status_idx on venues(status);
create index venues_type_idx on venues(type);

-- ---------------------------------------------------------------------------
-- Content: moments (exactly 4 — Hard rule per CLAUDE.md) and journeys
-- ---------------------------------------------------------------------------

create table moments (
  -- id doubles as MomentType's value (e.g. 'date-night') — the type is
  -- already a 1:1, exactly-4-values key, so no separate id is needed.
  id text primary key check (id in ('date-night', 'entertaining-a-client', 'big-group-of-friends', 'solo-reset')),
  title text not null,
  curator text not null,
  blurb text not null
);

create table moment_venues (
  moment_id text not null references moments(id) on delete cascade,
  venue_id text not null references venues(id) on delete cascade,
  -- Preserves Moment.venueIds' array order.
  position integer not null,
  primary key (moment_id, venue_id)
);
create index moment_venues_moment_idx on moment_venues(moment_id);

create table journeys (
  id text primary key,
  moment_id text not null references moments(id),
  title text not null,
  blurb text,
  meta text
);
create index journeys_moment_idx on journeys(moment_id);

create table journey_stops (
  journey_id text not null references journeys(id) on delete cascade,
  venue_id text not null references venues(id),
  stop_order integer not null,
  walk_time_to_next_minutes integer,
  primary key (journey_id, stop_order)
);
create index journey_stops_journey_idx on journey_stops(journey_id);

-- ---------------------------------------------------------------------------
-- Content: holiday destinations (Profile-only travel feature)
-- ---------------------------------------------------------------------------

create table destinations (
  id text primary key,
  name text not null,
  region text not null,
  lat double precision not null,
  lon double precision not null,
  best_months smallint[] not null,
  best_season_label text not null,
  tile_ids text[] not null default '{}',
  curator text not null,
  editorial_description text not null
);

-- ---------------------------------------------------------------------------
-- Users: profile + "You" onboarding step (extends auth.users)
-- ---------------------------------------------------------------------------

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  subscription_status text not null default 'none'
    check (subscription_status in ('none', 'trialing', 'active', 'past_due', 'canceled')),
  onboarding_complete boolean not null default false,

  -- YouProfile fields
  spend_level smallint not null default 3 check (spend_level between 1 and 5),
  dietary text[] not null default '{none}',
  pet text not null default 'none' check (pet in ('none', 'small-dog', 'large-dog')),
  religious_observance text[] not null default '{none}',
  gender text check (gender in ('woman', 'man', 'non-binary', 'prefer-not-to-say')),
  age_range text check (age_range in ('18-24', '25-34', '35-44', '45-54', '55-64', '65+')),
  relationship_status text
    check (relationship_status in ('single', 'seeing-someone', 'partnered', 'married', 'prefer-not-to-say')),

  created_at timestamptz not null default now()
);

-- Auto-create a profile row the moment someone signs up, so the app never
-- has to handle a "signed in but no profile yet" state.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create table user_preferences (
  user_id uuid not null references profiles(id) on delete cascade,
  category text not null check (category in ('Do', 'Drink', 'Eat')),
  -- Minimum 3 required per category (Hard rule 7) — enforced in the app's
  -- onboarding flow, not here (a DB constraint can't see "in progress" state).
  selected_tile_ids text[] not null default '{}',
  sub_preference_state jsonb not null default '{}',
  primary key (user_id, category)
);

create table saved_collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);
create index saved_collections_user_idx on saved_collections(user_id);

create table saved_collection_venues (
  collection_id uuid not null references saved_collections(id) on delete cascade,
  venue_id text not null references venues(id) on delete cascade,
  primary key (collection_id, venue_id)
);

create table saved_journeys (
  user_id uuid not null references profiles(id) on delete cascade,
  journey_id text not null references journeys(id) on delete cascade,
  primary key (user_id, journey_id)
);

create table admin_users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role text not null default 'admin' check (role = 'admin')
);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table cities enable row level security;
alter table districts enable row level security;
alter table district_groups enable row level security;
alter table district_group_members enable row level security;
alter table tiles enable row level security;
alter table venues enable row level security;
alter table moments enable row level security;
alter table moment_venues enable row level security;
alter table journeys enable row level security;
alter table journey_stops enable row level security;
alter table destinations enable row level security;

-- Public read on every content table. No insert/update/delete policy is
-- defined for anon/authenticated, so only service_role (which bypasses RLS)
-- can write — i.e. scripts/seed-supabase.mjs and any future admin backend.
create policy "content is publicly readable" on cities for select using (true);
create policy "content is publicly readable" on districts for select using (true);
create policy "content is publicly readable" on district_groups for select using (true);
create policy "content is publicly readable" on district_group_members for select using (true);
create policy "content is publicly readable" on tiles for select using (true);
create policy "content is publicly readable" on venues for select using (true);
create policy "content is publicly readable" on moments for select using (true);
create policy "content is publicly readable" on moment_venues for select using (true);
create policy "content is publicly readable" on journeys for select using (true);
create policy "content is publicly readable" on journey_stops for select using (true);
create policy "content is publicly readable" on destinations for select using (true);

alter table profiles enable row level security;
alter table user_preferences enable row level security;
alter table saved_collections enable row level security;
alter table saved_collection_venues enable row level security;
alter table saved_journeys enable row level security;
alter table admin_users enable row level security;

create policy "users manage their own profile" on profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "users manage their own preferences" on user_preferences
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "users manage their own saved collections" on saved_collections
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "users manage venues in their own saved collections" on saved_collection_venues
  for all using (
    exists (select 1 from saved_collections c where c.id = collection_id and c.user_id = auth.uid())
  ) with check (
    exists (select 1 from saved_collections c where c.id = collection_id and c.user_id = auth.uid())
  );

create policy "users manage their own saved journeys" on saved_journeys
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- admin_users has no public policy at all — service_role only, matching how
-- the admin dashboard is a separate, back-office-only surface (Hard rule 8's
-- spirit extended to who administers, not just what's shown).
