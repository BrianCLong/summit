import { Pool } from "pg";
import { AdmissionController } from "./admission";
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function loadOverride(tenantId: string, expert: string) {
  const q = `select explore_max from qos_overrides
             where tenant_id=$1 and (expert is null or expert=$2) and expires_at > now()
             order by expert nulls last, expires_at desc limit 1`;
  const { rows } = await pool.query(q, [tenantId, expert]);
  return rows[0]?.explore_max as number | undefined;
}

// Example use before calling shouldAdmit():
// const override = await loadOverride(req.tenantId, req.expert);
// if (override !== undefined) admission.setTemporaryExploreMax(req.tenantTier, override);
