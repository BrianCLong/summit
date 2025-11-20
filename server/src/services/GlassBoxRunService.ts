/**
 * GlassBoxRunService - Captures and stores execution runs with full observability
 *
 * Features:
 * - Captures prompts, parameters, tool calls, and results
 * - Replay capability for debugging and testing
 * - Links runs to investigations for auditing
 * - Stores intermediate steps for transparency
 */

import { v4 as uuidv4 } from 'uuid';
import type { Pool } from 'pg';
import type { Redis } from 'ioredis';
import { logger } from '../utils/logger.js';
import { metrics } from '../observability/metrics.js';

export type RunStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export type ToolCall = {
  id: string;
  name: string;
  parameters: Record<string, unknown>;
  result?: unknown;
  error?: string;
  startTime: Date;
  endTime?: Date;
  durationMs?: number;
};

export type RunStep = {
  id: string;
  stepNumber: number;
  type: 'prompt' | 'tool_call' | 'llm_response' | 'validation' | 'cache_hit';
  description: string;
  input?: unknown;
  output?: unknown;
  error?: string;
  metadata?: Record<string, unknown>;
  startTime: Date;
  endTime?: Date;
  durationMs?: number;
};

export type GlassBoxRun = {
  id: string;
  investigationId: string;
  tenantId: string;
  userId: string;
  type: 'graphrag_query' | 'nl_to_cypher' | 'nl_to_sql' | 'subgraph_retrieval';
  status: RunStatus;

  // Input capture
  prompt: string;
  parameters: Record<string, unknown>;

  // Execution trace
  steps: RunStep[];
  toolCalls: ToolCall[];

  // Output capture
  result?: unknown;
  error?: string;

  // Metadata
  modelUsed?: string;
  tokensUsed?: number;
  costEstimate?: number;
  confidence?: number;

  // Timing
  startTime: Date;
  endTime?: Date;
  durationMs?: number;

  // Replay support
  replayable: boolean;
  parentRunId?: string; // If this is a replay
  replayCount: number;

  createdAt: Date;
  updatedAt: Date;
};

export type CreateRunInput = {
  investigationId: string;
  tenantId: string;
  userId: string;
  type: GlassBoxRun['type'];
  prompt: string;
  parameters?: Record<string, unknown>;
  modelUsed?: string;
};

export type ReplayOptions = {
  modifiedPrompt?: string;
  modifiedParameters?: Record<string, unknown>;
  skipCache?: boolean;
};

export class GlassBoxRunService {
  private pool: Pool;
  private redis: Redis | null;
  private cacheEnabled: boolean;
  private cacheTTL: number = 3600; // 1 hour

  constructor(pool: Pool, redis?: Redis) {
    this.pool = pool;
    this.redis = redis || null;
    this.cacheEnabled = !!redis;
  }

