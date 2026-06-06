-- ============================================================================
--  PLATAFORMA DE SEGUIMIENTO DE OBJETIVOS — Esquema de base de datos (Supabase)
-- ----------------------------------------------------------------------------
--  Cómo usar:
--    1. Entra a tu proyecto en Supabase.
--    2. Menú izquierdo -> SQL Editor -> New query.
--    3. Pega TODO este archivo y pulsa "Run".
--  Es idempotente en lo posible: puedes volver a ejecutarlo si algo falla.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. TABLAS
-- ----------------------------------------------------------------------------

-- Perfil del usuario (extiende la tabla interna auth.users de Supabase)
create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      text,
  full_name  text,
  created_at timestamptz default now()
);

-- Catálogo de ESTADOS (la "máquina de estados"). Lo comparten objetivos y tareas.
create table if not exists public.statuses (
  id         serial primary key,
  slug       text unique not null,   -- identificador estable usado por el código
  name       text not null,          -- texto que ve el usuario
  sort_order int  not null           -- orden de avance
);

-- Equipos
create table if not exists public.teams (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  owner_id   uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz default now()
);

-- Pertenencia de usuarios a equipos
create table if not exists public.team_members (
  id         uuid primary key default gen_random_uuid(),
  team_id    uuid not null references public.teams (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  role       text not null default 'member',   -- 'owner' | 'member'
  created_at timestamptz default now(),
  unique (team_id, user_id)
);

-- Objetivos. Si team_id es NULL => objetivo personal.
create table if not exists public.objectives (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text,
  owner_id    uuid not null references public.profiles (id) on delete cascade,
  team_id     uuid references public.teams (id) on delete cascade,
  status_id   int  not null references public.statuses (id) default 1,
  due_date    date,
  created_at  timestamptz default now()
);

-- Tareas dentro de un objetivo
create table if not exists public.tasks (
  id           uuid primary key default gen_random_uuid(),
  objective_id uuid not null references public.objectives (id) on delete cascade,
  title        text not null,
  description  text,
  status_id    int  not null references public.statuses (id) default 1,
  assignee_id  uuid references public.profiles (id) on delete set null,
  created_at   timestamptz default now()
);

-- Estados iniciales (solo se insertan si la tabla está vacía)
insert into public.statuses (slug, name, sort_order)
select * from (values
  ('pending',     'Pendiente',   1),
  ('in_progress', 'En progreso', 2),
  ('done',        'Completado',  3)
) as v(slug, name, sort_order)
where not exists (select 1 from public.statuses);

-- ----------------------------------------------------------------------------
-- 2. CREACIÓN AUTOMÁTICA DEL PERFIL AL REGISTRARSE
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- 3. FUNCIONES AUXILIARES (evitan recursión infinita en las políticas RLS)
--    Son SECURITY DEFINER: corren con permisos elevados y NO disparan RLS,
--    por eso pueden consultar team_members/objectives sin entrar en bucle.
-- ----------------------------------------------------------------------------
create or replace function public.is_team_member(_team_id uuid, _user_id uuid)
returns boolean
language sql security definer set search_path = public stable
as $$
  select exists (
    select 1 from public.team_members
    where team_id = _team_id and user_id = _user_id
  );
$$;

create or replace function public.can_access_objective(_objective_id uuid)
returns boolean
language sql security definer set search_path = public stable
as $$
  select exists (
    select 1 from public.objectives o
    where o.id = _objective_id
      and (
        o.owner_id = auth.uid()
        or (o.team_id is not null and public.is_team_member(o.team_id, auth.uid()))
      )
  );
$$;

-- ----------------------------------------------------------------------------
-- 4. ACTIVAR RLS (Row Level Security) EN TODAS LAS TABLAS
-- ----------------------------------------------------------------------------
alter table public.profiles     enable row level security;
alter table public.statuses     enable row level security;
alter table public.teams        enable row level security;
alter table public.team_members enable row level security;
alter table public.objectives   enable row level security;
alter table public.tasks        enable row level security;

-- ----------------------------------------------------------------------------
-- 5. POLÍTICAS
--    (Se eliminan primero por si ya existían, para poder re-ejecutar el script)
-- ----------------------------------------------------------------------------

-- PROFILES: cualquier usuario autenticado puede leer perfiles (necesario para
-- mostrar nombres de miembros e invitar por email). Cada quien edita el suyo.
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated using (true);

drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles
  for insert to authenticated with check (id = auth.uid());

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update to authenticated using (id = auth.uid());

-- STATUSES: catálogo de solo lectura para todos los autenticados.
drop policy if exists statuses_select on public.statuses;
create policy statuses_select on public.statuses
  for select to authenticated using (true);

-- TEAMS: ves un equipo si eres su dueño o miembro. Solo el dueño lo crea/edita/borra.
drop policy if exists teams_select on public.teams;
create policy teams_select on public.teams
  for select to authenticated
  using (owner_id = auth.uid() or public.is_team_member(id, auth.uid()));

drop policy if exists teams_insert on public.teams;
create policy teams_insert on public.teams
  for insert to authenticated with check (owner_id = auth.uid());

drop policy if exists teams_update on public.teams;
create policy teams_update on public.teams
  for update to authenticated using (owner_id = auth.uid());

drop policy if exists teams_delete on public.teams;
create policy teams_delete on public.teams
  for delete to authenticated using (owner_id = auth.uid());

-- TEAM_MEMBERS: ves los miembros de tus equipos. El dueño agrega; tú puedes salirte.
drop policy if exists team_members_select on public.team_members;
create policy team_members_select on public.team_members
  for select to authenticated
  using (user_id = auth.uid() or public.is_team_member(team_id, auth.uid()));

drop policy if exists team_members_insert on public.team_members;
create policy team_members_insert on public.team_members
  for insert to authenticated
  with check (
    exists (select 1 from public.teams t
            where t.id = team_id and t.owner_id = auth.uid())
  );

drop policy if exists team_members_delete on public.team_members;
create policy team_members_delete on public.team_members
  for delete to authenticated
  using (
    user_id = auth.uid()
    or exists (select 1 from public.teams t
               where t.id = team_id and t.owner_id = auth.uid())
  );

-- OBJECTIVES: ves los tuyos y los de tus equipos. Pueden editarlos sus participantes.
drop policy if exists objectives_select on public.objectives;
create policy objectives_select on public.objectives
  for select to authenticated
  using (
    owner_id = auth.uid()
    or (team_id is not null and public.is_team_member(team_id, auth.uid()))
  );

drop policy if exists objectives_insert on public.objectives;
create policy objectives_insert on public.objectives
  for insert to authenticated
  with check (
    owner_id = auth.uid()
    and (team_id is null or public.is_team_member(team_id, auth.uid()))
  );

drop policy if exists objectives_update on public.objectives;
create policy objectives_update on public.objectives
  for update to authenticated
  using (
    owner_id = auth.uid()
    or (team_id is not null and public.is_team_member(team_id, auth.uid()))
  );

drop policy if exists objectives_delete on public.objectives;
create policy objectives_delete on public.objectives
  for delete to authenticated
  using (
    owner_id = auth.uid()
    or (team_id is not null and exists (
          select 1 from public.teams t
          where t.id = team_id and t.owner_id = auth.uid()))
  );

-- TASKS: acceso heredado del objetivo al que pertenecen.
drop policy if exists tasks_select on public.tasks;
create policy tasks_select on public.tasks
  for select to authenticated using (public.can_access_objective(objective_id));

drop policy if exists tasks_insert on public.tasks;
create policy tasks_insert on public.tasks
  for insert to authenticated with check (public.can_access_objective(objective_id));

drop policy if exists tasks_update on public.tasks;
create policy tasks_update on public.tasks
  for update to authenticated using (public.can_access_objective(objective_id));

drop policy if exists tasks_delete on public.tasks;
create policy tasks_delete on public.tasks
  for delete to authenticated using (public.can_access_objective(objective_id));

-- ============================================================================
--  FIN. Si todo salió bien, no deberías ver errores en rojo.
-- ============================================================================
