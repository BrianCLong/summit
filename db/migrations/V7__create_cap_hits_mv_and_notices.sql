-- Count exploration-cap denies by tenant/expert over a rolling 30-day window
create materialized view if not exists mv_cap_hits_30d as
select tenant as tenant_id,
       coalesce(details->>'expert','*') as expert,
       count(*)::int as hits_30d
from audit_log
where action='admission_denied'
  and details->>'reason' ~ 'exploration cap'
  and at >= now() - interval '30 days'
group by 1,2;

create index if not exists mv_cap_hits_30d_idx on mv_cap_hits_30d(tenant_id, expert);

-- Notices table
create table if not exists tenant_notices (
  id bigserial primary key,
  tenant_id text not null,
  kind text not null,      -- 'upgrade_suggest'
  message text not null,
  severity text not null default 'info',  -- info|warn
  created_at timestamptz default now(),
  expires_at timestamptz not null
);

-- Upsert helper for idempotent daily hints
create or replace function add_upgrade_notice(p_tenant text, p_msg text, p_ttl_hours int)
returns void language plpgsql as $$
begin
  delete from tenant_notices where tenant_id=p_tenant and kind='upgrade_suggest';
  insert into tenant_notices(tenant_id, kind, message, severity, expires_at)
  values (p_tenant, 'upgrade_suggest', p_msg, 'info', now() + (p_ttl_hours || ' hours')::interval);
end $$;
