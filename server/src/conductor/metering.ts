import { Pool } from 'pg';

const pg = new Pool({ connectionString: process.env.DATABASE_URL });

export async function recordMeters(
  tenant: string,
  m: {
    cpuSec: number;
    gbSec: number;
    egressGb: number;
    dpEpsilon: number;
    pluginCalls: number;
  },
) {
  await pg.query(
    `INSERT INTO meters(tenant, ts, cpu_sec, gb_sec, egress_gb, dp_epsilon, plugin_calls)
     VALUES ($1, now(), $2, $3, $4, $5, $6)`,
    [tenant, m.cpuSec, m.gbSec, m.egressGb, m.dpEpsilon, m.pluginCalls],
  );
}

export async function exportBillingCSV(tenant: string, month: string) {
  // Placeholder: return an S3 URI where an export job would write.
  return `s3://billing/${tenant}/${month}.csv`;
}
