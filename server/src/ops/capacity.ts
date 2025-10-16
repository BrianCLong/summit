import { Pool } from 'pg';

const pg = new Pool({ connectionString: process.env.DATABASE_URL });
const RATE_CPU_SEC_USD = parseFloat(process.env.RATE_CPU_SEC_USD || '0.000011');
const RATE_GPU_SEC_USD = parseFloat(process.env.RATE_GPU_SEC_USD || '0.0006');
const RATE_GB_SEC_USD = parseFloat(process.env.RATE_GB_SEC_USD || '0.000002');
const RATE_EGRESS_GB_USD = parseFloat(process.env.RATE_EGRESS_GB_USD || '0.09');

export async function rollup(tenant: string, from: string, to: string) {
  const {
    rows: [m],
  } = await pg.query(
    `SELECT COALESCE(SUM(cpu_sec),0) cpu_sec, COALESCE(SUM(gb_sec),0) gb_sec, COALESCE(SUM(egress_gb),0) egress_gb
     FROM meters WHERE tenant=$1 AND ts BETWEEN $2 AND $3`,
    [tenant, from, to],
  );
  const {
    rows: [g],
  } = await pg.query(
    `SELECT COALESCE(SUM(gpu_sec),0) gpu_sec FROM gpu_meters WHERE tenant=$1 AND ts BETWEEN $2 AND $3`,
    [tenant, from, to],
  );
  const usage = {
    cpu_sec: Number(m?.cpu_sec || 0),
    gb_sec: Number(m?.gb_sec || 0),
    egress_gb: Number(m?.egress_gb || 0),
    gpu_sec: Number(g?.gpu_sec || 0),
  };
  const costUsd =
    usage.cpu_sec * RATE_CPU_SEC_USD +
    usage.gb_sec * RATE_GB_SEC_USD +
    usage.egress_gb * RATE_EGRESS_GB_USD +
    usage.gpu_sec * RATE_GPU_SEC_USD;
  return { window: { from, to }, usage, costUsd };
}
