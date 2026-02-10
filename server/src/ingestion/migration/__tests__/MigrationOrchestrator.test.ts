import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { MigrationOrchestrator } from '../MigrationOrchestrator';
import { MigrationConfig } from '../types';

describe('MigrationOrchestrator', () => {
  let orchestrator: MigrationOrchestrator;

  beforeEach(() => {
    orchestrator = new MigrationOrchestrator();
  });

  it('should run a dry run migration successfully', async () => {
    const config: MigrationConfig = {
      id: 'test-mig-1',
      tenantId: 'tenant-1',
      sourceType: 'mock',
      sourceConfig: { recordCount: 20, batchSize: 10 },
      dryRun: true
    };

    const result = await orchestrator.runMigration(config);

    expect(result.status).toBe('COMPLETED');
    expect(result.dryRun).toBe(true);
    // Based on the mock connector returning 10 records per batch for 2 batches
    expect(result.recordsProcessed).toBe(20);
    expect(result.recordsSuccess).toBe(20);
    expect(result.errors).toHaveLength(0);
  });

  it('should handle idempotency', async () => {
    const config: MigrationConfig = {
      id: 'test-mig-2',
      tenantId: 'tenant-1',
      sourceType: 'mock',
      sourceConfig: { recordCount: 20, batchSize: 10 },
      dryRun: false
    };

    // First run
    await orchestrator.runMigration(config);

    // Second run
    const result = await orchestrator.runMigration(config);

    expect(result.status).toBe('COMPLETED');
    expect(result.recordsProcessed).toBe(20);
    expect(result.recordsSkipped).toBe(20); // Should skip all since they were processed
  });
});
