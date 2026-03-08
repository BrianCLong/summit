"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveEvidenceBundle = saveEvidenceBundle;
exports.getLatestEvidence = getLatestEvidence;
exports.listEvidence = listEvidence;
const pg_js_1 = require("../../db/pg.js");
async function saveEvidenceBundle(ev) {
    await pg_js_1.pg.write(`INSERT INTO evidence_bundles (id, tenant_id, service, release_id, artifacts, slo, cost)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     ON CONFLICT (id) DO UPDATE SET artifacts = EXCLUDED.artifacts, slo = EXCLUDED.slo, cost = EXCLUDED.cost`, [
        ev.id,
        ev.tenant_id || null,
        ev.service,
        ev.release_id,
        JSON.stringify(ev.artifacts || []),
        JSON.stringify(ev.slo || {}),
        JSON.stringify(ev.cost || null),
    ]);
}
async function getLatestEvidence(service, releaseId) {
    return await pg_js_1.pg.oneOrNone(`SELECT * FROM evidence_bundles WHERE service = $1 AND release_id = $2 ORDER BY created_at DESC LIMIT 1`, [service, releaseId]);
}
async function listEvidence(service, releaseId, opts = {}) {
    const clauses = ['service = $1', 'release_id = $2'];
    const params = [service, releaseId];
    let idx = params.length + 1;
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
    return await pg_js_1.pg.readMany(sql, params);
}
