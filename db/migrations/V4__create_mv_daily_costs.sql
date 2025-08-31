create materialized view if not exists mv_daily_costs as
select date_trunc('day', ts) as day, tenant, expert,
       sum((signals->>'cost_cents')::numeric) as cost_cents
from rewards group by 1,2,3;
create index if not exists mv_daily_costs_idx on mv_daily_costs(day, tenant);
