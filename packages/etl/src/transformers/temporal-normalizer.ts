import {
  BaseTransformer,
  TransformationContext,
  TransformationResult,
  TransformerMetadata
} from './base.js';

/**
 * Temporal normalization configuration
 */
export interface TemporalNormalizationConfig {
  dateFields: string[]; // Fields containing date/time values
  outputFormat?: 'iso' | 'unix' | 'date'; // Output format
  timezone?: string; // Target timezone (e.g., 'UTC', 'America/New_York')
  handleInvalid?: 'skip' | 'null' | 'current' | 'error'; // How to handle invalid dates
  addTimestamp?: boolean; // Add processing timestamp
  timestampField?: string; // Field name for processing timestamp
}

/**
 * Temporal Normalizer Transformer
 * Normalizes date and time fields to a consistent format
 */
export class TemporalNormalizerTransformer extends BaseTransformer<
  Record<string, unknown>,
  Record<string, unknown>
> {
  private temporalConfig: TemporalNormalizationConfig;

  constructor(config: any) {
    super(config);
    this.temporalConfig = config.config as TemporalNormalizationConfig;
  }

  async transform(
    input: Record<string, unknown>,
    context: TransformationContext
  ): Promise<TransformationResult<Record<string, unknown>>> {
    const output = { ...input };
    const errors: Array<{
      message: string;
      field?: string;
      severity: 'ERROR' | 'WARNING' | 'INFO';
    }> = [];

    // Normalize specified date fields
    for (const field of this.temporalConfig.dateFields) {
      try {
        const value = this.getNestedValue(output, field);

        if (value !== undefined && value !== null) {
          const normalizedValue = this.normalizeDate(value, field);

          if (normalizedValue !== null) {
            this.setNestedValue(output, field, normalizedValue);
          } else {
            // Handle invalid date
            this.handleInvalidDate(output, field, value, errors);
          }
        }
      } catch (error) {
        errors.push({
          message: `Failed to normalize date field '${field}': ${error}`,
          field,
          severity: 'WARNING'
        });
      }
    }

    // Add processing timestamp if configured
    if (this.temporalConfig.addTimestamp) {
      const timestampField = this.temporalConfig.timestampField || '_processedAt';
      const timestamp = this.formatDate(new Date());
      this.setNestedValue(output, timestampField, timestamp);
    }

    return {
      data: output,
      errors: errors.length > 0 ? errors : undefined,
      metadata: {
        transformationType: 'temporal_normalization',
        fieldsNormalized: this.temporalConfig.dateFields.length
      }
    };
  }

  async validate(input: Record<string, unknown>): Promise<boolean> {
    if (typeof input !== 'object' || input === null) {
      return false;
    }

    return true;
  }

  /**
   * Normalize a date value
   */
  private normalizeDate(value: unknown, field: string): unknown {
    let date: Date;

    // Try to parse date
    if (value instanceof Date) {
      date = value;
    } else if (typeof value === 'number') {
      // Assume Unix timestamp
      date = new Date(value * 1000);
    } else if (typeof value === 'string') {
      date = this.parseDate(value);
    } else {
      return null;
    }

    // Check if date is valid
    if (isNaN(date.getTime())) {
      return null;
    }

    // Apply timezone conversion if needed
    if (this.temporalConfig.timezone) {
      date = this.convertTimezone(date, this.temporalConfig.timezone);
    }

    // Format according to output format
    return this.formatDate(date);
  }

  /**
   * Parse date string with multiple formats
   */
  private parseDate(dateString: string): Date {
    // Try ISO format first
    let date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      return date;
    }

    // Try common date formats
    const formats = [
      // ISO variants
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
      // US format
      /^\d{1,2}\/\d{1,2}\/\d{4}/,
      // EU format
      /^\d{1,2}\.\d{1,2}\.\d{4}/,
      // RFC 2822
      /^[A-Za-z]{3},\s\d{1,2}\s[A-Za-z]{3}\s\d{4}/
    ];

    for (const format of formats) {
      if (format.test(dateString)) {
        date = new Date(dateString);
        if (!isNaN(date.getTime())) {
          return date;
        }
      }
    }

    return new Date(NaN);
  }

  /**
   * Convert date to target timezone (simplified)
   */
  private convertTimezone(date: Date, timezone: string): Date {
    // In production, use a library like date-fns-tz or moment-timezone
    // This is a simplified implementation
    if (timezone === 'UTC') {
      return new Date(date.toISOString());
    }

    // For now, return as-is
    return date;
  }

  /**
   * Format date according to output format
   */
  private formatDate(date: Date): unknown {
    const format = this.temporalConfig.outputFormat || 'iso';

    switch (format) {
      case 'iso':
        return date.toISOString();
      case 'unix':
        return Math.floor(date.getTime() / 1000);
      case 'date':
        return date;
      default:
        return date.toISOString();
    }
  }

  /**
   * Handle invalid date according to configuration
   */
  private handleInvalidDate(
    output: Record<string, unknown>,
    field: string,
    originalValue: unknown,
    errors: Array<{
      message: string;
      field?: string;
      severity: 'ERROR' | 'WARNING' | 'INFO';
    }>
  ): void {
    const handleInvalid = this.temporalConfig.handleInvalid || 'null';

    switch (handleInvalid) {
      case 'skip':
        // Keep original value
        break;
      case 'null':
        this.setNestedValue(output, field, null);
        errors.push({
          message: `Invalid date value in field '${field}': ${originalValue}`,
          field,
          severity: 'WARNING'
        });
        break;
      case 'current':
        this.setNestedValue(output, field, this.formatDate(new Date()));
        errors.push({
          message: `Invalid date value in field '${field}': ${originalValue}, using current date`,
          field,
          severity: 'INFO'
        });
        break;
      case 'error':
        errors.push({
          message: `Invalid date value in field '${field}': ${originalValue}`,
          field,
          severity: 'ERROR'
        });
        break;
    }
  }

  /**
   * Get nested value from object
   */
  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    const keys = path.split('.');
    let current: any = obj;

    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        return undefined;
      }
    }

    return current;
  }

  /**
   * Set nested value in object
   */
  private setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): void {
    const keys = path.split('.');
    let current: any = obj;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in current) || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }

    current[keys[keys.length - 1]] = value;
  }

  getMetadata(): TransformerMetadata {
    return {
      name: 'Temporal Normalizer',
      type: 'NORMALIZE_TEMPORAL',
      version: '1.0.0',
      description: 'Normalizes date and time fields to a consistent format'
    };
  }
}
