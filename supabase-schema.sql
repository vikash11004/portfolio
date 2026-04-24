-- Run this in Supabase SQL Editor.
-- Replace YOUR_OWNER_EMAIL before running this script.

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  category text not null check (category in ('web', 'design', 'oss', 'software')),
  categories jsonb not null default '[]',
  year int,
  role text not null,
  thumbnail_url text not null,
  screenshot_urls jsonb not null default '[]',
  description_html text not null,
  tech_stack jsonb not null default '[]',
  live_url text,
  github_url text,
  featured boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select on public.projects to anon, authenticated;
grant insert, update, delete on public.projects to authenticated;

alter table public.projects
add column categories jsonb not null default '[]';

alter table public.projects
add column screenshot_urls jsonb not null default '[]';

update public.projects
set categories = jsonb_build_array(category)
where categories is null
  or categories = '[]'::jsonb;

update public.projects
set screenshot_urls = jsonb_build_array(thumbnail_url)
where screenshot_urls is null
  or screenshot_urls = '[]'::jsonb;

notify pgrst, 'reload schema';

alter table public.projects enable row level security;

drop policy if exists projects_select_authenticated on public.projects;
drop policy if exists projects_select_public on public.projects;
create policy projects_select_public
on public.projects
for select
to anon, authenticated
using (true);

drop policy if exists projects_insert_owner_only on public.projects;
create policy projects_insert_owner_only
on public.projects
for insert
to authenticated
with check ((auth.jwt() ->> 'email') = 'YOUR_OWNER_EMAIL');

drop policy if exists projects_update_owner_only on public.projects;
create policy projects_update_owner_only
on public.projects
for update
to authenticated
using ((auth.jwt() ->> 'email') = 'YOUR_OWNER_EMAIL')
with check ((auth.jwt() ->> 'email') = 'YOUR_OWNER_EMAIL');

drop policy if exists projects_delete_owner_only on public.projects;
create policy projects_delete_owner_only
on public.projects
for delete
to authenticated
using ((auth.jwt() ->> 'email') = 'YOUR_OWNER_EMAIL');
