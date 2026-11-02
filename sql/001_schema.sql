-- ============================================================
-- CV Studio — esquema inicial (tablas, RLS y datos semilla)
-- ============================================================

-- Perfil del usuario (1:1 con auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nombre text,
  titulo text,
  ciudad text,
  bio text,
  foto_url text,
  email text,
  preferencias jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- CV del usuario (contenido flexible en JSON)
create table if not exists public.cvs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  contenido jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Vacantes semilla (lectura para usuarios autenticados)
create table if not exists public.vacancies (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  empresa text not null,
  ubicacion text,
  descripcion text,
  skills text[] not null default '{}',
  created_at timestamptz not null default now()
);

-- Movimientos financieros del usuario
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  tipo text not null check (tipo in ('ingreso', 'gasto')),
  categoria text not null,
  monto numeric(12, 2) not null check (monto >= 0),
  fecha date not null default current_date,
  nota text,
  created_at timestamptz not null default now()
);

create index if not exists transactions_user_fecha_idx
  on public.transactions (user_id, fecha desc);

-- ------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.cvs enable row level security;
alter table public.vacancies enable row level security;
alter table public.transactions enable row level security;

-- Profiles
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- CVs
create policy "cvs_select_own"
  on public.cvs for select
  using (auth.uid() = user_id);

create policy "cvs_insert_own"
  on public.cvs for insert
  with check (auth.uid() = user_id);

create policy "cvs_update_own"
  on public.cvs for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Vacancies: solo lectura para autenticados
create policy "vacancies_select_authenticated"
  on public.vacancies for select
  to authenticated
  using (true);

-- Transactions
create policy "transactions_select_own"
  on public.transactions for select
  using (auth.uid() = user_id);

create policy "transactions_insert_own"
  on public.transactions for insert
  with check (auth.uid() = user_id);

create policy "transactions_update_own"
  on public.transactions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "transactions_delete_own"
  on public.transactions for delete
  using (auth.uid() = user_id);

-- ------------------------------------------------------------
-- Trigger: crear perfil al registrarse
-- ------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nombre, email, foto_url, preferencias)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    new.raw_user_meta_data->>'avatar_url',
    jsonb_build_object(
      'moneda', 'USD',
      'intereses', '[]'::jsonb,
      'disponibilidad', 'inmediata',
      'tema', 'claro'
    )
  )
  on conflict (id) do nothing;

  insert into public.cvs (user_id, contenido)
  values (
    new.id,
    jsonb_build_object(
      'experiencia', '[]'::jsonb,
      'educacion', '[]'::jsonb,
      'skills', '[]'::jsonb,
      'proyectos', '[]'::jsonb
    )
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Evitar que anon/authenticated invoquen el SECURITY DEFINER por RPC
revoke execute on function public.handle_new_user() from public, anon, authenticated;
grant execute on function public.handle_new_user() to postgres, service_role;

-- ------------------------------------------------------------
-- Semilla de vacantes
-- ------------------------------------------------------------
insert into public.vacancies (titulo, empresa, ubicacion, descripcion, skills)
values
  ('Frontend Junior', 'MercadoLibre', 'Remoto LATAM', 'Desarrollo de interfaces con React y buenas prácticas de accesibilidad.', array['HTML','CSS','JavaScript','React']),
  ('React Developer', 'Globant', 'Bogotá / Híbrido', 'Construcción de componentes reutilizables y consumo de APIs REST.', array['JavaScript','React','TypeScript','CSS']),
  ('UI Engineer', 'Rappi', 'Remoto', 'Implementación de design systems y microfrontends.', array['HTML','CSS','JavaScript','Design Systems']),
  ('Desarrollador Web Full Stack', 'Bancolombia', 'Medellín', 'Aplicaciones internas con Node y frontend moderno.', array['JavaScript','Node','SQL','HTML']),
  ('Analista Frontend', 'Softtek', 'Remoto', 'Mantenimiento y evolución de portales corporativos.', array['HTML','CSS','JavaScript','Accessibility']),
  ('Junior Web Developer', 'Accenture', 'Bogotá', 'Soporte a proyectos digitales y componentes UI.', array['HTML','CSS','JavaScript','Git']),
  ('Especialista UX/UI Frontend', 'Platzi', 'Remoto', 'Prototipos de alta fidelidad llevados a código.', array['CSS','Figma','JavaScript','HTML']),
  ('Desarrollador JavaScript', 'IBM', 'Remoto LATAM', 'Features orientadas a datos y dashboards interactivos.', array['JavaScript','Charts','SQL','CSS']),
  ('Frontend con Supabase', 'Startup Local', 'Remoto', 'SPAs con autenticación social y Postgres.', array['JavaScript','Supabase','HTML','CSS']),
  ('Ingeniero de Software Jr', 'Nequi', 'Medellín', 'Productos financieros digitales y dashboards de usuario.', array['JavaScript','Finanzas','SQL','React']),
  ('Web Designer Developer', 'Agencia Creativa', 'Cali', 'Sitios marketing y landing pages de alto rendimiento.', array['HTML','CSS','JavaScript','SEO']),
  ('Full Stack Junior', 'Andes Tech', 'Bogotá', 'CRUD, auth y despliegues estáticos con BaaS.', array['JavaScript','Supabase','Node','HTML']),
  ('Desarrollador de Portafolios', 'Talent Hub', 'Remoto', 'Herramientas de CV interactivo y matching laboral.', array['JavaScript','HTML','CSS','UX']),
  ('Associate Software Engineer', 'EPAM', 'Remoto', 'Equipos ágiles, code review y entrega continua.', array['JavaScript','Git','CSS','Testing']),
  ('Frontend Intern+', 'Google Developer Groups', 'Remoto', 'Proyectos open source y componentes accesibles.', array['HTML','CSS','JavaScript','A11y']);
