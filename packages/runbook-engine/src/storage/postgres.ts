/**
 * PostgreSQL Storage Backend
 *
 * Production-ready persistent storage for runbook executions.
 * Handles state, logs, and evidence with proper indexing.
 */

import { Pool, PoolClient } from 'pg';
import {
  RunbookExecution,
  RunbookLogEntry,
  Evidence,
  ExecutionStatus,
  StepResult,
  ApprovalDecision,
} from '../types';
import { StateStorage } from '../state-manager';

/**
 * PostgreSQL storage configuration
 */
export interface PostgresConfig {
  connectionString?: string;
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  password?: string;
  ssl?: boolean;
  max?: number; // Max pool size
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
}

/**
 * PostgreSQL storage implementation
 */
export class PostgresStorage implements StateStorage {
  private pool: Pool;

  constructor(config: PostgresConfig) {
    this.pool = new Pool({
      connectionString: config.connectionString,
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
      ssl: config.ssl ? { rejectUnauthorized: false } : false,
      max: config.max || 20,
      idleTimeoutMillis: config.idleTimeoutMillis || 30000,
      connectionTimeoutMillis: config.connectionTimeoutMillis || 2000,
    });
  }

  /**
   * Initialize database schema
   */
  async initialize(): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Executions table
      await client.query(`
        CREATE TABLE IF NOT EXISTS runbook_executions (
          id VARCHAR(255) PRIMARY KEY,
          runbook_id VARCHAR(255) NOT NULL,
          runbook_version VARCHAR(50) NOT NULL,
          status VARCHAR(50) NOT NULL,
          context JSONB NOT NULL,
          input JSONB,
          output JSONB,
          start_time TIMESTAMP NOT NULL,
          end_time TIMESTAMP,
          duration_ms INTEGER,
          error TEXT,
          is_replay BOOLEAN DEFAULT FALSE,
          original_execution_id VARCHAR(255),
          paused_at_step VARCHAR(255),
          paused_at TIMESTAMP,
          cancelled_by VARCHAR(255),
          cancellation_reason TEXT,
          depth INTEGER DEFAULT 0,
          parent_execution_id VARCHAR(255),
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);

      // Indexes for executions
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_executions_runbook_id
        ON runbook_executions(runbook_id)
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_executions_status
        ON runbook_executions(status)
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_executions_start_time
        ON runbook_executions(start_time DESC)
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_executions_tenant
        ON runbook_executions((context->>'tenantId'))
      `);

      // Step results table
      await client.query(`
        CREATE TABLE IF NOT EXISTS runbook_step_results (
          id SERIAL PRIMARY KEY,
          execution_id VARCHAR(255) NOT NULL REFERENCES runbook_executions(id) ON DELETE CASCADE,
          step_id VARCHAR(255) NOT NULL,
          status VARCHAR(50) NOT NULL,
          output JSONB,
          error TEXT,
          start_time TIMESTAMP NOT NULL,
          end_time TIMESTAMP,
          duration_ms INTEGER,
          attempt_number INTEGER NOT NULL,
          skipped BOOLEAN DEFAULT FALSE,
          skip_reason TEXT,
          created_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(execution_id, step_id)
        )
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_step_results_execution
        ON runbook_step_results(execution_id)
      `);

      // Approval decisions table
      await client.query(`
        CREATE TABLE IF NOT EXISTS runbook_approvals (
          id SERIAL PRIMARY KEY,
          execution_id VARCHAR(255) NOT NULL REFERENCES runbook_executions(id) ON DELETE CASCADE,
          step_id VARCHAR(255) NOT NULL,
          approver_id VARCHAR(255) NOT NULL,
          decision VARCHAR(50) NOT NULL,
          comments TEXT,
          timestamp TIMESTAMP NOT NULL,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_approvals_execution
        ON runbook_approvals(execution_id)
      `);

      // Logs table
      await client.query(`
        CREATE TABLE IF NOT EXISTS runbook_logs (
          id VARCHAR(255) PRIMARY KEY,
          execution_id VARCHAR(255) NOT NULL REFERENCES runbook_executions(id) ON DELETE CASCADE,
          step_id VARCHAR(255) NOT NULL,
          timestamp TIMESTAMP NOT NULL,
          level VARCHAR(50) NOT NULL,
          message TEXT NOT NULL,
          metadata JSONB,
          evidence_ids TEXT[],
          assumptions TEXT[],
          data_scope TEXT,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_logs_execution
        ON runbook_logs(execution_id)
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_logs_timestamp
        ON runbook_logs(timestamp DESC)
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_logs_level
        ON runbook_logs(level)
      `);

