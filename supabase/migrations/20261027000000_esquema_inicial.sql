create extension if not exists btree_gist with schema extensions;

create type papel_usuario as enum ('usuario', 'admin');
create type tipo_sala as enum ('reuniao', 'biblioteca', 'laboratorio');
create type status_reserva as enum ('pendente', 'aprovada', 'recusada', 'cancelada');

create table perfis (
  id uuid primary key references auth.users (id) on delete restrict,
  nome text not null,
  email text not null,
  papel papel_usuario not null default 'usuario',
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);
create unique index perfis_email_unico on perfis (lower(email));

create table salas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  tipo tipo_sala not null,
  capacidade integer not null check (capacidade > 0),
  recursos text[] not null default '{}',
  ativa boolean not null default true,
  criado_em timestamptz not null default now()
);
create unique index salas_nome_unico on salas (lower(nome));

create table reservas (
  id uuid primary key default gen_random_uuid(),
  sala_id uuid not null references salas (id),
  usuario_id uuid not null references perfis (id),
  inicio timestamptz not null,
  fim timestamptz not null,
  status status_reserva not null,
  finalidade text not null check (char_length(finalidade) <= 200),
  motivo_recusa text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  check (fim > inicio)
);
create index reservas_usuario_inicio_idx on reservas (usuario_id, inicio);
create index reservas_status_idx on reservas (status);

alter table reservas add constraint reservas_sem_conflito
  exclude using gist (sala_id with =, tstzrange(inicio, fim, '[)') with &&)
  where (status in ('pendente', 'aprovada'));

create table historico_reservas (
  id bigint generated always as identity primary key,
  reserva_id uuid not null references reservas (id),
  status_anterior status_reserva,
  status_novo status_reserva not null,
  alterado_por uuid not null references perfis (id),
  alterado_em timestamptz not null default now()
);
create index historico_reservas_reserva_idx on historico_reservas (reserva_id);

alter table perfis enable row level security;
alter table salas enable row level security;
alter table reservas enable row level security;
alter table historico_reservas enable row level security;
