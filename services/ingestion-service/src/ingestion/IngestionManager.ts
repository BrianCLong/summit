/**
 * Ingestion manager - manages active data ingestion instances
 */

import { Logger } from 'winston';
import { DataSourceConfig, PipelineStatus } from '@intelgraph/data-integration/src/types';
import { PipelineExecutor } from '@intelgraph/etl-framework/src/pipeline/PipelineExecutor';
import { ConnectorRegistry } from '../registry/ConnectorRegistry.js';

export interface IngestionInstance {
  id: string;
  config: DataSourceConfig;
  status: 'running' | 'stopped' | 'error';
  startedAt?: Date;
  stoppedAt?: Date;
  recordsProcessed: number;
  errors: any[];
  lastHeartbeat?: Date;
}

export class IngestionManager {
  private logger: Logger;
  private registry: ConnectorRegistry;
  private ingestions: Map<string, IngestionInstance> = new Map();
  private activeExecutors: Map<string, any> = new Map();

  constructor(logger: Logger, registry: ConnectorRegistry) {
    this.logger = logger;
    this.registry = registry;
  }

  /**
   * Create new ingestion instance
   */
  async createIngestion(config: DataSourceConfig): Promise<IngestionInstance> {
    // Validate connector exists
    const connectorMetadata = await this.registry.getConnector(config.type);
    if (!connectorMetadata) {
      throw new Error(`Unknown connector type: ${config.type}`);
    }

    const ingestion: IngestionInstance = {
      id: this.generateIngestionId(),
      config,
      status: 'stopped',
      recordsProcessed: 0,
      errors: []
    };

    this.ingestions.set(ingestion.id, ingestion);
    this.logger.info(`Created ingestion ${ingestion.id} for source ${config.name}`);

    return ingestion;
  }

  /**
   * List all ingestion instances
   */
  async listIngestions(): Promise<IngestionInstance[]> {
    return Array.from(this.ingestions.values());
  }

  /**
   * Get ingestion by ID
   */
  async getIngestion(id: string): Promise<IngestionInstance | undefined> {
    return this.ingestions.get(id);
  }

  /**
   * Start ingestion
   */
  async startIngestion(id: string): Promise<void> {
    const ingestion = this.ingestions.get(id);

    if (!ingestion) {
      throw new Error(`Ingestion ${id} not found`);
    }

    if (ingestion.status === 'running') {
      throw new Error(`Ingestion ${id} is already running`);
    }

    ingestion.status = 'running';
    ingestion.startedAt = new Date();
    ingestion.lastHeartbeat = new Date();

    this.logger.info(`Starting ingestion ${id}`);

    // Start pipeline execution in background
    this.executeIngestion(ingestion).catch(error => {
      this.logger.error(`Error in ingestion ${id}`, { error });
      ingestion.status = 'error';
      ingestion.errors.push({
        timestamp: new Date(),
        message: error.message,
        stack: error.stack
      });
    });
  }

  /**
   * Stop ingestion
   */
  async stopIngestion(id: string): Promise<void> {
    const ingestion = this.ingestions.get(id);

    if (!ingestion) {
      throw new Error(`Ingestion ${id} not found`);
    }

    if (ingestion.status !== 'running') {
      throw new Error(`Ingestion ${id} is not running`);
    }

    this.logger.info(`Stopping ingestion ${id}`);

    // Stop executor if exists
    const executor = this.activeExecutors.get(id);
    if (executor) {
      // Would implement graceful shutdown
      this.activeExecutors.delete(id);
    }

    ingestion.status = 'stopped';
    ingestion.stoppedAt = new Date();
  }

  /**
   * Delete ingestion
   */
  async deleteIngestion(id: string): Promise<void> {
    const ingestion = this.ingestions.get(id);

    if (!ingestion) {
      throw new Error(`Ingestion ${id} not found`);
    }

    if (ingestion.status === 'running') {
      await this.stopIngestion(id);
    }

    this.ingestions.delete(id);
    this.logger.info(`Deleted ingestion ${id}`);
  }

  /**
   * Stop all ingestions
   */
  async stopAll(): Promise<void> {
    this.logger.info('Stopping all ingestions');

    const stopPromises = Array.from(this.ingestions.values())
      .filter(ing => ing.status === 'running')
      .map(ing => this.stopIngestion(ing.id));

    await Promise.all(stopPromises);
  }

  /**
   * Execute ingestion pipeline
   */
  private async executeIngestion(ingestion: IngestionInstance): Promise<void> {
    const executor = new PipelineExecutor(this.logger);

    // Store executor reference
    this.activeExecutors.set(ingestion.id, executor);

    try {
      // Create connector instance
      const connector = this.createConnector(ingestion.config);

      // Listen to progress events
      executor.on('pipeline:progress', (data: any) => {
        ingestion.recordsProcessed = data.recordsLoaded;
        ingestion.lastHeartbeat = new Date();
      });

      // Execute pipeline
      const run = await executor.execute(connector, ingestion.config);

      // Update ingestion status
      if (run.status === PipelineStatus.SUCCESS || run.status === PipelineStatus.PARTIAL_SUCCESS) {
        ingestion.recordsProcessed = run.recordsLoaded;
        ingestion.status = 'stopped';
      } else {
        ingestion.status = 'error';
        ingestion.errors.push(...run.errors);
      }
    } catch (error) {
      this.logger.error(`Ingestion ${ingestion.id} failed`, { error });
      ingestion.status = 'error';
      ingestion.errors.push({
        timestamp: new Date(),
        message: error instanceof Error ? error.message : 'Unknown error',
        details: error
      });
    } finally {
      this.activeExecutors.delete(ingestion.id);
    }
  }

  /**
   * Create connector instance based on config
   */
  private createConnector(config: DataSourceConfig): any {
    // Factory method to create appropriate connector
    // Would import and instantiate the correct connector class based on config.type

    // Placeholder - returns mock connector
    return {
      connect: async () => {},
      disconnect: async () => {},
      testConnection: async () => true,
      extract: async function* () {
        yield [];
      },
      getSchema: async () => ({}),
      getCapabilities: () => ({
        supportsStreaming: false,
        supportsIncremental: false,
        supportsCDC: false,
        supportsSchema: false,
        supportsPartitioning: false,
        maxConcurrentConnections: 1
      })
    };
  }

  private generateIngestionId(): string {
    return `ingestion_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
