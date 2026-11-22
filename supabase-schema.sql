create table if not exists public.studymate_tasks (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  name text not null check (char_length(btrim(name)) between 1 and 200),
  due_date date not null,
  priority text not null check (priority in ('High', 'Medium', 'Low')),
  category text not null check (char_length(btrim(category)) between 1 and 40),
  completed boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

alter table public.studymate_tasks enable row level security;

grant select, insert, update, delete
  on public.studymate_tasks
  to authenticated;

drop policy if exists "Read own StudyMate tasks" on public.studymate_tasks;
create policy "Read own StudyMate tasks"
  on public.studymate_tasks for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Insert own StudyMate tasks" on public.studymate_tasks;
create policy "Insert own StudyMate tasks"
  on public.studymate_tasks for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Update own StudyMate tasks" on public.studymate_tasks;
create policy "Update own StudyMate tasks"
  on public.studymate_tasks for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Delete own StudyMate tasks" on public.studymate_tasks;
create policy "Delete own StudyMate tasks"
  on public.studymate_tasks for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create index if not exists studymate_tasks_user_due_date
  on public.studymate_tasks (user_id, due_date);

create table if not exists public.studymate_ai_usage (
  user_id uuid primary key references auth.users (id) on delete cascade,
  usage_date date not null,
  request_count integer not null check (request_count between 1 and 10)
);

alter table public.studymate_ai_usage enable row level security;

revoke all on public.studymate_ai_usage from anon, authenticated;

create or replace function public.consume_studymate_ai_quota(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  updated_request_count integer;
  today_utc date := (now() at time zone 'utc')::date;
begin
  insert into public.studymate_ai_usage as existing_usage
    (user_id, usage_date, request_count)
  values (p_user_id, today_utc, 1)
  on conflict (user_id) do update
    set usage_date = excluded.usage_date,
        request_count = case
          when existing_usage.usage_date < excluded.usage_date then 1
          else existing_usage.request_count + 1
        end
    where existing_usage.usage_date < excluded.usage_date
       or existing_usage.request_count < 10
  returning request_count into updated_request_count;

  return updated_request_count is not null;
end;
$$;

revoke all on function public.consume_studymate_ai_quota(uuid) from public, anon, authenticated;
grant execute on function public.consume_studymate_ai_quota(uuid) to service_role;
