import { SourceConnector } from '../../../connectors/types.js';
import { ConnectorContext } from '../../../data-model/types.js';
import { BaseConnector } from '../../../connectors/BaseConnector.js';
import { DataEnvelope } from '../../../types/data-envelope.js';

export interface MockConfig {
  recordCount?: number;
  batchSize?: number;
}

export class MockMigrationConnector extends BaseConnector implements SourceConnector {
  private config: MockConfig;

  constructor(config: MockConfig) {
    super();
    this.config = config || { recordCount: 20, batchSize: 10 };
  }

  async fetchBatch(ctx: ConnectorContext, cursor?: string | null): Promise<DataEnvelope<{
    records: any[];
    nextCursor?: string | null;
  }>> {
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
