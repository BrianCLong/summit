"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockMigrationConnector = void 0;
const BaseConnector_js_1 = require("../../../connectors/BaseConnector.js");
class MockMigrationConnector extends BaseConnector_js_1.BaseConnector {
    config;
    constructor(config) {
        super();
        this.config = config || { recordCount: 20, batchSize: 10 };
    }
    async fetchBatch(ctx, cursor) {
        const batchSize = this.config.batchSize || 10;
        const maxRecords = this.config.recordCount || 20;
        return this.withResilience(async () => {
            this.logger.info({ cursor }, 'Fetching Mock batch');
            // Mock data for prototype
            if (cursor === 'DONE') {
                return { records: [], nextCursor: 'DONE' };
            }
            const currentOffset = cursor ? parseInt(cursor) : 0;
            if (currentOffset >= maxRecords) {
                return { records: [], nextCursor: 'DONE' };
            }
            const remaining = maxRecords - currentOffset;
            const count = Math.min(batchSize, remaining);
            const mockRecords = Array.from({ length: count }).map((_, i) => ({
                Id: `mock-${currentOffset + i}`,
                Name: `Test Contact ${currentOffset + i}`,
                Email: `contact${currentOffset + i}@example.com`,
                Phone: '555-0100',
                attributes: { type: 'Contact' }
            }));
            const nextOffset = currentOffset + count;
            const nextCursor = nextOffset >= maxRecords ? 'DONE' : nextOffset.toString();
            return { records: mockRecords, nextCursor };
        }, ctx);
    }
}
exports.MockMigrationConnector = MockMigrationConnector;
