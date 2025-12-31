
import { PolicyDecision } from './policy';
import * as crypto from 'crypto';
import { Pool } from 'pg';
import { logger } from '../../utils/logger';

export interface ProvenanceStep {
  stepId: number;
  timestamp: string;
  action: string;
  input: any;
  policyDecision: PolicyDecision;
  output: any;
  usage: {
    tokens: number;
    durationMs: number;
  };
}

export interface ProvenanceTrace {
  runId: string;
  agentId: string;
  tenantId: string;
  templateId: string;
  startTime: string;
  endTime?: string;
  status: 'success' | 'failed' | 'killed';
  steps: ProvenanceStep[];
  receiptHash?: string;
}

// In-memory buffer is removed in favor of direct DB persistence for durability
// const traceBuffer: Map<string, ProvenanceTrace> = new Map();

export class ProvenanceRecorder {
  private db: Pool | null = null;

  init(db: Pool) {
    this.db = db;
  }

  /**
   * Initializes the provenance record in the DB.
   * Call this when the run is created or starts.
   */
  async startTrace(runId: string, agentId: string, tenantId: string, templateId: string) {
    if (!this.db) return;

    try {
        await this.db.query(
            `INSERT INTO maestro_run_provenance
             (run_id, tenant_id, agent_id, template_id, start_time, status, steps)
             VALUES ($1, $2, $3, $4, NOW(), 'running', '[]')
             ON CONFLICT (run_id) DO NOTHING`,
            [runId, tenantId, agentId, templateId]
        );
    } catch (err) {
        logger.error('Failed to start provenance trace', { runId, error: err });
    }
  }

  async recordStep(runId: string, step: ProvenanceStep) {
    if (!this.db) return;

    try {
        // Atomic append to JSONB array in Postgres
        // Note: This works for PG 9.5+. For PG < 9.5 we'd need a different approach.
        // using || operator for jsonb concatenation.
        await this.db.query(
            `UPDATE maestro_run_provenance
             SET steps = steps || $2::jsonb
             WHERE run_id = $1`,
            [runId, JSON.stringify([step])]
        );
    } catch (err) {
        logger.error('Failed to record provenance step', { runId, error: err });
    }
  }

  async finalizeTrace(runId: string, status: 'success' | 'failed' | 'killed'): Promise<string | null> {
    if (!this.db) return null;

    try {
        // Fetch full trace to generate hash
        const res = await this.db.query(
            `SELECT * FROM maestro_run_provenance WHERE run_id = $1`,
            [runId]
        );

        if (res.rows.length === 0) return null;
        const row = res.rows[0];

        const trace: ProvenanceTrace = {
            runId: row.run_id,
            tenantId: row.tenant_id,
            agentId: row.agent_id,
            templateId: row.template_id,
            startTime: row.start_time,
            endTime: new Date().toISOString(),
            status: status,
            steps: row.steps || []
        };

        // Generate Receipt Hash
        const content = JSON.stringify(trace);
        const receiptHash = crypto.createHash('sha256').update(content).digest('hex');

        // Update DB
        await this.db.query(
            `UPDATE maestro_run_provenance
             SET end_time = NOW(), status = $2, receipt_hash = $3
             WHERE run_id = $1`,
            [runId, status, receiptHash]
        );

        return receiptHash;

    } catch (err) {
        logger.error('Failed to finalize provenance trace', { runId, error: err });
        return null;
    }
  }

  // Only for testing primarily, or strictly read-only views
  async getTrace(runId: string): Promise<ProvenanceTrace | undefined> {
    if (!this.db) return undefined;
    const res = await this.db.query(`SELECT * FROM maestro_run_provenance WHERE run_id = $1`, [runId]);
    if (res.rows.length === 0) return undefined;
    const row = res.rows[0];
     return {
            runId: row.run_id,
            tenantId: row.tenant_id,
            agentId: row.agent_id,
            templateId: row.template_id,
            startTime: row.start_time,
            endTime: row.end_time,
            status: row.status as any,
            steps: row.steps,
            receiptHash: row.receipt_hash
        };
  }
}

export const provenanceRecorder = new ProvenanceRecorder();
