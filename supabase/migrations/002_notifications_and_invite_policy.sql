-- =============================================================================
-- EventSnap — Notifications + invitation par tout membre
-- =============================================================================

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  event_id uuid references public.events (id) on delete cascade,
  message text not null,
  type text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_id_idx on public.notifications (user_id);
create index if not exists notifications_created_at_idx on public.notifications (created_at desc);

alter table public.notifications enable row level security;

drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own"
on public.notifications
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "notifications_insert_member" on public.notifications;
create policy "notifications_insert_member"
on public.notifications
for insert
to authenticated
with check (
  event_id is null
  or public.is_event_member(event_id)
);

drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own"
on public.notifications
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- Tout membre de l'événement peut inviter (pas seulement host/admin)
drop policy if exists "event_invitations_insert_manager" on public.event_invitations;

create policy "event_invitations_insert_member"
on public.event_invitations
for insert
to authenticated
with check (
  inviter_id = auth.uid()
  and public.is_event_member(event_id)
);

grant select, insert, update on public.notifications to authenticated;
