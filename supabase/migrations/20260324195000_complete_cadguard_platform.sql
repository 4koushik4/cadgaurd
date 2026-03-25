/*
  CADGuard AI - Complete production schema
  Includes: tables, constraints, indexes, triggers, storage buckets, and RLS policies.
*/

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 160),
  description text default '',
  file_format text not null check (lower(file_format) in ('stl', 'step', 'stp', 'obj')),
  file_url text not null,
  file_path text,
  file_size bigint not null default 0,
  quality_score numeric(5,2) not null default 0 check (quality_score >= 0 and quality_score <= 100),
  status text not null default 'uploaded' check (status in ('uploaded', 'processing', 'completed', 'failed')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.projects add column if not exists file_path text;

create table if not exists public.validations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  validation_type text not null default 'comprehensive',
  status text not null default 'pending' check (status in ('pending', 'running', 'completed', 'failed')),
  total_issues int not null default 0,
  critical_issues int not null default 0,
  warnings int not null default 0,
  info_count int not null default 0,
  execution_time numeric(8,3) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.issues (
  id uuid primary key default gen_random_uuid(),
  validation_id uuid not null references public.validations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  rule_id text not null,
  severity text not null check (severity in ('critical', 'high', 'medium', 'low')),
  category text not null,
  title text not null,
  description text not null default '',
  measured_value numeric,
  expected_value numeric,
  unit text default '',
  location jsonb not null default '{}'::jsonb,
  ai_explanation text not null default '',
  ai_suggestion text not null default '',
  status text not null default 'open' check (status in ('open', 'resolved', 'ignored')),
  created_at timestamptz not null default now()
);

create table if not exists public.simulation_results (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  simulation_type text not null default 'stress_analysis',
  load_conditions jsonb not null default '{}'::jsonb,
  material_properties jsonb not null default '{}'::jsonb,
  max_stress numeric not null default 0,
  max_displacement numeric not null default 0,
  safety_factor numeric not null default 0,
  failure_prediction jsonb not null default '{}'::jsonb,
  visualization_data jsonb not null default '{}'::jsonb,
  passed boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.design_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  issue_pattern text not null,
  fix_applied text not null,
  success_rate numeric(5,2) not null default 0,
  usage_count int not null default 0,
  category text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ux_design_history_user_pattern unique (user_id, issue_pattern)
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  validation_id uuid references public.validations(id) on delete set null,
  report_type text not null,
  format text not null default 'web',
  file_url text default '',
  content jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_projects_user_id on public.projects(user_id);
create index if not exists idx_projects_status on public.projects(status);
create index if not exists idx_projects_quality_score on public.projects(quality_score);
create index if not exists idx_validations_project_id on public.validations(project_id);
create index if not exists idx_issues_validation_id on public.issues(validation_id);
create index if not exists idx_issues_project_id on public.issues(project_id);
create index if not exists idx_issues_severity on public.issues(severity);
create index if not exists idx_simulation_project_id on public.simulation_results(project_id);
create index if not exists idx_reports_project_id on public.reports(project_id);
create index if not exists idx_design_history_user_pattern on public.design_history(user_id, issue_pattern);

drop trigger if exists set_projects_updated_at on public.projects;
create trigger set_projects_updated_at
before update on public.projects
for each row
execute function public.set_updated_at();

drop trigger if exists set_design_history_updated_at on public.design_history;
create trigger set_design_history_updated_at
before update on public.design_history
for each row
execute function public.set_updated_at();

alter table public.projects enable row level security;
alter table public.validations enable row level security;
alter table public.issues enable row level security;
alter table public.simulation_results enable row level security;
alter table public.design_history enable row level security;
alter table public.reports enable row level security;

drop policy if exists "Users can view own projects" on public.projects;
drop policy if exists "Users can create own projects" on public.projects;
drop policy if exists "Users can update own projects" on public.projects;
drop policy if exists "Users can delete own projects" on public.projects;

create policy "Users can view own projects"
on public.projects for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can create own projects"
on public.projects for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update own projects"
on public.projects for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete own projects"
on public.projects for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can view validations for own projects" on public.validations;
drop policy if exists "Users can create validations for own projects" on public.validations;
drop policy if exists "Users can update validations for own projects" on public.validations;

create policy "Users can view validations for own projects"
on public.validations for select
to authenticated
using (
  exists (
    select 1 from public.projects p
    where p.id = validations.project_id
      and p.user_id = auth.uid()
  )
);

create policy "Users can create validations for own projects"
on public.validations for insert
to authenticated
with check (
  exists (
    select 1 from public.projects p
    where p.id = validations.project_id
      and p.user_id = auth.uid()
  )
);

create policy "Users can update validations for own projects"
on public.validations for update
to authenticated
using (
  exists (
    select 1 from public.projects p
    where p.id = validations.project_id
      and p.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.projects p
    where p.id = validations.project_id
      and p.user_id = auth.uid()
  )
);

drop policy if exists "Users can view issues for own projects" on public.issues;
drop policy if exists "Users can create issues for own projects" on public.issues;
drop policy if exists "Users can update issues for own projects" on public.issues;

create policy "Users can view issues for own projects"
on public.issues for select
to authenticated
using (
  exists (
    select 1 from public.projects p
    where p.id = issues.project_id
      and p.user_id = auth.uid()
  )
);

create policy "Users can create issues for own projects"
on public.issues for insert
to authenticated
with check (
  exists (
    select 1 from public.projects p
    where p.id = issues.project_id
      and p.user_id = auth.uid()
  )
);

create policy "Users can update issues for own projects"
on public.issues for update
to authenticated
using (
  exists (
    select 1 from public.projects p
    where p.id = issues.project_id
      and p.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.projects p
    where p.id = issues.project_id
      and p.user_id = auth.uid()
  )
);

drop policy if exists "Users can view simulations for own projects" on public.simulation_results;
drop policy if exists "Users can create simulations for own projects" on public.simulation_results;

create policy "Users can view simulations for own projects"
on public.simulation_results for select
to authenticated
using (
  exists (
    select 1 from public.projects p
    where p.id = simulation_results.project_id
      and p.user_id = auth.uid()
  )
);

create policy "Users can create simulations for own projects"
on public.simulation_results for insert
to authenticated
with check (
  exists (
    select 1 from public.projects p
    where p.id = simulation_results.project_id
      and p.user_id = auth.uid()
  )
);

drop policy if exists "Users can view own design history" on public.design_history;
drop policy if exists "Users can create own design history" on public.design_history;
drop policy if exists "Users can update own design history" on public.design_history;

create policy "Users can view own design history"
on public.design_history for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can create own design history"
on public.design_history for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update own design history"
on public.design_history for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can view reports for own projects" on public.reports;
drop policy if exists "Users can create reports for own projects" on public.reports;

create policy "Users can view reports for own projects"
on public.reports for select
to authenticated
using (
  exists (
    select 1 from public.projects p
    where p.id = reports.project_id
      and p.user_id = auth.uid()
  )
);

create policy "Users can create reports for own projects"
on public.reports for insert
to authenticated
with check (
  exists (
    select 1 from public.projects p
    where p.id = reports.project_id
      and p.user_id = auth.uid()
  )
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('cad-files', 'cad-files', true, 104857600, array['application/sla', 'model/stl', 'text/plain', 'application/step', 'application/octet-stream']),
  ('reports', 'reports', true, 52428800, array['application/json', 'text/html', 'application/pdf'])
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Read own CAD files" on storage.objects;
drop policy if exists "Upload own CAD files" on storage.objects;
drop policy if exists "Update own CAD files" on storage.objects;
drop policy if exists "Delete own CAD files" on storage.objects;
drop policy if exists "Read own reports" on storage.objects;
drop policy if exists "Upload own reports" on storage.objects;
drop policy if exists "Delete own reports" on storage.objects;

create policy "Read own CAD files"
on storage.objects for select
to authenticated
using (
  bucket_id = 'cad-files'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Upload own CAD files"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'cad-files'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Update own CAD files"
on storage.objects for update
to authenticated
using (
  bucket_id = 'cad-files'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'cad-files'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Delete own CAD files"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'cad-files'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Read own reports"
on storage.objects for select
to authenticated
using (
  bucket_id = 'reports'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Upload own reports"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'reports'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Delete own reports"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'reports'
  and (storage.foldername(name))[1] = auth.uid()::text
);
