import { EventEmitter } from 'events';
import type { ConnectorConfig, RateLimitConfig, AuthConfig } from '../types.js';
import Bottleneck from 'bottleneck';

/**
 * Base interface for all data connectors
 */
export interface IConnector {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  test(): Promise<boolean>;
  fetch(options?: Record<string, unknown>): AsyncGenerator<unknown, void, unknown>;
  getMetadata(): ConnectorMetadata;
}

/**
 * Connector metadata
 */
export interface ConnectorMetadata {
  name: string;
  type: string;
  version: string;
  description?: string;
  capabilities: string[];
  requiredConfig: string[];
}

/**
 * Connector statistics
 */
export interface ConnectorStats {
  recordsRead: number;
  bytesRead: number;
  errors: number;
  startTime: Date;
  endTime?: Date;
  lastError?: Error;
}

/**
 * Abstract base class for all connectors
 */
export abstract class BaseConnector extends EventEmitter implements IConnector {
  protected config: ConnectorConfig;
  protected connected: boolean = false;
  protected limiter?: Bottleneck;
  protected stats: ConnectorStats;

  constructor(config: ConnectorConfig) {
    super();
    this.config = config;
    this.stats = {
      recordsRead: 0,
      bytesRead: 0,
      errors: 0,
      startTime: new Date()
    };

    // Setup rate limiter if configured
    if (config.rateLimit) {
      this.limiter = this.createRateLimiter(config.rateLimit);
    }
  }

  /**
   * Create rate limiter from configuration
   */
  private createRateLimiter(config: RateLimitConfig): Bottleneck {
    return new Bottleneck({
      maxConcurrent: 1,
      minTime: config.minTime || 0,
      reservoir: config.maxRequests,
      reservoirRefreshAmount: config.maxRequests,
      reservoirRefreshInterval: config.windowMs
    });
  }

  /**
   * Apply rate limiting to an async function
   */
  protected async withRateLimit<T>(fn: () => Promise<T>): Promise<T> {
    if (this.limiter) {
      return this.limiter.schedule(() => fn());
    }
    return fn();
  }

  /**
   * Connect to the data source
   */
  abstract connect(): Promise<void>;

  /**
   * Disconnect from the data source
   */
  abstract disconnect(): Promise<void>;

  /**
   * Test connection to the data source
   */
  abstract test(): Promise<boolean>;

  /**
   * Fetch data from the source
   */
  abstract fetch(options?: Record<string, unknown>): AsyncGenerator<unknown, void, unknown>;

  /**
   * Get connector metadata
   */
  abstract getMetadata(): ConnectorMetadata;

  /**
   * Get connector statistics
   */
  getStats(): ConnectorStats {
    return { ...this.stats };
  }

  /**
   * Reset connector statistics
   */
  resetStats(): void {
    this.stats = {
      recordsRead: 0,
      bytesRead: 0,
      errors: 0,
      startTime: new Date()
    };
  }

  /**
   * Check if connector is connected
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Get authorization headers based on auth configuration
   */
  protected getAuthHeaders(authConfig: AuthConfig): Record<string, string> {
    const headers: Record<string, string> = {};

    switch (authConfig.type) {
      case 'api_key':
        headers[authConfig.headerName] = authConfig.apiKey;
        break;
      case 'bearer':
        headers['Authorization'] = `Bearer ${authConfig.token}`;
        break;
      case 'basic':
        const credentials = Buffer.from(`${authConfig.username}:${authConfig.password}`).toString('base64');
        headers['Authorization'] = `Basic ${credentials}`;
        break;
      case 'oauth2':
        // OAuth2 token should be fetched separately and passed as bearer
        // This is handled by the OAuth2Connector
        break;
      case 'none':
        // No authentication
        break;
    }

    return headers;
  }

  /**
   * Handle and emit errors
   */
  protected handleError(error: Error): void {
    this.stats.errors++;
    this.stats.lastError = error;
    this.emit('error', error);
  }

  /**
   * Emit progress updates
   */
  protected emitProgress(recordsRead: number, bytesRead: number): void {
    this.stats.recordsRead = recordsRead;
    this.stats.bytesRead = bytesRead;
    this.emit('progress', {
      recordsRead,
      bytesRead,
      errors: this.stats.errors
    });
  }

  /**
   * Mark connector as finished
   */
  protected finish(): void {
    this.stats.endTime = new Date();
    this.emit('finish', this.stats);
  }
}

/**
 * Connector factory for creating connector instances
 */
export class ConnectorFactory {
  private static connectors: Map<string, new (config: ConnectorConfig) => IConnector> = new Map();

  /**
   * Register a connector type
   */
  static register(type: string, connectorClass: new (config: ConnectorConfig) => IConnector): void {
    this.connectors.set(type, connectorClass);
  }

  /**
   * Create a connector instance
   */
  static create(config: ConnectorConfig): IConnector {
    const ConnectorClass = this.connectors.get(config.type);
    if (!ConnectorClass) {
      throw new Error(`Unknown connector type: ${config.type}`);
    }
    return new ConnectorClass(config);
  }

  /**
   * Get all registered connector types
   */
  static getTypes(): string[] {
    return Array.from(this.connectors.keys());
  }
}
