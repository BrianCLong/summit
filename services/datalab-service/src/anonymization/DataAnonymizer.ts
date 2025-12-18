import { createHash } from 'crypto';
import {
  AnonymizationTechnique,
  FieldAnonymizationConfig,
} from '../types/index.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('DataAnonymizer');

/**
 * Anonymization statistics for a field
 */
interface AnonymizationStats {
  fieldPath: string;
  technique: AnonymizationTechnique;
  recordsProcessed: number;
  valuesAnonymized: number;
  uniqueValuesBefore: number;
  uniqueValuesAfter: number;
}

/**
 * Result of anonymization operation
 */
export interface AnonymizationResult<T> {
  data: T;
  stats: AnonymizationStats[];
  warnings: string[];
}

/**
 * DataAnonymizer provides field-level data anonymization
 * with multiple techniques for privacy protection.
 */
export class DataAnonymizer {
  private pseudonymMaps: Map<string, Map<string, string>> = new Map();
  private hashSalt: string;

  constructor(hashSalt?: string) {
    this.hashSalt = hashSalt || this.generateSalt();
  }

  /**
   * Anonymize a dataset according to field configurations
   */
  async anonymize<T extends Record<string, unknown>>(
    data: T[],
    configs: FieldAnonymizationConfig[]
  ): Promise<AnonymizationResult<T[]>> {
    const stats: AnonymizationStats[] = [];
    const warnings: string[] = [];
    const anonymizedData: T[] = [];

    for (const config of configs) {
      stats.push({
        fieldPath: config.fieldPath,
        technique: config.technique,
        recordsProcessed: 0,
        valuesAnonymized: 0,
        uniqueValuesBefore: 0,
        uniqueValuesAfter: 0,
      });
    }

    for (const record of data) {
      const anonymizedRecord = { ...record };

      for (let i = 0; i < configs.length; i++) {
        const config = configs[i];
        const stat = stats[i];

        try {
          const originalValue = this.getNestedValue(record, config.fieldPath);
          stat.recordsProcessed++;

          if (originalValue !== undefined && originalValue !== null) {
            const anonymizedValue = this.anonymizeValue(
              originalValue,
              config
            );
            this.setNestedValue(anonymizedRecord, config.fieldPath, anonymizedValue);
            stat.valuesAnonymized++;
          }
        } catch (error) {
          const message = `Failed to anonymize field ${config.fieldPath}: ${error}`;
          warnings.push(message);
          logger.warn(message);
        }
      }

      anonymizedData.push(anonymizedRecord);
    }

    // Calculate unique value stats
    for (let i = 0; i < configs.length; i++) {
      const config = configs[i];
      const stat = stats[i];

      const originalValues = new Set(
        data.map(r => JSON.stringify(this.getNestedValue(r, config.fieldPath)))
      );
      const anonymizedValues = new Set(
        anonymizedData.map(r =>
          JSON.stringify(this.getNestedValue(r, config.fieldPath))
        )
      );

      stat.uniqueValuesBefore = originalValues.size;
      stat.uniqueValuesAfter = anonymizedValues.size;
    }

    logger.info('Anonymization complete', {
      records: data.length,
      fields: configs.length,
      warnings: warnings.length,
    });

    return {
      data: anonymizedData,
      stats,
      warnings,
    };
  }

  /**
   * Anonymize a single value according to technique
   */
  anonymizeValue(
    value: unknown,
    config: FieldAnonymizationConfig
  ): unknown {
    if (value === null || value === undefined) {
      return value;
    }

    switch (config.technique) {
      case AnonymizationTechnique.REDACTION:
        return this.redact(value, config.config);

      case AnonymizationTechnique.HASHING:
        return this.hash(value, config.config);

      case AnonymizationTechnique.PSEUDONYMIZATION:
        return this.pseudonymize(value, config.fieldPath, config.config);

      case AnonymizationTechnique.GENERALIZATION:
        return this.generalize(value, config.config);

      case AnonymizationTechnique.MASKING:
        return this.mask(value, config.config);

      case AnonymizationTechnique.NOISE_ADDITION:
        return this.addNoise(value, config.config);

      case AnonymizationTechnique.K_ANONYMITY:
        return this.applyKAnonymity(value, config.config);

      case AnonymizationTechnique.DIFFERENTIAL_PRIVACY:
        return this.applyDifferentialPrivacy(value, config.config);

      default:
        logger.warn(`Unknown anonymization technique: ${config.technique}`);
        return value;
    }
  }

  /**
   * Redact value completely
   */
  private redact(
    value: unknown,
    config: FieldAnonymizationConfig['config']
  ): string {
    const strValue = String(value);

    if (config.preserveLength) {
      return config.maskChar!.repeat(strValue.length);
    }

    return '[REDACTED]';
  }

  /**
   * Hash value with salt
   */
  private hash(
    value: unknown,
    config: FieldAnonymizationConfig['config']
  ): string {
    const algorithm = config.hashAlgorithm || 'sha256';
    const strValue = String(value);

    const hash = createHash(algorithm)
      .update(this.hashSalt + strValue)
      .digest('hex');

    return hash;
  }

  /**
   * Pseudonymize value with consistent mapping
   */
  private pseudonymize(
    value: unknown,
    fieldPath: string,
    config: FieldAnonymizationConfig['config']
  ): string {
    const strValue = String(value);

    // Get or create map for this field
    if (!this.pseudonymMaps.has(fieldPath)) {
      this.pseudonymMaps.set(fieldPath, new Map());
    }

    const fieldMap = this.pseudonymMaps.get(fieldPath)!;

    // Return existing pseudonym or create new one
    if (fieldMap.has(strValue)) {
      return fieldMap.get(strValue)!;
    }

    // Generate pseudonym
    const pseudonym = this.generatePseudonym(strValue, config);
    fieldMap.set(strValue, pseudonym);

    return pseudonym;
  }

