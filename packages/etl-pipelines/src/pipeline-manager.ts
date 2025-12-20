/**
 * ETL/ELT Pipeline Manager
 */

import { Pool } from 'pg';
import { BulkLoader } from './loaders/bulk-loader';
import { IncrementalLoader } from './loaders/incremental-loader';

export class PipelineManager {
  public bulkLoader: BulkLoader;
  public incrementalLoader: IncrementalLoader;

  constructor(pool: Pool) {
    this.bulkLoader = new BulkLoader(pool);
    this.incrementalLoader = new IncrementalLoader(pool);
  }

  async runPipeline(config: {
    name: string;
    source: string;
    target: string;
    type: 'bulk' | 'incremental';
    schedule?: string;
  }): Promise<void> {
    // Simplified pipeline execution
    console.log(`Running pipeline: ${config.name}`);
  }
}
