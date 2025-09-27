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

