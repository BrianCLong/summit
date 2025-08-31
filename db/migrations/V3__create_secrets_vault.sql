create table if not exists secrets_vault (
  id text primary key,
  tenant text not null,
  alg text not null default 'KMS-AWS',
  blob bytea not null,
  created_at timestamptz not null default now()
);