  /**
   * Generalize value to less specific form
   */
  private generalize(
    value: unknown,
    config: FieldAnonymizationConfig['config']
  ): unknown {
    if (typeof value === 'number') {
      // Round to nearest 10, 100, etc based on magnitude
      const magnitude = Math.pow(10, Math.floor(Math.log10(Math.abs(value))));
      return Math.round(value / magnitude) * magnitude;
    }

    if (typeof value === 'string') {
      // For strings, keep first few characters
      const keepLength = Math.min(3, Math.floor(value.length / 2));
      return value.substring(0, keepLength) + '...';
    }

    if (value instanceof Date) {
      // Generalize to month/year
      return new Date(value.getFullYear(), value.getMonth(), 1);
    }

    return value;
  }

  /**
   * Mask value with partial hiding
   */
  private mask(
    value: unknown,
    config: FieldAnonymizationConfig['config']
  ): string {
    const strValue = String(value);
    const maskChar = config.maskChar || '*';
    const fromStart = config.maskFromStart || 0;
    const fromEnd = config.maskFromEnd || 0;

    if (strValue.length <= fromStart + fromEnd) {
      return maskChar.repeat(strValue.length);
    }

    const masked =
      strValue.substring(0, fromStart) +
      maskChar.repeat(strValue.length - fromStart - fromEnd) +
      strValue.substring(strValue.length - fromEnd);

    return masked;
  }

  /**
   * Add statistical noise to numeric values
   */
  private addNoise(
    value: unknown,
    config: FieldAnonymizationConfig['config']
  ): unknown {
    if (typeof value !== 'number') {
      return value;
    }

    // Add Laplacian noise scaled by value magnitude
    const scale = Math.abs(value) * 0.1; // 10% scale factor
    const noise = this.laplacianNoise(scale);

    return value + noise;
  }

  /**
   * Apply k-anonymity generalization
   */
  private applyKAnonymity(
    value: unknown,
    config: FieldAnonymizationConfig['config']
  ): unknown {
    const k = config.kValue || 5;

    if (typeof value === 'number') {
      // Create ranges that group at least k values
      const range = Math.ceil(Math.abs(value) / k) * k;
      const lower = Math.floor(value / range) * range;
      return `${lower}-${lower + range}`;
    }

    if (typeof value === 'string' && value.length > 0) {
      // Generalize to first character + length range
      const lengthRange = Math.ceil(value.length / k) * k;
      return `${value[0]}*** (${lengthRange - k + 1}-${lengthRange} chars)`;
    }

    return this.generalize(value, config);
  }

  /**
   * Apply differential privacy noise
   */
  private applyDifferentialPrivacy(
    value: unknown,
    config: FieldAnonymizationConfig['config']
  ): unknown {
    if (typeof value !== 'number') {
      return this.hash(value, config);
    }

    const epsilon = config.epsilon || 1.0;
    const sensitivity = 1; // Assume unit sensitivity
    const scale = sensitivity / epsilon;

    const noise = this.laplacianNoise(scale);
    return value + noise;
  }

  // Helper methods

  private generateSalt(): string {
    return createHash('sha256')
      .update(Date.now().toString() + Math.random().toString())
      .digest('hex')
      .substring(0, 16);
  }

  private generatePseudonym(
    original: string,
    config: FieldAnonymizationConfig['config']
  ): string {
    // Generate consistent but anonymous pseudonym
    const hash = createHash('sha256')
      .update(this.hashSalt + original)
      .digest('hex');

    if (config.preserveFormat) {
      // Try to preserve format (e.g., email, phone)
      if (original.includes('@')) {
        return `user_${hash.substring(0, 8)}@example.com`;
      }
      if (/^\d{3}-\d{3}-\d{4}$/.test(original)) {
        return `555-${hash.substring(0, 3)}-${hash.substring(3, 7)}`;
      }
    }

    if (config.preserveLength) {
      return hash.substring(0, original.length);
    }

    return `PSEUDO_${hash.substring(0, 12)}`;
  }

  private laplacianNoise(scale: number): number {
    // Generate Laplacian noise using inverse CDF
    const u = Math.random() - 0.5;
    return -scale * Math.sign(u) * Math.log(1 - 2 * Math.abs(u));
  }

  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    const parts = path.split('.');
    let current: unknown = obj;

    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }
      current = (current as Record<string, unknown>)[part];
    }

    return current;
  }

  private setNestedValue(
    obj: Record<string, unknown>,
    path: string,
    value: unknown
  ): void {
    const parts = path.split('.');
    let current = obj;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!(part in current)) {
        current[part] = {};
      }
      current = current[part] as Record<string, unknown>;
    }

    current[parts[parts.length - 1]] = value;
  }

  /**
   * Reset pseudonym mappings (for new dataset)
   */
  resetMappings(): void {
    this.pseudonymMaps.clear();
  }

  /**
   * Get pseudonym mapping for a field (for audit purposes)
   */
  getPseudonymMapping(fieldPath: string): Map<string, string> | undefined {
    return this.pseudonymMaps.get(fieldPath);
  }
}

/**
 * Singleton instance
 */
let anonymizerInstance: DataAnonymizer | null = null;

export function getDataAnonymizer(salt?: string): DataAnonymizer {
  if (!anonymizerInstance) {
    anonymizerInstance = new DataAnonymizer(salt);
  }
  return anonymizerInstance;
}
