-- =============================================================================
-- EventSnap — Schéma v1
-- À exécuter une fois dans : Supabase Dashboard → SQL Editor → New query → Run
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Extensions & types
-- -----------------------------------------------------------------------------

create extension if not exists "pgcrypto";

create type public.user_plan as enum ('free', 'premium');

create type public.member_role as enum (
  'host',
  'admin',
  'photographer',
  'participant'
);

create type public.invitation_status as enum (
  'pending',
  'accepted',
  'declined'
);

create type public.friendship_status as enum (
  'pending',
  'accepted'
);

-- -----------------------------------------------------------------------------
-- 2. Tables
-- -----------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null,
  avatar_url text,
  plan public.user_plan not null default 'free',
  storage_used_bytes bigint not null default 0 check (storage_used_bytes >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_username_length check (char_length(username) between 3 and 30),
  constraint profiles_username_format check (username ~ '^[a-zA-Z0-9_]+$')
);

create unique index profiles_username_lower_idx on public.profiles (lower(username));

create table public.events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  latitude double precision not null,
  longitude double precision not null,
  location_label text,
  event_date timestamptz not null,
  expires_at timestamptz not null,
  host_id uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint events_name_length check (char_length(name) between 1 and 120),
  constraint events_expires_after_start check (expires_at > event_date)
);

create index events_host_id_idx on public.events (host_id);
create index events_expires_at_idx on public.events (expires_at);
create index events_event_date_idx on public.events (event_date);
create index events_geo_idx on public.events (latitude, longitude);

create table public.members (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.member_role not null default 'participant',
  joined_at timestamptz not null default now(),
  constraint members_unique_user_event unique (event_id, user_id)
);

create index members_event_id_idx on public.members (event_id);
create index members_user_id_idx on public.members (user_id);

create table public.event_invitations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  inviter_id uuid not null references public.profiles (id) on delete cascade,
  invitee_id uuid not null references public.profiles (id) on delete cascade,
  status public.invitation_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_invitations_no_self check (inviter_id <> invitee_id),
  constraint event_invitations_unique_invitee unique (event_id, invitee_id)
);

create index event_invitations_invitee_idx on public.event_invitations (invitee_id);
create index event_invitations_event_id_idx on public.event_invitations (event_id);

create table public.photos (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  storage_path text not null,
  file_size_bytes bigint not null default 0 check (file_size_bytes >= 0),
  created_at timestamptz not null default now(),
  constraint photos_storage_path_unique unique (storage_path)
);

create index photos_event_id_idx on public.photos (event_id);
create index photos_user_id_idx on public.photos (user_id);
create index photos_created_at_idx on public.photos (created_at);

create table public.reactions (
  id uuid primary key default gen_random_uuid(),
  photo_id uuid not null references public.photos (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now(),
  constraint reactions_emoji_allowed check (emoji in ('❤️', '😂', '🔥', '🙌')),
  constraint reactions_unique_user_photo unique (photo_id, user_id)
);

create index reactions_photo_id_idx on public.reactions (photo_id);

create table public.friendships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  friend_id uuid not null references public.profiles (id) on delete cascade,
  status public.friendship_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint friendships_no_self check (user_id <> friend_id),
  constraint friendships_unique_pair unique (user_id, friend_id)
);

create index friendships_user_id_idx on public.friendships (user_id);
create index friendships_friend_id_idx on public.friendships (friend_id);

-- -----------------------------------------------------------------------------
-- 3. Fonctions utilitaires (RLS & freemium)
-- -----------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.is_event_member(
  p_event_id uuid,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.members m
    where m.event_id = p_event_id
      and m.user_id = p_user_id
  );
$$;

create or replace function public.is_event_host(
  p_event_id uuid,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.members m
    where m.event_id = p_event_id
      and m.user_id = p_user_id
      and m.role = 'host'
  );
$$;

create or replace function public.is_event_manager(
  p_event_id uuid,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.members m
    where m.event_id = p_event_id
      and m.user_id = p_user_id
      and m.role in ('host', 'admin')
  );
$$;

