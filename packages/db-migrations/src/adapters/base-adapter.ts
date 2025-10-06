import type { Dialect, MigrationMeta } from '../types.js';

export interface TransactionAware {
  readonly id?: string;
}

export interface DatabaseAdapter<TTransaction = unknown> {
  readonly dialect: Dialect | string;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  beginTransaction(): Promise<TTransaction>;
  commit(transaction: TTransaction): Promise<void>;
  rollback(transaction: TTransaction): Promise<void>;
  runInTransaction<R>(callback: (transaction: TTransaction) => Promise<R>): Promise<R>;
  ensureSafety?(meta: MigrationMeta): Promise<void>;
  dryRun?(meta: MigrationMeta): Promise<void>;
}

export interface AdapterFactoryOptions {
  readonly connectionString?: string;
}
