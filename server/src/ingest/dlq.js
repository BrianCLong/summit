"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DLQService = void 0;
// @ts-nocheck
const pg_js_1 = require("../db/pg.js");
const uuid_1 = require("uuid");
class DLQService {
    logger;
    constructor(logger) {
        this.logger = logger;
    }
    async sendToDLQ(record) {
        const id = (0, uuid_1.v4)();
        try {
            await pg_js_1.pg.none(`INSERT INTO ingestion_dlq (id, tenant_id, pipeline_key, stage, reason, payload)
         VALUES ($1, $2, $3, $4, $5, $6)`, [record.id || id, record.tenantId, record.pipelineKey, record.stage, record.reason, JSON.stringify(record.payload)]);
            this.logger.warn({ dlqId: id, pipeline: record.pipelineKey }, 'Record sent to DLQ');
        }
        catch (err) {
            this.logger.error({ err, originalRecord: record }, 'Failed to write to DLQ');
            // Last resort: log it so it's not lost
        }
    }
    async getDLQRecords(tenantId, limit = 50, offset = 0) {
        return pg_js_1.pg.manyOrNone(`SELECT * FROM ingestion_dlq WHERE tenant_id = $1 AND resolved_at IS NULL ORDER BY created_at DESC LIMIT $2 OFFSET $3`, [tenantId, limit, offset]);
    }
    async resolveRecord(id, tenantId) {
        await pg_js_1.pg.none(`UPDATE ingestion_dlq SET resolved_at = NOW() WHERE id = $1 AND tenant_id = $2`, [id, tenantId]);
    }
}
exports.DLQService = DLQService;
