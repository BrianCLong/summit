"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DLQService = void 0;
const pg_1 = require("pg");
class DLQService {
    pgPool;
    constructor() {
        this.pgPool = new pg_1.Pool({ connectionString: process.env.DATABASE_URL });
    }
    async recordFailure(ctx, stage, reason, rawPayload) {
        const client = await this.pgPool.connect();
        try {
            await client.query(`INSERT INTO dlq_records (id, tenant_id, pipeline_key, stage, reason, raw_payload)
         VALUES ($1, $2, $3, $4, $5, $6)`, [
                `dlq-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                ctx.tenantId,
                ctx.pipelineKey,
                stage,
                reason,
                JSON.stringify(rawPayload)
            ]);
            ctx.logger.error({ stage, reason, pipeline: ctx.pipelineKey }, 'Record sent to DLQ');
        }
        catch (e) {
            ctx.logger.error({ error: e }, 'Failed to write to DLQ');
        }
        finally {
            client.release();
        }
    }
}
exports.DLQService = DLQService;
