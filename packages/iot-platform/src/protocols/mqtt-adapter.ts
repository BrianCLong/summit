/**
 * MQTT Protocol Adapter
 * Implements MQTT/MQTTS connectivity for IoT devices
 */

import mqtt, { MqttClient, IClientOptions } from 'mqtt';
import { EventEmitter } from 'eventemitter3';
import pino from 'pino';
import {
  ProtocolAdapter,
  ConnectionConfig,
  IoTProtocol,
  QoSLevel,
  IoTMessage
} from '../core/types.js';

const logger = pino({ name: 'mqtt-adapter' });

export class MQTTAdapter extends EventEmitter implements ProtocolAdapter {
  readonly protocol = IoTProtocol.MQTT;
  private client: MqttClient | null = null;
  private config: ConnectionConfig | null = null;
  private reconnecting = false;

  async connect(config: ConnectionConfig): Promise<void> {
    if (this.client?.connected) {
      logger.warn('Already connected to MQTT broker');
      return;
    }

    this.config = config;

    const options: IClientOptions = {
      clientId: config.credentials.clientId,
      username: config.credentials.username,
      password: config.credentials.password,
      keepalive: config.keepAlive ?? 60,
      reconnectPeriod: config.reconnectPeriod ?? 5000,
      connectTimeout: config.connectTimeout ?? 30000,
      clean: config.clean ?? true,
      protocol: config.secure ? 'mqtts' : 'mqtt',
    };

    // Add TLS options if secure connection
    if (config.secure && config.credentials.certificate) {
      options.cert = config.credentials.certificate;
      options.key = config.credentials.privateKey;
      options.ca = config.credentials.caCertificate;
      options.rejectUnauthorized = true;
    }

    // Add Last Will and Testament if configured
    if (config.will) {
      options.will = {
        topic: config.will.topic,
        payload: config.will.payload,
        qos: config.will.qos,
        retain: config.will.retain,
      };
    }

    const url = `${options.protocol}://${config.host}:${config.port}`;

    return new Promise((resolve, reject) => {
      try {
        this.client = mqtt.connect(url, options);

        this.client.on('connect', () => {
          logger.info({ deviceId: config.credentials.deviceId }, 'Connected to MQTT broker');
          this.reconnecting = false;
          this.emit('connected');
          resolve();
        });

        this.client.on('message', (topic: string, payload: Buffer, packet: any) => {
          const message: IoTMessage = {
            id: `${Date.now()}-${Math.random()}`,
            deviceId: config.credentials.deviceId,
            timestamp: new Date(),
            protocol: this.protocol,
            topic,
            payload,
            qos: packet.qos ?? QoSLevel.AT_MOST_ONCE,
            retained: packet.retain ?? false,
          };

          this.emit('message', message);
        });

        this.client.on('error', (error: Error) => {
          logger.error({ error, deviceId: config.credentials.deviceId }, 'MQTT error');
          this.emit('error', error);
          if (!this.client?.connected) {
            reject(error);
          }
        });

        this.client.on('close', () => {
          logger.info({ deviceId: config.credentials.deviceId }, 'MQTT connection closed');
          this.emit('disconnected');
        });

        this.client.on('reconnect', () => {
          if (!this.reconnecting) {
            logger.info({ deviceId: config.credentials.deviceId }, 'Reconnecting to MQTT broker');
            this.reconnecting = true;
            this.emit('reconnecting');
          }
        });

        this.client.on('offline', () => {
          logger.warn({ deviceId: config.credentials.deviceId }, 'MQTT client offline');
          this.emit('offline');
        });

      } catch (error) {
        logger.error({ error }, 'Failed to create MQTT client');
        reject(error);
      }
    });
  }

  async disconnect(): Promise<void> {
    if (!this.client) {
      return;
    }

    return new Promise((resolve) => {
      this.client!.end(false, {}, () => {
        logger.info('MQTT client disconnected');
        this.client = null;
        resolve();
      });
    });
  }

  async publish(topic: string, payload: Buffer | string, qos: QoSLevel = QoSLevel.AT_LEAST_ONCE): Promise<void> {
    if (!this.client?.connected) {
      throw new Error('MQTT client not connected');
    }

    return new Promise((resolve, reject) => {
      this.client!.publish(topic, payload, { qos }, (error) => {
        if (error) {
          logger.error({ error, topic }, 'Failed to publish message');
          reject(error);
        } else {
          logger.debug({ topic, qos }, 'Message published');
          resolve();
        }
      });
    });
  }

  async subscribe(topic: string, qos: QoSLevel = QoSLevel.AT_LEAST_ONCE): Promise<void> {
    if (!this.client?.connected) {
      throw new Error('MQTT client not connected');
    }

    return new Promise((resolve, reject) => {
      this.client!.subscribe(topic, { qos }, (error) => {
        if (error) {
          logger.error({ error, topic }, 'Failed to subscribe to topic');
          reject(error);
        } else {
          logger.info({ topic, qos }, 'Subscribed to topic');
          resolve();
        }
      });
    });
  }

  async unsubscribe(topic: string): Promise<void> {
    if (!this.client?.connected) {
      throw new Error('MQTT client not connected');
    }

    return new Promise((resolve, reject) => {
      this.client!.unsubscribe(topic, (error) => {
        if (error) {
          logger.error({ error, topic }, 'Failed to unsubscribe from topic');
          reject(error);
        } else {
          logger.info({ topic }, 'Unsubscribed from topic');
          resolve();
        }
      });
    });
  }

  isConnected(): boolean {
    return this.client?.connected ?? false;
  }
}
