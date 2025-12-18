/**
 * Signal Normalizer
 *
 * Normalizes signals to ensure consistent format across all signal types.
 * Handles:
 * - Field name normalization (camelCase)
 * - Timestamp normalization (Unix milliseconds)
 * - Data type coercion
 * - Default value injection
 *
 * @module signal-normalizer
 */

import {
  type SignalEnvelope,
  type RawSignalInput,
  createSignalEnvelope,
  SignalTypeRegistry,
  type SignalTypeIdType,
  SignalQuality,
} from '@intelgraph/signal-contracts';
import type { Logger } from 'pino';

/**
 * Normalizer configuration
 */
export interface NormalizerConfig {
  /** Apply camelCase normalization to payload fields */
  normalizeCamelCase: boolean;
  /** Inject default values for missing optional fields */
  injectDefaults: boolean;
  /** Trim string values */
  trimStrings: boolean;
  /** Convert empty strings to null */
  emptyStringsToNull: boolean;
  /** Maximum string length (truncate if exceeded) */
  maxStringLength: number;
  /** Remove null/undefined values from payload */
  removeNullValues: boolean;
}

/**
 * Default normalizer configuration
 */
const defaultConfig: NormalizerConfig = {
  normalizeCamelCase: true,
  injectDefaults: true,
  trimStrings: true,
  emptyStringsToNull: true,
  maxStringLength: 10000,
  removeNullValues: false,
};

/**
 * Signal Normalizer class
 */
export class SignalNormalizerService {
  private config: NormalizerConfig;
  private logger: Logger;
  private stats = {
    total: 0,
    normalized: 0,
    errors: 0,
  };

  constructor(logger: Logger, config?: Partial<NormalizerConfig>) {
    this.logger = logger.child({ component: 'signal-normalizer' });
    this.config = { ...defaultConfig, ...config };
  }

  /**
   * Normalize a raw signal input into a SignalEnvelope
   */
  normalizeRawInput(input: RawSignalInput): SignalEnvelope {
    this.stats.total++;

    try {
      // Normalize the payload
      const normalizedPayload = this.normalizePayload(input.payload);

      // Normalize timestamp
      const timestamp = this.normalizeTimestamp(input.timestamp);

      // Determine signal quality
      const quality = this.determineQuality(input);

      // Create the envelope
      const envelope = createSignalEnvelope(
        {
          ...input,
          payload: normalizedPayload,
          timestamp,
        },
        {
          quality,
          policyLabels: this.inferPolicyLabels(input),
        },
      );

      // Normalize location if present
      if (envelope.location) {
        envelope.location = this.normalizeLocation(envelope.location);
      }

      // Normalize device info if present
      if (envelope.device) {
        envelope.device = this.normalizeDeviceInfo(envelope.device);
      }

      this.stats.normalized++;
      return envelope;
    } catch (error) {
      this.stats.errors++;
      this.logger.error({ error, input }, 'Failed to normalize signal');
      throw error;
    }
  }

  /**
   * Normalize an existing envelope (e.g., after enrichment)
   */
  normalizeEnvelope(envelope: SignalEnvelope): SignalEnvelope {
    this.stats.total++;

    try {
      const normalized: SignalEnvelope = {
        ...envelope,
        metadata: {
          ...envelope.metadata,
          tags: this.normalizeTags(envelope.metadata.tags),
        },
        payload: this.normalizePayload(envelope.payload),
      };

      if (normalized.location) {
        normalized.location = this.normalizeLocation(normalized.location);
      }

      if (normalized.device) {
        normalized.device = this.normalizeDeviceInfo(normalized.device);
      }

      this.stats.normalized++;
      return normalized;
    } catch (error) {
      this.stats.errors++;
      this.logger.error({ error }, 'Failed to normalize envelope');
      throw error;
    }
  }

  /**
   * Normalize a payload object
   */
  private normalizePayload(payload: unknown): unknown {
    if (payload === null || payload === undefined) {
      return {};
    }

    if (typeof payload !== 'object') {
      return payload;
    }

    if (Array.isArray(payload)) {
      return payload.map((item) => this.normalizePayload(item));
    }

    const result: Record<string, unknown> = {};
    const obj = payload as Record<string, unknown>;

    for (const [key, value] of Object.entries(obj)) {
      // Normalize key to camelCase if configured
      const normalizedKey = this.config.normalizeCamelCase
        ? this.toCamelCase(key)
        : key;

      // Skip null/undefined if configured
      if (this.config.removeNullValues && (value === null || value === undefined)) {
        continue;
      }

      // Normalize value
      const normalizedValue = this.normalizeValue(value);

      // Skip empty strings converted to null if configured
      if (this.config.removeNullValues && normalizedValue === null) {
        continue;
      }

      result[normalizedKey] = normalizedValue;
    }

    return result;
  }

  /**
   * Normalize a single value
   */
  private normalizeValue(value: unknown): unknown {
    if (value === null || value === undefined) {
      return null;
    }

    if (typeof value === 'string') {
      return this.normalizeString(value);
    }

    if (typeof value === 'number') {
      return this.normalizeNumber(value);
    }

    if (typeof value === 'object') {
      return this.normalizePayload(value);
    }

    return value;
  }

