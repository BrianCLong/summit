import { pg } from '../../db/pg';

export type EvidenceBundle = {
  id: string;
  tenant_id?: string | null;
  service: string;
  release_id: string;
  artifacts: any[];
  slo: any;
  cost?: any;
  created_at?: string;
};

export async function saveEvidenceBundle(ev: EvidenceBundle) {
  await pg.write(
    `INSERT INTO evidence_bundles (id, tenant_id, service, release_id, artifacts, slo, cost)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     ON CONFLICT (id) DO UPDATE SET artifacts = EXCLUDED.artifacts, slo = EXCLUDED.slo, cost = EXCLUDED.cost`,
    [ev.id, ev.tenant_id || null, ev.service, ev.release_id, JSON.stringify(ev.artifacts || []), JSON.stringify(ev.slo || {}), JSON.stringify(ev.cost || null)],
  );
}

export async function getLatestEvidence(service: string, releaseId: string): Promise<EvidenceBundle | null> {
  return await pg.oneOrNone(
    `SELECT * FROM evidence_bundles WHERE service = $1 AND release_id = $2 ORDER BY created_at DESC LIMIT 1`,
    [service, releaseId],
  );
}

export async function listEvidence(
  service: string,
  releaseId: string,
  opts: { since?: string; until?: string; limit?: number; offset?: number } = {}
): Promise<EvidenceBundle[]> {
  const clauses: string[] = ['service = $1', 'release_id = $2'];
  const params: any[] = [service, releaseId];
  let idx = params.length + 1;
  if (opts.since) { clauses.push(`created_at >= $${idx++}`); params.push(new Date(opts.since).toISOString()); }
  if (opts.until) { clauses.push(`created_at <= $${idx++}`); params.push(new Date(opts.until).toISOString()); }
  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 200);
  const offset = Math.max(opts.offset ?? 0, 0);
  const sql = `SELECT * FROM evidence_bundles WHERE ${clauses.join(' AND ')} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;
  return await pg.readMany(sql, params);
}

