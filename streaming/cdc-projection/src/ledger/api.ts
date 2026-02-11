import { createHash } from 'crypto';

interface ProjectionEvent {
  projection_name: string;
  applied_at: Date;
  source_commit_lsn: string;
  evidence_id: string;
  inputs_digest: string;
  chain_hash: string;
}

interface VerificationReport {
  valid: boolean;
  brokenAt?: string;
  reason?: string;
  eventsVerified?: number;
}

function sha256(data: string) { return createHash('sha256').update(data).digest('hex'); }

export class ProjectionLedgerAPI {
  constructor(private db: any) {} // Mock DB

  // Query projection history
  async getProjectionHistory(
    projectionName: string,
    limit = 100
  ): Promise<ProjectionEvent[]> {
    return this.db.query(`
      SELECT * FROM projection_ledger
      WHERE projection_name = $1
      ORDER BY applied_at DESC
      LIMIT $2
    `, [projectionName, limit]);
  }

  // Verify projection integrity
  async verifyProjection(
    projectionName: string,
    startLsn: string,
    endLsn: string
  ): Promise<VerificationReport> {
    const events: ProjectionEvent[] = await this.db.query(`
      SELECT * FROM projection_ledger
      WHERE projection_name = $1
        AND source_commit_lsn BETWEEN $2 AND $3
      ORDER BY source_commit_lsn
    `, [projectionName, startLsn, endLsn]);

    // Verify evidence chain
    for (let i = 1; i < events.length; i++) {
      const prev = events[i - 1];
      const curr = events[i];

      const expectedHash = sha256(prev.evidence_id + curr.inputs_digest);
      if (curr.chain_hash !== expectedHash) {
        return {
          valid: false,
          brokenAt: curr.source_commit_lsn,
          reason: 'Evidence chain break',
        };
      }
    }

    return { valid: true, eventsVerified: events.length };
  }
}
