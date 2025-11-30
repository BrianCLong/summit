/**
 * Polling Connector
 *
 * A connector that polls an external data source at regular intervals.
 * Useful for APIs that don't support push/webhook mechanisms.
 *
 * @module polling-connector
 */

import type { Logger } from 'pino';

import type { RawSignalInput, SignalTypeIdType } from '@intelgraph/signal-contracts';

import { BaseConnector, type BaseConnectorConfig } from './base-connector.js';

/**
 * Polling connector configuration
 */
export interface PollingConnectorConfig extends Partial<BaseConnectorConfig> {
  connectorId: string;
  name: string;
  tenantId: string;
  signalTypes: SignalTypeIdType[];
  /** Polling interval in milliseconds */
  pollingIntervalMs: number;
  /** Function to fetch data from the source */
  fetchData: () => Promise<unknown>;
  /** Transform function for fetched data */
  transform: (data: unknown) => RawSignalInput | RawSignalInput[] | null;
  /** Jitter percentage for polling interval (0-100) */
  jitterPercent?: number;
  /** Maximum consecutive errors before stopping */
  maxConsecutiveErrors?: number;
}

/**
 * Polling Connector class
 */
export class PollingConnector extends BaseConnector {
  private pollingConfig: PollingConnectorConfig;
  private pollingTimer: NodeJS.Timeout | null = null;
  private consecutiveErrors = 0;
  private isPolling = false;

  constructor(config: PollingConnectorConfig, logger: Logger) {
    super(config, logger);
    this.pollingConfig = {
      jitterPercent: 10,
      maxConsecutiveErrors: 5,
      ...config,
    };
  }

  /**
   * Connect and start polling
   */
  protected async doConnect(): Promise<void> {
    // Perform initial fetch to verify connectivity
    await this.poll();
    this.startPolling();
    this.logger.info({ intervalMs: this.pollingConfig.pollingIntervalMs }, 'Polling started');
  }

  /**
   * Disconnect and stop polling
   */
  protected async doDisconnect(): Promise<void> {
    this.stopPolling();
    this.logger.info('Polling stopped');
  }

  /**
   * Check health
   */
  protected async checkHealth(): Promise<boolean> {
    return this.consecutiveErrors < (this.pollingConfig.maxConsecutiveErrors ?? 5);
  }

  /**
   * Start the polling timer
   */
  private startPolling(): void {
    this.stopPolling();
    this.scheduleNextPoll();
  }

  /**
   * Stop the polling timer
   */
  private stopPolling(): void {
    if (this.pollingTimer) {
      clearTimeout(this.pollingTimer);
      this.pollingTimer = null;
    }
  }

  /**
   * Schedule the next poll with jitter
   */
  private scheduleNextPoll(): void {
    const baseInterval = this.pollingConfig.pollingIntervalMs;
    const jitterPercent = this.pollingConfig.jitterPercent ?? 10;
    const jitter = baseInterval * (jitterPercent / 100) * (Math.random() - 0.5) * 2;
    const interval = Math.max(1000, baseInterval + jitter);

    this.pollingTimer = setTimeout(() => this.pollAndReschedule(), interval);
  }

  /**
   * Poll and reschedule
   */
  private async pollAndReschedule(): Promise<void> {
    if (this.status !== 'connected') {
      return;
    }

    try {
      await this.poll();
      this.consecutiveErrors = 0;
    } catch (error) {
      this.consecutiveErrors++;
      this.logger.error(
        { error, consecutiveErrors: this.consecutiveErrors },
        'Polling error',
      );

      if (this.consecutiveErrors >= (this.pollingConfig.maxConsecutiveErrors ?? 5)) {
        this.logger.error('Max consecutive errors reached, triggering reconnect');
        this.emit('error', new Error('Max consecutive polling errors reached'));
        return;
      }
    }

    this.scheduleNextPoll();
  }

  /**
   * Perform a single poll
   */
  private async poll(): Promise<void> {
    if (this.isPolling) {
      this.logger.warn('Poll already in progress, skipping');
      return;
    }

    this.isPolling = true;

    try {
      const data = await this.pollingConfig.fetchData();

      if (data === null || data === undefined) {
        return;
      }

      const signals = this.pollingConfig.transform(data);

      if (!signals) {
        return;
      }

      const signalArray = Array.isArray(signals) ? signals : [signals];

      for (const signal of signalArray) {
        this.emitSignal({
          ...signal,
          tenantId: signal.tenantId ?? this.pollingConfig.tenantId,
          sourceId: signal.sourceId ?? this.pollingConfig.connectorId,
          sourceType: signal.sourceType ?? 'feed',
        });
      }

      this.logger.debug({ signalCount: signalArray.length }, 'Poll completed');
    } finally {
      this.isPolling = false;
    }
  }

  /**
   * Force an immediate poll
   */
  async forcePoll(): Promise<void> {
    await this.poll();
  }
}

/**
 * Create a polling connector instance
 */
export function createPollingConnector(
  config: PollingConnectorConfig,
  logger: Logger,
): PollingConnector {
  return new PollingConnector(config, logger);
}
