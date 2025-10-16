import client from 'prom-client';
export const usage = new client.Counter({
  name: 'usage_api_calls',
  help: 'API calls',
  labelNames: ['tenant'],
});
export async function recordUsage(
  db,
  tenantId: string,
  key = 'api_calls_per_day',
) {
  await db.none(
    'insert into quota_usage(tenant_id,key,period,used) values($1,$2,current_date,1)\                 on conflict (tenant_id,key,period) do update set used=quota_usage.used+1',
    [tenantId, key],
  );
  usage.inc({ tenant: tenantId });
}
