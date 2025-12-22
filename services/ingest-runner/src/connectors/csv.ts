import { IngestConnector, ResourceDefinition, IngestRecord, Checkpoint } from '@intelgraph/ingest-connector-sdk';
import { parse } from 'csv-parse';
import fs from 'fs';
import path from 'path';

export class CsvConnector implements IngestConnector<any, any> {
  async discover(): Promise<ResourceDefinition[]> {
    // In a real scenario, this would scan a directory
    return [
      {
          id: 'csv-1',
          name: 'example.csv',
          type: 'csv',
          metadata: { filepath: process.env.CSV_SOURCE_PATH || '/tmp/data.csv' }
      }
    ];
  }

  async *pull(resource: ResourceDefinition, state?: any): AsyncGenerator<IngestRecord, void, unknown> {
    const filepath = resource.metadata?.filepath as string;
    if (!filepath || !fs.existsSync(filepath)) {
        console.warn(`CSV file not found: ${filepath}`);
        return;
    }

    const parser = fs.createReadStream(filepath).pipe(parse({ columns: true }));
    let index = 0;

    // Parse cursor if exists (format: "csv-1-INDEX")
    let lastProcessedIndex = -1;
    if (state?.cursor) {
        const parts = state.cursor.split('-');
        const idxStr = parts[parts.length - 1];
        const parsed = parseInt(idxStr, 10);
        if (!isNaN(parsed)) {
            lastProcessedIndex = parsed;
        }
    }

    for await (const record of parser) {
        index++;

        if (index <= lastProcessedIndex) {
            continue;
        }

        yield {
          id: `${resource.id}-${index}`,
          data: record,
          extractedAt: new Date()
        };
    }
  }

  async ack(checkpoint: Checkpoint): Promise<void> {
    console.log('Acked', checkpoint);
  }

  async checkpoint(state: any): Promise<Checkpoint> {
    return {
      resourceId: 'csv-1',
      cursor: state.cursor,
      timestamp: Date.now()
    };
  }
}
