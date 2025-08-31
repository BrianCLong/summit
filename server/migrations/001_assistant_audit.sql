create table if not exists assistant_audit (
  id bigserial primary key,
  req_id text not null,
  user_id text,
  mode text not null check (mode in ('fetch','sse','socket')),
  input text not null,
  tokens integer not null default 0,
  ms integer not null default 0,
  status text not null check (status in ('ok','cancel','error')),
  created_at timestamptz not null default now()
);
create index if not exists idx_assistant_audit_req on assistant_audit(req_id);
create index if not exists idx_assistant_audit_user on assistant_audit(user_id);
