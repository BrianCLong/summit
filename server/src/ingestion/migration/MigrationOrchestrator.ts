import { MigrationConfig, MigrationResult, MigrationContext } from './types.js';
import { SourceConnector } from '../../connectors/types.js';
import { IdempotencyService } from './IdempotencyService.js';
import { ValidationService } from './ValidationService.js';
import { MockMigrationConnector } from './connectors/MockMigrationConnector.js';
import { MigrationDestination } from './Destination.js';
import { MockMigrationDestination } from './destinations/MockMigrationDestination.js';
import pino from 'pino';

// @ts-ignore
const logger = pino({ name: 'MigrationOrchestrator' });

export class MigrationOrchestrator {
  private idempotencyService: IdempotencyService;
  private validationService: ValidationService;
  private destination: MigrationDestination;

  constructor() {
    this.idempotencyService = new IdempotencyService();
    this.validationService = new ValidationService();
    this.destination = new MockMigrationDestination();
  }

  async runMigration(config: MigrationConfig): Promise<MigrationResult> {
    const startedAt = new Date();
    const result: MigrationResult = {
      migrationId: config.id,
      status: 'IN_PROGRESS',
      recordsProcessed: 0,
      recordsSuccess: 0,
      recordsFailed: 0,
      recordsSkipped: 0,
      errors: [],
      startedAt,
      dryRun: config.dryRun || false,
    };

    const ctx: MigrationContext = {
      tenantId: config.tenantId,
      pipelineKey: `migration-${config.id}`,
      migrationId: config.id,
      dryRun: config.dryRun || false,
      mappings: config.mappings || {},
      logger,
      correlationId: `mig-${config.id}-${Date.now()}`
    };

    try {
      logger.info({ migrationId: config.id, type: config.sourceType }, 'Starting migration');

      // 1. Initialize Source
      const source = this.getConnector(config);

      let cursor: string | null = null;
      let hasMore = true;

      while (hasMore) {
        // 2. Fetch Batch
        let batch;
        try {
          batch = await source.fetchBatch(ctx, cursor);
        } catch (e: any) {
          result.errors.push({ stage: 'FETCH', message: e.message });
          result.status = 'FAILED';
          break;
        }

        const rawRecords = batch.data.records;

        if (!batch.data.nextCursor || batch.data.nextCursor === 'DONE') {
          hasMore = false;
        } else {
          cursor = batch.data.nextCursor;
        }

        if (rawRecords.length === 0) continue;

        for (const record of rawRecords) {
          result.recordsProcessed++;
          const recordId = record.id || record.Id || record.ID;

          try {
            // 3. Check Idempotency
            if (recordId && await this.idempotencyService.hasProcessed(ctx, recordId)) {
              result.recordsSkipped++;
              continue;
            }

            // 4. Validate
            const validation = await this.validationService.validateRecord(ctx, record);
            if (!validation.valid) {
              result.recordsFailed++;
              result.errors.push({
                recordId,
                stage: 'VALIDATION',
                message: validation.errors.join(', '),
                details: record
              });
              continue;
            }

            // 5. Map & Transform (Placeholder)
            // const mapped = this.mapRecord(record, config.mappings);

            // 6. Write (or simulate if dry-run)
            // Note: Batching writes would be more efficient in production
            if (!ctx.dryRun) {
              await this.destination.write(ctx, [record]);
              if (recordId) await this.idempotencyService.markProcessed(ctx, recordId);
            }

            result.recordsSuccess++;

          } catch (e: any) {
            result.recordsFailed++;
            result.errors.push({ recordId, stage: 'PROCESS', message: e.message });
          }
        }
      }

      if (result.status === 'IN_PROGRESS') {
        result.status = result.errors.length > 0 ? 'PARTIAL' : 'COMPLETED';
      }
      result.completedAt = new Date();

      logger.info({ migrationId: config.id, status: result.status }, 'Migration completed');

    } catch (error: any) {
      logger.error({ migrationId: config.id, error }, 'Migration failed');
      result.status = 'FAILED';
      result.errors.push({ stage: 'FATAL', message: error.message });
      result.completedAt = new Date();
    }

    return result;
  }

  private getConnector(config: MigrationConfig): SourceConnector {
    switch (config.sourceType) {
      case 'salesforce':
      case 'mock':
        return new MockMigrationConnector(config.sourceConfig);
      // Add other connectors here
      default:
        throw new Error(`Unsupported source type: ${config.sourceType}`);
    }
  }
}
