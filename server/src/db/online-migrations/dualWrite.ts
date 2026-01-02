import { dualWriteDurationSeconds } from './metrics.js';
import {
  assertIdentifier,
  ensureOnlineMigrationTables,
  type MigrationClient,
  type MigrationPool,
} from './state.js';

export interface DualWriteOptions<T> {
  migrationKey: string;
  operation?: string;
  writePrimary: (client: MigrationClient, payload: T) => Promise<void>;
  writeShadow: (client: MigrationClient, payload: T) => Promise<void>;
  enableShadow?: (payload: T) => boolean;
}

export class DualWriter<T> {
  constructor(private pool: MigrationPool, private options: DualWriteOptions<T>) { }

  async write(payload: T) {
    const migration = this.options.migrationKey;
    const operation = this.options.operation ?? 'mutation';
    assertIdentifier(operation, 'dual write operation');
    await ensureOnlineMigrationTables(this.pool);

    const client = await this.pool.connect();
    const start = Date.now();

    try {
      await client.query('BEGIN');
      await this.options.writePrimary(client, payload);
      const shouldShadow = this.options.enableShadow ? this.options.enableShadow(payload) : true;
      if (shouldShadow) {
        await this.options.writeShadow(client, payload);
      }
      await client.query('COMMIT');
      dualWriteDurationSeconds.observe(
        { migration, operation },
        (Date.now() - start) / 1000,
      );
    } catch (error: any) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release?.();
    }
  }
}