create or replace function public.has_pending_event_invitation(
  p_event_id uuid,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.event_invitations ei
    where ei.event_id = p_event_id
      and ei.invitee_id = p_user_id
      and ei.status = 'pending'
  );
$$;

create or replace function public.can_access_event(
  p_event_id uuid,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_event_member(p_event_id, p_user_id)
    or public.has_pending_event_invitation(p_event_id, p_user_id);
$$;

create or replace function public.get_storage_limit_bytes(p_plan public.user_plan)
returns bigint
language sql
immutable
as $$
  select case p_plan
    when 'premium' then 53687091200::bigint  -- 50 Go
    else 2147483648::bigint                  -- 2 Go
  end;
$$;

create or replace function public.get_monthly_event_limit(p_plan public.user_plan)
returns integer
language sql
immutable
as $$
  select case p_plan
    when 'premium' then null
    else 10
  end;
$$;

create or replace function public.get_daily_photo_limit(p_plan public.user_plan)
returns integer
language sql
immutable
as $$
  select case p_plan
    when 'premium' then null
    else 50
  end;
$$;

create or replace function public.can_create_event(p_user_id uuid default auth.uid())
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_plan public.user_plan;
  v_limit integer;
  v_count integer;
begin
  if p_user_id is null then
    return false;
  end if;

  select plan into v_plan from public.profiles where id = p_user_id;
  v_limit := public.get_monthly_event_limit(v_plan);

  if v_limit is null then
    return true;
  end if;

  select count(*)::integer into v_count
  from public.events e
  where e.host_id = p_user_id
    and e.created_at >= date_trunc('month', now());

  return v_count < v_limit;
end;
$$;

create or replace function public.can_upload_photo(
  p_event_id uuid,
  p_file_size_bytes bigint,
  p_user_id uuid default auth.uid()
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_plan public.user_plan;
  v_storage_used bigint;
  v_storage_limit bigint;
  v_daily_limit integer;
  v_daily_count integer;
  v_event public.events%rowtype;
begin
  if p_user_id is null or not public.is_event_member(p_event_id, p_user_id) then
    return false;
  end if;

  select * into v_event from public.events where id = p_event_id;
  if not found or v_event.expires_at <= now() then
    return false;
  end if;

  select plan, storage_used_bytes
  into v_plan, v_storage_used
  from public.profiles
  where id = p_user_id;

  v_storage_limit := public.get_storage_limit_bytes(v_plan);

  if v_storage_used + p_file_size_bytes > v_storage_limit then
    return false;
  end if;

  v_daily_limit := public.get_daily_photo_limit(v_plan);
  if v_daily_limit is not null then
    select count(*)::integer into v_daily_count
    from public.photos ph
    where ph.user_id = p_user_id
      and ph.created_at >= date_trunc('day', now());

    if v_daily_count >= v_daily_limit then
      return false;
    end if;
  end if;

  return true;
end;
$$;

-- -----------------------------------------------------------------------------
-- 4. Triggers
-- -----------------------------------------------------------------------------

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger events_set_updated_at
before update on public.events
for each row execute function public.set_updated_at();

create trigger event_invitations_set_updated_at
before update on public.event_invitations
for each row execute function public.set_updated_at();

create trigger friendships_set_updated_at
before update on public.friendships
for each row execute function public.set_updated_at();

-- Profil auto-créé à l'inscription
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_username text;
begin
  v_username := coalesce(
    nullif(trim(new.raw_user_meta_data->>'username'), ''),
    split_part(new.email, '@', 1)
  );

  v_username := regexp_replace(lower(v_username), '[^a-z0-9_]', '_', 'g');
  v_username := left(v_username, 30);

  if char_length(v_username) < 3 then
    v_username := 'user_' || left(replace(new.id::text, '-', ''), 8);
  end if;

  insert into public.profiles (id, username)
  values (new.id, v_username)
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Le host devient membre automatiquement
create or replace function public.handle_new_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.members (event_id, user_id, role)
  values (new.id, new.host_id, 'host')
  on conflict (event_id, user_id) do update
    set role = excluded.role;

  return new;
end;
$$;

create trigger on_event_created
after insert on public.events
for each row execute function public.handle_new_event();

-- Mise à jour du stockage utilisateur
create or replace function public.sync_profile_storage_usage()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.profiles
    set storage_used_bytes = storage_used_bytes + new.file_size_bytes
    where id = new.user_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.profiles
    set storage_used_bytes = greatest(0, storage_used_bytes - old.file_size_bytes)
    where id = old.user_id;
    return old;
  elsif tg_op = 'UPDATE' and new.file_size_bytes <> old.file_size_bytes then
    update public.profiles
    set storage_used_bytes = greatest(
      0,
      storage_used_bytes - old.file_size_bytes + new.file_size_bytes
    )
    where id = new.user_id;
    return new;
  end if;

  return new;
end;
$$;

create trigger photos_sync_storage_usage
after insert or update or delete on public.photos
for each row execute function public.sync_profile_storage_usage();

-- -----------------------------------------------------------------------------
-- 5. RPC métier
-- -----------------------------------------------------------------------------

create or replace function public.accept_event_invitation(p_invitation_id uuid)
returns public.members
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invitation public.event_invitations%rowtype;
  v_member public.members%rowtype;
begin
  select * into v_invitation
  from public.event_invitations
  where id = p_invitation_id
    and invitee_id = auth.uid()
    and status = 'pending';

  if not found then
    raise exception 'Invitation introuvable ou non autorisée';
  end if;

  update public.event_invitations
  set status = 'accepted'
  where id = p_invitation_id;

  insert into public.members (event_id, user_id, role)
  values (v_invitation.event_id, v_invitation.invitee_id, 'participant')
  on conflict (event_id, user_id) do update
    set role = excluded.role
  returning * into v_member;

  return v_member;
end;
$$;

create or replace function public.decline_event_invitation(p_invitation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.event_invitations
  set status = 'declined'
  where id = p_invitation_id
    and invitee_id = auth.uid()
    and status = 'pending';

  if not found then
    raise exception 'Invitation introuvable ou non autorisée';
  end if;
end;
$$;

create or replace function public.accept_friend_request(p_friendship_id uuid)
returns public.friendships
language plpgsql
security definer
set search_path = public
as $$
declare
  v_friendship public.friendships%rowtype;
begin
  update public.friendships
  set status = 'accepted'
  where id = p_friendship_id
    and friend_id = auth.uid()
    and status = 'pending'
  returning * into v_friendship;

  if not found then
    raise exception 'Demande d''ami introuvable ou non autorisée';
  end if;

  return v_friendship;
end;
$$;

-- -----------------------------------------------------------------------------
-- 6. Row Level Security
-- -----------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.members enable row level security;
alter table public.event_invitations enable row level security;
alter table public.photos enable row level security;
alter table public.reactions enable row level security;
alter table public.friendships enable row level security;

-- profiles
create policy "profiles_select_authenticated"
on public.profiles
for select
to authenticated
using (true);

create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check (id = auth.uid());

create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

-- events
create policy "events_select_accessible"
on public.events
for select
to authenticated
using (public.can_access_event(id));

create policy "events_insert_authenticated"
on public.events
for insert
to authenticated
with check (
  host_id = auth.uid()
  and public.can_create_event(auth.uid())
);

create policy "events_update_host"
on public.events
for update
to authenticated
using (public.is_event_host(id))
with check (public.is_event_host(id));

create policy "events_delete_host"
on public.events
for delete
to authenticated
using (public.is_event_host(id));

-- members
create policy "members_select_same_event"
on public.members
for select
to authenticated
using (public.can_access_event(event_id));

create policy "members_insert_manager"
on public.members
for insert
to authenticated
with check (
  public.is_event_manager(event_id)
  or (
    user_id = auth.uid()
    and exists (
      select 1
      from public.event_invitations ei
      where ei.event_id = members.event_id
        and ei.invitee_id = auth.uid()
        and ei.status = 'accepted'
    )
  )
);

create policy "members_update_host"
on public.members
for update
to authenticated
using (public.is_event_host(event_id))
with check (public.is_event_host(event_id));

create policy "members_delete_host_or_self"
on public.members
for delete
to authenticated
using (
  public.is_event_host(event_id)
  or (user_id = auth.uid() and role <> 'host')
);

-- event_invitations
create policy "event_invitations_select_involved"
on public.event_invitations
for select
to authenticated
using (
  inviter_id = auth.uid()
  or invitee_id = auth.uid()
  or public.is_event_manager(event_id)
);

create policy "event_invitations_insert_manager"
on public.event_invitations
for insert
to authenticated
with check (
  inviter_id = auth.uid()
  and public.is_event_manager(event_id)
);

create policy "event_invitations_update_invitee"
on public.event_invitations
for update
to authenticated
using (invitee_id = auth.uid())
with check (invitee_id = auth.uid());

create policy "event_invitations_delete_manager_or_inviter"
on public.event_invitations
for delete
to authenticated
using (
  inviter_id = auth.uid()
  or public.is_event_manager(event_id)
);

-- photos
create policy "photos_select_member"
on public.photos
for select
to authenticated
using (public.is_event_member(event_id));

create policy "photos_insert_member_with_limits"
on public.photos
for insert
to authenticated
with check (
  user_id = auth.uid()
  and public.can_upload_photo(event_id, file_size_bytes)
);

create policy "photos_delete_author_or_host"
on public.photos
for delete
to authenticated
using (
  user_id = auth.uid()
  or public.is_event_host(event_id)
);

-- reactions
create policy "reactions_select_member"
on public.reactions
for select
to authenticated
using (
  exists (
    select 1
    from public.photos ph
    where ph.id = reactions.photo_id
      and public.is_event_member(ph.event_id)
  )
);

create policy "reactions_insert_member"
on public.reactions
for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.photos ph
    where ph.id = reactions.photo_id
      and public.is_event_member(ph.event_id)
  )
);

create policy "reactions_update_own"
on public.reactions
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "reactions_delete_own"
on public.reactions
for delete
to authenticated
using (user_id = auth.uid());

-- friendships
create policy "friendships_select_involved"
on public.friendships
for select
to authenticated
using (user_id = auth.uid() or friend_id = auth.uid());

create policy "friendships_insert_requester"
on public.friendships
for insert
to authenticated
with check (user_id = auth.uid());

create policy "friendships_update_recipient"
on public.friendships
for update
to authenticated
using (friend_id = auth.uid())
with check (friend_id = auth.uid());

create policy "friendships_delete_involved"
on public.friendships
for delete
to authenticated
using (user_id = auth.uid() or friend_id = auth.uid());

-- -----------------------------------------------------------------------------
-- 7. Storage (bucket event-photos)
-- Chemin attendu : {event_id}/{user_id}/{filename}
-- -----------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'event-photos',
  'event-photos',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.storage_event_id_from_path(p_path text)
returns uuid
language sql
immutable
as $$
  select nullif((storage.foldername(p_path))[1], '')::uuid;
$$;

create policy "event_photos_select_member"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'event-photos'
  and public.is_event_member(public.storage_event_id_from_path(name))
);

create policy "event_photos_insert_member"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'event-photos'
  and (storage.foldername(name))[2] = auth.uid()::text
  and public.is_event_member(public.storage_event_id_from_path(name))
);

create policy "event_photos_delete_author_or_host"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'event-photos'
  and (
    (storage.foldername(name))[2] = auth.uid()::text
    or public.is_event_host(public.storage_event_id_from_path(name))
  )
);

-- -----------------------------------------------------------------------------
-- 8. Realtime (galerie live & réactions)
-- -----------------------------------------------------------------------------

alter publication supabase_realtime add table public.photos;
alter publication supabase_realtime add table public.reactions;
alter publication supabase_realtime add table public.event_invitations;

-- -----------------------------------------------------------------------------
-- 9. Droits
-- -----------------------------------------------------------------------------

grant usage on schema public to anon, authenticated;

grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

grant execute on function public.accept_event_invitation(uuid) to authenticated;
grant execute on function public.decline_event_invitation(uuid) to authenticated;
grant execute on function public.accept_friend_request(uuid) to authenticated;
