import { IngestConnector, ResourceDefinition, IngestRecord, Checkpoint } from '@intelgraph/ingest-connector-sdk';

export class CsvConnector implements IngestConnector<any, any> {
  async discover(): Promise<ResourceDefinition[]> {
    return [
      { id: 'csv-1', name: 'example.csv', type: 'csv' }
    ];
  }

  async *pull(resource: ResourceDefinition, state?: any): AsyncGenerator<IngestRecord, void, unknown> {
    // Mock implementation
    yield {
      id: '1',
      data: { col1: 'val1', col2: 'val2' },
      extractedAt: new Date()
    };
  }

  async ack(checkpoint: Checkpoint): Promise<void> {
    console.log('Acked', checkpoint);
  }

  async checkpoint(state: any): Promise<Checkpoint> {
    return {
      resourceId: 'csv-1',
      cursor: '1',
      timestamp: Date.now()
    };
  }
}
