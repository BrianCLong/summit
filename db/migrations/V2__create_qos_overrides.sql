create table if not exists qos_overrides (
  id bigserial primary key,
  tenant_id text not null,
  expert text default null,          -- null = all experts for tenant
  explore_max real not null check (explore_max >= 0 and explore_max <= 1),
  expires_at timestamptz not null,
  reason text not null,
  actor text not null,
  created_at timestamptz not null default now()
);
create index if not exists qos_overrides_active_idx
  on qos_overrides(tenant_id, expert, expires_at) where expires_at > now();
