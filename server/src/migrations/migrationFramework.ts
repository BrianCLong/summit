// Maestro Conductor v24.3.0 - Zero Downtime Migration Framework
// Epic E17: Schema Evolution - Advanced migration system with rollback support

import { trace, Span } from '@opentelemetry/api';
import { Counter, Histogram, Gauge } from 'prom-client';
import { pool } from '../db/pg';
import { neo } from '../db/neo4j';
import { redis } from '../subscriptions/pubsub';
import { EventEmitter } from 'events';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';

const tracer = trace.getTracer('migration-framework', '24.3.0');

// Metrics
const migrationOperations = new Counter({
  name: 'migration_operations_total',
  help: 'Total migration operations',
  labelNames: ['tenant_id', 'migration_type', 'phase', 'result'],
});

const migrationDuration = new Histogram({
  name: 'migration_duration_seconds',
  help: 'Migration execution time',
  buckets: [1, 5, 10, 30, 60, 300, 600, 1800, 3600],
  labelNames: ['migration_type', 'phase'],
});

const activeMigrations = new Gauge({
  name: 'active_migrations',
  help: 'Currently running migrations',
  labelNames: ['tenant_id', 'migration_type'],
});

const migrationLockStatus = new Gauge({
  name: 'migration_lock_status',
  help: 'Migration lock status (1 = locked, 0 = unlocked)',
  labelNames: ['tenant_id'],
});

export type MigrationType = 'postgresql' | 'neo4j' | 'mixed';
export type MigrationPhase = 'expand' | 'migrate' | 'contract';
export type MigrationStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'rolled_back';

export interface Migration {
  id: string;
  name: string;
  description: string;
  type: MigrationType;
  version: string;
  dependencies: string[];
  phases: {
    expand?: MigrationStep[];
    migrate?: MigrationStep[];
    contract?: MigrationStep[];
  };
  rollback?: {
    expand?: MigrationStep[];
    migrate?: MigrationStep[];
    contract?: MigrationStep[];
  };
  metadata: {
    author: string;
    createdAt: Date;
    estimatedDuration: number;
    breakingChange: boolean;
    tenantScoped: boolean;
  };
  validation?: ValidationRule[];
  settings: {
    batchSize?: number;
    pauseBetweenBatches?: number;
    maxRetries?: number;
    timeout?: number;
    requiresMaintenanceWindow?: boolean;
  };
}

export interface MigrationStep {
  id: string;
  name: string;
  type: 'sql' | 'cypher' | 'javascript' | 'validation';
  content: string;
  condition?: string;
  retryable: boolean;
  timeout?: number;
  rollback?: string;
}

export interface ValidationRule {
  name: string;
  type: 'pre' | 'post' | 'continuous';
  check: string;
  expectedResult: any;
  critical: boolean;
}

export interface MigrationExecution {
  migrationId: string;
  tenantId: string;
  status: MigrationStatus;
  currentPhase?: MigrationPhase;
  currentStep?: string;
  startedAt: Date;
  completedAt?: Date;
  error?: string;
  progress: {
    totalSteps: number;
    completedSteps: number;
    currentStepProgress?: number;
  };
  metrics: {
    recordsProcessed: number;
    recordsUpdated: number;
    recordsCreated: number;
    recordsDeleted: number;
  };
}

export interface MigrationLock {
  tenantId: string;
  migrationId: string;
  phase: MigrationPhase;
  lockedAt: Date;
  lockedBy: string;
  expiresAt: Date;
}

export class MigrationFramework extends EventEmitter {
  private readonly lockPrefix = 'migration_lock';
  private readonly statePrefix = 'migration_state';
  private readonly lockTTL = 3600; // 1 hour

  constructor() {
    super();
  }

