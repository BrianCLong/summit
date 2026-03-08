"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockMigrationDestination = void 0;
class MockMigrationDestination {
    async write(ctx, records) {
        if (ctx.dryRun) {
            ctx.logger.info({ count: records.length }, 'Dry run: skipping write');
            return;
        }
        // Simulate write
        ctx.logger.info({ count: records.length, firstId: records[0]?.id }, 'Writing records to destination');
    }
}
exports.MockMigrationDestination = MockMigrationDestination;
