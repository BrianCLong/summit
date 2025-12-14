import { Pool } from 'pg';
import { ConnectorContext } from '../data-model/types';

export class DLQService {
  private pgPool: Pool;

  constructor() {
    this.pgPool = new Pool({ connectionString: process.env.DATABASE_URL });
  }

  async recordFailure(
    ctx: ConnectorContext,
    stage: string,
    reason: string,
    rawPayload: any
  ): Promise<void> {
    const client = await this.pgPool.connect();
    try {
      await client.query(
        `INSERT INTO dlq_records (id, tenant_id, pipeline_key, stage, reason, raw_payload)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          `dlq-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          ctx.tenantId,
          ctx.pipelineKey,
          stage,
          reason,
          JSON.stringify(rawPayload)
        ]
      );
      ctx.logger.error({ stage, reason, pipeline: ctx.pipelineKey }, 'Record sent to DLQ');
    } catch (e) {
      ctx.logger.error({ error: e }, 'Failed to write to DLQ');
    } finally {
      client.release();
    }
  }
}
