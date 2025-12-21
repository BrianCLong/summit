/**
 * Runbook State Manager
 *
 * Manages execution state persistence with Redis backing.
 * Supports pause/resume/cancel operations with atomic state transitions.
 *
 * @module runbooks/runtime/state-manager
 */

import { createHash } from 'crypto';
import Redis from 'ioredis';
import {
  RunbookExecution,
  RunbookExecutionStatus,
  RunbookStepStatus,
  RunbookExecutionRepository,
  RunbookExecutionLogEntry,
  RunbookExecutionLogRepository,
  RunbookLogEventType,
  generateLogId,
  nowISO,
} from './types';

// ============================================================================
// Redis-backed Execution Repository
// ============================================================================

/**
 * Redis-backed implementation of RunbookExecutionRepository
 */
export class RedisRunbookExecutionRepository implements RunbookExecutionRepository {
  private readonly keyPrefix = 'runbook:execution:';
  private readonly indexPrefix = 'runbook:index:';

  constructor(private readonly redis: Redis) {}

  /**
   * Create a new execution record
   */
  async create(execution: RunbookExecution): Promise<void> {
    const key = this.keyPrefix + execution.executionId;
    const ttl = 7 * 24 * 60 * 60; // 7 days

    await this.redis.setex(key, ttl, JSON.stringify(execution));

    // Add to indexes
    await Promise.all([
      this.redis.zadd(
        `${this.indexPrefix}runbook:${execution.runbookId}`,
        Date.now(),
        execution.executionId
      ),
      this.redis.zadd(
        `${this.indexPrefix}tenant:${execution.tenantId}`,
        Date.now(),
        execution.executionId
      ),
      this.redis.zadd(
        `${this.indexPrefix}status:${execution.status}`,
        Date.now(),
        execution.executionId
      ),
    ]);
  }

  /**
   * Update an existing execution record
   */
  async update(execution: RunbookExecution): Promise<void> {
    const key = this.keyPrefix + execution.executionId;
    const existing = await this.redis.get(key);

    if (!existing) {
      throw new Error(`Execution ${execution.executionId} not found`);
    }

    const oldExecution: RunbookExecution = JSON.parse(existing);
    const ttl = 7 * 24 * 60 * 60;

    execution.lastUpdatedAt = nowISO();
    await this.redis.setex(key, ttl, JSON.stringify(execution));

    // Update status index if changed
    if (oldExecution.status !== execution.status) {
      await Promise.all([
        this.redis.zrem(
          `${this.indexPrefix}status:${oldExecution.status}`,
          execution.executionId
        ),
        this.redis.zadd(
          `${this.indexPrefix}status:${execution.status}`,
          Date.now(),
          execution.executionId
        ),
      ]);
    }
  }

  /**
   * Get execution by ID
   */
  async getById(executionId: string): Promise<RunbookExecution | null> {
    const key = this.keyPrefix + executionId;
    const data = await this.redis.get(key);
    return data ? JSON.parse(data) : null;
  }

  /**
   * List executions by runbook ID
   */
  async listByRunbook(runbookId: string, limit = 100): Promise<RunbookExecution[]> {
    const ids = await this.redis.zrevrange(
      `${this.indexPrefix}runbook:${runbookId}`,
      0,
      limit - 1
    );
    return this.getMultiple(ids);
  }

  /**
   * List executions by tenant ID
   */
  async listByTenant(tenantId: string, limit = 100): Promise<RunbookExecution[]> {
    const ids = await this.redis.zrevrange(
      `${this.indexPrefix}tenant:${tenantId}`,
      0,
      limit - 1
    );
    return this.getMultiple(ids);
  }

  /**
   * List executions by status
   */
  async listByStatus(status: RunbookExecutionStatus, limit = 100): Promise<RunbookExecution[]> {
    const ids = await this.redis.zrevrange(
      `${this.indexPrefix}status:${status}`,
      0,
      limit - 1
    );
    return this.getMultiple(ids);
  }

  /**
   * Get multiple executions by IDs
   */
  private async getMultiple(ids: string[]): Promise<RunbookExecution[]> {
    if (ids.length === 0) return [];

    const pipeline = this.redis.pipeline();
    ids.forEach((id) => pipeline.get(this.keyPrefix + id));
    const results = await pipeline.exec();

    return (results || [])
      .filter((r) => r && r[1])
      .map((r) => JSON.parse(r![1] as string));
  }
}

