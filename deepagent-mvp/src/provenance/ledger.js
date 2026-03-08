"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProvenanceLedger = void 0;
const pg_1 = require("pg");
const crypto_1 = require("crypto");
const config_1 = require("../config");
class ProvenanceLedger {
    pool;
    constructor() {
        this.pool = new pg_1.Pool(config_1.config.postgres);
    }
    async recordEvent(tenantId, runId, actor, type, payload) {
        const lastEvent = await this.getLastEvent(tenantId, runId);
        const prevHash = lastEvent ? lastEvent.hash : '';
        const canonicalPayload = JSON.stringify(payload);
        const hash = (0, crypto_1.createHash)('sha256')
            .update(prevHash + canonicalPayload)
            .digest('hex');
        const query = 'INSERT INTO provenance_events (tenant_id, run_id, actor, type, payload, prev_hash, hash) VALUES ($1, $2, $3, $4, $5, $6, $7)';
        await this.pool.query(query, [tenantId, runId, actor, type, payload, prevHash, hash]);
    }
    async getLastEvent(tenantId, runId) {
        const query = 'SELECT * FROM provenance_events WHERE tenant_id = $1 AND run_id = $2 ORDER BY ts DESC LIMIT 1';
        const result = await this.pool.query(query, [tenantId, runId]);
        return result.rows[0] || null;
    }
    async getEvents(tenantId, runId) {
        const query = 'SELECT * FROM provenance_events WHERE tenant_id = $1 AND run_id = $2 ORDER BY ts ASC';
        const result = await this.pool.query(query, [tenantId, runId]);
        return result.rows;
    }
}
exports.ProvenanceLedger = ProvenanceLedger;
