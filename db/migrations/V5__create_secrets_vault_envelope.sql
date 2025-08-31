create table if not exists secrets_vault (
  id text primary key,
  tenant text not null,
  purpose text not null,
  edek bytea not null,
  iv bytea not null,
  tag bytea not null,
  ct bytea not null,
  ctx jsonb not null,
  created_at timestamptz default now()
);
create index if not exists secrets_vault_tenant on secrets_vault(tenant);
