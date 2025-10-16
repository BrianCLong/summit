/**
 * PostgreSQL State Store Implementation
 * Manages workflow run state and step execution tracking
 */

import { Pool, PoolClient } from 'pg';
import { StateStore, RunContext, StepExecution } from '../engine';

export class PostgresStateStore implements StateStore {
  constructor(private pool: Pool) {}

  async createRun(context: RunContext): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      await client.query(
        `
        INSERT INTO workflow_runs (
          run_id, workflow_name, workflow_version, tenant_id, 
          triggered_by, environment, parameters, budget, 
          status, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'running', NOW())
      `,
        [
          context.run_id,
          context.workflow.name,
          context.workflow.version,
          context.tenant_id,
          context.triggered_by,
          context.environment,
          JSON.stringify(context.parameters),
          JSON.stringify(context.budget),
        ],
      );

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async updateRunStatus(
    runId: string,
    status: string,
    error?: string,
  ): Promise<void> {
    await this.pool.query(
      `
      UPDATE workflow_runs 
      SET status = $1, error = $2, completed_at = CASE WHEN $1 IN ('completed', 'failed', 'cancelled') THEN NOW() ELSE completed_at END
      WHERE run_id = $3
    `,
      [status, error, runId],
    );
  }

  async getRunStatus(runId: string): Promise<string> {
    const result = await this.pool.query(
      'SELECT status FROM workflow_runs WHERE run_id = $1',
      [runId],
    );
    return result.rows[0]?.status || 'not_found';
  }

  async getRunDetails(runId: string): Promise<any> {
    const client = await this.pool.connect();
    try {
      // Get run details
      const runResult = await client.query(
        `
        SELECT * FROM workflow_runs WHERE run_id = $1
      `,
        [runId],
      );

      if (runResult.rows.length === 0) {
        return null;
      }

      // Get step executions
      const stepsResult = await client.query(
        `
        SELECT * FROM step_executions 
        WHERE run_id = $1 
        ORDER BY created_at ASC
      `,
        [runId],
      );

      return {
        ...runResult.rows[0],
        parameters: JSON.parse(runResult.rows[0].parameters || '{}'),
        budget: JSON.parse(runResult.rows[0].budget || '{}'),
        steps: stepsResult.rows.map((row) => ({
          ...row,
          metadata: JSON.parse(row.metadata || '{}'),
        })),
      };
    } finally {
      client.release();
    }
  }

  async createStepExecution(execution: StepExecution): Promise<void> {
    await this.pool.query(
      `
      INSERT INTO step_executions (
        step_id, run_id, status, attempt, metadata, created_at
      ) VALUES ($1, $2, $3, $4, $5, NOW())
    `,
      [
        execution.step_id,
        execution.run_id,
        execution.status,
        execution.attempt,
        JSON.stringify(execution.metadata),
      ],
    );
  }

  async updateStepExecution(execution: StepExecution): Promise<void> {
    await this.pool.query(
      `
      UPDATE step_executions 
      SET status = $1, started_at = $2, completed_at = $3, 
          output = $4, error = $5, cost_usd = $6, metadata = $7,
          updated_at = NOW()
      WHERE step_id = $8 AND run_id = $9 AND attempt = $10
    `,
      [
        execution.status,
        execution.started_at,
        execution.completed_at,
        JSON.stringify(execution.output),
        execution.error,
        execution.cost_usd,
        JSON.stringify(execution.metadata),
        execution.step_id,
        execution.run_id,
        execution.attempt,
      ],
    );
  }

  async getStepExecution(
    runId: string,
    stepId: string,
  ): Promise<StepExecution | null> {
    const result = await this.pool.query(
      `
      SELECT * FROM step_executions 
      WHERE run_id = $1 AND step_id = $2 
      ORDER BY attempt DESC 
      LIMIT 1
    `,
      [runId, stepId],
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      step_id: row.step_id,
      run_id: row.run_id,
      status: row.status,
      attempt: row.attempt,
      started_at: row.started_at,
      completed_at: row.completed_at,
      output: row.output ? JSON.parse(row.output) : undefined,
      error: row.error,
      cost_usd: row.cost_usd,
      metadata: JSON.parse(row.metadata || '{}'),
    };
  }

  async getRunMetrics(runId: string): Promise<{
    totalSteps: number;
    completedSteps: number;
    failedSteps: number;
    totalCost: number;
    duration?: number;
  }> {
    const result = await this.pool.query(
      `
      SELECT 
        COUNT(*) as total_steps,
        COUNT(CASE WHEN status = 'succeeded' THEN 1 END) as completed_steps,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_steps,
        COALESCE(SUM(cost_usd), 0) as total_cost,
        EXTRACT(EPOCH FROM (MAX(completed_at) - MIN(started_at))) as duration_seconds
      FROM step_executions 
      WHERE run_id = $1
    `,
      [runId],
    );

    const row = result.rows[0];
    return {
      totalSteps: parseInt(row.total_steps),
      completedSteps: parseInt(row.completed_steps),
      failedSteps: parseInt(row.failed_steps),
      totalCost: parseFloat(row.total_cost),
      duration: row.duration_seconds
        ? parseFloat(row.duration_seconds)
        : undefined,
    };
  }
}