// ============================================================================
// Redis-backed Execution Log Repository
// ============================================================================

/**
 * Redis-backed implementation of RunbookExecutionLogRepository
 */
export class RedisRunbookExecutionLogRepository implements RunbookExecutionLogRepository {
  private readonly keyPrefix = 'runbook:log:';
  private readonly indexPrefix = 'runbook:logindex:';

  constructor(private readonly redis: Redis) {}

  /**
   * Append a log entry with hash chain integrity
   */
  async append(entry: RunbookExecutionLogEntry): Promise<void> {
    const listKey = `${this.keyPrefix}${entry.executionId}`;
    const tenantKey = `${this.indexPrefix}tenant:${entry.tenantId}`;
    const ttl = 30 * 24 * 60 * 60; // 30 days

    // Get previous hash for chain
    const lastEntry = await this.redis.lindex(listKey, -1);
    if (lastEntry) {
      const parsed: RunbookExecutionLogEntry = JSON.parse(lastEntry);
      entry.previousHash = parsed.hash;
    } else {
      entry.previousHash = 'genesis';
    }

    // Compute entry hash
    entry.hash = this.computeHash(entry);

    // Store entry
    await this.redis.rpush(listKey, JSON.stringify(entry));
    await this.redis.expire(listKey, ttl);

    // Add to tenant index
    await this.redis.zadd(tenantKey, Date.now(), `${entry.executionId}:${entry.logId}`);
    await this.redis.expire(tenantKey, ttl);
  }

  /**
   * List all log entries for an execution
   */
  async listByExecution(executionId: string): Promise<RunbookExecutionLogEntry[]> {
    const listKey = `${this.keyPrefix}${executionId}`;
    const entries = await this.redis.lrange(listKey, 0, -1);
    return entries.map((e) => JSON.parse(e));
  }

  /**
   * List recent log entries for a tenant
   */
  async listByTenant(tenantId: string, limit = 100): Promise<RunbookExecutionLogEntry[]> {
    const tenantKey = `${this.indexPrefix}tenant:${tenantId}`;
    const refs = await this.redis.zrevrange(tenantKey, 0, limit - 1);

    const results: RunbookExecutionLogEntry[] = [];
    for (const ref of refs) {
      const [executionId, logId] = ref.split(':');
      const entries = await this.listByExecution(executionId);
      const entry = entries.find((e) => e.logId === logId);
      if (entry) results.push(entry);
    }

    return results;
  }

  /**
   * Verify the hash chain integrity for an execution
   */
  async verifyChain(executionId: string): Promise<{ valid: boolean; error?: string }> {
    const entries = await this.listByExecution(executionId);

    if (entries.length === 0) {
      return { valid: true };
    }

    // Check first entry
    if (entries[0].previousHash !== 'genesis') {
      return { valid: false, error: 'First entry does not have genesis hash' };
    }

    // Verify chain
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const expectedHash = this.computeHash({ ...entry, hash: '' });

      if (entry.hash !== expectedHash) {
        return {
          valid: false,
          error: `Entry ${entry.logId} has invalid hash`,
        };
      }

      if (i > 0 && entry.previousHash !== entries[i - 1].hash) {
        return {
          valid: false,
          error: `Entry ${entry.logId} has broken chain link`,
        };
      }
    }

    return { valid: true };
  }

  /**
   * Compute hash for a log entry
   */
  private computeHash(entry: Omit<RunbookExecutionLogEntry, 'hash'> & { hash?: string }): string {
    const data = JSON.stringify({
      logId: entry.logId,
      executionId: entry.executionId,
      runbookId: entry.runbookId,
      tenantId: entry.tenantId,
      timestamp: entry.timestamp,
      actorId: entry.actorId,
      eventType: entry.eventType,
      stepId: entry.stepId,
      details: entry.details,
      previousHash: entry.previousHash,
    });
    return createHash('sha256').update(data).digest('hex');
  }
}

// ============================================================================
// Execution State Manager
// ============================================================================

/**
 * Manages runbook execution state with atomic transitions and audit logging
 */
export class RunbookStateManager {
  constructor(
    private readonly executionRepo: RunbookExecutionRepository,
    private readonly logRepo: RunbookExecutionLogRepository
  ) {}

