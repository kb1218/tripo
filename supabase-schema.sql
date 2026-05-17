create extension if not exists pgcrypto;
create schema if not exists private;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  city text not null,
  phone text not null,
  gender text not null,
  emergency_contact text not null,
  phone_verified boolean not null default false,
  phone_verified_at timestamptz,
  age_range text not null default '25-34',
  budget_band text not null default 'Budget',
  travel_frequency text not null default 'Occasional',
  personality_style text not null default 'Balanced',
  adventure_level integer not null default 3 check (adventure_level between 1 and 5),
  travel_interests text not null default '',
  bio text not null default '',
  ai_summary text not null default '',
  safety_score integer not null default 50 check (safety_score between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_users (
  email text primary key,
  created_at timestamptz not null default now()
);

create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.profiles(id) on delete cascade,
  host_name text not null,
  title text not null,
  city text not null,
  destination text not null,
  trip_date date not null,
  interest text not null,
  vibe text not null,
  visibility text not null check (visibility in ('mixed', 'women-only', 'men-only')),
  seats integer not null check (seats >= 2 and seats <= 20),
  description text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.trip_members (
  trip_id uuid not null references public.trips(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  member_name text not null,
  created_at timestamptz not null default now(),
  primary key (trip_id, user_id)
);

create table if not exists public.trip_messages (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  author_name text not null,
  content text not null check (char_length(trim(content)) > 0 and char_length(content) <= 1000),
  moderation_status text not null default 'clear' check (moderation_status in ('clear', 'flagged', 'blocked')),
  moderation_label text not null default '',
  created_at timestamptz not null default now()
);

alter table public.profiles add column if not exists phone_verified boolean not null default false;
alter table public.profiles add column if not exists phone_verified_at timestamptz;
alter table public.profiles add column if not exists age_range text not null default '25-34';
alter table public.profiles add column if not exists budget_band text not null default 'Budget';
alter table public.profiles add column if not exists travel_frequency text not null default 'Occasional';
alter table public.profiles add column if not exists personality_style text not null default 'Balanced';
alter table public.profiles add column if not exists adventure_level integer not null default 3;
alter table public.profiles add column if not exists travel_interests text not null default '';
alter table public.profiles add column if not exists bio text not null default '';
alter table public.profiles add column if not exists ai_summary text not null default '';
alter table public.profiles add column if not exists safety_score integer not null default 50;
alter table public.trip_messages add column if not exists moderation_status text not null default 'clear';
alter table public.trip_messages add column if not exists moderation_label text not null default '';

create table if not exists public.trip_reviews (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  author_name text not null,
  rating integer not null check (rating between 1 and 5),
  body text not null check (char_length(trim(body)) > 0 and char_length(body) <= 600),
  created_at timestamptz not null default now(),
  unique (trip_id, author_id)
);

create table if not exists public.trip_reports (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reporter_name text not null,
  issue text not null check (char_length(trim(issue)) > 0 and char_length(issue) <= 1000),
  created_at timestamptz not null default now()
);

create index if not exists trips_host_id_idx on public.trips(host_id);
create index if not exists trips_trip_date_idx on public.trips(trip_date);
create index if not exists trip_members_user_id_idx on public.trip_members(user_id);
create index if not exists trip_messages_trip_id_idx on public.trip_messages(trip_id);
create index if not exists trip_reviews_trip_id_idx on public.trip_reviews(trip_id);
create index if not exists trip_reports_trip_id_idx on public.trip_reports(trip_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $set_updated_at$
begin
  new.updated_at = now();
  return new;
end;
$set_updated_at$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $handle_new_user$
begin
  insert into public.profiles (
    id,
    full_name,
    city,
    phone,
    gender,
    emergency_contact,
    age_range,
    budget_band,
    travel_frequency,
    personality_style,
    adventure_level,
    travel_interests,
    bio
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', 'Traveler'),
    coalesce(new.raw_user_meta_data ->> 'city', 'Not set'),
    coalesce(new.raw_user_meta_data ->> 'phone', 'Not set'),
    coalesce(new.raw_user_meta_data ->> 'gender', 'Not set'),
    coalesce(new.raw_user_meta_data ->> 'emergency_contact', 'Not set'),
    coalesce(new.raw_user_meta_data ->> 'age_range', '25-34'),
    coalesce(new.raw_user_meta_data ->> 'budget_band', 'Budget'),
    coalesce(new.raw_user_meta_data ->> 'travel_frequency', 'Occasional'),
    coalesce(new.raw_user_meta_data ->> 'personality_style', 'Balanced'),
    greatest(1, least(5, coalesce((new.raw_user_meta_data ->> 'adventure_level')::integer, 3))),
    coalesce(new.raw_user_meta_data ->> 'travel_interests', ''),
    coalesce(new.raw_user_meta_data ->> 'bio', '')
  )
  on conflict (id) do nothing;

  return new;
end;
$handle_new_user$;

create or replace function public.sync_trip_host_name()
returns trigger
language plpgsql
as $sync_trip_host_name$
begin
  select full_name into new.host_name
  from public.profiles
  where id = new.host_id;
  return new;
end;
$sync_trip_host_name$;

create or replace function public.sync_member_name()
returns trigger
language plpgsql
as $sync_member_name$
begin
  select full_name into new.member_name
  from public.profiles
  where id = new.user_id;
  return new;
end;
$sync_member_name$;

create or replace function public.sync_message_author_name()
returns trigger
language plpgsql
as $sync_message_author_name$
begin
  select full_name into new.author_name
  from public.profiles
  where id = new.author_id;
  return new;
end;
$sync_message_author_name$;

create or replace function public.sync_review_author_name()
returns trigger
language plpgsql
as $sync_review_author_name$
begin
  select full_name into new.author_name
  from public.profiles
  where id = new.author_id;
  return new;
end;
$sync_review_author_name$;

create or replace function public.sync_reporter_name()
returns trigger
language plpgsql
as $sync_reporter_name$
begin
  select full_name into new.reporter_name
  from public.profiles
  where id = new.reporter_id;
  return new;
end;
$sync_reporter_name$;

create or replace function public.add_host_membership()
returns trigger
language plpgsql
security definer
set search_path = public
as $add_host_membership$
begin
  insert into public.trip_members (trip_id, user_id, member_name)
  values (new.id, new.host_id, new.host_name)
  on conflict (trip_id, user_id) do nothing;
  return new;
end;
$add_host_membership$;

create or replace function private.can_access_trip_members(target_trip_id uuid)
returns boolean
language sql
security definer
set search_path = public, private
as $can_access_trip_members$
  select exists (
    select 1
    from public.trips t
    where t.id = target_trip_id
      and (
        t.host_id = (select auth.uid())
        or exists (
          select 1
          from public.trip_members tm
          where tm.trip_id = target_trip_id
            and tm.user_id = (select auth.uid())
        )
      )
  );
$can_access_trip_members$;

create or replace function private.trip_has_space(target_trip_id uuid)
returns boolean
language sql
security definer
set search_path = public, private
as $trip_has_space$
  select exists (
    select 1
    from public.trips t
    where t.id = target_trip_id
      and (
        select count(*)
        from public.trip_members tm
        where tm.trip_id = target_trip_id
      ) < t.seats
  );
$trip_has_space$;

create or replace function private.user_matches_trip_visibility(target_trip_id uuid, joining_user_id uuid)
returns boolean
language sql
security definer
set search_path = public, private
as $user_matches_trip_visibility$
  select exists (
    select 1
    from public.trips t
    join public.profiles p on p.id = joining_user_id
    where t.id = target_trip_id
      and (
        t.visibility = 'mixed'
        or (
          t.visibility = 'women-only'
          and lower(coalesce(p.gender, '')) in ('woman', 'women', 'female')
        )
        or (
          t.visibility = 'men-only'
          and lower(coalesce(p.gender, '')) in ('man', 'men', 'male')
        )
      )
  );
$user_matches_trip_visibility$;

create or replace function private.profile_is_verified(target_user_id uuid)
returns boolean
language sql
security definer
set search_path = public, auth, private
as $profile_is_verified$
  select exists (
    select 1
    from public.profiles p
    join auth.users u on u.id = p.id
    where p.id = target_user_id
      and u.email_confirmed_at is not null
  );
$profile_is_verified$;

create or replace function private.is_admin()
returns boolean
language sql
security definer
set search_path = public, private
as $is_admin$
  select exists (
    select 1
    from public.admin_users au
    where lower(au.email) = lower(coalesce((auth.jwt() ->> 'email'), ''))
  );
$is_admin$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

drop trigger if exists trips_sync_host_name on public.trips;
create trigger trips_sync_host_name
before insert or update on public.trips
for each row execute function public.sync_trip_host_name();

drop trigger if exists trips_add_host_membership on public.trips;
create trigger trips_add_host_membership
after insert on public.trips
for each row execute function public.add_host_membership();

drop trigger if exists trip_members_sync_name on public.trip_members;
create trigger trip_members_sync_name
before insert or update on public.trip_members
for each row execute function public.sync_member_name();

drop trigger if exists trip_messages_sync_author_name on public.trip_messages;
create trigger trip_messages_sync_author_name
before insert or update on public.trip_messages
for each row execute function public.sync_message_author_name();

drop trigger if exists trip_reviews_sync_author_name on public.trip_reviews;
create trigger trip_reviews_sync_author_name
before insert or update on public.trip_reviews
for each row execute function public.sync_review_author_name();

drop trigger if exists trip_reports_sync_reporter_name on public.trip_reports;
create trigger trip_reports_sync_reporter_name
before insert or update on public.trip_reports
for each row execute function public.sync_reporter_name();

alter table public.profiles enable row level security;
alter table public.admin_users enable row level security;
alter table public.trips enable row level security;
alter table public.trip_members enable row level security;
alter table public.trip_messages enable row level security;
alter table public.trip_reviews enable row level security;
alter table public.trip_reports enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using ((select auth.uid()) = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check ((select auth.uid()) = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

drop policy if exists "profiles_admin_select_all" on public.profiles;
create policy "profiles_admin_select_all"
on public.profiles
for select
to authenticated
using ((select private.is_admin()));

drop policy if exists "profiles_admin_update_all" on public.profiles;
create policy "profiles_admin_update_all"
on public.profiles
for update
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

drop policy if exists "profiles_admin_delete_all" on public.profiles;
create policy "profiles_admin_delete_all"
on public.profiles
for delete
to authenticated
using ((select private.is_admin()));

drop policy if exists "admin_users_select_admins" on public.admin_users;
create policy "admin_users_select_admins"
on public.admin_users
for select
to authenticated
using ((select private.is_admin()));

drop policy if exists "trips_select_authenticated" on public.trips;
create policy "trips_select_authenticated"
on public.trips
for select
to authenticated
using (true);

drop policy if exists "trips_admin_select_all" on public.trips;
create policy "trips_admin_select_all"
on public.trips
for select
to authenticated
using ((select private.is_admin()));

drop policy if exists "trips_insert_own" on public.trips;
create policy "trips_insert_own"
on public.trips
for insert
to authenticated
with check (
  (select auth.uid()) = host_id
  and (select private.profile_is_verified(host_id))
);

drop policy if exists "trips_update_own" on public.trips;
create policy "trips_update_own"
on public.trips
for update
to authenticated
using ((select auth.uid()) = host_id)
with check ((select auth.uid()) = host_id);

drop policy if exists "trips_delete_own" on public.trips;
create policy "trips_delete_own"
on public.trips
for delete
to authenticated
using ((select auth.uid()) = host_id);

drop policy if exists "trips_admin_update_all" on public.trips;
create policy "trips_admin_update_all"
on public.trips
for update
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

drop policy if exists "trips_admin_delete_all" on public.trips;
create policy "trips_admin_delete_all"
on public.trips
for delete
to authenticated
using ((select private.is_admin()));

drop policy if exists "trip_members_select_member_or_host" on public.trip_members;
create policy "trip_members_select_member_or_host"
on public.trip_members
for select
to authenticated
using (
  (select private.can_access_trip_members(trip_members.trip_id))
);

drop policy if exists "trip_members_admin_select_all" on public.trip_members;
create policy "trip_members_admin_select_all"
on public.trip_members
for select
to authenticated
using ((select private.is_admin()));

drop policy if exists "trip_members_insert_self" on public.trip_members;
create policy "trip_members_insert_self"
on public.trip_members
for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and (select private.trip_has_space(trip_members.trip_id))
  and (select private.user_matches_trip_visibility(trip_members.trip_id, trip_members.user_id))
  and (select private.profile_is_verified(trip_members.user_id))
);

drop policy if exists "trip_members_delete_self_or_host" on public.trip_members;
create policy "trip_members_delete_self_or_host"
on public.trip_members
for delete
to authenticated
using (
  (select auth.uid()) = user_id
  or exists (
    select 1
    from public.trips t
    where t.id = trip_members.trip_id
      and t.host_id = (select auth.uid())
  )
);

drop policy if exists "trip_messages_select_member_only" on public.trip_messages;
create policy "trip_messages_select_member_only"
on public.trip_messages
for select
to authenticated
using (
  (select private.can_access_trip_members(trip_messages.trip_id))
);

drop policy if exists "trip_messages_admin_select_all" on public.trip_messages;
create policy "trip_messages_admin_select_all"
on public.trip_messages
for select
to authenticated
using ((select private.is_admin()));

drop policy if exists "trip_messages_insert_member_only" on public.trip_messages;
create policy "trip_messages_insert_member_only"
on public.trip_messages
for insert
to authenticated
with check (
  (select auth.uid()) = author_id
  and (select private.can_access_trip_members(trip_messages.trip_id))
);

drop policy if exists "trip_reviews_select_authenticated" on public.trip_reviews;
create policy "trip_reviews_select_authenticated"
on public.trip_reviews
for select
to authenticated
using (true);

drop policy if exists "trip_reviews_admin_select_all" on public.trip_reviews;
create policy "trip_reviews_admin_select_all"
on public.trip_reviews
for select
to authenticated
using ((select private.is_admin()));

drop policy if exists "trip_reviews_insert_own" on public.trip_reviews;
create policy "trip_reviews_insert_own"
on public.trip_reviews
for insert
to authenticated
with check (
  (select auth.uid()) = author_id
  and (select private.can_access_trip_members(trip_reviews.trip_id))
);

drop policy if exists "trip_reviews_update_own" on public.trip_reviews;
create policy "trip_reviews_update_own"
on public.trip_reviews
for update
to authenticated
using ((select auth.uid()) = author_id)
with check ((select auth.uid()) = author_id);

drop policy if exists "trip_reviews_delete_own" on public.trip_reviews;
create policy "trip_reviews_delete_own"
on public.trip_reviews
for delete
to authenticated
using ((select auth.uid()) = author_id);

drop policy if exists "trip_reports_select_own" on public.trip_reports;
create policy "trip_reports_select_own"
on public.trip_reports
for select
to authenticated
using ((select auth.uid()) = reporter_id);

drop policy if exists "trip_reports_admin_select_all" on public.trip_reports;
create policy "trip_reports_admin_select_all"
on public.trip_reports
for select
to authenticated
using ((select private.is_admin()));

drop policy if exists "trip_reports_admin_delete_all" on public.trip_reports;
create policy "trip_reports_admin_delete_all"
on public.trip_reports
for delete
to authenticated
using ((select private.is_admin()));

drop policy if exists "trip_reports_insert_own" on public.trip_reports;
create policy "trip_reports_insert_own"
on public.trip_reports
for insert
to authenticated
with check (
  (select auth.uid()) = reporter_id
  and exists (
    select 1
    from public.trips t
    where t.id = trip_reports.trip_id
  )
);
