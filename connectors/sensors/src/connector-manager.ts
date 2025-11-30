/**
 * Connector Manager
 *
 * Manages multiple sensor connectors, providing:
 * - Lifecycle management (start/stop all)
 * - Signal aggregation
 * - Health monitoring
 * - Metrics collection
 *
 * @module connector-manager
 */

import { EventEmitter } from 'eventemitter3';
import type { Logger } from 'pino';

import type { RawSignalInput } from '@intelgraph/signal-contracts';

import { BaseConnector, type ConnectorStatus } from './base-connector.js';

/**
 * Manager events
 */
export interface ConnectorManagerEvents {
  signal: (signal: RawSignalInput, connectorId: string) => void;
  connectorAdded: (connectorId: string) => void;
  connectorRemoved: (connectorId: string) => void;
  connectorStatusChange: (connectorId: string, status: ConnectorStatus) => void;
  error: (error: Error, connectorId: string) => void;
}

/**
 * Manager configuration
 */
export interface ConnectorManagerConfig {
  /** Start connectors automatically when added */
  autoStart: boolean;
  /** Maximum concurrent connector starts */
  maxConcurrentStarts: number;
  /** Health check interval for all connectors */
  healthCheckIntervalMs: number;
}

/**
 * Default configuration
 */
const defaultConfig: ConnectorManagerConfig = {
  autoStart: true,
  maxConcurrentStarts: 5,
  healthCheckIntervalMs: 60000,
};

/**
 * Connector Manager class
 */
export class ConnectorManager extends EventEmitter<ConnectorManagerEvents> {
  private config: ConnectorManagerConfig;
  private logger: Logger;
  private connectors = new Map<string, BaseConnector>();
  private healthCheckTimer: NodeJS.Timeout | null = null;

  constructor(logger: Logger, config?: Partial<ConnectorManagerConfig>) {
    super();
    this.logger = logger.child({ component: 'connector-manager' });
    this.config = { ...defaultConfig, ...config };
  }

  /**
   * Add a connector
   */
  async addConnector(connector: BaseConnector): Promise<void> {
    const info = connector.getInfo();

    if (this.connectors.has(info.connectorId)) {
      throw new Error(`Connector ${info.connectorId} already exists`);
    }

    // Set up event forwarding
    connector.on('signal', (signal) => {
      this.emit('signal', signal, info.connectorId);
    });

    connector.on('statusChange', (status) => {
      this.emit('connectorStatusChange', info.connectorId, status);
    });

    connector.on('error', (error) => {
      this.emit('error', error, info.connectorId);
    });

    this.connectors.set(info.connectorId, connector);
    this.emit('connectorAdded', info.connectorId);

    this.logger.info({ connectorId: info.connectorId, name: info.name }, 'Connector added');

    if (this.config.autoStart) {
      await connector.connect();
    }
  }

  /**
   * Remove a connector
   */
  async removeConnector(connectorId: string): Promise<void> {
    const connector = this.connectors.get(connectorId);

    if (!connector) {
      throw new Error(`Connector ${connectorId} not found`);
    }

    await connector.disconnect();
    connector.removeAllListeners();
    this.connectors.delete(connectorId);
    this.emit('connectorRemoved', connectorId);

    this.logger.info({ connectorId }, 'Connector removed');
  }

  /**
   * Get a connector by ID
   */
  getConnector(connectorId: string): BaseConnector | undefined {
    return this.connectors.get(connectorId);
  }

  /**
   * Get all connectors
   */
  getAllConnectors(): BaseConnector[] {
    return Array.from(this.connectors.values());
  }

  /**
   * Start all connectors
   */
  async startAll(): Promise<void> {
    this.logger.info({ count: this.connectors.size }, 'Starting all connectors');

    const connectors = Array.from(this.connectors.values());
    const batches: BaseConnector[][] = [];

    // Split into batches for concurrent start
    for (let i = 0; i < connectors.length; i += this.config.maxConcurrentStarts) {
      batches.push(connectors.slice(i, i + this.config.maxConcurrentStarts));
    }

    for (const batch of batches) {
      await Promise.all(
        batch.map((connector) =>
          connector.connect().catch((error) => {
            this.logger.error({ error, connectorId: connector.getInfo().connectorId }, 'Failed to start connector');
          }),
        ),
      );
    }

    this.startHealthCheck();
    this.logger.info('All connectors started');
  }

  /**
   * Stop all connectors
   */
  async stopAll(): Promise<void> {
    this.logger.info({ count: this.connectors.size }, 'Stopping all connectors');
    this.stopHealthCheck();

    await Promise.all(
      Array.from(this.connectors.values()).map((connector) =>
        connector.disconnect().catch((error) => {
          this.logger.error({ error, connectorId: connector.getInfo().connectorId }, 'Failed to stop connector');
        }),
      ),
    );

    this.logger.info('All connectors stopped');
  }

  /**
   * Start health check timer
   */
  private startHealthCheck(): void {
    this.stopHealthCheck();
    this.healthCheckTimer = setInterval(
      () => this.checkAllHealth(),
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
   * Check health of all connectors
   */
  private checkAllHealth(): void {
    const statuses = this.getStatus();
    const unhealthy = statuses.filter((s) => s.status === 'error' || s.status === 'disconnected');

    if (unhealthy.length > 0) {
      this.logger.warn({ unhealthyCount: unhealthy.length, connectors: unhealthy.map((u) => u.connectorId) }, 'Unhealthy connectors detected');
    }
  }

  /**
   * Get status of all connectors
   */
  getStatus(): Array<{ connectorId: string; name: string; status: ConnectorStatus }> {
    return Array.from(this.connectors.values()).map((connector) => {
      const info = connector.getInfo();
      return {
        connectorId: info.connectorId,
        name: info.name,
        status: info.status,
      };
    });
  }

  /**
   * Get aggregated metrics
   */
  getMetrics(): {
    totalConnectors: number;
    connectedCount: number;
    signalsReceived: number;
    signalsEmitted: number;
    errorsCount: number;
    byConnector: Record<string, ReturnType<BaseConnector['getMetrics']>>;
  } {
    const byConnector: Record<string, ReturnType<BaseConnector['getMetrics']>> = {};
    let signalsReceived = 0;
    let signalsEmitted = 0;
    let errorsCount = 0;
    let connectedCount = 0;

    for (const connector of this.connectors.values()) {
      const info = connector.getInfo();
      const metrics = connector.getMetrics();

      byConnector[info.connectorId] = metrics;
      signalsReceived += metrics.signalsReceived;
      signalsEmitted += metrics.signalsEmitted;
      errorsCount += metrics.errorsCount;

      if (info.status === 'connected') {
        connectedCount++;
      }
    }

    return {
      totalConnectors: this.connectors.size,
      connectedCount,
      signalsReceived,
      signalsEmitted,
      errorsCount,
      byConnector,
    };
  }

  /**
   * Get connector count
   */
  get size(): number {
    return this.connectors.size;
  }
}

/**
 * Create a connector manager instance
 */
export function createConnectorManager(
  logger: Logger,
  config?: Partial<ConnectorManagerConfig>,
): ConnectorManager {
  return new ConnectorManager(logger, config);
}
