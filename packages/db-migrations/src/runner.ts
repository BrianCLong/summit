import { performance } from 'node:perf_hooks';
import { buildMigrationPlan } from './plan-builder.js';
import type {
  BackupHandle,
  MigrationDefinition,
  MigrationEvent,
  MigrationLogger,
  MigrationOptions,
  MigrationRecord,
  MigrationStateStore,
  PlannedMigration,
  RollbackTestOptions,
} from './types.js';
import type { DatabaseAdapter } from './adapters/base-adapter.js';
import { ConsoleLogger } from './logger.js';

export class MigrationValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MigrationValidationError';
  }
}

export class MigrationExecutionError extends Error {
  constructor(public readonly planned: PlannedMigration, public readonly backup: BackupHandle | undefined, cause: unknown) {
    super(`Migration ${planned.meta.id} failed: ${(cause as Error).message}`, { cause });
    this.name = 'MigrationExecutionError';
  }
}

interface MigrationRunnerConfig {
  readonly adapter: DatabaseAdapter;
  readonly stateStore: MigrationStateStore;
  readonly logger?: MigrationLogger;
}

interface ExecutedMigration {
  readonly planned: PlannedMigration;
  readonly durationMs: number;
  readonly record: MigrationRecord;
  readonly backup?: BackupHandle;
}

export class MigrationRunner {
  private readonly logger: MigrationLogger;

  constructor(private readonly config: MigrationRunnerConfig) {
    this.logger = config.logger ?? new ConsoleLogger();
  }

  async apply(definitions: readonly MigrationDefinition[], options: MigrationOptions = {}): Promise<MigrationRecord[]> {
    await this.config.stateStore.init();
    await this.config.adapter.connect();
    try {
      return await this.config.stateStore.withLock(async () => this.applyInternal(definitions, options));
    } finally {
      await this.config.adapter.disconnect();
    }
  }

  async verifyRollback(
    definitions: readonly MigrationDefinition[],
    options: RollbackTestOptions
  ): Promise<MigrationRecord[]> {
    const injectedFailure = definitions.map((definition) => {
      if (definition.id !== options.failAt) {
        return definition;
      }
      return {
        ...definition,
        async up(context) {
          await definition.up(context);
          throw new Error(`Injected failure for scenario ${options.scenario ?? 'unknown'}`);
        },
      } satisfies MigrationDefinition;
    });

    try {
      await this.apply(injectedFailure, options);
      throw new Error('Rollback verification did not trigger failure');
    } catch (error) {
      if (error instanceof Error && error.message.includes('Injected failure')) {
        return this.config.stateStore.listApplied();
      }
      throw error;
    }
  }

  private async applyInternal(
    definitions: readonly MigrationDefinition[],
    options: MigrationOptions
  ): Promise<MigrationRecord[]> {
    this.validate(definitions, options);
    const applied = await this.config.stateStore.listApplied();
    const plan = options.target
      ? buildMigrationPlan(definitions, { applied, target: options.target })
      : buildMigrationPlan(definitions, { applied });

    const emit = (event: MigrationEvent): void => {
      options.onProgress?.(event);
      this.logger.info(event.message, {
        type: event.type,
        migration: event.migration?.id,
      });
      if (event.error) {
        this.logger.error('migration-event-error', {
          id: event.migration?.id,
          error: event.error,
        });
      }
    };

    emit({ type: 'plan', message: `Plan generated with ${plan.length} pending migrations` });

    if (options.dryRun) {
      for (const planned of plan) {
        emit({
          type: 'apply:skipped',
          message: `Dry-run: ${planned.meta.id}`,
          migration: planned.meta,
        });
        if (typeof this.config.adapter.dryRun === 'function') {
          await this.config.adapter.dryRun(planned.meta);
        }
      }
      return applied;
    }

    const executed: ExecutedMigration[] = [];
    try {
      for (const planned of plan) {
        const result = await this.applyMigration(planned, options, emit);
        executed.push(result);
      }
    } catch (error) {
      if (error instanceof MigrationExecutionError) {
        await this.rollbackFailures(executed, error, options, emit);
        throw error.cause;
      }
      await this.rollbackFailures(executed, undefined, options, emit);
      throw error;
    }

    return this.config.stateStore.listApplied();
  }