  /**
   * Normalize a string value
   */
  private normalizeString(value: string): string | null {
    let normalized = value;

    // Trim if configured
    if (this.config.trimStrings) {
      normalized = normalized.trim();
    }

    // Convert empty to null if configured
    if (this.config.emptyStringsToNull && normalized.length === 0) {
      return null;
    }

    // Truncate if too long
    if (normalized.length > this.config.maxStringLength) {
      normalized = normalized.substring(0, this.config.maxStringLength);
    }

    return normalized;
  }

  /**
   * Normalize a number value
   */
  private normalizeNumber(value: number): number | null {
    if (Number.isNaN(value)) {
      return null;
    }

    if (!Number.isFinite(value)) {
      return null;
    }

    return value;
  }

  /**
   * Normalize timestamp to Unix milliseconds
   */
  private normalizeTimestamp(timestamp?: number): number {
    if (!timestamp) {
      return Date.now();
    }

    // If timestamp is in seconds (before year 2001 in ms)
    if (timestamp < 1000000000000) {
      return timestamp * 1000;
    }

    // If timestamp is in microseconds (after year 5000 in ms)
    if (timestamp > 100000000000000) {
      return Math.floor(timestamp / 1000);
    }

    return timestamp;
  }

  /**
   * Normalize location data
   */
  private normalizeLocation(location: {
    latitude: number;
    longitude: number;
    altitude?: number;
    accuracy?: number;
    heading?: number;
    speed?: number;
    source?: string;
  }): typeof location {
    return {
      latitude: this.roundCoordinate(location.latitude),
      longitude: this.roundCoordinate(location.longitude),
      altitude: location.altitude !== undefined ? Math.round(location.altitude) : undefined,
      accuracy: location.accuracy !== undefined ? Math.round(location.accuracy) : undefined,
      heading: location.heading !== undefined ? Math.round(location.heading) : undefined,
      speed: location.speed !== undefined ? Math.round(location.speed * 100) / 100 : undefined,
      source: location.source,
    };
  }

  /**
   * Round coordinate to 6 decimal places (~0.1m precision)
   */
  private roundCoordinate(value: number): number {
    return Math.round(value * 1000000) / 1000000;
  }

  /**
   * Normalize device info
   */
  private normalizeDeviceInfo(device: {
    deviceId: string;
    deviceType?: string;
    manufacturer?: string;
    model?: string;
    osName?: string;
    osVersion?: string;
    appVersion?: string;
    firmwareVersion?: string;
  }): typeof device {
    return {
      deviceId: device.deviceId.trim(),
      deviceType: device.deviceType?.trim().toLowerCase(),
      manufacturer: device.manufacturer?.trim(),
      model: device.model?.trim(),
      osName: device.osName?.trim().toLowerCase(),
      osVersion: device.osVersion?.trim(),
      appVersion: device.appVersion?.trim(),
      firmwareVersion: device.firmwareVersion?.trim(),
    };
  }

  /**
   * Normalize tags array
   */
  private normalizeTags(tags: string[]): string[] {
    return [...new Set(tags.map((tag) => tag.trim().toLowerCase()).filter((tag) => tag.length > 0))];
  }

  /**
   * Convert string to camelCase
   */
  private toCamelCase(str: string): string {
    // Already camelCase
    if (/^[a-z][a-zA-Z0-9]*$/.test(str)) {
      return str;
    }

    // snake_case or kebab-case to camelCase
    return str
      .toLowerCase()
      .replace(/[-_]([a-z])/g, (_, letter) => letter.toUpperCase());
  }

  /**
   * Determine signal quality based on available data
   */
  private determineQuality(input: RawSignalInput): typeof SignalQuality[keyof typeof SignalQuality] {
    let score = 0;

    // Has location
    if (input.location) {
      score += 2;
      if (input.location.accuracy && input.location.accuracy < 100) {
        score += 1;
      }
    }

    // Has device info
    if (input.device) {
      score += 1;
    }

    // Has correlation ID
    if (input.correlationId) {
      score += 1;
    }

    // Has tags
    if (input.tags && input.tags.length > 0) {
      score += 1;
    }

    // Map score to quality
    if (score >= 5) {
      return SignalQuality.HIGH;
    }
    if (score >= 3) {
      return SignalQuality.MEDIUM;
    }
    if (score >= 1) {
      return SignalQuality.LOW;
    }
    return SignalQuality.UNKNOWN;
  }

  /**
   * Infer policy labels based on signal type and content
   */
  private inferPolicyLabels(input: RawSignalInput): string[] {
    const labels: string[] = [];

    // Add signal type category as label
    const category = input.signalType.split('.')[0];
    labels.push(`category:${category}`);

    // Add priority label based on signal type
    const typeDef = SignalTypeRegistry[input.signalType as SignalTypeIdType];
    if (typeDef) {
      labels.push(`priority:${typeDef.priority}`);
    }

    return labels;
  }

  /**
   * Get normalization statistics
   */
  getStats(): { total: number; normalized: number; errors: number; successRate: number } {
    return {
      ...this.stats,
      successRate: this.stats.total > 0 ? this.stats.normalized / this.stats.total : 1,
    };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = { total: 0, normalized: 0, errors: 0 };
  }
}

/**
 * Create a signal normalizer instance
 */
export function createSignalNormalizer(
  logger: Logger,
  config?: Partial<NormalizerConfig>,
): SignalNormalizerService {
  return new SignalNormalizerService(logger, config);
}