      // Evidence table
      await client.query(`
        CREATE TABLE IF NOT EXISTS runbook_evidence (
          id VARCHAR(255) PRIMARY KEY,
          execution_id VARCHAR(255) NOT NULL REFERENCES runbook_executions(id) ON DELETE CASCADE,
          type VARCHAR(255) NOT NULL,
          source_ref TEXT NOT NULL,
          timestamp TIMESTAMP NOT NULL,
          confidence NUMERIC(3,2) NOT NULL,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_evidence_execution
        ON runbook_evidence(execution_id)
      `);

      // Input hashes for idempotency
      await client.query(`
        CREATE TABLE IF NOT EXISTS runbook_input_hashes (
          runbook_id VARCHAR(255) NOT NULL,
          input_hash VARCHAR(64) NOT NULL,
          execution_id VARCHAR(255) NOT NULL REFERENCES runbook_executions(id) ON DELETE CASCADE,
          created_at TIMESTAMP DEFAULT NOW(),
          PRIMARY KEY (runbook_id, input_hash)
        )
      `);

      await client.query('COMMIT');
      console.log('PostgreSQL schema initialized successfully');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Save or update execution
   */
  async saveExecution(execution: RunbookExecution): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Upsert main execution record
      await client.query(
        `
        INSERT INTO runbook_executions (
          id, runbook_id, runbook_version, status, context, input, output,
          start_time, end_time, duration_ms, error, is_replay, original_execution_id,
          paused_at_step, paused_at, cancelled_by, cancellation_reason, depth, parent_execution_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
        ON CONFLICT (id) DO UPDATE SET
          status = EXCLUDED.status,
          output = EXCLUDED.output,
          end_time = EXCLUDED.end_time,
          duration_ms = EXCLUDED.duration_ms,
          error = EXCLUDED.error,
          paused_at_step = EXCLUDED.paused_at_step,
          paused_at = EXCLUDED.paused_at,
          cancelled_by = EXCLUDED.cancelled_by,
          cancellation_reason = EXCLUDED.cancellation_reason,
          updated_at = NOW()
        `,
        [
          execution.id,
          execution.runbookId,
          execution.runbookVersion,
          execution.status,
          execution.context,
          execution.input,
          execution.output,
          execution.startTime,
          execution.endTime,
          execution.durationMs,
          execution.error?.message,
          execution.isReplay,
          execution.originalExecutionId,
          execution.pausedAtStep,
          execution.pausedAt,
          execution.cancelledBy,
          execution.cancellationReason,
          execution.depth || 0,
          execution.parentExecutionId,
        ]
      );

      // Save step results
      for (const [stepId, result] of execution.stepResults) {
        await client.query(
          `
          INSERT INTO runbook_step_results (
            execution_id, step_id, status, output, error, start_time, end_time,
            duration_ms, attempt_number, skipped, skip_reason
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          ON CONFLICT (execution_id, step_id) DO UPDATE SET
            status = EXCLUDED.status,
            output = EXCLUDED.output,
            error = EXCLUDED.error,
            end_time = EXCLUDED.end_time,
            duration_ms = EXCLUDED.duration_ms,
            attempt_number = EXCLUDED.attempt_number,
            skipped = EXCLUDED.skipped,
            skip_reason = EXCLUDED.skip_reason
          `,
          [
            execution.id,
            stepId,
            result.status,
            result.output,
            result.error?.message,
            result.startTime,
            result.endTime,
            result.durationMs,
            result.attemptNumber,
            result.skipped || false,
            result.skipReason,
          ]
        );

        // Save approvals for this step
        if (result.approvals) {
          for (const approval of result.approvals) {
            await client.query(
              `
              INSERT INTO runbook_approvals (
                execution_id, step_id, approver_id, decision, comments, timestamp
              ) VALUES ($1, $2, $3, $4, $5, $6)
              `,
              [
                execution.id,
                stepId,
                approval.approverId,
                approval.decision,
                approval.comments,
                approval.timestamp,
              ]
            );
          }
        }
      }

      // Save logs (batch insert)
      if (execution.logs.length > 0) {
        const logValues = execution.logs.map((log, idx) => {
          return `($${idx * 9 + 1}, $${idx * 9 + 2}, $${idx * 9 + 3}, $${idx * 9 + 4}, $${idx * 9 + 5}, $${idx * 9 + 6}, $${idx * 9 + 7}, $${idx * 9 + 8}, $${idx * 9 + 9})`;
        });

        const logParams = execution.logs.flatMap((log) => [
          log.id,
          log.executionId,
          log.stepId,
          log.timestamp,
          log.level,
          log.message,
          log.metadata || null,
          log.evidenceIds || null,
          log.assumptions || null,
        ]);

        await client.query(
          `
          INSERT INTO runbook_logs (
            id, execution_id, step_id, timestamp, level, message, metadata, evidence_ids, assumptions
          ) VALUES ${logValues.join(', ')}
          ON CONFLICT (id) DO NOTHING
          `,
          logParams
        );
      }

