/**
 * HTTP Connector
 *
 * A connector that receives signals via HTTP webhooks.
 * Useful for integrating with external systems that can push data.
 *
 * @module http-connector
 */

import type { Logger } from 'pino';

import { SignalTypeId, type RawSignalInput, type SignalTypeIdType } from '@intelgraph/signal-contracts';

import { BaseConnector, type BaseConnectorConfig } from './base-connector.js';

/**
 * HTTP connector configuration
 */
export interface HttpConnectorConfig extends Partial<BaseConnectorConfig> {
  connectorId: string;
  name: string;
  tenantId: string;
  signalTypes: SignalTypeIdType[];
  /** Port to listen on (if running standalone) */
  port?: number;
  /** Path for webhook endpoint */
  webhookPath?: string;
  /** Authentication token for incoming requests */
  authToken?: string;
  /** Transform function for incoming data */
  transform?: (data: unknown) => RawSignalInput | RawSignalInput[] | null;
}

/**
 * HTTP Connector class
 */
export class HttpConnector extends BaseConnector {
  private httpConfig: HttpConnectorConfig;
  private isListening = false;

  constructor(config: HttpConnectorConfig, logger: Logger) {
    super(config, logger);
    this.httpConfig = config;
  }

  /**
   * Connect (mark as ready to receive)
   */
  protected async doConnect(): Promise<void> {
    this.isListening = true;
    this.logger.info({ webhookPath: this.httpConfig.webhookPath }, 'HTTP connector ready');
  }

  /**
   * Disconnect
   */
  protected async doDisconnect(): Promise<void> {
    this.isListening = false;
    this.logger.info('HTTP connector stopped');
  }

  /**
   * Check health
   */
  protected async checkHealth(): Promise<boolean> {
    return this.isListening;
  }

  /**
   * Handle incoming webhook data
   */
  handleWebhook(data: unknown, headers?: Record<string, string>): {
    success: boolean;
    signalCount: number;
    error?: string;
  } {
    if (!this.isListening) {
      return { success: false, signalCount: 0, error: 'Connector not listening' };
    }

    // Validate auth token if configured
    if (this.httpConfig.authToken) {
      const authHeader = headers?.['authorization'] ?? headers?.['Authorization'];
      if (authHeader !== `Bearer ${this.httpConfig.authToken}`) {
        return { success: false, signalCount: 0, error: 'Unauthorized' };
      }
    }

    try {
      // Transform the data
      let signals: RawSignalInput[];

      if (this.httpConfig.transform) {
        const transformed = this.httpConfig.transform(data);
        if (!transformed) {
          return { success: true, signalCount: 0 };
        }
        signals = Array.isArray(transformed) ? transformed : [transformed];
      } else {
        // Default transformation assumes data is already in RawSignalInput format
        signals = Array.isArray(data) ? (data as RawSignalInput[]) : [data as RawSignalInput];
      }

      // Emit each signal
      for (const signal of signals) {
        this.emitSignal({
          ...signal,
          tenantId: signal.tenantId ?? this.httpConfig.tenantId,
          sourceId: signal.sourceId ?? this.httpConfig.connectorId,
          sourceType: signal.sourceType ?? 'application',
        });
      }

      return { success: true, signalCount: signals.length };
    } catch (error) {
      this.logger.error({ error }, 'Failed to process webhook data');
      return {
        success: false,
        signalCount: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

/**
 * Create an HTTP connector instance
 */
export function createHttpConnector(config: HttpConnectorConfig, logger: Logger): HttpConnector {
  return new HttpConnector(config, logger);
}
