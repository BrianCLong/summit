import { pg } from '../../db/pg';
import { appendTenantFilter, resolveTenantId } from '../../tenancy/tenantScope.js';

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
  const tenantId = resolveTenantId(ev.tenant_id, 'evidence.save');
  await pg.write(
    `INSERT INTO evidence_bundles (id, tenant_id, service, release_id, artifacts, slo, cost)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     ON CONFLICT (id) DO UPDATE SET artifacts = EXCLUDED.artifacts, slo = EXCLUDED.slo, cost = EXCLUDED.cost`,
    [
      ev.id,
      tenantId,
      ev.service,
      ev.release_id,
      JSON.stringify(ev.artifacts || []),
      JSON.stringify(ev.slo || {}),
      JSON.stringify(ev.cost || null),
    ],
    { tenantId },
  );
}

export async function getLatestEvidence(
  service: string,
  releaseId: string,
  tenantId?: string,
): Promise<EvidenceBundle | null> {
  const scopedTenantId = resolveTenantId(tenantId, 'evidence.getLatest');
  return await pg.oneOrNone(
    appendTenantFilter(
      `SELECT * FROM evidence_bundles WHERE service = $1 AND release_id = $2`,
      3,
    ) + ' ORDER BY created_at DESC LIMIT 1',
    [service, releaseId, scopedTenantId],
    { tenantId: scopedTenantId },
  );
}

export async function listEvidence(
  service: string,
  releaseId: string,
  opts: {
    since?: string;
    until?: string;
    limit?: number;
    offset?: number;
    tenantId?: string;
  } = {},
): Promise<EvidenceBundle[]> {
  const tenantId = resolveTenantId(opts.tenantId, 'evidence.list');
  const clauses: string[] = ['service = $1', 'release_id = $2'];
  const params: any[] = [service, releaseId];
  let idx = params.length + 1;
  clauses.push(`tenant_id = $${idx++}`);
  params.push(tenantId);
  if (opts.since) {
    clauses.push(`created_at >= $${idx++}`);
    params.push(new Date(opts.since).toISOString());
  }
  if (opts.until) {
    clauses.push(`created_at <= $${idx++}`);
    params.push(new Date(opts.until).toISOString());
  }
  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 200);
  const offset = Math.max(opts.offset ?? 0, 0);
  const sql = `SELECT * FROM evidence_bundles WHERE ${clauses.join(' AND ')} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;
  return await pg.readMany(sql, params, { tenantId });
}
