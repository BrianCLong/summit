/**
 * ETL/ELT Pipeline Manager
 */

import { Pool } from 'pg';
import { BulkLoader } from './loaders/bulk-loader';
import { IncrementalLoader } from './loaders/incremental-loader';
import { PipelineContract } from './schema';

export interface AuthContext {
  permissions: string[];
}

export class PipelineManager {
  public bulkLoader: BulkLoader;
  public incrementalLoader: IncrementalLoader;

  constructor(pool: Pool) {
    this.bulkLoader = new BulkLoader(pool);
    this.incrementalLoader = new IncrementalLoader(pool);
  }

  public checkGovernance(contract: PipelineContract, auth: AuthContext): void {
    const { governance_tags } = contract.spec;

    if (governance_tags.includes('classified') && !auth.permissions.includes('access:classified')) {
      throw new Error('Access denied: classified pipeline requires access:classified permission');
    }

    if (governance_tags.includes('restricted') && !auth.permissions.includes('access:restricted')) {
      throw new Error('Access denied: restricted pipeline requires access:restricted permission');
    }
  }

  async runPipeline(
    contract: PipelineContract,
    auth: AuthContext,
    config: {
      type: 'bulk' | 'incremental';
      schedule?: string;
    }
  ): Promise<void> {
    this.checkGovernance(contract, auth);

    console.log(`Running pipeline: ${contract.metadata.name}`);
    // implementation logic...
  }
}
