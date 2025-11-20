/**
 * WebSocket Protocol Adapter
 * Implements WebSocket connectivity for real-time IoT data streaming
 */

import WebSocket, { WebSocketServer } from 'ws';
import { EventEmitter } from 'eventemitter3';
import pino from 'pino';
import {
  ProtocolAdapter,
  ConnectionConfig,
  IoTProtocol,
  QoSLevel,
  IoTMessage
} from '../core/types.js';

const logger = pino({ name: 'websocket-adapter' });

export class WebSocketAdapter extends EventEmitter implements ProtocolAdapter {
  readonly protocol = IoTProtocol.WEBSOCKET;
  private ws: WebSocket | null = null;
  private config: ConnectionConfig | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  async connect(config: ConnectionConfig): Promise<void> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      logger.warn('Already connected to WebSocket server');
      return;
    }

    this.config = config;

    const protocol = config.secure ? 'wss' : 'ws';
    const url = `${protocol}://${config.host}:${config.port}`;

    return new Promise((resolve, reject) => {
      try {
        const headers: Record<string, string> = {};

        // Add authentication headers
        if (config.credentials.token) {
          headers['Authorization'] = `Bearer ${config.credentials.token}`;
        } else if (config.credentials.apiKey) {
          headers['X-API-Key'] = config.credentials.apiKey;
        }

        headers['X-Device-Id'] = config.credentials.deviceId;
        headers['X-Client-Id'] = config.credentials.clientId;

        this.ws = new WebSocket(url, { headers });

        this.ws.on('open', () => {
          logger.info({ deviceId: config.credentials.deviceId }, 'Connected to WebSocket server');
          this.emit('connected');
          this.startHeartbeat();
          resolve();
        });

        this.ws.on('message', (data: Buffer) => {
          try {
            const message: IoTMessage = {
              id: `${Date.now()}-${Math.random()}`,
              deviceId: config.credentials.deviceId,
              timestamp: new Date(),
              protocol: this.protocol,
              payload: data,
              qos: QoSLevel.AT_MOST_ONCE, // WebSocket doesn't have native QoS
            };

            this.emit('message', message);
          } catch (error) {
            logger.error({ error }, 'Failed to process WebSocket message');
          }
        });

        this.ws.on('error', (error: Error) => {
          logger.error({ error, deviceId: config.credentials.deviceId }, 'WebSocket error');
          this.emit('error', error);
          if (this.ws?.readyState !== WebSocket.OPEN) {
            reject(error);
          }
        });

        this.ws.on('close', (code: number, reason: Buffer) => {
          logger.info(
            { deviceId: config.credentials.deviceId, code, reason: reason.toString() },
            'WebSocket connection closed'
          );
          this.stopHeartbeat();
          this.emit('disconnected');
          this.scheduleReconnect();
        });

        this.ws.on('ping', () => {
          this.ws?.pong();
        });

        this.ws.on('pong', () => {
          logger.debug('Received pong from server');
        });

      } catch (error) {
        logger.error({ error }, 'Failed to create WebSocket client');
        reject(error);
      }
    });
  }

  async disconnect(): Promise<void> {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.stopHeartbeat();

    if (!this.ws) {
      return;
    }

    return new Promise((resolve) => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.close(1000, 'Normal closure');
        this.ws.once('close', () => {
          logger.info('WebSocket client disconnected');
          this.ws = null;
          resolve();
        });
      } else {
        this.ws = null;
        resolve();
      }
    });
  }

  async publish(topic: string, payload: Buffer | string, qos?: QoSLevel): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected');
    }

    const message = {
      type: 'publish',
      topic,
      payload: payload.toString(),
      timestamp: new Date().toISOString(),
    };

    return new Promise((resolve, reject) => {
      this.ws!.send(JSON.stringify(message), (error) => {
        if (error) {
          logger.error({ error, topic }, 'Failed to send WebSocket message');
          reject(error);
        } else {
          logger.debug({ topic }, 'Message sent via WebSocket');
          resolve();
        }
      });
    });
  }

  async subscribe(topic: string, qos?: QoSLevel): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected');
    }

    const message = {
      type: 'subscribe',
      topic,
      timestamp: new Date().toISOString(),
    };

    return new Promise((resolve, reject) => {
      this.ws!.send(JSON.stringify(message), (error) => {
        if (error) {
          logger.error({ error, topic }, 'Failed to subscribe via WebSocket');
          reject(error);
        } else {
          logger.info({ topic }, 'Subscribed via WebSocket');
          resolve();
        }
      });
    });
  }

  async unsubscribe(topic: string): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected');
    }

    const message = {
      type: 'unsubscribe',
      topic,
      timestamp: new Date().toISOString(),
    };

    return new Promise((resolve, reject) => {
      this.ws!.send(JSON.stringify(message), (error) => {
        if (error) {
          logger.error({ error, topic }, 'Failed to unsubscribe via WebSocket');
          reject(error);
        } else {
          logger.info({ topic }, 'Unsubscribed via WebSocket');
          resolve();
        }
      });
    });
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.ping();
      }
    }, 30000); // Ping every 30 seconds
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private scheduleReconnect(): void {
    if (!this.config || this.reconnectTimer) {
      return;
    }

    const reconnectPeriod = this.config.reconnectPeriod ?? 5000;

    this.reconnectTimer = setTimeout(() => {
      logger.info('Attempting to reconnect WebSocket');
      this.reconnectTimer = null;
      this.connect(this.config!).catch((error) => {
        logger.error({ error }, 'Reconnection failed');
      });
    }, reconnectPeriod);
  }
}
