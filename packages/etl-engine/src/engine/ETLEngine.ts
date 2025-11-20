/**
 * ETL/ELT Execution Engine
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import {
  BasePipeline,
  IntegrationConfig,
  PipelineContext,
  PipelineMode,
  PipelineStatus,
  TransformationType,
} from '@intelgraph/data-integration';
import { IConnector } from '@intelgraph/data-integration';
import { ITransformer } from './ITransformer';
import { TransformerRegistry } from './TransformerRegistry';
import { PipelineValidationResult } from '@intelgraph/data-integration';

/**
 * ETL Pipeline Engine
 */
export class ETLEngine extends BasePipeline {
  private sourceConnector!: IConnector;
  private targetConnector!: IConnector;
  private transformerRegistry: TransformerRegistry;
  private batchSize: number;

  constructor(config: IntegrationConfig) {
    super(config);
    this.transformerRegistry = new TransformerRegistry();
    this.batchSize = config.performance?.batchSize || 1000;
  }

  /**
   * Set source connector
   */
  setSourceConnector(connector: IConnector): void {
    this.sourceConnector = connector;
  }

  /**
   * Set target connector
   */
  setTargetConnector(connector: IConnector): void {
    this.targetConnector = connector;
  }

  /**
   * Execute ETL pipeline
   */
  protected async executeInternal(context: PipelineContext): Promise<void> {
    const mode = this.config.mode || PipelineMode.ETL;

    if (mode === PipelineMode.ETL) {
      await this.executeETL(context);
    } else if (mode === PipelineMode.ELT) {
      await this.executeELT(context);
    } else {
      throw new Error(`Unsupported pipeline mode: ${mode}`);
    }
  }

  /**
   * Execute ETL (Extract, Transform, Load)
   */
  private async executeETL(context: PipelineContext): Promise<void> {
    this.emit('stage:started', { stage: 'extract', context });

    try {
      // Extract data from source
      const extractedData = this.extract(context);

      this.emit('stage:completed', { stage: 'extract', context });
      this.emit('stage:started', { stage: 'transform', context });

      // Transform data
      const transformedData = this.transform(extractedData, context);

      this.emit('stage:completed', { stage: 'transform', context });
      this.emit('stage:started', { stage: 'load', context });

      // Load data to target
      await this.load(transformedData, context);

      this.emit('stage:completed', { stage: 'load', context });
    } catch (error) {
      this.emit('stage:failed', { stage: 'etl', error, context });
      throw error;
    }
  }

  /**
   * Execute ELT (Extract, Load, Transform in target)
   */
  private async executeELT(context: PipelineContext): Promise<void> {
    this.emit('stage:started', { stage: 'extract', context });

    try {
      // Extract data from source
      const extractedData = this.extract(context);

      this.emit('stage:completed', { stage: 'extract', context });
      this.emit('stage:started', { stage: 'load', context });

      // Load raw data to target
      await this.load(extractedData, context);

      this.emit('stage:completed', { stage: 'load', context });
      this.emit('stage:started', { stage: 'transform', context });

      // Transform data in target system
      await this.transformInTarget(context);

      this.emit('stage:completed', { stage: 'transform', context });
    } catch (error) {
      this.emit('stage:failed', { stage: 'elt', error, context });
      throw error;
    }
  }

  /**
   * Extract data from source
   */
  private async *extract(context: PipelineContext): AsyncIterableIterator<any> {
    if (!this.sourceConnector) {
      throw new Error('Source connector not configured');
    }

    let recordCount = 0;
    const startTime = Date.now();

    try {
      for await (const record of this.sourceConnector.read()) {
        yield record;
        recordCount++;

        if (recordCount % 1000 === 0) {
          this.emit('progress', {
            stage: 'extract',
            recordsProcessed: recordCount,
            elapsed: Date.now() - startTime,
          });
        }
      }

      if (!context.metrics) context.metrics = {};
      context.metrics.recordsExtracted = recordCount;
    } catch (error) {
      this.emit('error', { stage: 'extract', error });
      throw error;
    }
  }

