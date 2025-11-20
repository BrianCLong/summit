import {
  BaseTransformer,
  TransformationContext,
  TransformationResult,
  TransformerMetadata
} from './base.js';

/**
 * Schema mapping configuration
 */
export interface SchemaMappingConfig {
  mappings: Array<{
    source: string; // Source field path (supports dot notation)
    target: string; // Target field path
    transform?: 'uppercase' | 'lowercase' | 'trim' | 'date' | 'number' | 'boolean' | 'json';
    defaultValue?: unknown;
    required?: boolean;
  }>;
  removeUnmapped?: boolean; // Remove fields not in mappings
  strict?: boolean; // Fail on missing required fields
}

/**
 * Schema Mapper Transformer
 * Maps data from one schema to another with field transformations
 */
export class SchemaMapperTransformer extends BaseTransformer<
  Record<string, unknown>,
  Record<string, unknown>
> {
  private mappingConfig: SchemaMappingConfig;

  constructor(config: any) {
    super(config);
    this.mappingConfig = config.config as SchemaMappingConfig;
  }

  async transform(
    input: Record<string, unknown>,
    context: TransformationContext
  ): Promise<TransformationResult<Record<string, unknown>>> {
    const output: Record<string, unknown> = this.mappingConfig.removeUnmapped ? {} : { ...input };
    const errors: Array<{ message: string; field?: string; severity: 'ERROR' | 'WARNING' | 'INFO' }> = [];

    for (const mapping of this.mappingConfig.mappings) {
      try {
        // Get source value
        let value = this.getNestedValue(input, mapping.source);

        // Handle missing values
        if (value === undefined || value === null) {
          if (mapping.defaultValue !== undefined) {
            value = mapping.defaultValue;
          } else if (mapping.required && this.mappingConfig.strict) {
            errors.push({
              message: `Required field '${mapping.source}' is missing`,
              field: mapping.source,
              severity: 'ERROR'
            });
            continue;
          } else if (mapping.required) {
            errors.push({
              message: `Required field '${mapping.source}' is missing`,
              field: mapping.source,
              severity: 'WARNING'
            });
            continue;
          } else {
            continue;
          }
        }

        // Apply transformation
        if (mapping.transform) {
          value = this.applyTransform(value, mapping.transform);
        }

        // Set target value
        this.setNestedValue(output, mapping.target, value);
      } catch (error) {
        errors.push({
          message: `Failed to map '${mapping.source}' to '${mapping.target}': ${error}`,
          field: mapping.source,
          severity: 'WARNING'
        });
      }
    }

    if (errors.some((e) => e.severity === 'ERROR')) {
      return {
        data: input,
        errors
      };
    }

    return {
      data: output,
      errors: errors.length > 0 ? errors : undefined,
      metadata: {
        transformationType: 'schema_mapping',
        fieldsMappe: this.mappingConfig.mappings.length
      }
    };
  }

  async validate(input: Record<string, unknown>): Promise<boolean> {
    if (typeof input !== 'object' || input === null) {
      return false;
    }

    if (this.mappingConfig.strict) {
      for (const mapping of this.mappingConfig.mappings) {
        if (mapping.required) {
          const value = this.getNestedValue(input, mapping.source);
          if (value === undefined || value === null) {
            return false;
          }
        }
      }
    }

    return true;
  }

  /**
   * Get nested value from object using dot notation
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
   * Set nested value in object using dot notation
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

  /**
   * Apply transformation to value
   */
  private applyTransform(value: unknown, transform: string): unknown {
    if (value === null || value === undefined) {
      return value;
    }

    switch (transform) {
      case 'uppercase':
        return String(value).toUpperCase();
      case 'lowercase':
        return String(value).toLowerCase();
      case 'trim':
        return String(value).trim();
      case 'date':
        return new Date(String(value));
      case 'number':
        return Number(value);
      case 'boolean':
        return Boolean(value);
      case 'json':
        return typeof value === 'string' ? JSON.parse(value) : value;
      default:
        return value;
    }
  }

  getMetadata(): TransformerMetadata {
    return {
      name: 'Schema Mapper',
      type: 'NORMALIZE_SCHEMA',
      version: '1.0.0',
      description: 'Maps data from one schema to another with field transformations'
    };
  }
}
