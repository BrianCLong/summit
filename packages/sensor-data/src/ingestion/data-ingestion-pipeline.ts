/**
 * Data Ingestion Pipeline
 * High-throughput sensor data ingestion with buffering and batching
 */

import { EventEmitter } from 'eventemitter3';
import { v4 as uuidv4 } from 'uuid';
import pino from 'pino';
import {
  SensorReading,
  DataBuffer,
  DataIngestionConfig,
  DataValidator,
  DataTransform,
  TimeSeriesDataPoint,
} from '../types.js';

const logger = pino({ name: 'data-ingestion' });

export class DataIngestionPipeline extends EventEmitter {
  private buffers = new Map<string, DataBuffer>();
  private validators: DataValidator[] = [];
  private transforms: DataTransform[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private stats = {
    received: 0,
    validated: 0,
    invalid: 0,
    transformed: 0,
    ingested: 0,
    failed: 0,
  };

  constructor(private config: DataIngestionConfig = {}) {
    super();

    // Default configuration
    this.config.batchSize = config.batchSize ?? 100;
    this.config.batchTimeout = config.batchTimeout ?? 5000;
    this.config.maxRetries = config.maxRetries ?? 3;
    this.config.compression = config.compression ?? false;
    this.config.validation = config.validation ?? true;

    // Start periodic flush
    this.startFlushTimer();
  }

  /**
   * Ingest a single sensor reading
   */
  async ingest(reading: SensorReading): Promise<void> {
    this.stats.received++;

    try {
      // Validate if enabled
      if (this.config.validation) {
        const isValid = this.validate(reading);
        if (!isValid) {
          this.stats.invalid++;
          logger.warn({ reading }, 'Invalid sensor reading');
          this.emit('reading:invalid', reading);
          return;
        }
        this.stats.validated++;
      }

      // Apply transformations
      let transformedReading = reading;
      for (const transform of this.transforms) {
        const result = transform.transform(transformedReading);
        if (result === null) {
          logger.debug({ transform: transform.name }, 'Reading filtered by transform');
          return;
        }
        transformedReading = result;
      }
      this.stats.transformed++;

      // Add to buffer
      await this.buffer(transformedReading);

      this.emit('reading:ingested', transformedReading);
    } catch (error) {
      this.stats.failed++;
      logger.error({ error, reading }, 'Failed to ingest reading');
      this.emit('reading:error', { reading, error });
    }
  }

  /**
   * Ingest multiple readings in batch
   */
  async ingestBatch(readings: SensorReading[]): Promise<void> {
    logger.debug({ count: readings.length }, 'Ingesting batch of readings');

    for (const reading of readings) {
      await this.ingest(reading);
    }
  }

  /**
   * Add validator to pipeline
   */
  addValidator(validator: DataValidator): void {
    this.validators.push(validator);
    logger.info({ validator: validator.constructor.name }, 'Validator added to pipeline');
  }

  /**
   * Add transform to pipeline
   */
  addTransform(transform: DataTransform): void {
    this.transforms.push(transform);
    logger.info({ transform: transform.name }, 'Transform added to pipeline');
  }

  /**
   * Get buffer for device/sensor
   */
  private getBuffer(deviceId: string, sensorId: string): DataBuffer {
    const key = `${deviceId}:${sensorId}`;
    let buffer = this.buffers.get(key);

    if (!buffer) {
      buffer = {
        deviceId,
        sensorId,
        readings: [],
        capacity: this.config.batchSize!,
        flushThreshold: Math.floor(this.config.batchSize! * 0.8),
        lastFlush: new Date(),
      };
      this.buffers.set(key, buffer);
    }

    return buffer;
  }

  /**
   * Buffer a reading
   */
  private async buffer(reading: SensorReading): Promise<void> {
    const buffer = this.getBuffer(reading.deviceId, reading.sensorId);
    buffer.readings.push(reading);

    // Check if buffer should be flushed
    if (buffer.readings.length >= buffer.flushThreshold) {
      await this.flush(buffer);
    }
  }

  /**
   * Validate a reading
   */
  private validate(reading: SensorReading): boolean {
    if (this.validators.length === 0) {
      return true;
    }

    for (const validator of this.validators) {
      const result = validator.validate(reading);
      if (!result.valid) {
        logger.debug(
          { errors: result.errors, warnings: result.warnings },
          'Validation failed'
        );
        return false;
      }
    }

    return true;
  }

  /**
   * Flush buffer to storage
   */
  private async flush(buffer: DataBuffer): Promise<void> {
    if (buffer.readings.length === 0) {
      return;
    }

    const readings = buffer.readings.splice(0, buffer.readings.length);
    buffer.lastFlush = new Date();

    logger.debug(
      {
        deviceId: buffer.deviceId,
        sensorId: buffer.sensorId,
        count: readings.length,
      },
      'Flushing buffer'
    );

    try {
      // Convert to time-series format
      const dataPoints = readings.map((reading) => this.toTimeSeriesDataPoint(reading));

      // Emit batch for storage
      this.emit('batch:ready', {
        deviceId: buffer.deviceId,
        sensorId: buffer.sensorId,
        dataPoints,
        readings,
      });

      this.stats.ingested += readings.length;

      logger.debug(
        {
          deviceId: buffer.deviceId,
          sensorId: buffer.sensorId,
          count: readings.length,
        },
        'Buffer flushed successfully'
      );
    } catch (error) {
      logger.error({ error, buffer }, 'Failed to flush buffer');
      // Put readings back in buffer
      buffer.readings.unshift(...readings);
      throw error;
    }
  }

  /**
   * Flush all buffers
   */
  async flushAll(): Promise<void> {
    logger.info({ bufferCount: this.buffers.size }, 'Flushing all buffers');

    const flushPromises: Promise<void>[] = [];

    for (const buffer of this.buffers.values()) {
      flushPromises.push(this.flush(buffer));
    }

    await Promise.allSettled(flushPromises);
  }

  /**
   * Start periodic flush timer
   */
  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flushAll().catch((error) => {
        logger.error({ error }, 'Periodic flush failed');
      });
    }, this.config.batchTimeout!);
  }

  /**
   * Stop pipeline
   */
  async stop(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }

    await this.flushAll();

    logger.info('Data ingestion pipeline stopped');
  }

  /**
   * Convert sensor reading to time-series data point
   */
  private toTimeSeriesDataPoint(reading: SensorReading): TimeSeriesDataPoint {
    const fields: Record<string, number | string | boolean> = {};

    if (typeof reading.value === 'object' && reading.value !== null) {
      Object.assign(fields, reading.value);
    } else {
      fields.value = reading.value;
    }

    if (reading.quality !== undefined) {
      fields.quality = reading.quality;
    }

    return {
      timestamp: reading.timestamp,
      deviceId: reading.deviceId,
      sensorId: reading.sensorId,
      fields,
      tags: {
        sensorType: reading.sensorType,
        unit: reading.unit ?? 'unknown',
        ...reading.metadata,
      },
    };
  }

  /**
   * Get ingestion statistics
   */
  getStats() {
    return {
      ...this.stats,
      buffered: Array.from(this.buffers.values()).reduce(
        (sum, buffer) => sum + buffer.readings.length,
        0
      ),
      bufferCount: this.buffers.size,
    };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      received: 0,
      validated: 0,
      invalid: 0,
      transformed: 0,
      ingested: 0,
      failed: 0,
    };
  }
}
