create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('validation', 'simulation', 'ai_alert', 'system')),
  title text not null,
  message text not null,
  level text not null default 'info' check (level in ('info', 'success', 'warning', 'error')),
  is_read boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  theme text not null default 'neon' check (theme in ('neon', 'dark')),
  ai_enabled boolean not null default true,
  notify_validation boolean not null default true,
  notify_simulation boolean not null default true,
  notify_ai_alerts boolean not null default true,
  updated_at timestamptz not null default now()
);

create index if not exists idx_notifications_user_created_at on public.notifications(user_id, created_at desc);
create index if not exists idx_notifications_user_read on public.notifications(user_id, is_read);

alter table public.notifications enable row level security;
alter table public.user_preferences enable row level security;

drop policy if exists "Users can view own notifications" on public.notifications;
drop policy if exists "Users can create own notifications" on public.notifications;
drop policy if exists "Users can update own notifications" on public.notifications;
drop policy if exists "Users can delete own notifications" on public.notifications;

create policy "Users can view own notifications"
on public.notifications for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can create own notifications"
on public.notifications for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update own notifications"
on public.notifications for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete own notifications"
on public.notifications for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can view own preferences" on public.user_preferences;
drop policy if exists "Users can create own preferences" on public.user_preferences;
drop policy if exists "Users can update own preferences" on public.user_preferences;

create policy "Users can view own preferences"
on public.user_preferences for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can create own preferences"
on public.user_preferences for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update own preferences"
on public.user_preferences for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create or replace function public.set_user_preferences_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_user_preferences_updated_at on public.user_preferences;
create trigger set_user_preferences_updated_at
before update on public.user_preferences
for each row
execute function public.set_user_preferences_updated_at();