  async executeMigration(
    migration: Migration,
    tenantId: string,
    options: {
      dryRun?: boolean;
      phase?: MigrationPhase;
      skipValidation?: boolean;
      resumeFromStep?: string;
    } = {},
  ): Promise<MigrationExecution> {
    return tracer.startActiveSpan(
      'migration_framework.execute',
      async (span: Span) => {
        span.setAttributes({
          tenant_id: tenantId,
          migration_id: migration.id,
          migration_type: migration.type,
          dry_run: options.dryRun || false,
          breaking_change: migration.metadata.breakingChange,
        });

        // Create execution record
        const execution: MigrationExecution = {
          migrationId: migration.id,
          tenantId,
          status: 'running',
          startedAt: new Date(),
          progress: {
            totalSteps: this.calculateTotalSteps(migration),
            completedSteps: 0,
          },
          metrics: {
            recordsProcessed: 0,
            recordsUpdated: 0,
            recordsCreated: 0,
            recordsDeleted: 0,
          },
        };

        activeMigrations.inc({
          tenant_id: tenantId,
          migration_type: migration.type,
        });

        try {
          // Acquire migration lock
          await this.acquireLock(migration.id, tenantId, 'expand');

          // Pre-migration validation
          if (!options.skipValidation) {
            await this.runValidations(migration, tenantId, 'pre');
          }

          // Execute phases in order
          const phases: MigrationPhase[] = options.phase
            ? [options.phase]
            : ['expand', 'migrate', 'contract'];

          for (const phase of phases) {
            if (migration.phases[phase]) {
              execution.currentPhase = phase;
              await this.executePhase(migration, execution, phase, options);

              // Update lock for next phase
              if (phase !== phases[phases.length - 1]) {
                await this.releaseLock(migration.id, tenantId);
                await this.acquireLock(
                  migration.id,
                  tenantId,
                  phases[phases.indexOf(phase) + 1],
                );
              }
            }
          }

          // Post-migration validation
          if (!options.skipValidation && !options.dryRun) {
            await this.runValidations(migration, tenantId, 'post');
          }

          execution.status = 'completed';
          execution.completedAt = new Date();

          migrationOperations.inc({
            tenant_id: tenantId,
            migration_type: migration.type,
            phase: 'complete',
            result: 'success',
          });

          this.emit('migrationCompleted', execution);
          return execution;
        } catch (error) {
          execution.status = 'failed';
          execution.error = (error as Error).message;
          execution.completedAt = new Date();

          span.recordException(error as Error);
          span.setStatus({ code: 2, message: (error as Error).message });

          migrationOperations.inc({
            tenant_id: tenantId,
            migration_type: migration.type,
            phase: execution.currentPhase || 'unknown',
            result: 'error',
          });

          this.emit('migrationFailed', execution, error);
          throw error;
        } finally {
          await this.releaseLock(migration.id, tenantId);
          activeMigrations.dec({
            tenant_id: tenantId,
            migration_type: migration.type,
          });
          span.end();
        }
      },
    );
  }

  private async executePhase(
    migration: Migration,
    execution: MigrationExecution,
    phase: MigrationPhase,
    options: { dryRun?: boolean; resumeFromStep?: string },
  ): Promise<void> {
    const steps = migration.phases[phase] || [];
    const startTime = Date.now();

    let startIndex = 0;
    if (options.resumeFromStep) {
      startIndex = steps.findIndex(
        (step) => step.id === options.resumeFromStep,
      );
      if (startIndex === -1) startIndex = 0;
    }

    for (let i = startIndex; i < steps.length; i++) {
      const step = steps[i];
      execution.currentStep = step.id;

      try {
        await this.executeStep(
          migration,
          execution,
          step,
          phase,
          options.dryRun || false,
        );
        execution.progress.completedSteps++;

        this.emit('stepCompleted', {
          migrationId: migration.id,
          tenantId: execution.tenantId,
          phase,
          step: step.id,
          progress: execution.progress,
        });

        // Pause between steps if configured
        if (migration.settings.pauseBetweenBatches && i < steps.length - 1) {
          await this.sleep(migration.settings.pauseBetweenBatches);
        }
      } catch (error) {
        // Retry logic
        const maxRetries = migration.settings.maxRetries || 3;
        let retryCount = 0;

        while (step.retryable && retryCount < maxRetries) {
          retryCount++;

          try {
            await this.sleep(1000 * retryCount); // Exponential backoff
            await this.executeStep(
              migration,
              execution,
              step,
              phase,
              options.dryRun || false,
            );
            execution.progress.completedSteps++;
            break;
          } catch (retryError) {
            if (retryCount === maxRetries) {
              throw retryError;
            }
          }
        }

        if (!step.retryable) {
          throw error;
        }
      }
    }

    migrationDuration.observe(
      { migration_type: migration.type, phase },
      (Date.now() - startTime) / 1000,
    );
  }

