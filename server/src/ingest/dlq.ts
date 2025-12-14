import { pg } from '../db/pg.js';
import { DLQRecord } from '../data-model/types.js';
import { Logger } from 'pino';
import { v4 as uuidv4 } from 'uuid';

export class DLQService {
  constructor(private logger: Logger) {}

  async sendToDLQ(
    record: Omit<DLQRecord, 'id' | 'createdAt' | 'retryCount' | 'resolvedAt'>
  ) {
    const id = uuidv4();
    try {
      await pg.none(
        `INSERT INTO ingestion_dlq (id, tenant_id, pipeline_key, stage, reason, payload)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [record.id || id, record.tenantId, record.pipelineKey, record.stage, record.reason, JSON.stringify(record.payload)]
      );
      this.logger.warn({ dlqId: id, pipeline: record.pipelineKey }, 'Record sent to DLQ');
    } catch (err) {
      this.logger.error({ err, originalRecord: record }, 'Failed to write to DLQ');
      // Last resort: log it so it's not lost
    }
  }

  async getDLQRecords(tenantId: string, limit = 50, offset = 0): Promise<DLQRecord[]> {
    return pg.manyOrNone(
      `SELECT * FROM ingestion_dlq WHERE tenant_id = $1 AND resolved_at IS NULL ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [tenantId, limit, offset]
    );
  }

  async resolveRecord(id: string, tenantId: string) {
    await pg.none(
      `UPDATE ingestion_dlq SET resolved_at = NOW() WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId]
    );
  }
}