  /**
   * Create a new execution and log the start event
   */
  async createExecution(
    execution: RunbookExecution,
    actorId: string
  ): Promise<RunbookExecution> {
    await this.executionRepo.create(execution);

    await this.appendLog(execution, actorId, 'EXECUTION_STARTED', undefined, {
      runbookId: execution.runbookId,
      runbookVersion: execution.runbookVersion,
      input: execution.input,
      authorityIds: execution.authorityIds,
      legalBasis: execution.legalBasis,
    });

    return execution;
  }

  /**
   * Transition execution to RUNNING status
   */
  async transitionToRunning(executionId: string, actorId: string): Promise<RunbookExecution> {
    const execution = await this.getExecutionOrThrow(executionId);

    if (execution.status !== 'PENDING' && execution.status !== 'PAUSED') {
      throw new Error(`Cannot start execution in status ${execution.status}`);
    }

    const previousStatus = execution.status;
    execution.status = 'RUNNING';
    execution.lastUpdatedAt = nowISO();

    await this.executionRepo.update(execution);

    await this.appendLog(execution, actorId, 'EXECUTION_STATUS_CHANGED', undefined, {
      previousStatus,
      newStatus: 'RUNNING',
    });

    return execution;
  }

  /**
   * Pause execution
   */
  async pauseExecution(executionId: string, actorId: string): Promise<RunbookExecution> {
    const execution = await this.getExecutionOrThrow(executionId);

    if (execution.status !== 'RUNNING') {
      throw new Error(`Cannot pause execution in status ${execution.status}`);
    }

    execution.status = 'PAUSED';
    execution.lastUpdatedAt = nowISO();
    execution.controlledBy = actorId;
    execution.controlledAt = nowISO();

    await this.executionRepo.update(execution);

    await this.appendLog(execution, actorId, 'EXECUTION_PAUSED', undefined, {
      previousStatus: 'RUNNING',
      pausedBy: actorId,
    });

    return execution;
  }

  /**
   * Resume execution
   */
  async resumeExecution(executionId: string, actorId: string): Promise<RunbookExecution> {
    const execution = await this.getExecutionOrThrow(executionId);

    if (execution.status !== 'PAUSED') {
      throw new Error(`Cannot resume execution in status ${execution.status}`);
    }

    execution.status = 'RUNNING';
    execution.lastUpdatedAt = nowISO();
    execution.controlledBy = actorId;
    execution.controlledAt = nowISO();

    await this.executionRepo.update(execution);

    await this.appendLog(execution, actorId, 'EXECUTION_RESUMED', undefined, {
      previousStatus: 'PAUSED',
      resumedBy: actorId,
    });

    return execution;
  }

  /**
   * Cancel execution
   */
  async cancelExecution(executionId: string, actorId: string): Promise<RunbookExecution> {
    const execution = await this.getExecutionOrThrow(executionId);

    if (execution.status === 'COMPLETED' || execution.status === 'FAILED') {
      throw new Error(`Cannot cancel execution in status ${execution.status}`);
    }

    const previousStatus = execution.status;
    execution.status = 'CANCELLED';
    execution.lastUpdatedAt = nowISO();
    execution.finishedAt = nowISO();
    execution.controlledBy = actorId;
    execution.controlledAt = nowISO();

    // Mark pending steps as cancelled
    execution.steps.forEach((step) => {
      if (step.status === 'PENDING' || step.status === 'RUNNING') {
        step.status = 'CANCELLED';
        step.finishedAt = nowISO();
      }
    });

    await this.executionRepo.update(execution);

    await this.appendLog(execution, actorId, 'EXECUTION_CANCELLED', undefined, {
      previousStatus,
      cancelledBy: actorId,
    });

    return execution;
  }

  /**
   * Mark step as started
   */
  async startStep(
    executionId: string,
    stepId: string,
    actorId: string
  ): Promise<RunbookExecution> {
    const execution = await this.getExecutionOrThrow(executionId);

    const step = execution.steps.find((s) => s.stepId === stepId);
    if (!step) {
      throw new Error(`Step ${stepId} not found in execution ${executionId}`);
    }

    step.status = 'RUNNING';
    step.startedAt = nowISO();
    step.attempt += 1;
    execution.lastUpdatedAt = nowISO();

    await this.executionRepo.update(execution);

    await this.appendLog(execution, actorId, 'STEP_STARTED', stepId, {
      attempt: step.attempt,
    });

    return execution;
  }