  private validate(definitions: readonly MigrationDefinition[], options: MigrationOptions): void {
    const ids = new Set<string>();
    for (const definition of definitions) {
      if (!definition.id) {
        throw new MigrationValidationError('Migration id is required');
      }
      if (ids.has(definition.id)) {
        throw new MigrationValidationError(`Duplicate migration id detected: ${definition.id}`);
      }
      ids.add(definition.id);
      if (!definition.down && !options.allowMissingDown) {
        throw new MigrationValidationError(`Migration ${definition.id} is missing a rollback handler`);
      }
      if (definition.safetyCheck) {
        try {
          void definition.safetyCheck();
        } catch (error) {
          throw new MigrationValidationError(
            `Safety check failed for migration ${definition.id}: ${(error as Error).message}`
          );
        }
      }
    }
  }

  private async applyMigration(
    planned: PlannedMigration,
    options: MigrationOptions,
    emit: (event: MigrationEvent) => void
  ): Promise<ExecutedMigration> {
    emit({ type: 'apply:start', message: `Applying ${planned.meta.id}`, migration: planned.meta });
    const start = performance.now();
    let backup: BackupHandle | undefined;

    if (options.backupProvider) {
      emit({ type: 'backup:start', message: `Creating backup for ${planned.meta.id}`, migration: planned.meta });
      backup = await options.backupProvider.beforeApply(planned.meta);
    }

    if (typeof this.config.adapter.ensureSafety === 'function') {
      await this.config.adapter.ensureSafety(planned.meta);
    }

    try {
      await this.config.adapter.runInTransaction(async (transaction) => {
        await planned.definition.up({
          adapter: this.config.adapter,
          dryRun: false,
          transaction,
          logger: this.logger,
        });
      });
    } catch (cause) {
      if (backup && options.backupProvider?.onFailure) {
        await options.backupProvider.onFailure(planned.meta, backup, cause);
      }
      throw new MigrationExecutionError(planned, backup, cause);
    }

    const durationMs = performance.now() - start;
    const recordBase: MigrationRecord = {
      id: planned.meta.id,
      version: planned.meta.version,
      checksum: planned.meta.checksum,
      appliedAt: new Date().toISOString(),
      durationMs,
    };
    const record = planned.definition.tags
      ? { ...recordBase, tags: planned.definition.tags }
      : recordBase;
    await this.config.stateStore.markApplied(record);

    if (backup && options.backupProvider?.afterSuccess) {
      await options.backupProvider.afterSuccess(planned.meta, backup);
    }

    emit({ type: 'apply:success', message: `Applied ${planned.meta.id}`, migration: planned.meta });
    return backup ? { planned, durationMs, record, backup } : { planned, durationMs, record };
  }

  private async rollbackFailures(
    executed: ExecutedMigration[],
    failure: MigrationExecutionError | undefined,
    options: MigrationOptions,
    emit: (event: MigrationEvent) => void
  ): Promise<void> {
    if (failure) {
      await this.rollbackSingle(failure.planned, options, emit, failure.cause, failure.backup, false);
    }
    for (const executedMigration of [...executed].reverse()) {
      await this.rollbackSingle(
        executedMigration.planned,
        options,
        emit,
        failure?.cause,
        executedMigration.backup,
        true
      );
    }
  }

  private async rollbackSingle(
    planned: PlannedMigration,
    options: MigrationOptions,
    emit: (event: MigrationEvent) => void,
    error: unknown,
    backup: BackupHandle | undefined,
    markReverted: boolean
  ): Promise<void> {
    emit({ type: 'rollback:start', message: `Rolling back ${planned.meta.id}`, migration: planned.meta, error });
    try {
      await this.config.adapter.runInTransaction(async (transaction) => {
        await planned.definition.down({
          adapter: this.config.adapter,
          dryRun: false,
          transaction,
          logger: this.logger,
        });
      });
      if (markReverted) {
        await this.config.stateStore.markReverted(planned.meta.id);
      }
      if (backup) {
        emit({
          type: 'backup:restore',
          message: `Restoring backup for ${planned.meta.id}`,
          migration: planned.meta,
        });
        await backup.restore();
      }
      emit({ type: 'rollback:success', message: `Rolled back ${planned.meta.id}`, migration: planned.meta });
    } catch (rollbackError) {
      emit({
        type: 'rollback:failure',
        message: `Rollback failed for ${planned.meta.id}`,
        migration: planned.meta,
        error: rollbackError,
      });
    }
  }
}
