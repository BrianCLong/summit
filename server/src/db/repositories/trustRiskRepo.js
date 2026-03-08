"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.upsertTrustScore = upsertTrustScore;
exports.getTrustScore = getTrustScore;
exports.insertRiskSignal = insertRiskSignal;
exports.listRecentSignals = listRecentSignals;
exports.listRiskSignalsPaged = listRiskSignalsPaged;
exports.listTrustScores = listTrustScores;
const pg_js_1 = require("../../db/pg.js");
async function upsertTrustScore(tenantId, subjectId, score, reasons, evidenceId) {
    const id = `ts_${tenantId}_${subjectId}`;
    await pg_js_1.pg.write(`INSERT INTO trust_scores (id, tenant_id, subject_id, score, reasons, evidence_id)
     VALUES ($1,$2,$3,$4,$5,$6)
     ON CONFLICT (id) DO UPDATE SET score = EXCLUDED.score, reasons = EXCLUDED.reasons, evidence_id = EXCLUDED.evidence_id, updated_at = now()`, [
        id,
        tenantId,
        subjectId,
        score,
        JSON.stringify(reasons || []),
        evidenceId || null,
    ], { tenantId });
    return id;
}
async function getTrustScore(tenantId, subjectId) {
    return await pg_js_1.pg.oneOrNone(`SELECT * FROM trust_scores WHERE tenant_id = $1 AND subject_id = $2 ORDER BY updated_at DESC LIMIT 1`, [tenantId, subjectId], { tenantId });
}
async function insertRiskSignal(rec) {
    await pg_js_1.pg.write(`INSERT INTO risk_signals (id, tenant_id, kind, severity, message, source, context, evidence_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`, [
        rec.id,
        rec.tenant_id,
        rec.kind,
        rec.severity,
        rec.message,
        rec.source,
        JSON.stringify(rec.context || null),
        rec.evidence_id || null,
    ], { tenantId: rec.tenant_id });
}
async function listRecentSignals(tenantId, subjectId, limit = 50) {
    // subjectId can be embedded in context, depending on adoption; filter client-side if needed
    return await pg_js_1.pg.readMany(`SELECT * FROM risk_signals WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT $2`, [tenantId, limit], { tenantId });
}
async function listRiskSignalsPaged(tenantId, opts = {}) {
    const clauses = ['tenant_id = $1'];
    const params = [tenantId];
    let idx = 2;
    if (opts.kind) {
        clauses.push(`kind = $${idx++}`);
        params.push(opts.kind);
    }
    if (opts.severity) {
        clauses.push(`severity = $${idx++}`);
        params.push(opts.severity);
    }
    const where = clauses.join(' AND ');
    const limit = Math.min(Math.max(opts.limit ?? 50, 1), 200);
    const offset = Math.max(opts.offset ?? 0, 0);
    const items = await pg_js_1.pg.readMany(`SELECT * FROM risk_signals WHERE ${where} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`, params, { tenantId });
    const cntRow = await pg_js_1.pg.oneOrNone(`SELECT COUNT(*)::int as c FROM risk_signals WHERE ${where}`, params, { tenantId });
    const total = cntRow?.c ?? 0;
    return {
        items,
        total,
        nextOffset: offset + items.length < total ? offset + items.length : null,
    };
}
async function listTrustScores(tenantId, limit = 50, offset = 0) {
    const items = await pg_js_1.pg.readMany(`SELECT * FROM trust_scores WHERE tenant_id = $1 ORDER BY updated_at DESC LIMIT $2 OFFSET $3`, [tenantId, limit, offset], { tenantId });
    const cnt = await pg_js_1.pg.oneOrNone(`SELECT COUNT(*)::int as c FROM trust_scores WHERE tenant_id = $1`, [tenantId], { tenantId });
    const total = cnt?.c ?? 0;
    return {
        items,
        total,
        nextOffset: offset + items.length < total ? offset + items.length : null,
    };
}
