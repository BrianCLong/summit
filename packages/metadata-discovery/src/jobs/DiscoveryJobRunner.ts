/**
 * Discovery Job Runner
 * Executes scheduled metadata discovery jobs
 */

import {
  DiscoveryJobConfig,
  DiscoveryJobExecution,
  JobStatus,
  DiscoveryError,
  ErrorSeverity,
  DataSourceConfig,
  ExtractionResult,
} from '../types/discovery.js';
import { PostgresExtractor } from '../extractors/PostgresExtractor.js';
import { DataProfiler } from '../profilers/DataProfiler.js';

export interface IDiscoveryJobStore {
  getJob(jobId: string): Promise<DiscoveryJobConfig | null>;
  saveExecution(execution: DiscoveryJobExecution): Promise<void>;
  updateJobStatus(jobId: string, lastRun: Date, nextRun: Date): Promise<void>;
}

export class DiscoveryJobRunner {
  private profiler: DataProfiler;

  constructor(private store: IDiscoveryJobStore) {
    this.profiler = new DataProfiler();
  }

  /**
   * Execute discovery job
   */
  async executeJob(
    jobConfig: DiscoveryJobConfig,
    sourceConfig: DataSourceConfig
  ): Promise<DiscoveryJobExecution> {
    const execution: DiscoveryJobExecution = {
      id: this.generateExecutionId(jobConfig.id),
      jobId: jobConfig.id,
      status: JobStatus.RUNNING,
      startedAt: new Date(),
      completedAt: null,
      assetsDiscovered: 0,
      errors: [],
      metadata: {},
    };

    try {
      // Extract metadata based on source type
      const extractionResult = await this.extractMetadata(sourceConfig, jobConfig);

      execution.assetsDiscovered = extractionResult.assets.length;
      execution.metadata = {
        statistics: extractionResult.statistics,
      };

      // Profile data if enabled
      if (jobConfig.options.profileData) {
        await this.profileAssets(extractionResult, jobConfig);
      }

      execution.status = JobStatus.COMPLETED;
      execution.completedAt = new Date();
    } catch (error) {
      execution.status = JobStatus.FAILED;
      execution.completedAt = new Date();
      execution.errors.push({
        code: 'EXECUTION_FAILED',
        message: error instanceof Error ? error.message : 'Unknown error',
        source: jobConfig.name,
        timestamp: new Date(),
        severity: ErrorSeverity.CRITICAL,
      });
    }

    await this.store.saveExecution(execution);

    return execution;
  }

  /**
   * Extract metadata from source
   */
  private async extractMetadata(
    sourceConfig: DataSourceConfig,
    jobConfig: DiscoveryJobConfig
  ): Promise<ExtractionResult> {
    switch (sourceConfig.type) {
      case 'POSTGRESQL':
        return this.extractFromPostgres(sourceConfig, jobConfig);
      // Add more source types as needed
      default:
        throw new Error(`Unsupported source type: ${sourceConfig.type}`);
    }
  }

  /**
   * Extract from PostgreSQL
   */
  private async extractFromPostgres(
    sourceConfig: DataSourceConfig,
    jobConfig: DiscoveryJobConfig
  ): Promise<ExtractionResult> {
    const extractor = new PostgresExtractor(sourceConfig.connectionString);

    try {
      const result = await extractor.extract();
      return result;
    } finally {
      await extractor.close();
    }
  }

  /**
   * Profile discovered assets
   */
  private async profileAssets(extractionResult: ExtractionResult, jobConfig: DiscoveryJobConfig): Promise<void> {
    for (const asset of extractionResult.assets) {
      if (asset.sampleData.length > 0 && asset.schema?.columns) {
        const columnNames = asset.schema.columns.map((c: any) => c.name);
        const profilingResult = await this.profiler.profileData(asset.name, asset.sampleData, columnNames);

        // Store profiling results
        asset.statistics = {
          ...asset.statistics,
          profiling: profilingResult,
        };
      }
    }
  }

  /**
   * Schedule job execution
   */
  async scheduleJob(jobConfig: DiscoveryJobConfig): Promise<void> {
    // Parse cron schedule and calculate next run time
    const nextRun = this.calculateNextRun(jobConfig.schedule);

    await this.store.updateJobStatus(jobConfig.id, new Date(), nextRun);
  }

  /**
   * Calculate next run time from cron expression
   */
  private calculateNextRun(cronExpression: string): Date {
    // Simple implementation - in production, use a proper cron parser
    const now = new Date();
    const nextRun = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Daily for now
    return nextRun;
  }

  /**
   * Generate execution ID
   */
  private generateExecutionId(jobId: string): string {
    return `exec-${jobId}-${Date.now()}`;
  }
}
