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

export async function listRiskSignalsPaged(
  tenantId: string,
  opts: { kind?: string; severity?: string; limit?: number; offset?: number } = {}
) {
  const clauses: string[] = ['tenant_id = $1'];
  const params: any[] = [tenantId];
  let idx = 2;
  if (opts.kind) { clauses.push(`kind = $${idx++}`); params.push(opts.kind); }
  if (opts.severity) { clauses.push(`severity = $${idx++}`); params.push(opts.severity); }
  const where = clauses.join(' AND ');
  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 200);
  const offset = Math.max(opts.offset ?? 0, 0);
  const items = await pg.readMany(`SELECT * FROM risk_signals WHERE ${where} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`, params, { tenantId });
  const cntRow = await pg.oneOrNone(`SELECT COUNT(*)::int as c FROM risk_signals WHERE ${where}`, params, { tenantId });
  const total = cntRow?.c ?? 0;
  return { items, total, nextOffset: offset + items.length < total ? offset + items.length : null };
}

export async function listTrustScores(
  tenantId: string,
  limit = 50,
  offset = 0
) {
  const items = await pg.readMany(
    `SELECT * FROM trust_scores WHERE tenant_id = $1 ORDER BY updated_at DESC LIMIT $2 OFFSET $3`,
    [tenantId, limit, offset],
    { tenantId },
  );
  const cnt = await pg.oneOrNone(`SELECT COUNT(*)::int as c FROM trust_scores WHERE tenant_id = $1`, [tenantId], { tenantId });
  const total = cnt?.c ?? 0;
  return { items, total, nextOffset: offset + items.length < total ? offset + items.length : null };
}
