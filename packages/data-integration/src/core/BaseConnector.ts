/**
 * Base connector class that all data source connectors extend
 */

import { EventEmitter } from 'events';
import { Logger } from 'winston';
import {
  DataSourceConfig,
  ExtractionStrategy,
  PipelineRun,
  PipelineStatus,
  PipelineError,
  ConnectorCapabilities
} from '../types';

export abstract class BaseConnector extends EventEmitter {
  protected config: DataSourceConfig;
  protected logger: Logger;
  protected isConnected: boolean = false;

  constructor(config: DataSourceConfig, logger: Logger) {
    super();
    this.config = config;
    this.logger = logger;
  }

  /**
   * Establish connection to data source
   */
  abstract connect(): Promise<void>;

  /**
   * Close connection to data source
   */
  abstract disconnect(): Promise<void>;

  /**
   * Test connection to data source
   */
  abstract testConnection(): Promise<boolean>;

  /**
   * Get connector capabilities
   */
  abstract getCapabilities(): ConnectorCapabilities;

  /**
   * Extract data from source
   */
  abstract extract(): AsyncGenerator<any[], void, unknown>;

  /**
   * Get schema information from source
   */
  abstract getSchema(): Promise<any>;

  /**
   * Validate configuration
   */
  protected validateConfig(): void {
    if (!this.config.id) {
      throw new Error('Data source ID is required');
    }
    if (!this.config.name) {
      throw new Error('Data source name is required');
    }
    if (!this.config.type) {
      throw new Error('Data source type is required');
    }
  }

  /**
   * Emit progress event
   */
  protected emitProgress(recordsProcessed: number, bytesProcessed: number): void {
    this.emit('progress', {
      recordsProcessed,
      bytesProcessed,
      timestamp: new Date()
    });
  }

  /**
   * Emit error event
   */
  protected emitError(error: PipelineError): void {
    this.emit('error', error);
  }

  /**
   * Handle retry logic with exponential backoff
   */
  protected async withRetry<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    const retryConfig = this.config.connectionConfig.retryConfig || {
      maxRetries: 3,
      initialDelayMs: 1000,
      maxDelayMs: 30000,
      backoffMultiplier: 2
    };

    let lastError: Error;

    for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        if (attempt === retryConfig.maxRetries) {
          this.logger.error(`${operationName} failed after ${retryConfig.maxRetries} retries`, {
            error: lastError.message
          });
          throw lastError;
        }

        const delay = Math.min(
          retryConfig.initialDelayMs * Math.pow(retryConfig.backoffMultiplier, attempt),
          retryConfig.maxDelayMs
        );

        this.logger.warn(`${operationName} failed, retrying in ${delay}ms (attempt ${attempt + 1}/${retryConfig.maxRetries})`, {
          error: lastError.message
        });

        await this.sleep(delay);
      }
    }

    throw lastError!;
  }

  /**
   * Sleep utility
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Rate limiting utility
   */
  protected async rateLimit(): Promise<void> {
    const rateLimitConfig = this.config.extractionConfig.rateLimitConfig;
    if (!rateLimitConfig) return;

    // Simple rate limiting implementation
    // In production, use a more sophisticated rate limiter like bottleneck
    const delayMs = 1000 / rateLimitConfig.maxRequestsPerSecond;
    await this.sleep(delayMs);
  }

  /**
   * Check if connector is connected
   */
  public isConnectionActive(): boolean {
    return this.isConnected;
  }

  /**
   * Get data source configuration
   */
  public getConfig(): DataSourceConfig {
    return { ...this.config };
  }
}