  /**
   * Mark step as succeeded
   */
  async succeedStep(
    executionId: string,
    stepId: string,
    actorId: string,
    output: Record<string, unknown>,
    evidence?: import('./types').Evidence[],
    citations?: import('./types').Citation[],
    proofs?: import('./types').CryptographicProof[],
    kpis?: Record<string, number>
  ): Promise<RunbookExecution> {
    const execution = await this.getExecutionOrThrow(executionId);

    const step = execution.steps.find((s) => s.stepId === stepId);
    if (!step) {
      throw new Error(`Step ${stepId} not found in execution ${executionId}`);
    }

    const finishedAt = nowISO();
    step.status = 'SUCCEEDED';
    step.finishedAt = finishedAt;
    step.output = output;
    step.durationMs = step.startedAt
      ? new Date(finishedAt).getTime() - new Date(step.startedAt).getTime()
      : undefined;

    execution.lastUpdatedAt = finishedAt;

    // Merge evidence, citations, proofs, kpis
    if (evidence) execution.evidence.push(...evidence);
    if (citations) execution.citations.push(...citations);
    if (proofs) execution.proofs.push(...proofs);
    if (kpis) Object.assign(execution.kpis, kpis);

    await this.executionRepo.update(execution);

    await this.appendLog(execution, actorId, 'STEP_SUCCEEDED', stepId, {
      durationMs: step.durationMs,
      outputKeys: Object.keys(output),
      evidenceCount: evidence?.length || 0,
      citationCount: citations?.length || 0,
      kpis,
    });

    return execution;
  }

  /**
   * Mark step as failed
   */
  async failStep(
    executionId: string,
    stepId: string,
    actorId: string,
    errorMessage: string
  ): Promise<RunbookExecution> {
    const execution = await this.getExecutionOrThrow(executionId);

    const step = execution.steps.find((s) => s.stepId === stepId);
    if (!step) {
      throw new Error(`Step ${stepId} not found in execution ${executionId}`);
    }

    const finishedAt = nowISO();
    step.status = 'FAILED';
    step.finishedAt = finishedAt;
    step.errorMessage = errorMessage;
    step.durationMs = step.startedAt
      ? new Date(finishedAt).getTime() - new Date(step.startedAt).getTime()
      : undefined;

    execution.lastUpdatedAt = finishedAt;

    await this.executionRepo.update(execution);

    await this.appendLog(execution, actorId, 'STEP_FAILED', stepId, {
      durationMs: step.durationMs,
      errorMessage,
      attempt: step.attempt,
    });

    return execution;
  }

  /**
   * Mark step as skipped
   */
  async skipStep(
    executionId: string,
    stepId: string,
    actorId: string,
    reason: string
  ): Promise<RunbookExecution> {
    const execution = await this.getExecutionOrThrow(executionId);

    const step = execution.steps.find((s) => s.stepId === stepId);
    if (!step) {
      throw new Error(`Step ${stepId} not found in execution ${executionId}`);
    }

    step.status = 'SKIPPED';
    step.finishedAt = nowISO();
    execution.lastUpdatedAt = nowISO();

    await this.executionRepo.update(execution);

    await this.appendLog(execution, actorId, 'STEP_SKIPPED', stepId, {
      reason,
    });

    return execution;
  }

  /**
   * Mark execution as completed
   */
  async completeExecution(executionId: string, actorId: string): Promise<RunbookExecution> {
    const execution = await this.getExecutionOrThrow(executionId);

    execution.status = 'COMPLETED';
    execution.finishedAt = nowISO();
    execution.lastUpdatedAt = nowISO();

    await this.executionRepo.update(execution);

    await this.appendLog(execution, actorId, 'EXECUTION_COMPLETED', undefined, {
      totalDurationMs: new Date(execution.finishedAt!).getTime() -
        new Date(execution.startedAt).getTime(),
      stepCount: execution.steps.length,
      successCount: execution.steps.filter((s) => s.status === 'SUCCEEDED').length,
      kpis: execution.kpis,
    });

    return execution;
  }

  /**
   * Mark execution as failed
   */
  async failExecution(
    executionId: string,
    actorId: string,
    error: string
  ): Promise<RunbookExecution> {
    const execution = await this.getExecutionOrThrow(executionId);

    execution.status = 'FAILED';
    execution.error = error;
    execution.finishedAt = nowISO();
    execution.lastUpdatedAt = nowISO();

    await this.executionRepo.update(execution);

    await this.appendLog(execution, actorId, 'EXECUTION_FAILED', undefined, {
      error,
      totalDurationMs: new Date(execution.finishedAt!).getTime() -
        new Date(execution.startedAt).getTime(),
    });

    return execution;
  }