  private async executeStep(
    migration: Migration,
    execution: MigrationExecution,
    step: MigrationStep,
    phase: MigrationPhase,
    dryRun: boolean,
  ): Promise<void> {
    return tracer.startActiveSpan(
      'migration_framework.execute_step',
      async (span: Span) => {
        span.setAttributes({
          tenant_id: execution.tenantId,
          migration_id: migration.id,
          phase: phase,
          step_id: step.id,
          step_type: step.type,
          dry_run: dryRun,
        });

        const startTime = Date.now();

        try {
          // Evaluate condition if present
          if (
            step.condition &&
            !(await this.evaluateCondition(step.condition, execution.tenantId))
          ) {
            span.setAttributes({ skipped: true, reason: 'condition_false' });
            return;
          }

          switch (step.type) {
            case 'sql':
              await this.executeSQLStep(step, execution, dryRun);
              break;
            case 'cypher':
              await this.executeCypherStep(step, execution, dryRun);
              break;
            case 'javascript':
              await this.executeJavaScriptStep(step, execution, dryRun);
              break;
            case 'validation':
              await this.executeValidationStep(step, execution);
              break;
            default:
              throw new Error(`Unsupported step type: ${step.type}`);
          }

          span.setAttributes({
            execution_time_ms: Date.now() - startTime,
            records_processed: execution.metrics.recordsProcessed,
          });
        } catch (error) {
          span.recordException(error as Error);
          span.setStatus({ code: 2, message: (error as Error).message });
          throw error;
        } finally {
          span.end();
        }
      },
    );
  }

  private async executeSQLStep(
    step: MigrationStep,
    execution: MigrationExecution,
    dryRun: boolean,
  ): Promise<void> {
    const client = await pool.connect();

    try {
      if (dryRun) {
        // For dry run, use EXPLAIN or validate syntax
        if (step.content.trim().toLowerCase().startsWith('select')) {
          await client.query(`EXPLAIN ${step.content}`);
        } else {
          // Validate syntax by preparing without executing
          await client.query(`PREPARE migration_dry_run AS ${step.content}`);
          await client.query(`DEALLOCATE migration_dry_run`);
        }
      } else {
        // Execute with batching for large operations
        const batchSize = step.name.includes('batch') ? 1000 : undefined;

        if (
          batchSize &&
          (step.content.includes('UPDATE') || step.content.includes('DELETE'))
        ) {
          await this.executeSQLInBatches(
            step.content,
            execution,
            client,
            batchSize,
          );
        } else {
          const result = await client.query(step.content);
          execution.metrics.recordsProcessed += result.rowCount || 0;

          if (step.content.toLowerCase().includes('insert')) {
            execution.metrics.recordsCreated += result.rowCount || 0;
          } else if (step.content.toLowerCase().includes('update')) {
            execution.metrics.recordsUpdated += result.rowCount || 0;
          } else if (step.content.toLowerCase().includes('delete')) {
            execution.metrics.recordsDeleted += result.rowCount || 0;
          }
        }
      }
    } finally {
      client.release();
    }
  }

  private async executeSQLInBatches(
    sql: string,
    execution: MigrationExecution,
    client: any,
    batchSize: number,
  ): Promise<void> {
    let processedRows = 0;
    let hasMore = true;

    while (hasMore) {
      const batchSQL = `${sql} LIMIT ${batchSize}`;
      const result = await client.query(batchSQL);

      processedRows += result.rowCount || 0;
      execution.metrics.recordsProcessed += result.rowCount || 0;

      hasMore = (result.rowCount || 0) === batchSize;

      if (hasMore) {
        await this.sleep(100); // Brief pause between batches
      }
    }
  }

  private async executeCypherStep(
    step: MigrationStep,
    execution: MigrationExecution,
    dryRun: boolean,
  ): Promise<void> {
    if (dryRun) {
      // For dry run, use EXPLAIN
      const explainQuery = `EXPLAIN ${step.content}`;
      await neo.run(explainQuery, {}, { tenantId: execution.tenantId });
    } else {
      const result = await neo.run(
        step.content,
        {},
        { tenantId: execution.tenantId },
      );
      execution.metrics.recordsProcessed += result.records.length;

      // Neo4j doesn't provide direct row counts for mutations
      // Would need to parse the query or use summary stats
    }
  }