      // Save evidence (batch insert)
      if (execution.evidence.length > 0) {
        const evidenceValues = execution.evidence.map((_, idx) => {
          return `($${idx * 6 + 1}, $${idx * 6 + 2}, $${idx * 6 + 3}, $${idx * 6 + 4}, $${idx * 6 + 5}, $${idx * 6 + 6})`;
        });

        const evidenceParams = execution.evidence.flatMap((ev) => [
          ev.id,
          execution.id,
          ev.type,
          ev.sourceRef,
          ev.timestamp,
          ev.confidence,
        ]);

        await client.query(
          `
          INSERT INTO runbook_evidence (
            id, execution_id, type, source_ref, timestamp, confidence
          ) VALUES ${evidenceValues.join(', ')}
          ON CONFLICT (id) DO NOTHING
          `,
          evidenceParams
        );
      }

      // Save input hash for idempotency
      const inputHash = this.hashInput(execution.input);
      await client.query(
        `
        INSERT INTO runbook_input_hashes (runbook_id, input_hash, execution_id)
        VALUES ($1, $2, $3)
        ON CONFLICT (runbook_id, input_hash) DO NOTHING
        `,
        [execution.runbookId, inputHash, execution.id]
      );

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get execution by ID
   */
  async getExecution(executionId: string): Promise<RunbookExecution | null> {
    const client = await this.pool.connect();
    try {
      // Get main execution
      const execResult = await client.query(
        `SELECT * FROM runbook_executions WHERE id = $1`,
        [executionId]
      );

      if (execResult.rows.length === 0) {
        return null;
      }

      const row = execResult.rows[0];

      // Get step results
      const stepsResult = await client.query(
        `SELECT * FROM runbook_step_results WHERE execution_id = $1`,
        [executionId]
      );

      const stepResults = new Map<string, StepResult>();
      for (const stepRow of stepsResult.rows) {
        // Get approvals for this step
        const approvalsResult = await client.query(
          `SELECT * FROM runbook_approvals WHERE execution_id = $1 AND step_id = $2`,
          [executionId, stepRow.step_id]
        );

        const approvals: ApprovalDecision[] = approvalsResult.rows.map((a) => ({
          approverId: a.approver_id,
          decision: a.decision,
          timestamp: a.timestamp,
          comments: a.comments,
        }));

        stepResults.set(stepRow.step_id, {
          stepId: stepRow.step_id,
          status: stepRow.status as ExecutionStatus,
          output: stepRow.output,
          error: stepRow.error ? new Error(stepRow.error) : undefined,
          startTime: stepRow.start_time,
          endTime: stepRow.end_time,
          durationMs: stepRow.duration_ms,
          attemptNumber: stepRow.attempt_number,
          evidence: [], // Will be populated from evidence table
          logs: [], // Will be populated from logs table
          approvals: approvals.length > 0 ? approvals : undefined,
          skipped: stepRow.skipped,
          skipReason: stepRow.skip_reason,
        });
      }

      // Get logs
      const logsResult = await client.query(
        `SELECT * FROM runbook_logs WHERE execution_id = $1 ORDER BY timestamp ASC`,
        [executionId]
      );

      const logs: RunbookLogEntry[] = logsResult.rows.map((log) => ({
        id: log.id,
        executionId: log.execution_id,
        stepId: log.step_id,
        timestamp: log.timestamp,
        level: log.level,
        message: log.message,
        metadata: log.metadata,
        evidenceIds: log.evidence_ids,
        assumptions: log.assumptions,
        dataScope: log.data_scope,
      }));

      // Get evidence
      const evidenceResult = await client.query(
        `SELECT * FROM runbook_evidence WHERE execution_id = $1`,
        [executionId]
      );

      const evidence: Evidence[] = evidenceResult.rows.map((ev) => ({
        id: ev.id,
        type: ev.type,
        sourceRef: ev.source_ref,
        timestamp: ev.timestamp,
        confidence: parseFloat(ev.confidence),
      }));

      return {
        id: row.id,
        runbookId: row.runbook_id,
        runbookVersion: row.runbook_version,
        status: row.status as ExecutionStatus,
        context: row.context,
        input: row.input,
        output: row.output,
        stepResults,
        startTime: row.start_time,
        endTime: row.end_time,
        durationMs: row.duration_ms,
        logs,
        evidence,
        error: row.error ? new Error(row.error) : undefined,
        isReplay: row.is_replay,
        originalExecutionId: row.original_execution_id,
        pausedAtStep: row.paused_at_step,
        pausedAt: row.paused_at,
        cancelledBy: row.cancelled_by,
        cancellationReason: row.cancellation_reason,
        depth: row.depth,
        parentExecutionId: row.parent_execution_id,
      };
    } finally {
      client.release();
    }
  }

