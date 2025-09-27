import { pg } from '../../db/pg';

export type TrustScoreRecord = {
  id: string;
  tenant_id: string;
  subject_id: string;
  score: number;
  reasons: any[];
  evidence_id?: string | null;
  created_at: string;
  updated_at: string;
};

export async function upsertTrustScore(tenantId: string, subjectId: string, score: number, reasons: any[], evidenceId?: string) {
  const id = `ts_${tenantId}_${subjectId}`;
  await pg.write(
    `INSERT INTO trust_scores (id, tenant_id, subject_id, score, reasons, evidence_id)
     VALUES ($1,$2,$3,$4,$5,$6)
     ON CONFLICT (id) DO UPDATE SET score = EXCLUDED.score, reasons = EXCLUDED.reasons, evidence_id = EXCLUDED.evidence_id, updated_at = now()`,
    [id, tenantId, subjectId, score, JSON.stringify(reasons || []), evidenceId || null],
    { tenantId },
  );
  return id;
}

export async function getTrustScore(tenantId: string, subjectId: string): Promise<TrustScoreRecord | null> {
  return await pg.oneOrNone(
    `SELECT * FROM trust_scores WHERE tenant_id = $1 AND subject_id = $2 ORDER BY updated_at DESC LIMIT 1`,
    [tenantId, subjectId],
    { tenantId },
  );
}

export type RiskSignalRecord = {
  id: string;
  tenant_id: string;
  kind: string;
  severity: string;
  message: string;
  source: string;
  context?: any;
  evidence_id?: string | null;
  created_at: string;
};

export async function insertRiskSignal(rec: Omit<RiskSignalRecord, 'created_at'>) {
  await pg.write(
    `INSERT INTO risk_signals (id, tenant_id, kind, severity, message, source, context, evidence_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [rec.id, rec.tenant_id, rec.kind, rec.severity, rec.message, rec.source, JSON.stringify(rec.context || null), rec.evidence_id || null],
    { tenantId: rec.tenant_id },
  );
}

export async function listRecentSignals(tenantId: string, subjectId?: string, limit = 50): Promise<RiskSignalRecord[]> {
  // subjectId can be embedded in context, depending on adoption; filter client-side if needed
  return await pg.readMany(
    `SELECT * FROM risk_signals WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT $2`,
    [tenantId, limit],
    { tenantId },
  );
}

