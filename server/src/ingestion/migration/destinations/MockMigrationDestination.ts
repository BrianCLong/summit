import { MigrationDestination } from '../Destination.js';
import { MigrationContext } from '../types.js';

export class MockMigrationDestination implements MigrationDestination {
  async write(ctx: MigrationContext, records: any[]): Promise<void> {
    if (ctx.dryRun) {
        ctx.logger.info({ count: records.length }, 'Dry run: skipping write');
        return;
    }
    // Simulate write
    ctx.logger.info({ count: records.length, firstId: records[0]?.id }, 'Writing records to destination');
  }
}