  /**
   * Get all executions for a runbook
   */
  async getExecutionsByRunbook(runbookId: string): Promise<RunbookExecution[]> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        `SELECT id FROM runbook_executions WHERE runbook_id = $1 ORDER BY start_time DESC`,
        [runbookId]
      );

      const executions: RunbookExecution[] = [];
      for (const row of result.rows) {
        const execution = await this.getExecution(row.id);
        if (execution) {
          executions.push(execution);
        }
      }

      return executions;
    } finally {
      client.release();
    }
  }

  /**
   * Query logs
   */
  async queryLogs(query: any): Promise<RunbookLogEntry[]> {
    const client = await this.pool.connect();
    try {
      let sql = 'SELECT * FROM runbook_logs WHERE execution_id = $1';
      const params: any[] = [query.executionId];
      let paramIndex = 2;

      if (query.stepId) {
        sql += ` AND step_id = $${paramIndex}`;
        params.push(query.stepId);
        paramIndex++;
      }

      if (query.level) {
        sql += ` AND level = $${paramIndex}`;
        params.push(query.level);
        paramIndex++;
      }

      if (query.startTime) {
        sql += ` AND timestamp >= $${paramIndex}`;
        params.push(query.startTime);
        paramIndex++;
      }

      if (query.endTime) {
        sql += ` AND timestamp <= $${paramIndex}`;
        params.push(query.endTime);
        paramIndex++;
      }

      sql += ' ORDER BY timestamp ASC';

      if (query.limit) {
        sql += ` LIMIT $${paramIndex}`;
        params.push(query.limit);
        paramIndex++;
      }

      if (query.offset) {
        sql += ` OFFSET $${paramIndex}`;
        params.push(query.offset);
      }

      const result = await client.query(sql, params);

      return result.rows.map((log) => ({
        id: log.id,
        executionId: log.execution_id,
        stepId: log.step_id,
        timestamp: log.timestamp,
        level: log.level,
        message: log.message,
        metadata: log.metadata,
        evidenceIds: log.evidence_ids,
        assumptions: log.assumptions,
        dataScope: log.data_scope,
      }));
    } finally {
      client.release();
    }
  }

  /**
   * Get evidence by ID
   */
  async getEvidence(evidenceId: string): Promise<Evidence | null> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        `SELECT * FROM runbook_evidence WHERE id = $1`,
        [evidenceId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        id: row.id,
        type: row.type,
        sourceRef: row.source_ref,
        timestamp: row.timestamp,
        confidence: parseFloat(row.confidence),
      };
    } finally {
      client.release();
    }
  }

  /**
   * Get all evidence for execution
   */
  async getExecutionEvidence(executionId: string): Promise<Evidence[]> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        `SELECT * FROM runbook_evidence WHERE execution_id = $1`,
        [executionId]
      );

      return result.rows.map((ev) => ({
        id: ev.id,
        type: ev.type,
        sourceRef: ev.source_ref,
        timestamp: ev.timestamp,
        confidence: parseFloat(ev.confidence),
      }));
    } finally {
      client.release();
    }
  }

  /**
   * Delete execution
   */
  async deleteExecution(executionId: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query(`DELETE FROM runbook_executions WHERE id = $1`, [
        executionId,
      ]);
    } finally {
      client.release();
    }
  }

  /**
   * Find duplicate execution
   */
  async findDuplicateExecution(
    runbookId: string,
    inputHash: string
  ): Promise<RunbookExecution | null> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        `SELECT execution_id FROM runbook_input_hashes WHERE runbook_id = $1 AND input_hash = $2`,
        [runbookId, inputHash]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return this.getExecution(result.rows[0].execution_id);
    } finally {
      client.release();
    }
  }

  /**
   * Hash input for idempotency
   */
  private hashInput(input: Record<string, any>): string {
    const crypto = require('crypto');
    const sorted = this.sortObject(input);
    const json = JSON.stringify(sorted);
    return crypto.createHash('sha256').update(json).digest('hex');
  }

  private sortObject(obj: any): any {
    if (Array.isArray(obj)) {
      return obj.map((item) => this.sortObject(item));
    }
    if (obj && typeof obj === 'object' && !(obj instanceof Date)) {
      const sorted: any = {};
      const keys = Object.keys(obj).sort();
      for (const key of keys) {
        sorted[key] = this.sortObject(obj[key]);
      }
      return sorted;
    }
    return obj;
  }

  /**
   * Close connection pool
   */
  async close(): Promise<void> {
    await this.pool.end();
  }
}