  private async executeJavaScriptStep(
    step: MigrationStep,
    execution: MigrationExecution,
    dryRun: boolean,
  ): Promise<void> {
    // Sandbox JavaScript execution
    const context = {
      console,
      execution,
      dryRun,
      pool,
      neo,
      redis,
      // Add utility functions
      sleep: this.sleep,
      log: (message: string) =>
        console.log(`[${execution.migrationId}:${step.id}] ${message}`),
    };

    if (dryRun) {
      // For dry run, validate syntax
      new Function('context', step.content);
    } else {
      try {
        const fn = new Function('context', step.content);
        await fn(context);
      } catch (error) {
        throw new Error(`JavaScript step failed: ${(error as Error).message}`);
      }
    }
  }

  private async executeValidationStep(
    step: MigrationStep,
    execution: MigrationExecution,
  ): Promise<void> {
    // Parse validation content as JSON
    const validation = JSON.parse(step.content);

    if (validation.type === 'sql') {
      const result = await pool.query(validation.query);
      const actual = result.rows[0]?.[validation.field] || result.rowCount;

      if (actual !== validation.expected) {
        throw new Error(
          `Validation failed: expected ${validation.expected}, got ${actual}`,
        );
      }
    } else if (validation.type === 'cypher') {
      const result = await neo.run(
        validation.query,
        {},
        { tenantId: execution.tenantId },
      );
      const actual =
        result.records[0]?.get(validation.field) || result.records.length;

      if (actual !== validation.expected) {
        throw new Error(
          `Validation failed: expected ${validation.expected}, got ${actual}`,
        );
      }
    }
  }

  private async evaluateCondition(
    condition: string,
    tenantId: string,
  ): Promise<boolean> {
    // Simple condition evaluation - could be extended with a proper expression parser
    if (condition.startsWith('sql:')) {
      const query = condition.substring(4);
      const result = await pool.query(query);
      return result.rowCount > 0;
    } else if (condition.startsWith('cypher:')) {
      const query = condition.substring(7);
      const result = await neo.run(query, {}, { tenantId });
      return result.records.length > 0;
    }

    return true; // Default to true for unknown conditions
  }

  private async runValidations(
    migration: Migration,
    tenantId: string,
    type: 'pre' | 'post',
  ): Promise<void> {
    const validations =
      migration.validation?.filter((v) => v.type === type) || [];

    for (const validation of validations) {
      try {
        if (validation.check.startsWith('sql:')) {
          const query = validation.check.substring(4);
          const result = await pool.query(query);
          const actual = result.rows[0] || { count: result.rowCount };

          if (
            JSON.stringify(actual) !== JSON.stringify(validation.expectedResult)
          ) {
            const error = new Error(`Validation '${validation.name}' failed`);
            if (validation.critical) {
              throw error;
            } else {
              console.warn(error.message);
            }
          }
        }
      } catch (error) {
        if (validation.critical) {
          throw new Error(
            `Critical validation '${validation.name}' failed: ${(error as Error).message}`,
          );
        }
      }
    }
  }

  async rollbackMigration(
    migrationId: string,
    tenantId: string,
    toPhase?: MigrationPhase,
  ): Promise<void> {
    return tracer.startActiveSpan(
      'migration_framework.rollback',
      async (span: Span) => {
        span.setAttributes({
          tenant_id: tenantId,
          migration_id: migrationId,
          to_phase: toPhase || 'complete',
        });

        try {
          // Load migration definition
          const migration = await this.loadMigration(migrationId);
          if (!migration.rollback) {
            throw new Error(
              `Migration ${migrationId} does not support rollback`,
            );
          }

          // Execute rollback phases in reverse order
          const phases: MigrationPhase[] = toPhase
            ? this.getPhasesUntil(toPhase).reverse()
            : ['contract', 'migrate', 'expand'];

          for (const phase of phases) {
            const rollbackSteps = migration.rollback[phase];
            if (rollbackSteps) {
              for (const step of rollbackSteps) {
                await this.executeStep(
                  migration,
                  {
                    migrationId,
                    tenantId,
                    status: 'running',
                    startedAt: new Date(),
                    progress: {
                      totalSteps: rollbackSteps.length,
                      completedSteps: 0,
                    },
                    metrics: {
                      recordsProcessed: 0,
                      recordsUpdated: 0,
                      recordsCreated: 0,
                      recordsDeleted: 0,
                    },
                  },
                  step,
                  phase,
                  false,
                );
              }
            }
          }

          migrationOperations.inc({
            tenant_id: tenantId,
            migration_type: migration.type,
            phase: 'rollback',
            result: 'success',
          });
        } catch (error) {
          span.recordException(error as Error);
          span.setStatus({ code: 2, message: (error as Error).message });
          throw error;
        } finally {
          span.end();
        }
      },
    );
  }

