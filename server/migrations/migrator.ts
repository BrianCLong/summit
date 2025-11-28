import { MigrationManager } from '../src/db/migrations/versioning.js';

/**
 * Postgres migration runner for managed SQL migrations.
 * Uses the typed MigrationManager to coordinate apply/rollback operations
 * while keeping compatibility with the legacy entrypoint signature.
 */
export async function run(_name = 'default', _batch = 1000) {
  const manager = new MigrationManager();
  await manager.migrate();
}
