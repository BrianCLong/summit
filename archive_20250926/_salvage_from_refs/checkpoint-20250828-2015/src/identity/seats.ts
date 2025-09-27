import { pool } from '../db/pg';
import { seatsGauge, approvalsPending } from '../metrics/identity';

export async function updateSeatMetrics(orgId: string) {
  const q1 = await pool.query(`SELECT count(*)::int AS n FROM "user" WHERE org_id=$1 AND status='active'`, [orgId]);
  const q2 = await pool.query(`
    SELECT count(*)::int AS n FROM "user" u
    JOIN membership m ON m.user_id=u.id
    JOIN "group" g ON g.id=m.group_id
    WHERE u.org_id=$1 AND u.status='active' AND g.name IN ('IntelGraph-Analyst','IntelGraph-Admin')`, [orgId]);
  seatsGauge.labels(orgId, 'total').set(q1.rows[0].n);
  seatsGauge.labels(orgId, 'privileged').set(q2.rows[0].n);
}

export async function updateApprovalsGauge(orgId: string) {
  const q = await pool.query(`SELECT count(*)::int AS n FROM access_request WHERE org_id=$1 AND status='pending'`, [orgId]);
  approvalsPending.labels(orgId).set(q.rows[0].n);
}
