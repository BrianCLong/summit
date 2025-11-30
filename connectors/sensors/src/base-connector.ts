/**
 * Base Connector
 *
 * Abstract base class for all sensor connectors.
 * Provides common functionality for:
 * - Connection lifecycle management
 * - Signal emission
 * - Health monitoring
 * - Metrics collection
 *
 * @module base-connector
 */

import { EventEmitter } from 'eventemitter3';
import type { Logger } from 'pino';

import type { RawSignalInput, SignalTypeIdType } from '@intelgraph/signal-contracts';

/**
 * Connector status
 */
export type ConnectorStatus = 'disconnected' | 'connecting' | 'connected' | 'error' | 'reconnecting';

/**
 * Connector events
 */
export interface ConnectorEvents {
  signal: (signal: RawSignalInput) => void;
  connected: () => void;
  disconnected: (reason?: string) => void;
  error: (error: Error) => void;
  statusChange: (status: ConnectorStatus) => void;
}

/**
 * Base connector configuration
 */
export interface BaseConnectorConfig {
  /** Unique connector identifier */
  connectorId: string;
  /** Connector name for display */
  name: string;
  /** Tenant ID for multi-tenancy */
  tenantId: string;
  /** Signal types this connector produces */
  signalTypes: SignalTypeIdType[];
  /** Auto-reconnect on disconnect */
  autoReconnect: boolean;
  /** Reconnect delay in milliseconds */
  reconnectDelayMs: number;
  /** Maximum reconnect attempts */
  maxReconnectAttempts: number;
  /** Health check interval in milliseconds */
  healthCheckIntervalMs: number;
  /** Batch size for signal emission */
  batchSize: number;
  /** Batch timeout in milliseconds */
  batchTimeoutMs: number;
}

/**
 * Connector metrics
 */
export interface ConnectorMetrics {
  signalsReceived: number;
  signalsEmitted: number;
  signalsDropped: number;
  errorsCount: number;
  lastSignalAt: number | null;
  lastErrorAt: number | null;
  connectionUptime: number;
  reconnectCount: number;
}

/**
 * Default configuration
 */
const defaultConfig: Partial<BaseConnectorConfig> = {
  autoReconnect: true,
  reconnectDelayMs: 5000,
  maxReconnectAttempts: 10,
  healthCheckIntervalMs: 30000,
  batchSize: 100,
  batchTimeoutMs: 1000,
};

/**
 * Abstract Base Connector class
 */
export abstract class BaseConnector extends EventEmitter<ConnectorEvents> {
  protected config: BaseConnectorConfig;
  protected logger: Logger;
  protected status: ConnectorStatus = 'disconnected';
  protected metrics: ConnectorMetrics;
  protected signalBuffer: RawSignalInput[] = [];
  protected batchTimer: NodeJS.Timeout | null = null;
  protected healthCheckTimer: NodeJS.Timeout | null = null;
  protected reconnectAttempts = 0;
  protected connectedAt: number | null = null;

  constructor(config: Partial<BaseConnectorConfig> & Pick<BaseConnectorConfig, 'connectorId' | 'name' | 'tenantId' | 'signalTypes'>, logger: Logger) {
    super();
    this.config = { ...defaultConfig, ...config } as BaseConnectorConfig;
    this.logger = logger.child({
      component: 'connector',
      connectorId: this.config.connectorId,
      connectorName: this.config.name,
    });
    this.metrics = this.initializeMetrics();
  }

  /**
   * Initialize metrics
   */
  private initializeMetrics(): ConnectorMetrics {
    return {
      signalsReceived: 0,
      signalsEmitted: 0,
      signalsDropped: 0,
      errorsCount: 0,
      lastSignalAt: null,
      lastErrorAt: null,
      connectionUptime: 0,
      reconnectCount: 0,
    };
  }

  /**
   * Connect to the data source
   */
  async connect(): Promise<void> {
    if (this.status === 'connected' || this.status === 'connecting') {
      this.logger.warn('Already connected or connecting');
      return;
    }

    this.setStatus('connecting');
    this.logger.info('Connecting...');

    try {
      await this.doConnect();
      this.connectedAt = Date.now();
      this.reconnectAttempts = 0;
      this.setStatus('connected');
      this.emit('connected');
      this.startHealthCheck();
      this.logger.info('Connected successfully');
    } catch (error) {
      this.handleConnectionError(error as Error);
    }
  }

