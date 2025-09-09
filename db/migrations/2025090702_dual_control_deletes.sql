CREATE TABLE IF NOT EXISTS deletion_requests (
  id uuid primary key default gen_random_uuid(),
  resource_type text not null,
  resource_id text not null,
  requested_by text not null,
  approved_by text,
  approved_at timestamptz,
  reason text,
  created_at timestamptz not null default now()
);