  /**
   * Create a new glass-box run
   */
  async createRun(input: CreateRunInput): Promise<GlassBoxRun> {
    const startTime = Date.now();

    const run: GlassBoxRun = {
      id: uuidv4(),
      investigationId: input.investigationId,
      tenantId: input.tenantId,
      userId: input.userId,
      type: input.type,
      status: 'pending',
      prompt: input.prompt,
      parameters: input.parameters || {},
      steps: [],
      toolCalls: [],
      modelUsed: input.modelUsed,
      startTime: new Date(),
      replayable: true,
      replayCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const query = `
      INSERT INTO glass_box_runs (
        id, investigation_id, tenant_id, user_id, type, status,
        prompt, parameters, steps, tool_calls, model_used,
        start_time, replayable, replay_count, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *
    `;

    const values = [
      run.id,
      run.investigationId,
      run.tenantId,
      run.userId,
      run.type,
      run.status,
      run.prompt,
      JSON.stringify(run.parameters),
      JSON.stringify(run.steps),
      JSON.stringify(run.toolCalls),
      run.modelUsed,
      run.startTime,
      run.replayable,
      run.replayCount,
      run.createdAt,
      run.updatedAt,
    ];

    try {
      await this.pool.query(query, values);

      metrics.glassBoxRunsTotal.inc({ type: run.type, status: 'created' });

      logger.info({
        runId: run.id,
        investigationId: run.investigationId,
        type: run.type,
        durationMs: Date.now() - startTime,
      }, 'Created glass-box run');

      return run;
    } catch (error) {
      logger.error({ error, input }, 'Failed to create glass-box run');
      throw error;
    }
  }

  /**
   * Add a step to a run
   */
  async addStep(
    runId: string,
    step: Omit<RunStep, 'id' | 'stepNumber' | 'startTime'>
  ): Promise<void> {
    const run = await this.getRun(runId);
    if (!run) {
      throw new Error(`Run ${runId} not found`);
    }

    const newStep: RunStep = {
      id: uuidv4(),
      stepNumber: run.steps.length + 1,
      startTime: new Date(),
      ...step,
    };

    run.steps.push(newStep);
    run.updatedAt = new Date();

    const query = `
      UPDATE glass_box_runs
      SET steps = $1, updated_at = $2
      WHERE id = $3
    `;

    await this.pool.query(query, [
      JSON.stringify(run.steps),
      run.updatedAt,
      runId,
    ]);

    logger.debug({
      runId,
      stepNumber: newStep.stepNumber,
      type: newStep.type,
    }, 'Added step to run');
  }

  /**
   * Complete a step
   */
  async completeStep(
    runId: string,
    stepId: string,
    output?: unknown,
    error?: string
  ): Promise<void> {
    const run = await this.getRun(runId);
    if (!run) {
      throw new Error(`Run ${runId} not found`);
    }

    const step = run.steps.find(s => s.id === stepId);
    if (!step) {
      throw new Error(`Step ${stepId} not found in run ${runId}`);
    }

    step.endTime = new Date();
    step.durationMs = step.endTime.getTime() - step.startTime.getTime();
    step.output = output;
    step.error = error;
    run.updatedAt = new Date();

    const query = `
      UPDATE glass_box_runs
      SET steps = $1, updated_at = $2
      WHERE id = $3
    `;

    await this.pool.query(query, [
      JSON.stringify(run.steps),
      run.updatedAt,
      runId,
    ]);
  }

  /**
   * Add a tool call to a run
   */
  async addToolCall(
    runId: string,
    toolCall: Omit<ToolCall, 'id' | 'startTime'>
  ): Promise<string> {
    const run = await this.getRun(runId);
    if (!run) {
      throw new Error(`Run ${runId} not found`);
    }

    const newToolCall: ToolCall = {
      id: uuidv4(),
      startTime: new Date(),
      ...toolCall,
    };

    run.toolCalls.push(newToolCall);
    run.updatedAt = new Date();

    const query = `
      UPDATE glass_box_runs
      SET tool_calls = $1, updated_at = $2
      WHERE id = $3
    `;

    await this.pool.query(query, [
      JSON.stringify(run.toolCalls),
      run.updatedAt,
      runId,
    ]);

    logger.debug({
      runId,
      toolCallId: newToolCall.id,
      toolName: newToolCall.name,
    }, 'Added tool call to run');

    return newToolCall.id;
  }

  /**
   * Complete a tool call
   */
  async completeToolCall(
    runId: string,
    toolCallId: string,
    result?: unknown,
    error?: string
  ): Promise<void> {
    const run = await this.getRun(runId);
    if (!run) {
      throw new Error(`Run ${runId} not found`);
    }

    const toolCall = run.toolCalls.find(tc => tc.id === toolCallId);
    if (!toolCall) {
      throw new Error(`Tool call ${toolCallId} not found in run ${runId}`);
    }

    toolCall.endTime = new Date();
    toolCall.durationMs = toolCall.endTime.getTime() - toolCall.startTime.getTime();
    toolCall.result = result;
    toolCall.error = error;
    run.updatedAt = new Date();

    const query = `
      UPDATE glass_box_runs
      SET tool_calls = $1, updated_at = $2
      WHERE id = $3
    `;

    await this.pool.query(query, [
      JSON.stringify(run.toolCalls),
      run.updatedAt,
      runId,
    ]);
  }

  /**
   * Update run status
   */
  async updateStatus(
    runId: string,
    status: RunStatus,
    result?: unknown,
    error?: string
  ): Promise<void> {
    const endTime = status === 'completed' || status === 'failed' ? new Date() : undefined;

    const run = await this.getRun(runId);
    if (!run) {
      throw new Error(`Run ${runId} not found`);
    }

    const durationMs = endTime
      ? endTime.getTime() - run.startTime.getTime()
      : undefined;

    const query = `
      UPDATE glass_box_runs
      SET status = $1, result = $2, error = $3, end_time = $4, duration_ms = $5, updated_at = $6
      WHERE id = $7
    `;

    await this.pool.query(query, [
      status,
      result ? JSON.stringify(result) : null,
      error,
      endTime,
      durationMs,
      new Date(),
      runId,
    ]);

    metrics.glassBoxRunsTotal.inc({ type: run.type, status });

    if (durationMs) {
      metrics.glassBoxRunDurationMs.observe({ type: run.type }, durationMs);
    }

    logger.info({
      runId,
      status,
      durationMs,
      hasError: !!error,
    }, 'Updated run status');
  }

  /**
   * Get a run by ID
   */
  async getRun(runId: string): Promise<GlassBoxRun | null> {
    // Try cache first
    if (this.cacheEnabled && this.redis) {
      const cached = await this.redis.get(`glassbox:run:${runId}`);
      if (cached) {
        metrics.glassBoxCacheHits.inc({ operation: 'get_run' });
        return JSON.parse(cached);
      }
    }

    const query = `
      SELECT * FROM glass_box_runs
      WHERE id = $1
    `;

    const result = await this.pool.query(query, [runId]);

    if (result.rows.length === 0) {
      return null;
    }

    const run = this.rowToRun(result.rows[0]);

    // Cache the run
    if (this.cacheEnabled && this.redis) {
      await this.redis.setex(
        `glassbox:run:${runId}`,
        this.cacheTTL,
        JSON.stringify(run)
      );
    }

    return run;
  }

  /**
   * List runs for an investigation
   */
  async listRuns(
    investigationId: string,
    options?: {
      type?: GlassBoxRun['type'];
      status?: RunStatus;
      limit?: number;
      offset?: number;
    }
  ): Promise<{ runs: GlassBoxRun[]; total: number }> {
    const { type, status, limit = 50, offset = 0 } = options || {};

    let query = `
      SELECT * FROM glass_box_runs
      WHERE investigation_id = $1
    `;
    const params: unknown[] = [investigationId];
    let paramIndex = 2;

    if (type) {
      query += ` AND type = $${paramIndex}`;
      params.push(type);
      paramIndex++;
    }

    if (status) {
      query += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const [dataResult, countResult] = await Promise.all([
      this.pool.query(query, params),
      this.pool.query(
        `SELECT COUNT(*) FROM glass_box_runs WHERE investigation_id = $1`,
        [investigationId]
      ),
    ]);

    return {
      runs: dataResult.rows.map(row => this.rowToRun(row)),
      total: parseInt(countResult.rows[0].count),
    };
  }

  /**
   * Replay a run with optional modifications
   */
  async replayRun(
    runId: string,
    userId: string,
    options?: ReplayOptions
  ): Promise<GlassBoxRun> {
    const originalRun = await this.getRun(runId);
    if (!originalRun) {
      throw new Error(`Run ${runId} not found`);
    }

    if (!originalRun.replayable) {
      throw new Error(`Run ${runId} is not replayable`);
    }

    // Create new run based on original
    const replayRun = await this.createRun({
      investigationId: originalRun.investigationId,
      tenantId: originalRun.tenantId,
      userId,
      type: originalRun.type,
      prompt: options?.modifiedPrompt || originalRun.prompt,
      parameters: options?.modifiedParameters || originalRun.parameters,
      modelUsed: originalRun.modelUsed,
    });

    // Update with parent reference
    await this.pool.query(
      `UPDATE glass_box_runs SET parent_run_id = $1 WHERE id = $2`,
      [runId, replayRun.id]
    );

    // Increment replay count on original
    await this.pool.query(
      `UPDATE glass_box_runs SET replay_count = replay_count + 1 WHERE id = $1`,
      [runId]
    );

    // Clear cache if requested
    if (options?.skipCache && this.redis) {
      const keys = await this.redis.keys(`graphrag:*${originalRun.investigationId}*`);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    }

    logger.info({
      originalRunId: runId,
      replayRunId: replayRun.id,
      userId,
      modified: !!(options?.modifiedPrompt || options?.modifiedParameters),
    }, 'Replaying run');

    return replayRun;
  }

  /**
   * Get replay history for a run
   */
  async getReplayHistory(runId: string): Promise<GlassBoxRun[]> {
    const query = `
      SELECT * FROM glass_box_runs
      WHERE parent_run_id = $1
      ORDER BY created_at ASC
    `;

    const result = await this.pool.query(query, [runId]);
    return result.rows.map(row => this.rowToRun(row));
  }

  /**
   * Convert database row to GlassBoxRun
   */
  private rowToRun(row: any): GlassBoxRun {
    return {
      id: row.id,
      investigationId: row.investigation_id,
      tenantId: row.tenant_id,
      userId: row.user_id,
      type: row.type,
      status: row.status,
      prompt: row.prompt,
      parameters: JSON.parse(row.parameters || '{}'),
      steps: JSON.parse(row.steps || '[]'),
      toolCalls: JSON.parse(row.tool_calls || '[]'),
      result: row.result ? JSON.parse(row.result) : undefined,
      error: row.error,
      modelUsed: row.model_used,
      tokensUsed: row.tokens_used,
      costEstimate: row.cost_estimate ? parseFloat(row.cost_estimate) : undefined,
      confidence: row.confidence ? parseFloat(row.confidence) : undefined,
      startTime: new Date(row.start_time),
      endTime: row.end_time ? new Date(row.end_time) : undefined,
      durationMs: row.duration_ms,
      replayable: row.replayable,
      parentRunId: row.parent_run_id,
      replayCount: row.replay_count,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  /**
   * Clean up old runs (for maintenance)
   */
  async cleanupOldRuns(daysToKeep: number = 90): Promise<number> {
    const query = `
      DELETE FROM glass_box_runs
      WHERE created_at < NOW() - INTERVAL '${daysToKeep} days'
      AND status IN ('completed', 'failed', 'cancelled')
    `;

    const result = await this.pool.query(query);

    logger.info({
      deletedCount: result.rowCount,
      daysToKeep,
    }, 'Cleaned up old runs');

    return result.rowCount || 0;
  }
}