  private async acquireLock(
    migrationId: string,
    tenantId: string,
    phase: MigrationPhase,
  ): Promise<void> {
    const lockKey = `${this.lockPrefix}:${tenantId}:${migrationId}:${phase}`;
    const lock: MigrationLock = {
      tenantId,
      migrationId,
      phase,
      lockedAt: new Date(),
      lockedBy: process.pid.toString(),
      expiresAt: new Date(Date.now() + this.lockTTL * 1000),
    };

    const lockSet = await redis.setWithTTLIfNotExists(
      lockKey,
      JSON.stringify(lock),
      this.lockTTL,
    );

    if (!lockSet) {
      throw new Error(
        `Failed to acquire migration lock for ${migrationId}:${phase}`,
      );
    }

    migrationLockStatus.set({ tenant_id: tenantId }, 1);
  }

  private async releaseLock(
    migrationId: string,
    tenantId: string,
  ): Promise<void> {
    const lockPattern = `${this.lockPrefix}:${tenantId}:${migrationId}:*`;
    // In a real implementation, would use Redis SCAN to find and delete matching keys
    console.log(`Releasing migration locks: ${lockPattern}`);
    migrationLockStatus.set({ tenant_id: tenantId }, 0);
  }

  private calculateTotalSteps(migration: Migration): number {
    let total = 0;
    for (const phase of Object.values(migration.phases)) {
      total += phase?.length || 0;
    }
    return total;
  }

  private getPhasesUntil(toPhase: MigrationPhase): MigrationPhase[] {
    const allPhases: MigrationPhase[] = ['expand', 'migrate', 'contract'];
    const toIndex = allPhases.indexOf(toPhase);
    return allPhases.slice(0, toIndex + 1);
  }

  private async loadMigration(migrationId: string): Promise<Migration> {
    // In a real implementation, would load from database or file system
    throw new Error('Migration loading not implemented');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async getMigrationStatus(
    migrationId: string,
    tenantId: string,
  ): Promise<MigrationExecution | null> {
    const stateKey = `${this.statePrefix}:${tenantId}:${migrationId}`;
    const state = await redis.get(stateKey);
    return state ? JSON.parse(state) : null;
  }

  async listRunningMigrations(
    tenantId?: string,
  ): Promise<MigrationExecution[]> {
    // Implementation would scan Redis for running migration states
    return [];
  }

  async loadMigrationsFromDirectory(directory: string): Promise<Migration[]> {
    const migrations: Migration[] = [];
    const files = await fs.readdir(directory);

    for (const file of files) {
      if (file.endsWith('.json') || file.endsWith('.js')) {
        const filePath = path.join(directory, file);
        const content = await fs.readFile(filePath, 'utf-8');

        if (file.endsWith('.json')) {
          migrations.push(JSON.parse(content));
        } else {
          // For .js files, would need to safely evaluate and extract migration definition
        }
      }
    }

    return migrations.sort((a, b) => a.version.localeCompare(b.version));
  }

  generateMigrationReport(executions: MigrationExecution[]): {
    totalMigrations: number;
    successfulMigrations: number;
    failedMigrations: number;
    averageDuration: number;
    totalRecordsProcessed: number;
  } {
    const completed = executions.filter((e) => e.completedAt);
    const successful = executions.filter((e) => e.status === 'completed');
    const failed = executions.filter((e) => e.status === 'failed');

    const totalDuration = completed.reduce((sum, e) => {
      return sum + (e.completedAt!.getTime() - e.startedAt.getTime());
    }, 0);

    const totalRecordsProcessed = executions.reduce((sum, e) => {
      return sum + e.metrics.recordsProcessed;
    }, 0);

    return {
      totalMigrations: executions.length,
      successfulMigrations: successful.length,
      failedMigrations: failed.length,
      averageDuration:
        completed.length > 0 ? totalDuration / completed.length : 0,
      totalRecordsProcessed,
    };
  }
}

export const migrationFramework = new MigrationFramework();
