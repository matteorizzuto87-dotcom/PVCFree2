-- CONTACTS TABLE
create table if not exists public.contacts (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  nome text not null,
  cognome text not null,
  azienda text not null,
  email text not null,
  categoria text check (categoria in ('Cliente','Fornitore','Altro')),
  regione text,
  polimero text check (polimero in ('TPE','TPO','TPU','BIO')),
  processo text check (processo in ('Stampaggio','Estrusione','Altro')),
  note text,
  images jsonb not null default '[]',
  created_by text
);
alter table public.contacts enable row level security;
create policy "contacts_select" on public.contacts for select using ( auth.role() = 'authenticated' );
create policy "contacts_insert" on public.contacts for insert with check ( auth.role() = 'authenticated' );
create policy "contacts_update" on public.contacts for update using ( auth.role() = 'authenticated' );
create policy "contacts_delete" on public.contacts for delete using ( auth.role() = 'authenticated' );

-- MATERIALS TABLE (for 'Database Materiali' tool)
create table if not exists public.materials (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  categoria text check (categoria in ('TPE','TPO','TPU','BIO')) not null,
  nome text not null,
  descrizione text,
  properties jsonb not null default '{}'::jsonb
);
alter table public.materials enable row level security;
create policy "materials_select" on public.materials for select using ( auth.role() = 'authenticated' );
create policy "materials_insert" on public.materials for insert with check ( auth.role() = 'authenticated' );
create policy "materials_update" on public.materials for update using ( auth.role() = 'authenticated' );
create policy "materials_delete" on public.materials for delete using ( auth.role() = 'authenticated' );
