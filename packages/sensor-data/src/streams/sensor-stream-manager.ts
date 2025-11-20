/**
 * Sensor Stream Manager
 * Manages real-time sensor data streams
 */

import { EventEmitter } from 'eventemitter3';
import pino from 'pino';
import { SensorStream, SensorReading, SensorType } from '../types.js';

const logger = pino({ name: 'sensor-stream' });

export class SensorStreamManager extends EventEmitter {
  private streams = new Map<string, SensorStream>();
  private subscriptions = new Map<string, Set<(reading: SensorReading) => void>>();

  /**
   * Register a sensor stream
   */
  registerStream(stream: SensorStream): void {
    const key = this.getStreamKey(stream.deviceId, stream.sensorId);
    this.streams.set(key, stream);

    logger.info(
      {
        deviceId: stream.deviceId,
        sensorId: stream.sensorId,
        sensorType: stream.sensorType,
        samplingRate: stream.samplingRate,
      },
      'Sensor stream registered'
    );

    this.emit('stream:registered', stream);
  }

  /**
   * Unregister a sensor stream
   */
  unregisterStream(deviceId: string, sensorId: string): void {
    const key = this.getStreamKey(deviceId, sensorId);
    const stream = this.streams.get(key);

    if (stream) {
      this.streams.delete(key);
      this.subscriptions.delete(key);

      logger.info({ deviceId, sensorId }, 'Sensor stream unregistered');

      this.emit('stream:unregistered', stream);
    }
  }

  /**
   * Get stream
   */
  getStream(deviceId: string, sensorId: string): SensorStream | undefined {
    const key = this.getStreamKey(deviceId, sensorId);
    return this.streams.get(key);
  }

  /**
   * Update stream status
   */
  updateStreamStatus(deviceId: string, sensorId: string, active: boolean): void {
    const stream = this.getStream(deviceId, sensorId);
    if (stream) {
      stream.active = active;
      logger.info({ deviceId, sensorId, active }, 'Stream status updated');
      this.emit('stream:status-changed', stream);
    }
  }

  /**
   * Publish reading to stream
   */
  publishReading(reading: SensorReading): void {
    const key = this.getStreamKey(reading.deviceId, reading.sensorId);
    const stream = this.streams.get(key);

    if (!stream) {
      logger.warn(
        { deviceId: reading.deviceId, sensorId: reading.sensorId },
        'Stream not found for reading'
      );
      return;
    }

    if (!stream.active) {
      logger.debug({ deviceId: reading.deviceId, sensorId: reading.sensorId }, 'Stream inactive');
      return;
    }

    stream.lastReading = reading.timestamp;

    // Notify subscribers
    const subscribers = this.subscriptions.get(key);
    if (subscribers) {
      for (const handler of subscribers) {
        try {
          handler(reading);
        } catch (error) {
          logger.error({ error }, 'Error in stream subscriber');
        }
      }
    }

    this.emit('stream:reading', reading);
  }

  /**
   * Subscribe to sensor stream
   */
  subscribe(
    deviceId: string,
    sensorId: string,
    handler: (reading: SensorReading) => void
  ): () => void {
    const key = this.getStreamKey(deviceId, sensorId);

    if (!this.subscriptions.has(key)) {
      this.subscriptions.set(key, new Set());
    }

    this.subscriptions.get(key)!.add(handler);

    logger.debug({ deviceId, sensorId }, 'Subscribed to sensor stream');

    // Return unsubscribe function
    return () => {
      this.subscriptions.get(key)?.delete(handler);
      logger.debug({ deviceId, sensorId }, 'Unsubscribed from sensor stream');
    };
  }

  /**
   * Subscribe to all streams of a device
   */
  subscribeToDevice(
    deviceId: string,
    handler: (reading: SensorReading) => void
  ): () => void {
    const deviceStreams = Array.from(this.streams.values()).filter(
      (s) => s.deviceId === deviceId
    );

    const unsubscribers = deviceStreams.map((stream) =>
      this.subscribe(stream.deviceId, stream.sensorId, handler)
    );

    logger.info({ deviceId, streamCount: deviceStreams.length }, 'Subscribed to device streams');

    // Return combined unsubscribe function
    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }

  /**
   * Subscribe to sensor type across all devices
   */
  subscribeToSensorType(
    sensorType: SensorType,
    handler: (reading: SensorReading) => void
  ): () => void {
    const typeStreams = Array.from(this.streams.values()).filter(
      (s) => s.sensorType === sensorType
    );

    const unsubscribers = typeStreams.map((stream) =>
      this.subscribe(stream.deviceId, stream.sensorId, handler)
    );

    logger.info(
      { sensorType, streamCount: typeStreams.length },
      'Subscribed to sensor type streams'
    );

    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }

  /**
   * Get all active streams
   */
  getActiveStreams(): SensorStream[] {
    return Array.from(this.streams.values()).filter((s) => s.active);
  }

  /**
   * Get streams for device
   */
  getDeviceStreams(deviceId: string): SensorStream[] {
    return Array.from(this.streams.values()).filter((s) => s.deviceId === deviceId);
  }

  /**
   * Get streams by sensor type
   */
  getStreamsBySensorType(sensorType: SensorType): SensorStream[] {
    return Array.from(this.streams.values()).filter((s) => s.sensorType === sensorType);
  }

  /**
   * Get stream statistics
   */
  getStreamStats(): {
    total: number;
    active: number;
    inactive: number;
    byType: Record<string, number>;
  } {
    const streams = Array.from(this.streams.values());

    const byType: Record<string, number> = {};
    for (const stream of streams) {
      byType[stream.sensorType] = (byType[stream.sensorType] || 0) + 1;
    }

    return {
      total: streams.length,
      active: streams.filter((s) => s.active).length,
      inactive: streams.filter((s) => !s.active).length,
      byType,
    };
  }

  private getStreamKey(deviceId: string, sensorId: string): string {
    return `${deviceId}:${sensorId}`;
  }
}
