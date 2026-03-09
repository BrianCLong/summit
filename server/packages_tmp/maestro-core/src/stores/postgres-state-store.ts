/**
 * PostgreSQL State Store Implementation
 * Manages workflow run state and step execution tracking with transactional durability
 */

import { Pool, PoolClient } from 'pg';
import { trace, SpanStatusCode, context as otelContext, propagation } from '@opentelemetry/api';
import { StateStore, RunContext, StepExecution } from '../engine';

const tracer = trace.getTracer('maestro-postgres-store');

export class PostgresStateStore implements StateStore {
  constructor(private pool: Pool) {}

  private async withTransaction<T>(
    operation: (client: PoolClient) => Promise<T>,
  ): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await operation(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // eslint-disable-next-line require-await
  async createRun(context: RunContext): Promise<void> {
    return tracer.startActiveSpan('createRun', async (span) => {
      span.setAttributes({
        'run.id': context.run_id,
        'workflow.name': context.workflow.name,
        'tenant.id': context.tenant_id,
      });

      try {
        await this.withTransaction(async (client) => {
          await client.query(
            `
            INSERT INTO workflow_runs (
              run_id, workflow_name, workflow_version, tenant_id,
              triggered_by, environment, parameters, budget,
              status, created_at, idempotency_key, workflow_definition
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'running', NOW(), $9, $10)
            ON CONFLICT (idempotency_key) DO NOTHING
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
              context.idempotency_key,
              JSON.stringify(context.workflow),
            ],
          );

          // Initial event
          await client.query(
            `INSERT INTO workflow_events (run_id, event_type, payload, trace_id) VALUES ($1, $2, $3, $4)`,
            [context.run_id, 'run_created', JSON.stringify({ workflow: context.workflow.name }), span.spanContext().traceId]
          );
        });
      } catch (error) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  // eslint-disable-next-line require-await
  async updateRunStatus(
    runId: string,
    status: string,
    error?: string,
  ): Promise<void> {
    return tracer.startActiveSpan('updateRunStatus', async (span) => {
      span.setAttribute('run.id', runId);
      try {
        await this.withTransaction(async (client) => {
          await client.query(
            `
            UPDATE workflow_runs
            SET status = $1, error = $2, completed_at = CASE WHEN $1 IN ('completed', 'failed', 'cancelled') THEN NOW() ELSE completed_at END
            WHERE run_id = $3
          `,
            [status, error, runId],
          );

          await client.query(
            `INSERT INTO workflow_events (run_id, event_type, payload) VALUES ($1, $2, $3)`,
            [runId, `run_status_${status}`, JSON.stringify({ error })]
          );
        });
      } finally {
        span.end();
      }
    });
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
      const runResult = await client.query(
        `SELECT * FROM workflow_runs WHERE run_id = $1`,
        [runId],
      );

      if (runResult.rows.length === 0) return null;

      const stepsResult = await client.query(
        `SELECT * FROM step_executions WHERE run_id = $1 ORDER BY created_at ASC`,
        [runId],
      );

      return {
        ...runResult.rows[0],
        parameters: JSON.parse(runResult.rows[0].parameters || '{}'),
        budget: JSON.parse(runResult.rows[0].budget || '{}'),
        workflow_definition: runResult.rows[0].workflow_definition,
        steps: stepsResult.rows.map((row) => ({
          ...row,
          metadata: JSON.parse(row.metadata || '{}'),
          output: row.output ? JSON.parse(row.output) : undefined,
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
        step_id, run_id, status, attempt, metadata, created_at, idempotency_key
      ) VALUES ($1, $2, $3, $4, $5, NOW(), $6)
      ON CONFLICT DO NOTHING
    `,
      [
        execution.step_id,
        execution.run_id,
        execution.status,
        execution.attempt,
        JSON.stringify(execution.metadata),
        execution.idempotency_key,
      ],
    );
  }

  // eslint-disable-next-line require-await
  async updateStepExecution(execution: StepExecution): Promise<void> {
    return tracer.startActiveSpan('updateStepExecution', async (span) => {
      span.setAttributes({
        'run.id': execution.run_id,
        'step.id': execution.step_id,
        'step.status': execution.status,
      });

      try {
        const traceContext = {};
        propagation.inject(otelContext.active(), traceContext);

        await this.withTransaction(async (client) => {
          await client.query(
            `
            UPDATE step_executions
            SET status = $1, started_at = $2, completed_at = $3,
                output = $4, error = $5, cost_usd = $6, metadata = $7,
                updated_at = NOW(), last_heartbeat = $8, worker_id = $9
            WHERE step_id = $10 AND run_id = $11 AND attempt = $12
          `,
            [
              execution.status,
              execution.started_at,
              execution.completed_at,
              JSON.stringify(execution.output),
              execution.error,
              execution.cost_usd,
              JSON.stringify(execution.metadata),
              execution.last_heartbeat || new Date(),
              execution.worker_id,
              execution.step_id,
              execution.run_id,
              execution.attempt,
            ],
          );

          // Event log
          await client.query(
            `INSERT INTO workflow_events (run_id, step_id, event_type, payload, trace_id) VALUES ($1, $2, $3, $4, $5)`,
            [
              execution.run_id,
              execution.step_id,
              `step_${execution.status}`,
              JSON.stringify({ attempt: execution.attempt, error: execution.error }),
              span.spanContext().traceId
            ]
          );

          // Outbox entry
          if (['succeeded', 'failed'].includes(execution.status)) {
            await client.query(
              `INSERT INTO workflow_outbox (run_id, event_type, payload, trace_context) VALUES ($1, $2, $3, $4)`,
              [
                execution.run_id,
                `step.${execution.status}`,
                JSON.stringify({ step_id: execution.step_id, output: execution.output, error: execution.error }),
                JSON.stringify(traceContext)
              ]
            );
          }
        });
      } catch (error) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
        throw error;
      } finally {
        span.end();
      }
    });
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

    if (result.rows.length === 0) return null;

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
      idempotency_key: row.idempotency_key,
      last_heartbeat: row.last_heartbeat,
      worker_id: row.worker_id,
    };
  }

  async getActiveExecutions(): Promise<StepExecution[]> {
    const result = await this.pool.query(
      `SELECT * FROM step_executions WHERE status IN ('running', 'pending')`
    );
    return result.rows.map(row => ({
      ...row,
      metadata: JSON.parse(row.metadata || '{}'),
      output: row.output ? JSON.parse(row.output) : undefined,
    }));
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