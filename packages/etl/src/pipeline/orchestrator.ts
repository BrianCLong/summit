import { EventEmitter } from 'events';
import type {
  PipelineConfig,
  PipelineRun,
  PipelineRunStatus,
  PipelineRunMetrics,
  DataQualityAssessment
} from '../types.js';
import { ConnectorFactory, type IConnector } from '../connectors/base.js';
import { TransformationPipeline, TransformerFactory } from '../transformers/base.js';
import type { ITransformer } from '../transformers/base.js';

/**
 * Pipeline execution options
 */
export interface PipelineExecutionOptions {
  dryRun?: boolean;
  maxRecords?: number;
  continueOnError?: boolean;
  batchSize?: number;
}

/**
 * Pipeline Orchestrator
 * Manages the execution of ETL pipelines
 */
export class PipelineOrchestrator extends EventEmitter {
  private config: PipelineConfig;
  private connector?: IConnector;
  private transformers: ITransformer[] = [];
  private currentRun?: PipelineRun;

  constructor(config: PipelineConfig) {
    super();
    this.config = config;
  }

  /**
   * Initialize pipeline components
   */
  async initialize(): Promise<void> {
    try {
      // Get connector configuration
      const connectorConfig = await this.getConnectorConfig(this.config.connectorId);

      // Create connector instance
      this.connector = ConnectorFactory.create(connectorConfig);

      // Create transformer instances
      this.transformers = this.config.transformations
        .filter((t) => t.enabled)
        .sort((a, b) => a.order - b.order)
        .map((transformConfig) => TransformerFactory.create(transformConfig));

      this.emit('initialized', {
        connector: this.connector.getMetadata(),
        transformers: this.transformers.map((t) => t.getMetadata())
      });
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Execute the pipeline
   */
  async execute(options: PipelineExecutionOptions = {}): Promise<PipelineRun> {
    if (!this.connector || this.transformers.length === 0) {
      await this.initialize();
    }

    // Initialize run
    const runId = this.generateRunId();
    this.currentRun = this.createPipelineRun(runId);

    this.emit('run-started', this.currentRun);

    try {
      // Connect to data source
      await this.connector!.connect();

      // Create transformation pipeline
      const transformationPipeline = new TransformationPipeline(this.transformers, {
        pipelineId: this.config.id,
        runId,
        tenantId: this.config.tenantId,
        metadata: {}
      });

      // Process data
      const batch: unknown[] = [];
      let recordCount = 0;

      for await (const record of this.connector!.fetch()) {
        try {
          recordCount++;
          this.currentRun!.metrics.recordsRead = recordCount;

          // Apply transformations
          const result = await transformationPipeline.execute(record);

          if (result.data !== null) {
            batch.push(result.data);
            this.currentRun!.metrics.recordsProcessed++;

            // Emit progress
            this.emit('progress', {
              recordsRead: recordCount,
              recordsProcessed: this.currentRun!.metrics.recordsProcessed,
              batch: batch.length
            });

            // Process batch if it reaches batch size
            if (batch.length >= (options.batchSize || 100)) {
              await this.processBatch(batch, options.dryRun || false);
              batch.length = 0;
            }
          }

          // Check max records limit
          if (options.maxRecords && recordCount >= options.maxRecords) {
            break;
          }
        } catch (error) {
          this.currentRun!.metrics.recordsFailed++;
          this.emit('record-error', { record, error });

          if (!options.continueOnError) {
            throw error;
          }
        }
      }

      // Process remaining batch
      if (batch.length > 0) {
        await this.processBatch(batch, options.dryRun || false);
      }

      // Disconnect from source
      await this.connector!.disconnect();

      // Complete run
      this.currentRun!.status = 'SUCCEEDED';
      this.currentRun!.finishedAt = new Date();
      this.calculateMetrics();

      this.emit('run-completed', this.currentRun);

      return this.currentRun!;
    } catch (error) {
      this.currentRun!.status = 'FAILED';
      this.currentRun!.finishedAt = new Date();
      this.currentRun!.error = (error as Error).message;
      this.currentRun!.errorStack = (error as Error).stack;

      this.emit('run-failed', { run: this.currentRun, error });

      throw error;
    }
  }

  /**
   * Cancel the current pipeline run
   */
  async cancel(): Promise<void> {
    if (this.currentRun && this.currentRun.status === 'RUNNING') {
      this.currentRun.status = 'CANCELLED';
      this.currentRun.finishedAt = new Date();

      if (this.connector) {
        await this.connector.disconnect();
      }

      this.emit('run-cancelled', this.currentRun);
    }
  }

  /**
   * Get current run status
   */
  getCurrentRun(): PipelineRun | undefined {
    return this.currentRun;
  }

  /**
   * Process a batch of records
   */
  private async processBatch(batch: unknown[], dryRun: boolean): Promise<void> {
    if (dryRun) {
      this.emit('batch-processed', {
        size: batch.length,
        dryRun: true
      });
      return;
    }

    try {
      // Write to destination
      await this.writeToDestination(batch);

      this.currentRun!.metrics.recordsWritten += batch.length;

      this.emit('batch-processed', {
        size: batch.length,
        totalWritten: this.currentRun!.metrics.recordsWritten
      });
    } catch (error) {
      this.emit('batch-error', { batch, error });
      throw error;
    }
  }

  /**
   * Write batch to destination
   */
  private async writeToDestination(batch: unknown[]): Promise<void> {
    const destination = this.config.destination;

    // This is a placeholder - actual implementation would depend on destination type
    // In production, this would write to PostgreSQL, Neo4j, Kafka, etc.
    this.emit('write-to-destination', {
      type: destination.type,
      records: batch.length
    });
  }

  /**
   * Create a new pipeline run
   */
  private createPipelineRun(runId: string): PipelineRun {
    return {
      id: runId,
      pipelineId: this.config.id,
      status: 'RUNNING',
      startedAt: new Date(),
      metrics: {
        recordsRead: 0,
        recordsProcessed: 0,
        recordsWritten: 0,
        recordsFailed: 0,
        recordsDuplicate: 0,
        bytesProcessed: 0,
        durationMs: 0
      },
      tenantId: this.config.tenantId
    };
  }

  /**
   * Calculate final metrics
   */
  private calculateMetrics(): void {
    if (!this.currentRun) return;

    const durationMs =
      this.currentRun.finishedAt!.getTime() - this.currentRun.startedAt.getTime();

    this.currentRun.metrics.durationMs = durationMs;

    // Calculate throughput
    if (durationMs > 0) {
      this.currentRun.metrics.throughputRecordsPerSec =
        (this.currentRun.metrics.recordsProcessed / durationMs) * 1000;
    }

    // Calculate error rate
    const totalRecords = this.currentRun.metrics.recordsRead;
    if (totalRecords > 0) {
      this.currentRun.metrics.errorRate =
        this.currentRun.metrics.recordsFailed / totalRecords;
    }
  }

  /**
   * Generate unique run ID
   */
  private generateRunId(): string {
    return `${this.config.id}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  }

  /**
   * Get connector configuration by ID
   * This is a placeholder - in production, this would fetch from a repository
   */
  private async getConnectorConfig(connectorId: string): Promise<any> {
    // Placeholder implementation
    // In production, this would fetch from a database or config store
    throw new Error('getConnectorConfig must be implemented');
  }
}
