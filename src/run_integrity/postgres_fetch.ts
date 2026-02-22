import { Pool } from 'pg';
import { EvidenceItem } from './types';

export class PostgresCollector {
  private pool: Pool;

  constructor(connectionString: string) {
    this.pool = new Pool({ connectionString });
  }

  async fetchEvidence(runId: string): Promise<EvidenceItem[]> {
    const client = await this.pool.connect();
    try {
      const query = `
        SELECT a.id, a.run_id, c.content, c.content_type,
               a.artifact_type, a.s3_key, a.sha256_hash, a.created_at
        FROM evidence_artifacts a
        LEFT JOIN evidence_artifact_content c ON a.id = c.artifact_id
        WHERE a.run_id = $1
      `;
      const res = await client.query(query, [runId]);
      return res.rows.map(row => {
        let payload = row.content;
        // Parse Buffer to JSON if type is json
        if (row.content && Buffer.isBuffer(row.content) && row.content_type === 'application/json') {
             try {
                 payload = JSON.parse(row.content.toString('utf-8'));
             } catch (e) {
                 // keep as string or raw if parse fails
                 payload = row.content.toString('utf-8');
             }
        }

        return {
          id: row.id,
          runId: row.run_id,
          payload: payload,
          metadata: {
              artifact_type: row.artifact_type,
              s3_key: row.s3_key,
              sha256_hash: row.sha256_hash,
              // created_at excluded from canonical digest usually to avoid timezone drift issues
              // unless explicitly required. The prompt says "volatile info only in stamp.json".
              // But if metadata includes created_at, it affects digest.
              // I will EXCLUDE volatile fields from the metadata object used for digest
              // in the compare step, or sanitization here.
              // For now, I'll include stable fields.
          }
        };
      });
    } finally {
      client.release();
    }
  }

  async close() {
    await this.pool.end();
  }
}
