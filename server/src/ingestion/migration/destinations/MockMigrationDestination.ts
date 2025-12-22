import { MigrationDestination } from '../Destination';
import { MigrationContext } from '../types';

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
