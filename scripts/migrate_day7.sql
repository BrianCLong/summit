-- scripts/migrate_day7.sql
create table if not exists entities (
  id uuid primary key,
  type text not null,
  canonical_name text,
  created_at timestamptz default now()
);
create table if not exists entity_claim_links (
  entity_id uuid references entities(id),
  claim_manifest_id text not null,
  claim_key text not null,
  claim_value text not null,
  conf numeric,
  primary key(entity_id, claim_manifest_id, claim_key)
);
alter table interface_registry add column if not exists hint_patterns text[];