  /**
   * Disconnect from the data source
   */
  async disconnect(): Promise<void> {
    if (this.status === 'disconnected') {
      this.logger.warn('Already disconnected');
      return;
    }

    this.logger.info('Disconnecting...');
    this.stopHealthCheck();
    this.flushBuffer();

    try {
      await this.doDisconnect();
    } catch (error) {
      this.logger.error({ error }, 'Error during disconnect');
    }

    this.connectedAt = null;
    this.setStatus('disconnected');
    this.emit('disconnected', 'Manual disconnect');
    this.logger.info('Disconnected');
  }

  /**
   * Handle connection error
   */
  private handleConnectionError(error: Error): void {
    this.metrics.errorsCount++;
    this.metrics.lastErrorAt = Date.now();
    this.setStatus('error');
    this.emit('error', error);
    this.logger.error({ error }, 'Connection error');

    if (this.config.autoReconnect && this.reconnectAttempts < this.config.maxReconnectAttempts) {
      this.scheduleReconnect();
    }
  }

  /**
   * Schedule a reconnection attempt
   */
  private scheduleReconnect(): void {
    this.reconnectAttempts++;
    this.metrics.reconnectCount++;
    const delay = this.config.reconnectDelayMs * Math.pow(2, this.reconnectAttempts - 1);

    this.logger.info(
      { attempt: this.reconnectAttempts, maxAttempts: this.config.maxReconnectAttempts, delayMs: delay },
      'Scheduling reconnect',
    );

    this.setStatus('reconnecting');

    setTimeout(() => {
      this.connect().catch((error) => {
        this.logger.error({ error }, 'Reconnect failed');
      });
    }, Math.min(delay, 60000)); // Cap at 1 minute
  }

  /**
   * Set connector status
   */
  protected setStatus(status: ConnectorStatus): void {
    if (this.status !== status) {
      this.status = status;
      this.emit('statusChange', status);
    }
  }

  /**
   * Emit a signal
   */
  protected emitSignal(signal: RawSignalInput): void {
    this.metrics.signalsReceived++;
    this.metrics.lastSignalAt = Date.now();

    // Add to buffer
    this.signalBuffer.push(signal);

    // Check if we should flush
    if (this.signalBuffer.length >= this.config.batchSize) {
      this.flushBuffer();
    } else if (!this.batchTimer) {
      this.batchTimer = setTimeout(() => this.flushBuffer(), this.config.batchTimeoutMs);
    }
  }

  /**
   * Flush the signal buffer
   */
  protected flushBuffer(): void {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    if (this.signalBuffer.length === 0) {
      return;
    }

    const signals = this.signalBuffer.splice(0);

    for (const signal of signals) {
      this.emit('signal', signal);
      this.metrics.signalsEmitted++;
    }

    this.logger.debug({ count: signals.length }, 'Flushed signal buffer');
  }

  /**
   * Start health check timer
   */
  private startHealthCheck(): void {
    this.stopHealthCheck();
    this.healthCheckTimer = setInterval(
      () => this.performHealthCheck(),
      this.config.healthCheckIntervalMs,
    );
  }

  /**
   * Stop health check timer
   */
  private stopHealthCheck(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
  }

  /**
   * Perform health check
   */
  private async performHealthCheck(): Promise<void> {
    try {
      const healthy = await this.checkHealth();
      if (!healthy) {
        this.logger.warn('Health check failed');
        this.handleConnectionError(new Error('Health check failed'));
      }
    } catch (error) {
      this.logger.error({ error }, 'Health check error');
    }
  }

  /**
   * Get connector status
   */
  getStatus(): ConnectorStatus {
    return this.status;
  }

  /**
   * Get connector metrics
   */
  getMetrics(): ConnectorMetrics {
    return {
      ...this.metrics,
      connectionUptime: this.connectedAt ? Date.now() - this.connectedAt : 0,
    };
  }

  /**
   * Get connector info
   */
  getInfo(): {
    connectorId: string;
    name: string;
    tenantId: string;
    signalTypes: SignalTypeIdType[];
    status: ConnectorStatus;
    metrics: ConnectorMetrics;
  } {
    return {
      connectorId: this.config.connectorId,
      name: this.config.name,
      tenantId: this.config.tenantId,
      signalTypes: this.config.signalTypes,
      status: this.status,
      metrics: this.getMetrics(),
    };
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = this.initializeMetrics();
  }

  // Abstract methods to be implemented by subclasses

  /**
   * Perform the actual connection
   */
  protected abstract doConnect(): Promise<void>;

  /**
   * Perform the actual disconnection
   */
  protected abstract doDisconnect(): Promise<void>;

  /**
   * Check if the connection is healthy
   */
  protected abstract checkHealth(): Promise<boolean>;
}