  /**
   * Transform data
   */
  private async *transform(
    dataStream: AsyncIterableIterator<any>,
    context: PipelineContext
  ): AsyncIterableIterator<any> {
    if (!this.config.transformations || this.config.transformations.length === 0) {
      // No transformations, pass through
      for await (const record of dataStream) {
        yield record;
      }
      return;
    }

    let recordCount = 0;
    let successCount = 0;
    let errorCount = 0;
    const startTime = Date.now();

    try {
      for await (const record of dataStream) {
        recordCount++;

        try {
          let transformedRecord = record;

          // Apply each transformation in sequence
          for (const transformConfig of this.config.transformations) {
            const transformer = this.transformerRegistry.get(transformConfig.type);
            if (transformer) {
              transformedRecord = await transformer.transform(transformedRecord, transformConfig.config);
            }
          }

          yield transformedRecord;
          successCount++;
        } catch (error) {
          errorCount++;
          this.handleTransformError(error as Error, record, context);

          // Skip record or handle based on error strategy
          if (this.config.errorHandling?.strategy !== 'skip') {
            throw error;
          }
        }

        if (recordCount % 1000 === 0) {
          this.emit('progress', {
            stage: 'transform',
            recordsProcessed: recordCount,
            recordsSucceeded: successCount,
            recordsFailed: errorCount,
            elapsed: Date.now() - startTime,
          });
        }
      }

      if (!context.metrics) context.metrics = {};
      context.metrics.recordsTransformed = successCount;
      context.metrics.recordsFailed = errorCount;
    } catch (error) {
      this.emit('error', { stage: 'transform', error });
      throw error;
    }
  }

  /**
   * Load data to target
   */
  private async load(dataStream: AsyncIterableIterator<any>, context: PipelineContext): Promise<void> {
    if (!this.targetConnector) {
      throw new Error('Target connector not configured');
    }

    let batch: any[] = [];
    let recordCount = 0;
    let successCount = 0;
    const startTime = Date.now();

    try {
      for await (const record of dataStream) {
        batch.push(record);
        recordCount++;

        // Write batch when it reaches the configured size
        if (batch.length >= this.batchSize) {
          const result = await this.targetConnector.write(batch, {
            mode: this.config.mode === PipelineMode.ELT ? 'append' : 'upsert',
            batchSize: this.batchSize,
          });

          successCount += result.recordsWritten;
          batch = [];

          this.emit('progress', {
            stage: 'load',
            recordsProcessed: recordCount,
            recordsWritten: successCount,
            elapsed: Date.now() - startTime,
          });
        }
      }

      // Write remaining records
      if (batch.length > 0) {
        const result = await this.targetConnector.write(batch, {
          mode: this.config.mode === PipelineMode.ELT ? 'append' : 'upsert',
          batchSize: this.batchSize,
        });
        successCount += result.recordsWritten;
      }

      if (!context.metrics) context.metrics = {};
      context.metrics.recordsLoaded = successCount;
    } catch (error) {
      this.emit('error', { stage: 'load', error });
      throw error;
    }
  }

  /**
   * Transform data in target system (for ELT)
   */
  private async transformInTarget(context: PipelineContext): Promise<void> {
    // Execute SQL transformations in target database
    if (this.config.transformations) {
      for (const transformation of this.config.transformations) {
        if (transformation.type === TransformationType.SQL) {
          // Execute SQL transformation
          this.emit('info', {
            message: `Executing SQL transformation: ${transformation.name}`,
          });

          // This would execute SQL in the target database
          // Implementation depends on the target connector
        }
      }
    }
  }

  /**
   * Handle transformation error
   */
  private handleTransformError(error: Error, record: any, context: PipelineContext): void {
    const errorStrategy = this.config.errorHandling?.strategy;

    switch (errorStrategy) {
      case 'skip':
        this.emit('record:skipped', { error, record });
        break;
      case 'dead_letter':
        this.emit('record:dead_letter', { error, record });
        // Send to dead letter queue
        break;
      case 'fail':
      default:
        throw error;
    }
  }

  /**
   * Custom validation
   */
  protected async customValidate(): Promise<PipelineValidationResult> {
    const errors: any[] = [];
    const warnings: any[] = [];

    if (!this.sourceConnector) {
      errors.push({ type: 'connector', message: 'Source connector not configured' });
    }

    if (!this.targetConnector) {
      errors.push({ type: 'connector', message: 'Target connector not configured' });
    }

    // Validate transformations
    if (this.config.transformations) {
      for (const transformation of this.config.transformations) {
        if (!this.transformerRegistry.has(transformation.type)) {
          errors.push({
            type: 'transformation',
            message: `Unknown transformation type: ${transformation.type}`,
          });
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Register custom transformer
   */
  registerTransformer(type: string, transformer: ITransformer): void {
    this.transformerRegistry.register(type, transformer);
  }
}
