import type { DatabaseAdapter } from './adapters/base-adapter';

export type Dialect = 'postgres' | 'mysql' | 'mongodb';

export interface MigrationMeta {
  readonly id: string;
  readonly version: string;
  readonly title?: string;
  readonly checksum: string;
  readonly dependencies: readonly string[];
}

export interface MigrationContext<TTransaction = unknown> {
  readonly adapter: DatabaseAdapter<TTransaction>;
  readonly transaction: TTransaction | null;
  readonly dryRun: boolean;
  readonly logger: MigrationLogger;
}

export type MigrationHandler<TTransaction = unknown> = (
  context: MigrationContext<TTransaction>
) => Promise<void> | void;

export interface MigrationDefinition<TTransaction = unknown> {
  readonly id: string;
  readonly version?: string;
  readonly title?: string;
  readonly dependencies?: readonly string[];
  readonly tags?: readonly string[];
  readonly up: MigrationHandler<TTransaction>;
  readonly down: MigrationHandler<TTransaction>;
  readonly checksum?: string;
  readonly safetyCheck?: () => Promise<void> | void;
}

export interface PlannedMigration<TTransaction = unknown> {
  readonly definition: MigrationDefinition<TTransaction>;
  readonly meta: MigrationMeta;
}

export interface MigrationRecord {
  readonly id: string;
  readonly version: string;
  readonly checksum: string;
  readonly appliedAt: string;
  readonly durationMs: number;
  readonly tags?: readonly string[];
}

export interface MigrationStateStore {
  init(): Promise<void>;
  listApplied(): Promise<MigrationRecord[]>;
  markApplied(record: MigrationRecord): Promise<void>;
  markReverted(id: string): Promise<void>;
  withLock<T>(callback: () => Promise<T>): Promise<T>;
}

export interface MigrationLogger {
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
}

export interface MigrationEvent {
  readonly type:
    | 'plan'
    | 'apply:start'
    | 'apply:success'
    | 'apply:skipped'
    | 'rollback:start'
    | 'rollback:success'
    | 'rollback:failure'
    | 'validation:error'
    | 'backup:start'
    | 'backup:restore';
  readonly migration?: MigrationMeta;
  readonly error?: unknown;
  readonly message: string;
}

export interface BackupHandle {
  restore(): Promise<void>;
  readonly metadata?: Record<string, unknown>;
}

export interface BackupProvider {
  beforeApply(meta: MigrationMeta): Promise<BackupHandle>;
  afterSuccess?(meta: MigrationMeta, handle: BackupHandle): Promise<void>;
  onFailure?(meta: MigrationMeta, handle: BackupHandle, error: unknown): Promise<void>;
}

export interface MigrationOptions {
  readonly dryRun?: boolean;
  readonly target?: string;
  readonly allowMissingDown?: boolean;
  readonly backupProvider?: BackupProvider;
  readonly onProgress?: (event: MigrationEvent) => void;
  readonly panicRollback?: boolean;
}

export interface RollbackTestOptions extends Omit<MigrationOptions, 'dryRun'> {
  readonly failAt: string;
  readonly scenario?: string;
}
