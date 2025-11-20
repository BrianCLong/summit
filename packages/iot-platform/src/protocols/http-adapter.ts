/**
 * HTTP/HTTPS Protocol Adapter
 * Implements HTTP REST API connectivity for IoT devices
 */

import { EventEmitter } from 'eventemitter3';
import pino from 'pino';
import {
  ProtocolAdapter,
  ConnectionConfig,
  IoTProtocol,
  QoSLevel,
  IoTMessage
} from '../core/types.js';

const logger = pino({ name: 'http-adapter' });

export class HTTPAdapter extends EventEmitter implements ProtocolAdapter {
  readonly protocol = IoTProtocol.HTTP;
  private config: ConnectionConfig | null = null;
  private connected = false;
  private baseUrl = '';
  private pollingInterval: NodeJS.Timeout | null = null;

  async connect(config: ConnectionConfig): Promise<void> {
    if (this.connected) {
      logger.warn('Already connected');
      return;
    }

    this.config = config;
    this.baseUrl = `${config.secure ? 'https' : 'http'}://${config.host}:${config.port}`;
    this.connected = true;

    logger.info({ deviceId: config.credentials.deviceId, baseUrl: this.baseUrl }, 'HTTP adapter connected');
    this.emit('connected');
  }

  async disconnect(): Promise<void> {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }

    this.connected = false;
    this.emit('disconnected');
    logger.info('HTTP adapter disconnected');
  }

  async publish(topic: string, payload: Buffer | string, qos?: QoSLevel): Promise<void> {
    if (!this.connected || !this.config) {
      throw new Error('HTTP adapter not connected');
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Device-Id': this.config.credentials.deviceId,
      'X-Client-Id': this.config.credentials.clientId,
    };

    // Add authentication
    if (this.config.credentials.token) {
      headers['Authorization'] = `Bearer ${this.config.credentials.token}`;
    } else if (this.config.credentials.apiKey) {
      headers['X-API-Key'] = this.config.credentials.apiKey;
    }

    const url = `${this.baseUrl}/${topic}`;
    const body = typeof payload === 'string' ? payload : payload.toString();

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      logger.debug({ topic, status: response.status }, 'Message published via HTTP');
    } catch (error) {
      logger.error({ error, topic }, 'Failed to publish via HTTP');
      throw error;
    }
  }

  async subscribe(topic: string, qos?: QoSLevel): Promise<void> {
    if (!this.connected || !this.config) {
      throw new Error('HTTP adapter not connected');
    }

    // HTTP doesn't have native subscribe - implement polling
    logger.info({ topic }, 'Starting HTTP polling for topic');

    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }

    this.pollingInterval = setInterval(async () => {
      try {
        await this.poll(topic);
      } catch (error) {
        logger.error({ error, topic }, 'Polling error');
      }
    }, 5000); // Poll every 5 seconds
  }

  async unsubscribe(topic: string): Promise<void> {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }

    logger.info({ topic }, 'Stopped HTTP polling');
  }

  isConnected(): boolean {
    return this.connected;
  }

  private async poll(topic: string): Promise<void> {
    if (!this.config) {
      return;
    }

    const headers: Record<string, string> = {
      'X-Device-Id': this.config.credentials.deviceId,
      'X-Client-Id': this.config.credentials.clientId,
    };

    if (this.config.credentials.token) {
      headers['Authorization'] = `Bearer ${this.config.credentials.token}`;
    } else if (this.config.credentials.apiKey) {
      headers['X-API-Key'] = this.config.credentials.apiKey;
    }

    const url = `${this.baseUrl}/${topic}`;

    try {
      const response = await fetch(url, { method: 'GET', headers });

      if (response.ok) {
        const data = await response.arrayBuffer();

        const message: IoTMessage = {
          id: `${Date.now()}-${Math.random()}`,
          deviceId: this.config.credentials.deviceId,
          timestamp: new Date(),
          protocol: this.protocol,
          topic,
          payload: Buffer.from(data),
          qos: QoSLevel.AT_MOST_ONCE,
        };

        this.emit('message', message);
      }
    } catch (error) {
      logger.debug({ error, topic }, 'Polling failed');
    }
  }
}