  /**
   * Get execution by ID or throw
   */
  async getExecutionOrThrow(executionId: string): Promise<RunbookExecution> {
    const execution = await this.executionRepo.getById(executionId);
    if (!execution) {
      throw new Error(`Execution ${executionId} not found`);
    }
    return execution;
  }

  /**
   * Append a log entry
   */
  private async appendLog(
    execution: RunbookExecution,
    actorId: string,
    eventType: RunbookLogEventType,
    stepId: string | undefined,
    details: Record<string, unknown>
  ): Promise<void> {
    const entry: RunbookExecutionLogEntry = {
      logId: generateLogId(),
      executionId: execution.executionId,
      runbookId: execution.runbookId,
      tenantId: execution.tenantId,
      timestamp: nowISO(),
      actorId,
      eventType,
      stepId,
      details,
      hash: '', // Will be computed in append
    };

    await this.logRepo.append(entry);
  }
}

// ============================================================================
// In-Memory Implementations (for testing)
// ============================================================================

/**
 * In-memory implementation for testing
 */
export class InMemoryRunbookExecutionRepository implements RunbookExecutionRepository {
  private executions = new Map<string, RunbookExecution>();

  async create(execution: RunbookExecution): Promise<void> {
    this.executions.set(execution.executionId, { ...execution });
  }

  async update(execution: RunbookExecution): Promise<void> {
    if (!this.executions.has(execution.executionId)) {
      throw new Error(`Execution ${execution.executionId} not found`);
    }
    execution.lastUpdatedAt = nowISO();
    this.executions.set(execution.executionId, { ...execution });
  }

  async getById(executionId: string): Promise<RunbookExecution | null> {
    const exec = this.executions.get(executionId);
    return exec ? { ...exec } : null;
  }

  async listByRunbook(runbookId: string, limit = 100): Promise<RunbookExecution[]> {
    return Array.from(this.executions.values())
      .filter((e) => e.runbookId === runbookId)
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
      .slice(0, limit);
  }

  async listByTenant(tenantId: string, limit = 100): Promise<RunbookExecution[]> {
    return Array.from(this.executions.values())
      .filter((e) => e.tenantId === tenantId)
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
      .slice(0, limit);
  }

  async listByStatus(status: RunbookExecutionStatus, limit = 100): Promise<RunbookExecution[]> {
    return Array.from(this.executions.values())
      .filter((e) => e.status === status)
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
      .slice(0, limit);
  }

  clear(): void {
    this.executions.clear();
  }
}

/**
 * In-memory log repository for testing
 */
export class InMemoryRunbookExecutionLogRepository implements RunbookExecutionLogRepository {
  private logs = new Map<string, RunbookExecutionLogEntry[]>();

  async append(entry: RunbookExecutionLogEntry): Promise<void> {
    const logs = this.logs.get(entry.executionId) || [];

    // Set previous hash
    if (logs.length > 0) {
      entry.previousHash = logs[logs.length - 1].hash;
    } else {
      entry.previousHash = 'genesis';
    }

    // Compute hash
    entry.hash = createHash('sha256')
      .update(JSON.stringify({ ...entry, hash: undefined }))
      .digest('hex');

    logs.push({ ...entry });
    this.logs.set(entry.executionId, logs);
  }

  async listByExecution(executionId: string): Promise<RunbookExecutionLogEntry[]> {
    return [...(this.logs.get(executionId) || [])];
  }

  async listByTenant(tenantId: string, limit = 100): Promise<RunbookExecutionLogEntry[]> {
    const allLogs: RunbookExecutionLogEntry[] = [];
    this.logs.forEach((entries) => {
      allLogs.push(...entries.filter((e) => e.tenantId === tenantId));
    });
    return allLogs
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
      .slice(0, limit);
  }

  async verifyChain(executionId: string): Promise<{ valid: boolean; error?: string }> {
    const entries = await this.listByExecution(executionId);

    if (entries.length === 0) return { valid: true };

    for (let i = 0; i < entries.length; i++) {
      if (i === 0 && entries[i].previousHash !== 'genesis') {
        return { valid: false, error: 'First entry missing genesis hash' };
      }
      if (i > 0 && entries[i].previousHash !== entries[i - 1].hash) {
        return { valid: false, error: `Broken chain at entry ${i}` };
      }
    }

    return { valid: true };
  }

  clear(): void {
    this.logs.clear();
  }
}
